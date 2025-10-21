# Wdrożenie Supabase Edge Functions

Ten przewodnik pokazuje jak wdrożyć Edge Functions do Supabase, aby aplikacja działała bezpiecznie na Vercel.

## Dlaczego Edge Functions?

Klucze API (Gemini) nie mogą być bezpiecznie przechowywane w kodzie frontendowym. Edge Functions działają po stronie serwera Supabase, więc klucze są bezpieczne.

## Krok 1: Zainstaluj Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

Sprawdź instalację:
```bash
supabase --version
```

## Krok 2: Zaloguj się do Supabase

```bash
supabase login
```

To otworzy przeglądarkę do autoryzacji.

## Krok 3: Połącz projekt

Najpierw zainicjuj projekt lokalnie:

```bash
cd /Users/uxellenceuxe/czytam-z-tobą
supabase init
```

Następnie połącz z projektem na Supabase:

```bash
supabase link --project-ref qxjudardrlbxqxlvpdvl
```

(`qxjudardrlbxqxlvpdvl` to ID Twojego projektu z URL: https://qxjudardrlbxqxlvpdvl.supabase.co)

## Krok 4: Ustaw zmienne środowiskowe w Supabase

W panelu Supabase:

1. Wejdź do **Project Settings** → **Edge Functions**
2. Dodaj **Secret** (zmienną środowiskową):
   - **Name**: `CZYTAM_GEMINI_API_KEY`
   - **Value**: Twój klucz API Google Gemini

## Krok 5: Wdróż Edge Functions

Wdróż wszystkie 4 funkcje:

```bash
# Z katalogu głównego projektu
supabase functions deploy syllabify-text
supabase functions deploy generate-image
supabase functions deploy generate-sentences
supabase functions deploy generate-booklet-image
```

Lub wdróż wszystkie naraz:

```bash
supabase functions deploy --no-verify-jwt
```

## Krok 6: Sprawdź wdrożenie

W panelu Supabase:

1. Przejdź do **Edge Functions** w menu bocznym
2. Powinieneś zobaczyć 4 funkcje:
   - `syllabify-text`
   - `generate-image`
   - `generate-sentences`
   - `generate-booklet-image`

## Krok 7: Wdróż aplikację na Vercel

Teraz możesz bezpiecznie wdrożyć aplikację na Vercel:

```bash
# Zainstaluj Vercel CLI jeśli nie masz
npm i -g vercel

# Wdróż
vercel
```

Lub po prostu:
- Wypchnij zmiany do GitHub
- Vercel automatycznie zbuduje i wdro ży aplikację

## Testowanie lokalnie

Jeśli chcesz przetestować Edge Functions lokalnie:

```bash
# Uruchom Supabase lokalnie
supabase start

# Ustaw zmienne środowiskowe lokalnie
supabase secrets set GEMINI_API_KEY=twoj_klucz_api

# Funkcje będą dostępne na http://localhost:54321/functions/v1/
```

## Rozwiązywanie problemów

### Błąd: "API key not configured"

Upewnij się, że ustawiłeś `CZYTAM_GEMINI_API_KEY` w sekcji Edge Functions → Secrets w panelu Supabase.

### Błąd CORS

Edge Functions mają już skonfigurowane CORS headers. Jeśli nadal widzisz błędy CORS, sprawdź czy wywołujesz funkcje przez `supabase.functions.invoke()`.

### Funkcje nie działają

Sprawdź logi funkcji w panelu Supabase:
- Przejdź do **Edge Functions**
- Kliknij na funkcję
- Zobacz logi w zakładce **Logs**

## URLs Edge Functions

Po wdrożeniu, funkcje będą dostępne pod adresami:
- `https://qxjudardrlbxqxlvpdvl.supabase.co/functions/v1/syllabify-text`
- `https://qxjudardrlbxqxlvpdvl.supabase.co/functions/v1/generate-image`
- `https://qxjudardrlbxqxlvpdvl.supabase.co/functions/v1/generate-sentences`
- `https://qxjudardrlbxqxlvpdvl.supabase.co/functions/v1/generate-booklet-image`

Ale **NIE wywołuj ich bezpośrednio** - używaj `supabase.functions.invoke()` w kodzie!

## Gotowe!

Aplikacja teraz bezpiecznie używa Edge Functions do generowania obrazków i syllabifikacji. Klucz API Gemini jest chroniony po stronie serwera.
