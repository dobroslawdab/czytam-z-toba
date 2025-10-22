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
      console.error('API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating image for text: "${text}"`);

    // Call Gemini API to generate image
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki, przedstawiający tylko i wyłącznie: ${text}. Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] }
    });

    // Validate response structure
    if (!response) {
      throw new Error('Empty response from Gemini API');
    }

    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates in response:', JSON.stringify(response));
      throw new Error('No image candidates generated');
    }

    const candidate = response.candidates[0];
    if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
      console.error('Invalid candidate structure:', JSON.stringify(candidate));
      throw new Error('Invalid response structure from Gemini API');
    }

    const part = candidate.content.parts[0];
    if (!part?.inlineData?.data) {
      console.error('No inline data in response part:', JSON.stringify(part));
      throw new Error('No image data in response');
    }

    const base64Image = part.inlineData.data;
    console.log(`Successfully generated image, size: ${base64Image.length} chars`);

    return new Response(
      JSON.stringify({ base64Image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Image generation error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate image',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
