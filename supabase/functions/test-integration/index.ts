import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestResult {
  success: boolean
  message: string
  details?: Record<string, any>
}

// Fetch integration settings from config_settings table
async function getIntegrationSettings(
  supabaseClient: any,
  keys: string[]
): Promise<Record<string, any>> {
  const { data, error } = await supabaseClient
    .from('config_settings')
    .select('key, value, data_type')
    .eq('category', 'integrations')
    .in('key', keys)

  if (error) throw new Error(`Failed to read settings: ${error.message}`)

  const settings: Record<string, any> = {}
  for (const row of data || []) {
    let parsed: any = row.value
    if (row.data_type === 'boolean') parsed = row.value === 'true' || row.value === '1'
    else if (row.data_type === 'number') parsed = parseFloat(row.value) || 0
    else if (row.data_type === 'json') {
      try { parsed = JSON.parse(row.value) } catch { /* keep as string */ }
    }
    settings[row.key] = parsed
  }

  // Mode resolution for Stripe
  if (keys.includes('stripe_secret_key') || keys.includes('stripe_publishable_key')) {
    const mode = settings.stripe_mode || 'test'
    const suffix = mode === 'live' ? '_live' : '_test'

    if (!settings.stripe_secret_key && (settings[`stripe_secret_key${suffix}`] || settings[`stripe_secret_key${suffix === '_live' ? '_test' : '_live'}`])) {
      settings.stripe_secret_key = settings[`stripe_secret_key${suffix}`] || settings[`stripe_secret_key${suffix === '_live' ? '_test' : '_live'}`]
    }
    if (!settings.stripe_publishable_key && (settings[`stripe_publishable_key${suffix}`] || settings[`stripe_publishable_key${suffix === '_live' ? '_test' : '_live'}`])) {
      settings.stripe_publishable_key = settings[`stripe_publishable_key${suffix}`] || settings[`stripe_publishable_key${suffix === '_live' ? '_test' : '_live'}`]
    }
  }

  // Mode resolution for Lulu
  if (keys.includes('lulu_client_key') || keys.includes('lulu_client_secret')) {
    const mode = settings.lulu_mode || 'sandbox'
    const suffix = mode === 'production' ? '_production' : '_sandbox'

    if (!settings.lulu_client_key) {
      settings.lulu_client_key = settings[`lulu_client_key${suffix}`] || settings[`lulu_client_key${suffix === '_production' ? '_sandbox' : '_production'}`]
    }
    if (!settings.lulu_client_secret) {
      settings.lulu_client_secret = settings[`lulu_client_secret${suffix}`] || settings[`lulu_client_secret${suffix === '_production' ? '_sandbox' : '_production'}`]
    }
  }

  return settings
}

// Test Stripe connection
async function testStripe(supabaseClient: any): Promise<TestResult> {
  const settings = await getIntegrationSettings(supabaseClient, [
    'stripe_enabled', 'stripe_mode',
    'stripe_secret_key', 'stripe_secret_key_test', 'stripe_secret_key_live',
  ])

  if (!settings.stripe_enabled) {
    return { success: false, message: 'Stripe is not enabled' }
  }

  const secretKey = settings.stripe_secret_key
  if (!secretKey) {
    return { success: false, message: 'Stripe secret key not configured' }
  }

  const response = await fetch('https://api.stripe.com/v1/balance', {
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    return { success: false, message: `Stripe API error: ${response.status}`, details: { error: body } }
  }

  const balance = await response.json()
  return {
    success: true,
    message: `Connected to Stripe (${settings.stripe_mode || 'test'} mode)`,
    details: {
      mode: settings.stripe_mode || 'test',
      available: balance.available,
      pending: balance.pending,
    },
  }
}

// Test Gemini connection
async function testGemini(supabaseClient: any): Promise<TestResult> {
  const settings = await getIntegrationSettings(supabaseClient, [
    'gemini_enabled', 'gemini_api_key',
  ])

  if (!settings.gemini_enabled) {
    return { success: false, message: 'Gemini is not enabled' }
  }

  const apiKey = settings.gemini_api_key
  if (!apiKey) {
    return { success: false, message: 'Gemini API key not configured' }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )

  if (!response.ok) {
    const body = await response.text()
    return { success: false, message: `Gemini API error: ${response.status}`, details: { error: body } }
  }

  const data = await response.json()
  const models = data.models?.slice(0, 5).map((m: any) => m.name) || []

  return {
    success: true,
    message: 'Connected to Google Gemini',
    details: { availableModels: models },
  }
}

// Test Lulu connection (OAuth2 + print-jobs endpoint)
async function testLulu(supabaseClient: any): Promise<TestResult> {
  const settings = await getIntegrationSettings(supabaseClient, [
    'lulu_enabled', 'lulu_mode',
    'lulu_client_key', 'lulu_client_secret',
    'lulu_client_key_sandbox', 'lulu_client_secret_sandbox',
    'lulu_client_key_production', 'lulu_client_secret_production',
  ])

  if (!settings.lulu_enabled) {
    return { success: false, message: 'Lulu is not enabled' }
  }

  const clientKey = settings.lulu_client_key
  const clientSecret = settings.lulu_client_secret
  if (!clientKey || !clientSecret) {
    return { success: false, message: 'Lulu client credentials not configured' }
  }

  const mode = settings.lulu_mode || 'sandbox'
  const apiUrl = mode === 'production'
    ? 'https://api.lulu.com'
    : 'https://api.sandbox.lulu.com'

  // Get OAuth2 token
  const credentials = btoa(`${clientKey}:${clientSecret}`)
  const tokenResponse = await fetch(
    `${apiUrl}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }
  )

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    return {
      success: false,
      message: `Lulu auth failed: ${tokenResponse.status}`,
      details: { error: errorText, environment: mode },
    }
  }

  const tokenData = await tokenResponse.json()

  // Test API with print-jobs list
  const jobsResponse = await fetch(`${apiUrl}/print-jobs/`, {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!jobsResponse.ok) {
    const errorText = await jobsResponse.text()
    return {
      success: false,
      message: `Lulu API error: ${jobsResponse.status}`,
      details: { error: errorText, environment: mode },
    }
  }

  const jobsData = await jobsResponse.json()

  return {
    success: true,
    message: `Connected to Lulu (${mode})`,
    details: {
      environment: mode,
      apiUrl,
      totalPrintJobs: jobsData.count ?? (jobsData.results?.length || 0),
    },
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { integration } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let result: TestResult

    switch (integration) {
      case 'stripe':
        result = await testStripe(supabaseClient)
        break
      case 'lulu':
        result = await testLulu(supabaseClient)
        break
      case 'gemini':
        result = await testGemini(supabaseClient)
        break
      default:
        result = { success: false, message: `Unknown integration: ${integration}` }
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[test-integration] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      message: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
