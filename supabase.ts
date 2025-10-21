import { createClient } from '@supabase/supabase-js'
import { LearningSet, Word } from './types';
import { GoogleGenAI } from "@google/genai";

// WAŻNE: Uzupełnij poniższe dane swoimi kluczami z pulpitu Supabase
// Wejdź w Settings -> API w swoim projekcie Supabase.
const supabaseUrl = 'https://qxjudardrlbxqxlvpdvl.supabase.co'; // Twój Project URL

// !!! IMPORTANT: You must replace this placeholder with your own Supabase anon key!
const supabaseAnonKey = 'sb_publishable_-CzdBZ-Vfw6T1SsVoCak3A_60Ovw70o'; // Twój Project API Key (anon public)


if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'TWOJ_KLUCZ_ANON') {
    const errorMessage = "Brak kluczy Supabase. Uzupełnij je w pliku supabase.ts. Aplikacja nie będzie działać poprawnie. / Supabase keys are missing. Please fill them in supabase.ts. The app will not work correctly.";
    // This error will be visible in the developer console.
    console.error(errorMessage);
}

export const supabase = createClient<({
    public: {
        Tables: {
            learning_sets: {
                Row: LearningSet;
                Insert: LearningSet;
                Update: Partial<LearningSet>
            };
            words: {
                Row: Word;
                Insert: Omit<Word, 'id' | 'created_at'>;
                Update: Partial<Omit<Word, 'id' | 'created_at'>>;
            }
        }
    }
})>(supabaseUrl, supabaseAnonKey);

// ============================================
// WORDS CRUD Functions
// ============================================

export const fetchWords = async () => {
    const { data, error } = await supabase
        .from('words')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createWord = async (word: Omit<Word, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('words')
        .insert(word)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateWord = async (id: number, updates: Partial<Omit<Word, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteWord = async (id: number) => {
    const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================
// IMAGE UPLOAD Functions
// ============================================

/**
 * Upload generated AI image to Supabase Storage
 * @param base64Data - Base64 encoded image data (without data:image/png;base64, prefix)
 * @param wordText - The word text (used for filename)
 * @returns Public URL of the uploaded image
 */
export const uploadWordImage = async (base64Data: string, wordText: string): Promise<string> => {
    try {
        // Convert base64 to Blob
        const base64Response = await fetch(`data:image/png;base64,${base64Data}`);
        const blob = await base64Response.blob();

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedWordText = wordText.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const fileName = `words/${timestamp}-${sanitizedWordText}.png`;

        // Upload to Supabase Storage bucket 'set_images'
        const { data, error } = await supabase.storage
            .from('set_images')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            throw new Error(`Nie udało się zapisać obrazka: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('set_images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err: any) {
        console.error('Upload word image error:', err);
        throw new Error(err.message || 'Nie udało się przesłać obrazka do storage');
    }
};

/**
 * Upload booklet sentence image to Supabase Storage
 * @param imageDataUrl - Full data URL (data:image/png;base64,...)
 * @param sentenceText - The sentence text (used for filename)
 * @returns Public URL of the uploaded image
 */
export const uploadBookletImage = async (imageDataUrl: string, sentenceText: string): Promise<string> => {
    try {
        // Convert data URL to Blob
        const base64Response = await fetch(imageDataUrl);
        const blob = await base64Response.blob();

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedText = sentenceText.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
        const fileName = `public/${timestamp}-${sanitizedText}.png`;

        // Upload to Supabase Storage bucket 'set_images'
        const { data, error } = await supabase.storage
            .from('set_images')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            throw new Error(`Nie udało się zapisać obrazka: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('set_images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err: any) {
        console.error('Upload booklet image error:', err);
        throw new Error(err.message || 'Nie udało się przesłać obrazka do storage');
    }
};

// ============================================
// AI SYLLABIFICATION Function
// ============================================

/**
 * Divide text into syllables using AI
 * @param text - The sentence to syllabify
 * @returns Syllabified text with middle dots in UPPERCASE (e.g., "FO·KA PLY·WA")
 */
export const syllabifyText = async (text: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Podziel na sylaby KAŻDE słowo w poniższym zdaniu. Oddziel sylaby za pomocą kropki środkowej (·), np. "KO·T". WSZYSTKIE LITERY MUSZĄ BYĆ WIELKIE (UPPERCASE). Zachowaj znaki interpunkcyjne. Zwróć tylko i wyłącznie zmodyfikowane zdanie. Zdanie: "${text}"`,
        });

        const result = response.text.trim().replace(/·/g, '·').toUpperCase();
        return result;
    } catch (err: any) {
        console.error('Syllabify text error:', err);
        throw new Error(err.message || 'Nie udało się podzielić tekstu na sylaby');
    }
};