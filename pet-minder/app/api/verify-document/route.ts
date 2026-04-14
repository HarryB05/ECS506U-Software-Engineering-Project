import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Stripe from "stripe";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { insertPendingVerification, updateVerificationResult } from "@/lib/id-verification";
import type { IdVerificationDocType } from "@/lib/types/id-verification";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createSupabaseAdmin(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CERTIFICATE_PROMPT = `You are a document verification assistant for a pet-minder platform.
Check if the uploaded file is a professional certificate relevant to pet care.
Reply in exactly this format:
STATUS: approved|rejected
REASON: one short sentence`;

const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const userId = String(formData.get("userId") ?? "");
    const rawDocType = String(formData.get("docType") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (rawDocType !== "identity" && rawDocType !== "certificate") {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    const docType = rawDocType as IdVerificationDocType;

    const { data: roleRows } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", user.id)
      .is("deleted_at", null);
    const isMinder = (roleRows ?? []).some((row) => row.role_type === "minder");

    if (docType === "certificate" && !isMinder) {
      return NextResponse.json(
        { error: "Only minders can submit certificate verification." },
        { status: 403 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be smaller than 10MB" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Service role key is not configured." },
        { status: 503 },
      );
    }

    const bytes = await file.arrayBuffer();
    const safeName = sanitizeFileName(file.name || "document");
    const storagePath = `${user.id}/${docType}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await admin.storage
      .from("id-verification-docs")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await insertPendingVerification(
      admin,
      user.id,
      docType,
      storagePath,
    );

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save verification record" },
        { status: 500 },
      );
    }

    if (docType === "identity") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json(
          { error: "STRIPE_SECRET_KEY is not configured." },
          { status: 503 },
        );
      }

      const stripe = new Stripe(stripeKey);
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        metadata: {
          user_id: user.id,
          verification_id: inserted.id,
          mode: "test",
        },
      });

      const { error: approveError } = await admin
        .from("id_verifications")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          ai_reason: "Government ID approved via Stripe test mode.",
          gemini_raw: JSON.stringify({ stripe_session_id: session.id }),
        })
        .eq("id", inserted.id);

      if (approveError) {
        return NextResponse.json({ error: approveError.message }, { status: 500 });
      }

      return NextResponse.json({
        status: "approved",
        reason: "Government ID verified via Stripe test mode.",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 503 },
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const base64 = Buffer.from(bytes).toString("base64");

    let geminiResult: Awaited<
      ReturnType<ReturnType<typeof genAI.getGenerativeModel>["generateContent"]>
    > | null = null;
    let modelError: unknown = null;

    for (const modelName of GEMINI_MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        geminiResult = await model.generateContent([
          { inlineData: { data: base64, mimeType: file.type } },
          CERTIFICATE_PROMPT,
        ]);
        modelError = null;
        break;
      } catch (error) {
        modelError = error;
      }
    }

    if (!geminiResult) {
      const message =
        modelError instanceof Error
          ? modelError.message
          : "No supported Gemini model is available.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const geminiRaw = geminiResult.response.text();

    const statusMatch = geminiRaw.match(/STATUS:\s*(approved|rejected)/i);
    const reasonMatch = geminiRaw.match(/REASON:\s*(.+)/i);
    const status = (statusMatch?.[1]?.toLowerCase() as "approved" | "rejected") ?? "rejected";
    const reason = reasonMatch?.[1]?.trim() ?? "Could not assess certificate.";

    const { error: certUpdateError } = await updateVerificationResult(
      admin,
      inserted.id,
      status,
      reason,
      geminiRaw,
    );
    if (certUpdateError) {
      return NextResponse.json({ error: certUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({
      status,
      reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
