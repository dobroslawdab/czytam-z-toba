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
    const apiKey = Deno.env.get('CZYTAM_GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const response = await model.generateContent(`Podziel na sylaby KAŻDE słowo w poniższym zdaniu. Oddziel sylaby za pomocą kropki środkowej (·), np. "KO·T". WSZYSTKIE LITERY MUSZĄ BYĆ WIELKIE (UPPERCASE). Zachowaj znaki interpunkcyjne. Zwróć tylko i wyłącznie zmodyfikowane zdanie. Zdanie: "${text}"`);

    const result = response.response.text().trim().replace(/·/g, '·').toUpperCase();

    return new Response(
      JSON.stringify({ syllabified: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Syllabify error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to syllabify text' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
