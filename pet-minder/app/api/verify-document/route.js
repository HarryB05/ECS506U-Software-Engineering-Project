// app/api/verify-document/route.ts
// Accepts a multipart upload, saves the file to Supabase Storage,
// sends it to Gemini for analysis, then writes the result back to
// id_verifications. No Stripe in this flow — Stripe Identity can be
// wired in later as an optional gate before this endpoint is called.

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  insertPendingVerification,
  updateVerificationResult,
} from "@/lib/id-verification";
import type { IdVerificationDocType } from "@/lib/types/id-verification";

// Service-role client — bypasses RLS for server-side writes
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ---------------------------------------------------------------------------
// Gemini prompts
// ---------------------------------------------------------------------------
const IDENTITY_PROMPT = `You are an ID verification assistant for a pet-minder platform.

Examine the uploaded document and decide whether it is a valid, readable
government-issued photo ID (passport, driver's licence, national ID card,
or state ID card).

Approve if:
- The document is clearly a government-issued photo ID
- It is readable and not heavily obscured
- It does not appear to be a screenshot of another screen

Reject if:
- It is a selfie, personal photo, or non-ID document
- It is a novelty, fake, or clearly expired ID
- It is too blurry or cropped to assess
- It is a non-government card (library card, gym pass, etc.)

Reply in EXACTLY this format — no other text:
STATUS: approved
REASON: one sentence confirming this is a valid government ID

OR:
STATUS: rejected
REASON: one sentence explaining why this does not qualify`;

const CERTIFICATE_PROMPT = `You are a professional-certificate verification assistant for a pet-minder platform.

Examine the uploaded document and decide whether it is a legitimate
professional or safety certificate relevant to animal / child care, such as:
- DBS Enhanced Disclosure (UK background check)
- Animal First Aid Certificate
- Animal Training / Behaviour Certification
- Safeguarding Level 1 or 2 Certificate
- Animal Welfare or Pet Care Licence
- Any official certification from a recognised body

Approve if:
- The document clearly shows an organisation name, a certificate or
  disclosure number, and issue/expiry dates
- It looks like an official printed or digital certificate
- It is relevant to animal care, safety, or background checks

Reject if:
- It is a personal photo, CV, or unrelated qualification
- It is clearly expired
- It has no issuing body, number, or date
- It is too blurry or cropped to assess

Reply in EXACTLY this format — no other text:
STATUS: approved
REASON: one sentence confirming this is a valid relevant certificate

OR:
STATUS: rejected
REASON: one sentence explaining why this does not qualify`;

// ---------------------------------------------------------------------------
// POST /api/verify-document
// Body: FormData with fields:
//   file     File
//   userId   string
//   docType  "identity" | "certificate"
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const docType = (formData.get("docType") as IdVerificationDocType) || "identity";

    // ---- basic validation ------------------------------------------------
    if (!file || !userId) {
      return Response.json({ error: "Missing file or userId" }, { status: 400 });
    }

    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!ALLOWED_MIME.includes(file.type)) {
      return Response.json(
        { error: "Only JPEG, PNG, WEBP, or PDF files are accepted" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "File must be under 10 MB" }, { status: 400 });
    }

    const supabase = serviceClient();

    // ---- upload to Supabase Storage --------------------------------------
    // Path: {userId}/{docType}/{timestamp}-{filename}
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userId}/${docType}/${Date.now()}-${safeFilename}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("id-verification-docs")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return Response.json({ error: "Failed to upload document" }, { status: 500 });
    }

    // ---- insert pending row to DB ----------------------------------------
    const { data: pendingRow, error: insertError } = await insertPendingVerification(
      supabase,
      userId,
      docType,
      storagePath,
    );

    if (insertError || !pendingRow) {
      console.error("DB insert error:", insertError);
      return Response.json({ error: "Failed to create verification record" }, { status: 500 });
    }

    // ---- call Gemini ------------------------------------------------------
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const base64 = Buffer.from(fileBuffer).toString("base64");
    const prompt = docType === "certificate" ? CERTIFICATE_PROMPT : IDENTITY_PROMPT;

    let geminiRaw = "";
    let status: "approved" | "rejected" = "rejected";
    let aiReason = "Could not assess document.";

    try {
      const geminiResult = await model.generateContent([
        { inlineData: { data: base64, mimeType: file.type } },
        prompt,
      ]);

      geminiRaw = geminiResult.response.text();

      const statusMatch = geminiRaw.match(/STATUS:\s*(approved|rejected)/i);
      const reasonMatch = geminiRaw.match(/REASON:\s*(.+)/i);

      status = (statusMatch?.[1]?.toLowerCase() as "approved" | "rejected") ?? "rejected";
      aiReason = reasonMatch?.[1]?.trim() ?? "Document could not be assessed.";
    } catch (geminiErr) {
      // Gemini failed — leave as rejected rather than silently approving
      console.error("Gemini error:", geminiErr);
      aiReason = "Automated check failed. Please re-upload a clearer document.";
    }

    // ---- write result back to DB -----------------------------------------
    await updateVerificationResult(supabase, pendingRow.id, status, aiReason, geminiRaw);

    return Response.json({ status, reason: aiReason });
  } catch (err) {
    console.error("verify-document route error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}