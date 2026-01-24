// Environment variables for both sandbox and production
const LULU_SANDBOX_CLIENT_KEY = Deno.env.get('LULU_SANDBOX_CLIENT_KEY')
const LULU_SANDBOX_CLIENT_SECRET = Deno.env.get('LULU_SANDBOX_CLIENT_SECRET')
const LULU_PRODUCTION_CLIENT_KEY = Deno.env.get('LULU_PRODUCTION_CLIENT_KEY')
const LULU_PRODUCTION_CLIENT_SECRET = Deno.env.get('LULU_PRODUCTION_CLIENT_SECRET')
const LULU_USE_SANDBOX = Deno.env.get('LULU_USE_SANDBOX') // "true" or "false"

const SANDBOX_API_URL = 'https://api.sandbox.lulu.com'
const PRODUCTION_API_URL = 'https://api.lulu.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LuluTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface LuluConfig {
  clientKey: string
  clientSecret: string
  apiUrl: string
  environment: 'sandbox' | 'production'
}

// Get the appropriate Lulu configuration based on environment
function getLuluConfig(): LuluConfig {
  const useSandbox = LULU_USE_SANDBOX !== 'false' // Default to sandbox if not explicitly set to "false"

  if (useSandbox) {
    if (!LULU_SANDBOX_CLIENT_KEY || !LULU_SANDBOX_CLIENT_SECRET) {
      throw new Error('Missing sandbox credentials: LULU_SANDBOX_CLIENT_KEY and/or LULU_SANDBOX_CLIENT_SECRET')
    }
    return {
      clientKey: LULU_SANDBOX_CLIENT_KEY,
      clientSecret: LULU_SANDBOX_CLIENT_SECRET,
      apiUrl: SANDBOX_API_URL,
      environment: 'sandbox',
    }
  } else {
    if (!LULU_PRODUCTION_CLIENT_KEY || !LULU_PRODUCTION_CLIENT_SECRET) {
      throw new Error('Missing production credentials: LULU_PRODUCTION_CLIENT_KEY and/or LULU_PRODUCTION_CLIENT_SECRET')
    }
    return {
      clientKey: LULU_PRODUCTION_CLIENT_KEY,
      clientSecret: LULU_PRODUCTION_CLIENT_SECRET,
      apiUrl: PRODUCTION_API_URL,
      environment: 'production',
    }
  }
}

// Get OAuth2 bearer token from Lulu
async function getLuluAccessToken(config: LuluConfig): Promise<string> {
  const credentials = btoa(`${config.clientKey}:${config.clientSecret}`)

  const response = await fetch(
    `${config.apiUrl}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[test-lulu] Failed to get access token:', response.status, errorText)
    throw new Error(`Failed to get Lulu access token: ${response.status} ${errorText}`)
  }

  const data: LuluTokenResponse = await response.json()
  console.log('[test-lulu] Got access token, expires in:', data.expires_in, 'seconds')
  return data.access_token
}

// Get print jobs to verify API connection (returns empty array if no jobs)
async function getPrintJobs(config: LuluConfig, accessToken: string): Promise<unknown> {
  const response = await fetch(
    `${config.apiUrl}/print-jobs/`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[test-lulu] Failed to get print jobs:', response.status, errorText)
    throw new Error(`Failed to get print jobs: ${response.status} ${errorText}`)
  }

  return response.json()
}

Deno.serve(async (req) => {
  console.log('[test-lulu] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Allow GET for easy testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get configuration based on environment
    const config = getLuluConfig()
    console.log(`[test-lulu] Using ${config.environment} environment: ${config.apiUrl}`)

    console.log('[test-lulu] Getting Lulu access token...')
    const accessToken = await getLuluAccessToken(config)
    console.log('[test-lulu] Access token obtained successfully')

    console.log('[test-lulu] Fetching print jobs...')
    const printJobsResponse = await getPrintJobs(config, accessToken)
    console.log('[test-lulu] Print jobs retrieved successfully')

    // The response is typically { results: [], count: 0 } for print jobs
    const responseData = printJobsResponse as { results?: unknown[]; count?: number }
    const results = responseData.results || []
    const preview = results.slice(0, 5) // Return first 5 items as preview

    return new Response(JSON.stringify({
      success: true,
      message: 'Lulu API connection successful',
      environment: config.environment,
      apiUrl: config.apiUrl,
      totalPrintJobs: responseData.count ?? results.length,
      preview: preview,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[test-lulu] Error:', error)

    // Try to get environment info even on error
    let environment: string | undefined
    let apiUrl: string | undefined
    try {
      const config = getLuluConfig()
      environment = config.environment
      apiUrl = config.apiUrl
    } catch {
      // Config itself failed, include that in error
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to connect to Lulu API',
      environment,
      apiUrl,
      details: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
