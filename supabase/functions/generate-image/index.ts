import { GoogleGenAI, Modality } from "npm:@google/genai@1.25.0";

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
    const apiKey = Deno.env.get('CZYTAM_GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini API to generate image (same as local version)
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki, przedstawiający tylko i wyłącznie: ${text}. Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] }
    });

    // Extract base64 image from response
    const base64Image = response.candidates[0].content.parts[0].inlineData.data;

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
