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
    const { words } = await req.json();

    if (!words || !Array.isArray(words)) {
      return new Response(
        JSON.stringify({ error: 'Words array is required' }),
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

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              description: 'Tablica 3 prostych zdań dla dzieci.',
              items: { type: "string" }
            }
          }
        },
      },
    });

    const response = await model.generateContent(`Jesteś asystentem tworzącym materiały edukacyjne dla dzieci uczących się czytać. Na podstawie podanej listy słów, utwórz 3 proste, krótkie zdania. Każde zdanie powinno być odpowiednie dla małego dziecka i składać się głównie z podanych słów. Słowa: ${words.join(', ')}.`);

    const jsonResponse = JSON.parse(response.response.text());

    return new Response(
      JSON.stringify(jsonResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sentence generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate sentences' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
