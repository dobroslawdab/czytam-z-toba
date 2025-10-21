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
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment variables
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini API to generate image
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki, przedstawiający tylko i wyłącznie: ${text}. Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku.`;

    const response = await model.generateContent(prompt);

    // Gemini 2.0 doesn't support image generation directly, use Imagen instead
    // For now, return error - need to implement Imagen API
    throw new Error('Image generation requires Imagen API - not yet implemented');

    return new Response(
      JSON.stringify({ base64Image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
