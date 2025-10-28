export interface Word {
  id?: number; // Optional for new words, assigned by Supabase
  created_at?: string;
  text: string;
  image_url: string; // Changed from 'image' to match Supabase column name
  category: string;
  syllables: string[];
}

export enum SetType {
  PictureCards = 'Karty obrazkowe',
  Booklet = 'Książeczka',
  Analysis = 'Karty do analizy',
  Comparison = 'Karty porównawcze',
}

export interface LearningSet {
  id?: number; // ID is now optional, as it's assigned by Supabase
  created_at?: string;
  name: string;
  type: SetType;
  wordIds: string[];
  sentences?: { text: string; image_url?: string; syllables?: string }[];
}

export interface ChildProfile {
  id: string;
  name: string;
  knownWordIds: string[];
}

export enum View {
  Dashboard,
  SetCreator,
  LearningSession,
  MethodGuide,
  ProgressJournal,
  WordLibrary,
}

export enum LearningMode {
    CardShow = "Pokaz kart",
    Booklet = "Książeczka",
    BookletDiscovery = "Książeczka 2.0 - Odkrywanie",
    SyllablesInMotion = "Sylaby w ruchu",
    CompareWords = "Porównaj słowa",
    Memory = "Memory",
}

export type MemoryVariant = 'word-word' | 'image-word';

export type ActiveSession = {
    set: LearningSet;
    mode: LearningMode;
    memoryVariant?: MemoryVariant;
}