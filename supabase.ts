import { createClient } from '@supabase/supabase-js'
import { LearningSet } from './types';

// WAŻNE: Uzupełnij poniższe dane swoimi kluczami z pulpitu Supabase
// Wejdź w Settings -> API w swoim projekcie Supabase.
const supabaseUrl = 'https://qxjudardrlbxqxlvpdvl.supabase.co'; // Twój Project URL

// !!! IMPORTANT: You must replace this placeholder with your own Supabase anon key!
const supabaseAnonKey = 'TWOJ_KLUCZ_ANON'; // Twój Project API Key (anon public)


if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'TWOJ_KLUCZ_ANON') {
    const errorMessage = "Brak kluczy Supabase. Uzupełnij je w pliku supabase.ts. Aplikacja nie będzie działać poprawnie. / Supabase keys are missing. Please fill them in supabase.ts. The app will not work correctly.";
    // This error will be visible in the developer console.
    console.error(errorMessage);
}

export const supabase = createClient<({ public: { Tables: { learning_sets: { Row: LearningSet; Insert: LearningSet; Update: Partial<LearningSet> } } } })>(supabaseUrl, supabaseAnonKey);