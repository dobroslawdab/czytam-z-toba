import { createClient } from '@supabase/supabase-js'
import { LearningSet, Word } from './types';

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