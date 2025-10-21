import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sentence, characterImageBase64 } = await req.json();

    if (!sentence || typeof sentence !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Sentence parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment variables
    const apiKey = Deno.env.get('CZYTAM_GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gemini 2.0 doesn't support image generation directly
    // For now, return error - need to implement Imagen API
    throw new Error('Booklet image generation requires Imagen API - not yet implemented');

    return new Response(
      JSON.stringify({ base64Image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Booklet image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate booklet image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
