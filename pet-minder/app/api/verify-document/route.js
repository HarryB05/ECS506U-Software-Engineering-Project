import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
  try {
    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const type = formData.get('type') || 'identity' // 'identity' or 'certificate'

    if (!file || !userId) {
      return Response.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = file.type || 'application/pdf'

    // Determine prompt based on verification type
    let prompt
    if (type === 'certificate') {
      prompt = `You are a safety certificate verification assistant for a pet minder app registration.

      Check if this document appears to be a legitimate safety or professional certification, such as:
      - DBS Enhanced Disclosure (UK)
      - Animal First Aid Certificate
      - Animal Training/Behavior Certification
      - Safeguarding Level 2 Certificate
      - Animal Welfare Certification
      - Similar professional animal care credentials

      VALID credentials:
      - Official certificates with organization name, certificate number, and dates
      - Professional training certificates
      - Background check documentation
      - Professional licenses in animal care

      INVALID - reject these:
      - Personal documents (resumes, degrees unrelated to animal care)
      - Expired credentials (if clearly past expiry date)
      - Informal or suspicious-looking certificates
      - Documents in wrong format or unreadable

      This is for basic verification - not a professional check.

      Reply in EXACTLY this format and nothing else:
      STATUS: verified
      REASON: one sentence confirming this appears to be a valid safety certificate

      OR if invalid:
      STATUS: unverified
      REASON: one sentence explaining why this does not qualify as a valid certificate`
    } else {
      // identity verification
      prompt = `You are an ID verification assistant for a pet minder app registration.

      Check if this document appears to be a VALID government-issued identification document.

      VALID ID documents include:
      - Government-issued driver's license
      - Passport
      - National ID card
      - State ID card
      - Any official government photo ID

      INVALID - reject these:
      - Personal photos (selfies, family photos)
      - Screenshots of IDs
      - Fake or novelty IDs
      - Expired IDs (if clearly expired)
      - Non-government documents (library cards, gym memberships)
      - Blurry or unreadable documents

      This is for basic fraud prevention - not professional verification.

      Reply in EXACTLY this format and nothing else:
      STATUS: verified
      REASON: one sentence confirming this appears to be a valid government ID

      OR if invalid:
      STATUS: unverified
      REASON: one sentence explaining why this does not qualify as valid ID`
    }

    // Send to Gemini for analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      },
      prompt
    ])

    const responseText = result.response.text()

    // Parse Gemini response
    const statusMatch = responseText.match(/STATUS:\s*(verified|unverified)/i)
    const reasonMatch = responseText.match(/REASON:\s*(.+)/i)

    const status = statusMatch ? statusMatch[1].toLowerCase() : 'unverified'
    const reason = reasonMatch ? reasonMatch[1].trim() : 'Could not determine from document'

    // Save to verification_records with correct type
    const verifiedAt = status === 'verified' ? new Date().toISOString() : null

    await supabase.from('verification_records').insert({
      user_id: userId,
      type: type, // 'identity' or 'certificate'
      status: status,
      document_url: null,
      ai_reason: reason,
      verified_at: verifiedAt
    })

    // Update minder profile only if identity is verified
    if (type === 'identity' && status === 'verified') {
      // Check if user has minder role
      const { data: roleData } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', userId)

      const hasMinderRole = roleData?.some(r => r.role_type === 'minder')

      if (hasMinderRole) {
        await supabase
          .from('minder_profiles')
          .update({ is_verified: true })
          .eq('user_id', userId)
      }
    }

    return Response.json({ status, reason })

  } catch (err) {
    console.error('Document verification error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}