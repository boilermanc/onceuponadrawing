/**
 * Manage Lulu Webhooks
 *
 * Admin function to register, list, and test Lulu webhooks
 *
 * Endpoints:
 * - GET: List all webhooks
 * - POST { action: 'register', callback_url: string }: Register new webhook
 * - POST { action: 'test', webhook_id: number }: Test webhook delivery
 * - DELETE { webhook_id: number }: Delete webhook
 */

const LULU_SANDBOX_CLIENT_KEY = Deno.env.get('LULU_SANDBOX_CLIENT_KEY')!;
const LULU_SANDBOX_CLIENT_SECRET = Deno.env.get('LULU_SANDBOX_CLIENT_SECRET')!;
const LULU_PRODUCTION_CLIENT_KEY = Deno.env.get('LULU_PRODUCTION_CLIENT_KEY')!;
const LULU_PRODUCTION_CLIENT_SECRET = Deno.env.get('LULU_PRODUCTION_CLIENT_SECRET')!;
const LULU_USE_SANDBOX = Deno.env.get('LULU_USE_SANDBOX');

const SANDBOX_API_URL = 'https://api.sandbox.lulu.com';
const PRODUCTION_API_URL = 'https://api.lulu.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LuluConfig {
  clientKey: string;
  clientSecret: string;
  apiUrl: string;
  environment: 'sandbox' | 'production';
}

function getLuluConfig(): LuluConfig {
  const useSandbox = LULU_USE_SANDBOX !== 'false';

  if (useSandbox) {
    if (!LULU_SANDBOX_CLIENT_KEY || !LULU_SANDBOX_CLIENT_SECRET) {
      throw new Error('Missing sandbox credentials');
    }
    return {
      clientKey: LULU_SANDBOX_CLIENT_KEY,
      clientSecret: LULU_SANDBOX_CLIENT_SECRET,
      apiUrl: SANDBOX_API_URL,
      environment: 'sandbox',
    };
  } else {
    if (!LULU_PRODUCTION_CLIENT_KEY || !LULU_PRODUCTION_CLIENT_SECRET) {
      throw new Error('Missing production credentials');
    }
    return {
      clientKey: LULU_PRODUCTION_CLIENT_KEY,
      clientSecret: LULU_PRODUCTION_CLIENT_SECRET,
      apiUrl: PRODUCTION_API_URL,
      environment: 'production',
    };
  }
}

async function getLuluAccessToken(config: LuluConfig): Promise<string> {
  const credentials = btoa(`${config.clientKey}:${config.clientSecret}`);

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
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// List all webhooks
async function listWebhooks(config: LuluConfig, accessToken: string) {
  const response = await fetch(`${config.apiUrl}/webhooks/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list webhooks: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Register a new webhook
async function registerWebhook(config: LuluConfig, accessToken: string, callbackUrl: string) {
  const response = await fetch(`${config.apiUrl}/webhooks/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: callbackUrl,
      topics: ['PRINT_JOB_STATUS_CHANGED'],
      is_active: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to register webhook: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Delete a webhook
async function deleteWebhook(config: LuluConfig, accessToken: string, webhookId: number) {
  const response = await fetch(`${config.apiUrl}/webhooks/${webhookId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete webhook: ${response.status} ${errorText}`);
  }

  return { success: true, deleted: webhookId };
}

// Test webhook delivery - Note: Lulu may not support test submissions in sandbox
async function testWebhook(config: LuluConfig, accessToken: string, webhookId: number) {
  // Try the documented endpoint first
  const response = await fetch(`${config.apiUrl}/webhooks/${webhookId}/test/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    // Test endpoint may not be available - return helpful message
    return {
      message: 'Test endpoint not available. Your webhook is registered and will receive real order status updates when orders are processed.',
      webhookId,
      note: 'To test, place a test order through your site.'
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to test webhook: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get recent webhook submissions (for debugging)
async function getWebhookSubmissions(config: LuluConfig, accessToken: string, webhookId?: number) {
  let url = `${config.apiUrl}/webhook-submissions/`;
  if (webhookId) {
    url += `?webhook_id=${webhookId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get submissions: ${response.status} ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  console.log('[manage-lulu-webhooks] Request:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const config = getLuluConfig();
    console.log(`[manage-lulu-webhooks] Using ${config.environment} environment`);

    const accessToken = await getLuluAccessToken(config);
    console.log('[manage-lulu-webhooks] Access token obtained');

    // GET - List webhooks
    if (req.method === 'GET') {
      const webhooks = await listWebhooks(config, accessToken);
      const submissions = await getWebhookSubmissions(config, accessToken);

      return new Response(JSON.stringify({
        success: true,
        environment: config.environment,
        apiUrl: config.apiUrl,
        webhooks: webhooks.results || webhooks,
        recentSubmissions: submissions.results?.slice(0, 10) || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Register or test webhook
    if (req.method === 'POST') {
      const body = await req.json();
      const { action, callback_url, webhook_id } = body;

      if (action === 'register') {
        if (!callback_url) {
          throw new Error('callback_url is required');
        }
        console.log('[manage-lulu-webhooks] Registering webhook:', callback_url);
        const result = await registerWebhook(config, accessToken, callback_url);

        return new Response(JSON.stringify({
          success: true,
          message: 'Webhook registered successfully',
          webhook: result,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'test') {
        if (!webhook_id) {
          throw new Error('webhook_id is required');
        }
        console.log('[manage-lulu-webhooks] Testing webhook:', webhook_id);
        const result = await testWebhook(config, accessToken, webhook_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Test webhook sent',
          result,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unknown action: ${action}`);
    }

    // DELETE - Remove webhook
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { webhook_id } = body;

      if (!webhook_id) {
        throw new Error('webhook_id is required');
      }

      console.log('[manage-lulu-webhooks] Deleting webhook:', webhook_id);
      const result = await deleteWebhook(config, accessToken, webhook_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook deleted',
        result,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[manage-lulu-webhooks] Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
