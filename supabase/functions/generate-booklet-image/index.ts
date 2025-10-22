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

    console.log(`Generating booklet image for sentence: "${sentence}"`);

    // Call Gemini API to generate booklet image
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
      model: 'gemini-2.5-flash-image',
      contents: { parts },
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
    console.log(`Successfully generated booklet image, size: ${base64Image.length} chars`);

    return new Response(
      JSON.stringify({ base64Image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Booklet image generation error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate booklet image',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
