import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeaturedCreation {
  id: string;
  title: string;
  artist_name: string | null;
  artist_age: string | null;
  featured_thumbnail_url: string | null;
  featured_pages: string[] | null;
  featured_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 6;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid limit parameter. Must be between 1 and 50.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query featured creations
    const { data, error } = await supabase
      .from('creations')
      .select('id, title, artist_name, artist_age, featured_thumbnail_url, featured_pages, featured_at')
      .eq('is_featured', true)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('featured_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch featured creations', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return featured creations
    return new Response(
      JSON.stringify({ creations: data || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
