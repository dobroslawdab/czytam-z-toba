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

    // Call Gemini API to generate booklet image (same as local version)
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki ilustrujący zdanie: "${sentence}". Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku. ${characterImageBase64 ? 'Użyj postaci z referencyjnego obrazka.' : ''}`;

    const parts = [{ text: prompt }];

    // Add reference image if provided
    if (characterImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: characterImageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] }
    });

    // Extract base64 image from response
    const base64Image = response.candidates[0].content.parts[0].inlineData.data;

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
