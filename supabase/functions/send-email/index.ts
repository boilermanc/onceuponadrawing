const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  template_key: string
  recipient_email: string
  variables: Record<string, string>
  // Optional linking to related records
  user_id?: string
  book_order_id?: string
}

// Replace template variables with actual values
function processTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return result
}

async function sendResendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ id: string }> {
  console.log('[send-email] Calling Resend API for:', params.to)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Once Upon a Drawing <team@sproutify.app>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[send-email] Resend API error:', response.status, errorText)
    throw new Error(`Resend API error: ${errorText}`)
  }

  const result = await response.json()
  console.log('[send-email] Resend response:', result)
  return result
}

async function fetchTemplate(templateKey: string): Promise<{
  subject: string
  html_body: string
  plain_text_body: string | null
} | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/email_templates?template_key=eq.${templateKey}&is_active=eq.true&select=subject,html_body,plain_text_body`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )

  if (!response.ok) {
    console.error('[send-email] Failed to fetch template:', response.status)
    return null
  }

  const templates = await response.json()
  return templates[0] || null
}

async function logEmail(params: {
  template_key: string
  recipient_email: string
  subject: string
  variables_used: Record<string, string>
  resend_message_id: string | null
  status: 'sent' | 'failed'
  error_message?: string
  user_id?: string
  book_order_id?: string
}) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        template_key: params.template_key,
        recipient_email: params.recipient_email,
        subject: params.subject,
        variables_used: params.variables_used,
        resend_message_id: params.resend_message_id,
        status: params.status,
        error_message: params.error_message || null,
        user_id: params.user_id || null,
        book_order_id: params.book_order_id || null,
      }),
    })
    console.log('[send-email] Email logged successfully')
  } catch (err) {
    console.error('[send-email] Failed to log email:', err)
  }
}

Deno.serve(async (req) => {
  console.log('[send-email] Request received:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: SendEmailRequest = await req.json()
    console.log('[send-email] Template:', body.template_key, 'To:', body.recipient_email)

    // Validate required fields
    if (!body.template_key || !body.recipient_email || !body.variables) {
      return new Response(JSON.stringify({ error: 'Missing required fields: template_key, recipient_email, variables' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch email template
    const template = await fetchTemplate(body.template_key)

    if (!template) {
      console.error('[send-email] Template not found:', body.template_key)
      return new Response(JSON.stringify({ error: 'Template not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Process template with variables
    const subject = processTemplate(template.subject, body.variables)
    const htmlBody = processTemplate(template.html_body, body.variables)
    const textBody = template.plain_text_body
      ? processTemplate(template.plain_text_body, body.variables)
      : undefined

    // Send email via Resend
    console.log('[send-email] Sending email via Resend...')
    let resendResult: { id: string } | null = null
    let sendError: string | null = null

    try {
      resendResult = await sendResendEmail({
        to: body.recipient_email,
        subject,
        html: htmlBody,
        text: textBody,
      })
      console.log('[send-email] Email sent, Resend ID:', resendResult.id)
    } catch (err) {
      sendError = String(err)
      console.error('[send-email] Failed to send:', sendError)
    }

    // Log the email send attempt
    await logEmail({
      template_key: body.template_key,
      recipient_email: body.recipient_email,
      subject,
      variables_used: body.variables,
      resend_message_id: resendResult?.id || null,
      status: resendResult ? 'sent' : 'failed',
      error_message: sendError || undefined,
      user_id: body.user_id,
      book_order_id: body.book_order_id,
    })

    if (sendError) {
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: sendError,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: resendResult?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[send-email] Error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to process email request',
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
