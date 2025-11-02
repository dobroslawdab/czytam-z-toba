-- Migracja: Dodanie opcji dzielenia na sylaby i wyrównania tekstu dla "Moje przygody"
-- Data: 2025-11-02
-- Opis: Dodaje kolumny syllabification_method i text_alignment do tabeli learning_sets

-- Dodaj kolumnę syllabification_method
ALTER TABLE learning_sets
ADD COLUMN IF NOT EXISTS syllabification_method text DEFAULT 'ai' CHECK (syllabification_method IN ('ai', 'manual'));

-- Dodaj kolumnę text_alignment
ALTER TABLE learning_sets
ADD COLUMN IF NOT EXISTS text_alignment text DEFAULT 'left' CHECK (text_alignment IN ('left', 'center', 'right'));

-- Dodaj komentarze do kolumn dla dokumentacji
COMMENT ON COLUMN learning_sets.syllabification_method IS 'Metoda dzielenia na sylaby: ai (automatyczne przez AI) lub manual (bez dzielenia)';
COMMENT ON COLUMN learning_sets.text_alignment IS 'Wyrównanie tekstu: left (do lewej), center (do środka), right (do prawej)';
