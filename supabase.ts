import { createClient } from '@supabase/supabase-js'
import { LearningSet, Word } from './types';

// WAŻNE: Uzupełnij poniższe dane swoimi kluczami z pulpitu Supabase
// Wejdź w Settings -> API w swoim projekcie Supabase.
const supabaseUrl = 'https://qxjudardrlbxqxlvpdvl.supabase.co'; // Twój Project URL

// !!! IMPORTANT: You must replace this placeholder with your own Supabase anon key!
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4anVkYXJkcmxieHF4bHZwZHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjAzOTksImV4cCI6MjA1NTczNjM5OX0.TRXr8XW14w24qE7jmNsjqf-IUfdCpdU-10KMZiQiDv4'; // Twój Project API Key (anon public)


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
// RETRY UTILITY
// ============================================

/**
 * Retry a function with exponential backoff
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param onRetry - Callback called on each retry attempt
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    onRetry?: (attempt: number, maxRetries: number) => void
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1 && onRetry) {
                onRetry(attempt, maxRetries);
            }
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable (timeout, network error, etc)
            const isRetryable =
                error.message?.toLowerCase().includes('timeout') ||
                error.message?.toLowerCase().includes('fetch') ||
                error.status === 504 ||
                error.status === 524 ||
                error.message?.toLowerCase().includes('earlydrop') ||
                error.message?.toLowerCase().includes('network');

            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

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
 * Divide text into syllables using Supabase Edge Function
 * @param text - The sentence to syllabify
 * @returns Syllabified text with middle dots in UPPERCASE (e.g., "FO·KA PLY·WA")
 */
export const syllabifyText = async (text: string): Promise<string> => {
    try {
        const { data, error } = await supabase.functions.invoke('syllabify-text', {
            body: { text }
        });

        if (error) throw error;
        if (!data?.syllabified) throw new Error('Invalid response from syllabify function');

        return data.syllabified;
    } catch (err: any) {
        console.error('Syllabify text error:', err);
        throw new Error(err.message || 'Nie udało się podzielić tekstu na sylaby');
    }
};

/**
 * Generate image using Supabase Edge Function
 * @param text - The word to generate image for
 * @param customPrompt - Optional custom prompt for image generation
 * @param onRetry - Optional retry callback
 * @returns Base64 image data
 */
export const generateImage = async (
    text: string,
    customPrompt?: string,
    onRetry?: (attempt: number, maxRetries: number) => void
): Promise<string> => {
    return retryWithBackoff(async () => {
        console.log(`Calling generate-image Edge Function for: "${text}"`);
        if (customPrompt) {
            console.log(`Using custom prompt: "${customPrompt}"`);
        }

        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { text, customPrompt }
        });

        if (error) {
            console.error('Edge Function error:', {
                message: error.message,
                status: error.status,
                details: error
            });
            throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
        }

        if (!data) {
            console.error('Empty response from Edge Function');
            throw new Error('Empty response from generate-image function');
        }

        if (!data.base64Image) {
            console.error('Invalid response structure:', data);
            if (data.error) {
                throw new Error(`Gemini API error: ${data.error}${data.details ? ` (${data.details})` : ''}`);
            }
            throw new Error('Invalid response from generate-image function');
        }

        console.log(`Successfully received image, size: ${data.base64Image.length} chars`);
        return data.base64Image;
    }, 3, onRetry);
};

/**
 * Generate sentences using Supabase Edge Function
 * @param words - Array of words to base sentences on
 * @returns Object with sentences array
 */
export const generateSentences = async (words: string[]): Promise<{ sentences: string[] }> => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-sentences', {
            body: { words }
        });

        if (error) throw error;
        if (!data?.sentences) throw new Error('Invalid response from generate-sentences function');

        return data;
    } catch (err: any) {
        console.error('Generate sentences error:', err);
        throw new Error(err.message || 'Nie udało się wygenerować zdań');
    }
};

/**
 * Generate booklet image using Supabase Edge Function
 * @param sentence - The sentence to illustrate
 * @param characterImageBase64 - Optional base64 image of main character
 * @param customPrompt - Optional custom prompt for image generation
 * @param onRetry - Optional retry callback
 * @returns Base64 image data
 */
export const generateBookletImage = async (
    sentence: string,
    characterImageBase64?: string,
    customPrompt?: string,
    onRetry?: (attempt: number, maxRetries: number) => void
): Promise<string> => {
    return retryWithBackoff(async () => {
        console.log(`Calling generate-booklet-image Edge Function for: "${sentence}"`);
        if (customPrompt) {
            console.log(`Using custom prompt: "${customPrompt}"`);
        }

        const { data, error } = await supabase.functions.invoke('generate-booklet-image', {
            body: { sentence, characterImageBase64, customPrompt }
        });

        if (error) {
            console.error('Edge Function error:', {
                message: error.message,
                status: error.status,
                details: error
            });
            throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
        }

        if (!data) {
            console.error('Empty response from Edge Function');
            throw new Error('Empty response from generate-booklet-image function');
        }

        if (!data.base64Image) {
            console.error('Invalid response structure:', data);
            if (data.error) {
                throw new Error(`Gemini API error: ${data.error}${data.details ? ` (${data.details})` : ''}`);
            }
            throw new Error('Invalid response from generate-booklet-image function');
        }

        console.log(`Successfully received booklet image, size: ${data.base64Image.length} chars`);
        return data.base64Image;
    }, 3, onRetry);
};