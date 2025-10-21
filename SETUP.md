# 🚀 Instrukcja konfiguracji - Czytam z Tobą

## ✅ Status inicjalizacji

- ✅ Git repository zainicjalizowane
- ✅ Zależności npm zainstalowane (101 pakietów)
- ✅ Initial commit utworzony

## ⚙️ Wymagana konfiguracja

### 1. **Gemini API Key**

**Plik:** `.env.local`

```bash
GEMINI_API_KEY=TWOJ_KLUCZ_GEMINI_API
```

**Gdzie pobrać klucz?**
- Wejdź na: https://ai.google.dev/
- Zaloguj się kontem Google
- Utwórz nowy API key
- Skopiuj klucz i wklej do `.env.local`

---

### 2. **Supabase Configuration**

**Plik:** `supabase.ts`

```typescript
const supabaseUrl = 'https://qxjudardrlbxqxlvpdvl.supabase.co'; // ✅ Już ustawione
const supabaseAnonKey = 'TWOJ_KLUCZ_ANON'; // ❌ WYMAGANE - uzupełnij!
```

**Gdzie pobrać klucze?**
1. Wejdź na: https://supabase.com/dashboard
2. Wybierz projekt: `qxjudardrlbxqxlvpdvl`
3. Przejdź do: **Settings → API**
4. Skopiuj: **Project API keys → anon / public**
5. Wklej do `supabase.ts`

---

### 3. **Struktura bazy danych Supabase**

Upewnij się, że w projekcie Supabase istnieje tabela `learning_sets`:

```sql
CREATE TABLE learning_sets (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  wordIds TEXT[] NOT NULL,
  sentences JSONB
);
```

**Jak dodać tabelę?**
1. Supabase Dashboard → **SQL Editor**
2. Wklej powyższy kod SQL
3. Kliknij **Run**

---

## 🏃 Uruchomienie aplikacji

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Aplikacja dostępna pod:** http://localhost:5173

---

## 📦 Zainstalowane pakiety

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Supabase** - Backend database
- **Google Gemini AI** - AI integration

---

## 🎯 Następne kroki

1. ✅ Uzupełnij `GEMINI_API_KEY` w `.env.local`
2. ✅ Uzupełnij `supabaseAnonKey` w `supabase.ts`
3. ✅ Sprawdź strukturę bazy danych w Supabase
4. 🚀 Uruchom aplikację: `npm run dev`
5. 🎨 Testuj funkcje w przeglądarce

---

## 🐛 Troubleshooting

**Problem:** "Supabase keys are missing"
- **Rozwiązanie:** Uzupełnij klucz w `supabase.ts`

**Problem:** "401 Unauthorized" z Gemini API
- **Rozwiązanie:** Sprawdź czy `GEMINI_API_KEY` jest poprawny

**Problem:** Brak zestawów nauki
- **Rozwiązanie:** Sprawdź czy tabela `learning_sets` istnieje w Supabase

---

💡 **Potrzebujesz pomocy?** Sprawdź dokumentację w `README.md`
