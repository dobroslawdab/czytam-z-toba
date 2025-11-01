import React, { useState, useEffect, useMemo } from 'react';
import { ActiveSession, Word, MemoryVariant } from '../types';
import { Icon } from './ui/Icon';
import { GoogleGenAI } from "@google/genai";

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};


interface CardShowModeProps {
    words: Word[];
}

const CardShowMode: React.FC<CardShowModeProps> = ({ words }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(-1); // -1 = nie rozpoczęto
    const [wordCompleted, setWordCompleted] = useState(false);

    const currentWord = words[currentIndex];

    // Reset przy zmianie słowa
    useEffect(() => {
        setCurrentSyllableIndex(-1);
        setWordCompleted(false);
    }, [currentIndex]);

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const prevCard = () => {
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const handleSyllableProgress = () => {
        // Jeśli słowo jest ukończone, przejdź do następnego słowa
        if (wordCompleted) {
            nextCard();
            return;
        }

        const nextIndex = currentSyllableIndex + 1;

        // Jeśli to była ostatnia sylaba, oznacz słowo jako ukończone
        if (nextIndex >= currentWord.syllables.length) {
            setWordCompleted(true);
        } else {
            setCurrentSyllableIndex(nextIndex);
        }
    };

    const handleSyllableBack = () => {
        // Jeśli słowo jest ukończone, cofnij do ostatniej sylaby
        if (wordCompleted) {
            setWordCompleted(false);
            setCurrentSyllableIndex(currentWord.syllables.length - 1);
            return;
        }

        // Jeśli jesteśmy na początku słowa, przejdź do poprzedniego słowa
        if (currentSyllableIndex <= -1) {
            prevCard();
        } else {
            setCurrentSyllableIndex(currentSyllableIndex - 1);
        }
    };

    // Obsługa klawiatury: spacja i strzałki
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                handleSyllableBack();
            } else if (e.key === 'ArrowRight') {
                handleSyllableProgress();
            } else if (e.key === ' ') {
                e.preventDefault();
                handleSyllableProgress();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, currentSyllableIndex, wordCompleted]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none">
            <div
                className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex items-center justify-center p-16 transition-all duration-300 cursor-pointer"
                onClick={handleSyllableProgress}
            >
                <div className="text-6xl md:text-8xl font-bold tracking-wider text-center flex items-center justify-center">
                    <span className="learning-text learning-text-word animate-[fadeIn_0.3s_ease-in-out]">
                        {currentWord.syllables.map((syllable, index) => {
                            let opacity = 0.4; // Domyślnie szare

                            if (currentSyllableIndex === -1) {
                                // Nie rozpoczęto - wszystkie szare
                                opacity = 0.4;
                            } else if (wordCompleted) {
                                // Słowo ukończone - wszystkie czarne
                                opacity = 1;
                            } else if (index === currentSyllableIndex) {
                                // Aktualna sylaba - czarna
                                opacity = 1;
                            } else if (index < currentSyllableIndex) {
                                // Przeczytane sylaby - czarne
                                opacity = 1;
                            }

                            const isActive = index === currentSyllableIndex && !wordCompleted;

                            return (
                                <span
                                    key={index}
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        paddingBottom: '24px',
                                        marginRight: index < currentWord.syllables.length - 1 ? '3px' : '0',
                                        opacity,
                                        transition: 'opacity 0.3s'
                                    }}
                                >
                                    {syllable}
                                    {isActive && (
                                        <svg style={{position: 'absolute', bottom: '0', left: '0', width: '100%', height: '20px'}} viewBox="0 0 100 20" preserveAspectRatio="none">
                                            <path d="M2,10 Q50,18 98,10" stroke="#555" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                                        </svg>
                                    )}
                                </span>
                            );
                        })}
                    </span>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleSyllableBack(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>
             <button onClick={(e) => { e.stopPropagation(); handleSyllableProgress(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors transform rotate-180 z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

interface BookletModeProps {
    session: ActiveSession;
    sentences: { text: string; syllables?: string }[];
    sessionImages: Record<string, string>;
}

const BookletMode: React.FC<BookletModeProps> = ({ session, sentences, sessionImages }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [syllabifiedText, setSyllabifiedText] = useState<string | null>(null);
    const [isSyllabifying, setIsSyllabifying] = useState(false);
    const [syllabifyError, setSyllabifyError] = useState<string | null>(null);
    const [showAsSyllables, setShowAsSyllables] = useState(true);
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(-1); // -1 = nie rozpoczęto czytania
    const [syllablesArray, setSyllablesArray] = useState<string[]>([]);
    const [wordsData, setWordsData] = useState<Array<{startIndex: number, endIndex: number}>>([]);

    const currentSentence = sentences[currentPage];
    
    useEffect(() => {
        if (!currentSentence) return;

        // Check if syllables are already stored in the database
        if (currentSentence.syllables) {
            // Use pre-saved syllables (no AI call needed)
            setSyllabifiedText(currentSentence.syllables);
            setShowAsSyllables(true);
            setSyllabifyError(null);
            setIsSyllabifying(false);
            return;
        }

        // Backward compatibility: syllabify on-the-fly for old booklets without syllables
        const syllabify = async () => {
            setIsSyllabifying(true);
            setShowAsSyllables(true);
            setSyllabifyError(null);
            setSyllabifiedText(null);

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Podziel na sylaby KAŻDE słowo w poniższym zdaniu. Oddziel sylaby za pomocą kropki środkowej (·), np. "ko·t". Zachowaj oryginalną wielkość liter i znaki interpunkcyjne. Zwróć tylko i wyłącznie zmodyfikowane zdanie. Zdanie: "${currentSentence.text}"`,
                });
                const result = response.text.trim().replace(/·/g, '·');
                setSyllabifiedText(result);
            } catch (error) {
                console.error("Syllabification error:", error);
                setSyllabifyError("Nie udało się podzielić na sylaby. Spróbuj ponownie.");
            } finally {
                setIsSyllabifying(false);
            }
        };

        syllabify();
    }, [currentPage, sentences]);

    // Podziel tekst na sylaby i zresetuj indeks przy zmianie strony lub tekstu
    useEffect(() => {
        if (syllabifiedText) {
            // Rozdziel na słowa (po spacjach)
            const words = syllabifiedText.split(' ');

            // W każdym słowie rozdziel na sylaby (po kropkach)
            const allSyllables: string[] = [];
            const wordsInfo: Array<{startIndex: number, endIndex: number}> = [];

            let currentIndex = 0;

            words.forEach((word, wordIndex) => {
                const wordSyllables = word.split('·').filter(s => s.trim().length > 0);

                if (wordSyllables.length > 0) {
                    const startIndex = currentIndex;
                    const endIndex = currentIndex + wordSyllables.length - 1;

                    wordsInfo.push({ startIndex, endIndex });
                    allSyllables.push(...wordSyllables);
                    currentIndex += wordSyllables.length;
                }

                // Dodaj znacznik spacji (oprócz ostatniego słowa)
                if (wordIndex < words.length - 1) {
                    allSyllables.push(' '); // specjalny "element" dla spacji
                    currentIndex++; // spacja też zajmuje indeks, ale nie jest w wordsInfo
                }
            });

            setSyllablesArray(allSyllables);
            setWordsData(wordsInfo);
            setCurrentSyllableIndex(-1); // Reset na nową stronę
        }
    }, [syllabifiedText, currentPage]);


    if (!sentences || sentences.length === 0) {
        return <div className="w-full h-full flex items-center justify-center text-center p-8"><p className="text-xl text-gray-600">Ta książeczka nie ma jeszcze żadnych stron.</p></div>
    }
    
    const imageUrl = sessionImages[`${session.set.id}-${currentPage}`];
    
    const nextPage = () => setCurrentPage(p => (p + 1) % sentences.length);
    const prevPage = () => setCurrentPage(p => (p - 1 + sentences.length) % sentences.length);

    const handleSyllableProgress = () => {
        if (!syllabifiedText || syllablesArray.length === 0 || isSyllabifying) return;

        // Jeśli już po ostatniej sylabie całego zdania (wszystkie czarne), resetuj do początku
        if (currentSyllableIndex >= syllablesArray.length) {
            setCurrentSyllableIndex(-1);
            return;
        }

        let nextIndex = currentSyllableIndex + 1;

        // Jeśli jesteśmy na spacji (między słowami), przejdź do pierwszej sylaby następnego słowa
        if (nextIndex < syllablesArray.length && syllablesArray[nextIndex] === ' ') {
            // Przejdź do spacji (stan "słowo ukończone")
            setCurrentSyllableIndex(nextIndex);
        } else if (currentSyllableIndex >= 0 && syllablesArray[currentSyllableIndex] === ' ') {
            // Już jesteśmy na spacji, przejdź do pierwszej sylaby następnego słowa (pomiń spację)
            nextIndex = currentSyllableIndex + 1;
            while (nextIndex < syllablesArray.length && syllablesArray[nextIndex] === ' ') {
                nextIndex++;
            }
            setCurrentSyllableIndex(nextIndex);
        } else {
            // Normalne przejście do następnej sylaby
            setCurrentSyllableIndex(nextIndex);
        }
    };


    const renderSentence = () => {
        if (isSyllabifying) {
            return <p className="learning-text learning-text-sentence text-gray-500 animate-pulse">Dzielenie na sylaby...</p>;
        }
        if (syllabifyError) {
            return <p className="learning-text learning-text-sentence text-red-500 animate-[fadeIn_0.3s_ease-in-out]">{syllabifyError}</p>;
        }
        if (!syllabifiedText || syllablesArray.length === 0) {
            return <p className="learning-text learning-text-sentence text-gray-500 animate-pulse">Ładowanie...</p>;
        }

        // Renderuj sylaby z progresywnym podświetlaniem
        return (
            <p className="learning-text learning-text-sentence animate-[fadeIn_0.3s_ease-in-out]">
                {syllablesArray.map((syllable, index) => {
                    // Spacja to specjalny element - zawsze widoczna
                    if (syllable === ' ') {
                        return <span key={index}> </span>;
                    }

                    let opacity = 0.4; // Domyślnie 40%

                    // Znajdź do którego słowa należy ta sylaba
                    const wordIndex = wordsData.findIndex(w => index >= w.startIndex && index <= w.endIndex);

                    if (currentSyllableIndex === -1) {
                        // Nie rozpoczęto czytania - wszystkie 40%
                        opacity = 0.4;
                    } else if (currentSyllableIndex >= syllablesArray.length) {
                        // Po ostatniej sylabie całego zdania - wszystkie 100%
                        opacity = 1;
                    } else if (wordIndex !== -1) {
                        const word = wordsData[wordIndex];

                        // Sprawdź czy currentSyllableIndex wskazuje na spację (stan "słowo ukończone")
                        const isOnSpace = currentSyllableIndex >= 0 &&
                                         currentSyllableIndex < syllablesArray.length &&
                                         syllablesArray[currentSyllableIndex] === ' ';

                        if (isOnSpace) {
                            // Jesteśmy w stanie "między słowami"
                            // Znajdź słowo przed spacją
                            const previousWordIndex = wordsData.findIndex(w =>
                                currentSyllableIndex > w.endIndex &&
                                (wordsData.indexOf(w) === wordsData.length - 1 ||
                                 currentSyllableIndex < wordsData[wordsData.indexOf(w) + 1].startIndex)
                            );

                            if (previousWordIndex !== -1 && wordIndex <= previousWordIndex) {
                                // Sylaba należy do ukończonego słowa - 100%
                                opacity = 1;
                            } else {
                                // Sylaba należy do przyszłych słów - 40%
                                opacity = 0.4;
                            }
                        } else if (currentSyllableIndex > word.endIndex) {
                            // Całe słowo zostało już przeczytane (przeszliśmy do następnego słowa) - 100%
                            opacity = 1;
                        } else if (index === currentSyllableIndex) {
                            // To jest aktualna sylaba - 100%
                            opacity = 1;
                        } else {
                            // Inne sylaby (w aktualnym słowie lub przyszłych słowach) - 40%
                            opacity = 0.4;
                        }
                    }

                    return (
                        <span
                            key={index}
                            style={{ opacity }}
                            className="transition-opacity duration-300"
                        >
                            {syllable}
                        </span>
                    );
                })}
            </p>
        );
    }


    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none">
            <div
                className="w-full max-w-5xl aspect-video bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 sm:p-12 cursor-pointer"
                onClick={handleSyllableProgress}
            >
                <div className="w-full h-3/4 flex items-center justify-center mb-6">
                    {imageUrl ? (
                        <img src={imageUrl} alt={currentSentence.text} className="max-w-full max-h-full object-contain rounded-lg"/>
                    ) : (
                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Brak obrazka</div>
                    )}
                </div>
                <div className="text-5xl sm:text-7xl font-bold uppercase text-center text-gray-800 leading-relaxed h-32 flex items-center justify-center">
                    {renderSentence()}
                </div>
            </div>
            
             <button onClick={prevPage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>
             <button onClick={nextPage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors transform rotate-180 z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>

            <div className="absolute bottom-4 text-gray-500 font-medium">
                Strona {currentPage + 1} / {sentences.length}
            </div>
             <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

// ============================================
// BOOKLET DISCOVERY MODE (Książeczka 2.0 - Odkrywanie)
// ============================================

const BookletDiscoveryMode: React.FC<BookletModeProps> = ({ session, sentences, sessionImages }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [syllabifiedText, setSyllabifiedText] = useState<string | null>(null);
    const [isSyllabifying, setIsSyllabifying] = useState(false);
    const [syllabifyError, setSyllabifyError] = useState<string | null>(null);
    const [showAsSyllables, setShowAsSyllables] = useState(true);
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(-1);
    const [syllablesArray, setSyllablesArray] = useState<string[]>([]);
    const [wordsData, setWordsData] = useState<Array<{startIndex: number, endIndex: number}>>([]);
    const [sentenceCompleted, setSentenceCompleted] = useState(false); // NOWE: czy zdanie jest ukończone (wszystkie sylaby przeczytane)
    const [imageRevealed, setImageRevealed] = useState(false); // NOWE: stan odkrycia obrazka

    const currentSentence = sentences[currentPage];

    useEffect(() => {
        if (!currentSentence) return;

        // Check if syllables are already stored in the database
        if (currentSentence.syllables) {
            setSyllabifiedText(currentSentence.syllables);
            setIsSyllabifying(false);
            setSyllabifyError(null);
            return;
        }

        const syllabify = async () => {
            setIsSyllabifying(true);
            setSyllabifyError(null);
            try {
                const { syllabifyText } = await import('../supabase');
                const syllabified = await syllabifyText(currentSentence.text);
                setSyllabifiedText(syllabified);
            } catch (err: any) {
                console.error('Syllabify error:', err);
                setSyllabifyError(err.message || 'Nie udało się podzielić tekstu na sylaby');
            } finally {
                setIsSyllabifying(false);
            }
        };

        syllabify();
    }, [currentPage, sentences]);

    // Podziel tekst na sylaby i zresetuj indeks przy zmianie strony lub tekstu
    useEffect(() => {
        if (syllabifiedText) {
            const words = syllabifiedText.split(' ');
            const allSyllables: string[] = [];
            const wordsInfo: Array<{startIndex: number, endIndex: number}> = [];
            let currentIndex = 0;

            words.forEach((word, wordIndex) => {
                const wordSyllables = word.split('·').filter(s => s.trim().length > 0);
                if (wordSyllables.length > 0) {
                    const startIndex = currentIndex;
                    const endIndex = currentIndex + wordSyllables.length - 1;
                    wordsInfo.push({ startIndex, endIndex });
                    allSyllables.push(...wordSyllables);
                    currentIndex += wordSyllables.length;
                }
                if (wordIndex < words.length - 1) {
                    allSyllables.push(' ');
                    currentIndex++;
                }
            });

            setSyllablesArray(allSyllables);
            setWordsData(wordsInfo);
            setCurrentSyllableIndex(-1);
            setSentenceCompleted(false); // NOWE: reset ukończenia zdania przy nowej stronie
            setImageRevealed(false); // NOWE: reset odkrycia przy nowej stronie
        }
    }, [syllabifiedText, currentPage]);

    if (!sentences || sentences.length === 0) {
        return <div className="w-full h-full flex items-center justify-center text-center p-8"><p className="text-xl text-gray-600">Ta książeczka nie ma jeszcze żadnych stron.</p></div>
    }

    const imageUrl = sessionImages[`${session.set.id}-${currentPage}`];

    const nextPage = () => {
        setCurrentPage(p => (p + 1) % sentences.length);
    };

    const prevPage = () => {
        setCurrentPage(p => (p - 1 + sentences.length) % sentences.length);
    };

    // Obsługa klawiatury: strzałki i spacja
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                prevPage();
            } else if (e.key === 'ArrowRight') {
                nextPage();
            } else if (e.key === ' ') {
                e.preventDefault(); // Zapobiega scrollowaniu strony
                handleSyllableProgress();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, syllabifiedText, syllablesArray, isSyllabifying, imageRevealed, sentenceCompleted, currentSyllableIndex]);

    const handleSyllableProgress = () => {
        if (!syllabifiedText || syllablesArray.length === 0 || isSyllabifying) return;

        // Jeśli obrazek jest już odkryty, przejdź do następnej strony
        if (imageRevealed) {
            nextPage();
            return;
        }

        // Jeśli zdanie jest ukończone (wszystkie sylaby przeczytane), odkryj obrazek przy następnym kliknięciu
        if (sentenceCompleted) {
            setImageRevealed(true);
            return;
        }

        let nextIndex = currentSyllableIndex + 1;

        if (nextIndex < syllablesArray.length && syllablesArray[nextIndex] === ' ') {
            setCurrentSyllableIndex(nextIndex);
        } else if (currentSyllableIndex >= 0 && syllablesArray[currentSyllableIndex] === ' ') {
            nextIndex = currentSyllableIndex + 1;
            while (nextIndex < syllablesArray.length && syllablesArray[nextIndex] === ' ') {
                nextIndex++;
            }
            setCurrentSyllableIndex(nextIndex);
        } else {
            setCurrentSyllableIndex(nextIndex);
        }

        // NOWE: Sprawdź czy to była ostatnia sylaba → oznacz zdanie jako ukończone (ale NIE odkrywaj obrazka)
        if (nextIndex >= syllablesArray.length) {
            setSentenceCompleted(true);
        }
    };

    const renderSentence = () => {
        if (isSyllabifying) {
            return <p className="learning-text learning-text-sentence text-gray-500 animate-pulse">Dzielenie na sylaby...</p>;
        }
        if (syllabifyError) {
            return <p className="learning-text learning-text-sentence text-red-500 animate-[fadeIn_0.3s_ease-in-out]">{syllabifyError}</p>;
        }
        if (!syllabifiedText || syllablesArray.length === 0) {
            return <p className="learning-text learning-text-sentence text-gray-500 animate-pulse">Ładowanie...</p>;
        }

        return (
            <p className="learning-text learning-text-sentence animate-[fadeIn_0.3s_ease-in-out]">
                {syllablesArray.map((syllable, index) => {
                    if (syllable === ' ') {
                        return <span key={index}> </span>;
                    }

                    let opacity = 0.4;
                    const wordIndex = wordsData.findIndex(w => index >= w.startIndex && index <= w.endIndex);

                    if (currentSyllableIndex === -1) {
                        opacity = 0.4;
                    } else if (sentenceCompleted) {
                        // NOWE: gdy zdanie jest ukończone, cały tekst na czarno (opacity 1)
                        opacity = 1;
                    } else if (wordIndex !== -1) {
                        const word = wordsData[wordIndex];
                        const isOnSpace = currentSyllableIndex >= 0 &&
                                         currentSyllableIndex < syllablesArray.length &&
                                         syllablesArray[currentSyllableIndex] === ' ';

                        if (isOnSpace) {
                            const previousWordIndex = wordsData.findIndex(w =>
                                currentSyllableIndex > w.endIndex &&
                                (wordsData.indexOf(w) === wordsData.length - 1 ||
                                 currentSyllableIndex < wordsData[wordsData.indexOf(w) + 1].startIndex)
                            );
                            if (previousWordIndex !== -1 && wordIndex <= previousWordIndex) {
                                opacity = 1;
                            } else {
                                opacity = 0.4;
                            }
                        } else if (currentSyllableIndex > word.endIndex) {
                            opacity = 1;
                        } else if (index === currentSyllableIndex) {
                            opacity = 1;
                        } else {
                            opacity = 0.4;
                        }
                    }

                    const isActive = index === currentSyllableIndex && opacity === 1;

                    return (
                        <span
                            key={index}
                            style={{
                                opacity,
                                position: 'relative',
                                display: 'inline-block',
                                paddingBottom: '24px'
                            }}
                            className="transition-opacity duration-300"
                        >
                            {syllable}
                            {isActive && (
                                <svg style={{position: 'absolute', bottom: '0', left: '0', width: '100%', height: '20px'}} viewBox="0 0 100 20" preserveAspectRatio="none">
                                    <path d="M2,10 Q50,18 98,10" stroke="#555" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                                </svg>
                            )}
                        </span>
                    );
                })}
            </p>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none">
            <div
                className="w-full max-w-5xl aspect-video bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 sm:p-12 cursor-pointer"
                onClick={handleSyllableProgress}
            >
                {/* Obrazek - ukryty przed przeczytaniem */}
                {imageRevealed && imageUrl && (
                    <div
                        className="w-full h-3/4 flex items-center justify-center mb-6"
                        style={{
                            animation: 'imageReveal 0.8s ease-out'
                        }}
                    >
                        <img
                            src={imageUrl}
                            alt={currentSentence.text}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                )}

                {/* Tekst - na środku gdy brak obrazka, na dole gdy obrazek widoczny */}
                <div
                    className="text-5xl sm:text-7xl font-bold uppercase text-center text-gray-800 leading-relaxed flex items-center justify-center"
                    style={{
                        height: imageRevealed ? '8rem' : '100%',
                        transition: 'height 0.8s ease-out'
                    }}
                >
                    {renderSentence()}
                </div>
            </div>

            <button onClick={prevPage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>
            <button onClick={nextPage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors transform rotate-180 z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>

            <div className="absolute bottom-4 text-gray-500 font-medium">
                Strona {currentPage + 1} / {sentences.length}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes imageReveal {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
};


interface SyllablesInMotionModeProps {
    words: Word[];
}

const SyllablesInMotionMode: React.FC<SyllablesInMotionModeProps> = ({ words }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSplit, setIsSplit] = useState(false);
    const word = words[currentIndex];

    const nextWord = () => {
        setIsSplit(false);
        setCurrentIndex(p => (p + 1) % words.length);
    }
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-4xl aspect-[4/3] bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 relative">
                <div className="flex items-center justify-center space-x-4 h-32">
                    {!isSplit ? (
                         <h1 className="learning-text learning-text-word text-8xl font-bold text-gray-800">{word.text}</h1>
                    ) : (
                        word.syllables.map((syllable, index) => (
                            <React.Fragment key={index}>
                                <div className="learning-text learning-text-word text-8xl font-bold text-indigo-600 cursor-pointer hover:scale-110 transition-transform">{syllable}</div>
                                {index < word.syllables.length - 1 && <div className="text-6xl text-gray-300">|</div>}
                            </React.Fragment>
                        ))
                    )}
                </div>
                 <div className="absolute bottom-8 flex space-x-4">
                     <button onClick={() => setIsSplit(!isSplit)} className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold">
                         {isSplit ? 'Połącz' : 'Podziel'}
                     </button>
                     <button onClick={nextWord} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold">
                         Następne słowo
                     </button>
                 </div>
            </div>
        </div>
    );
};


interface MemoryGameModeProps {
    words: Word[];
    variant?: MemoryVariant;
}

type MemoryCard = {
    id: string; // unique ID for the card instance, e.g., 'word-1-a'
    wordId: string;
    cardType: 'image' | 'word' | 'full'; // 'full' = obrazek + słowo
    isFlipped: boolean;
    isMatched: boolean;
};

const MemoryGameMode: React.FC<MemoryGameModeProps> = ({ words, variant = 'word-word' }) => {
    const [cards, setCards] = useState<MemoryCard[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const wordsById = useMemo(() =>
        new Map(words.map(word => [word.id, word])),
    [words]);

    useEffect(() => {
        let gameCards: MemoryCard[];

        // Filtruj słowa aby mieć tylko te z poprawnym id
        const validWords = words.filter(word => word.id !== undefined);

        if (variant === 'image-word') {
            // Wariant: obrazek + słowo (osobne karty)
            // Ograniczenie do 10 par (20 kart), aby zmieściły się na ekranie
            gameCards = validWords.slice(0, 10).flatMap(word => ([
                { id: `${word.id}-image`, wordId: word.id!, cardType: 'image' as const, isFlipped: false, isMatched: false },
                { id: `${word.id}-word`, wordId: word.id!, cardType: 'word' as const, isFlipped: false, isMatched: false }
            ]));
        } else {
            // Wariant domyślny: słowo + słowo (identyczne karty ze słowami)
            // Ograniczenie do 10 par (20 kart), aby zmieściły się na ekranie
            gameCards = validWords.slice(0, 10).flatMap(word => ([
                { id: `${word.id}-a`, wordId: word.id!, cardType: 'word' as const, isFlipped: false, isMatched: false },
                { id: `${word.id}-b`, wordId: word.id!, cardType: 'word' as const, isFlipped: false, isMatched: false }
            ]));
        }

        // Filtruj karty, aby usunąć te bez prawidłowych słów w wordsById
        // Aby zachować pary, grupujemy według wordId i usuwamy całe grupy jeśli słowo nie istnieje
        const wordIds = new Set(gameCards.map(card => card.wordId));
        const validWordIds = Array.from(wordIds).filter(wordId => {
            const word = words.find(w => w.id === wordId);
            return word !== undefined;
        });

        // Zachowaj tylko karty z prawidłowymi wordId
        const filteredCards = gameCards.filter(card => validWordIds.includes(card.wordId));

        setCards(shuffleArray(filteredCards));
    }, [words, variant]);

    useEffect(() => {
        if (flippedCards.length === 2) {
            setIsChecking(true);
            const [firstIndex, secondIndex] = flippedCards;
            const firstCard = cards[firstIndex];
            const secondCard = cards[secondIndex];

            if (firstCard.wordId === secondCard.wordId) {
                // Match
                setTimeout(() => {
                    setCards(prev => prev.map(card => 
                        (card.wordId === firstCard.wordId) ? { ...card, isMatched: true } : card
                    ));
                    setFlippedCards([]);
                    setIsChecking(false);
                }, 500);
            } else {
                // No match
                setTimeout(() => {
                    setCards(prev => prev.map((card, index) => 
                        (index === firstIndex || index === secondIndex) ? { ...card, isFlipped: false } : card
                    ));
                    setFlippedCards([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    }, [flippedCards, cards]);

    const handleCardClick = (index: number) => {
        if (isChecking || cards[index].isFlipped || cards[index].isMatched || flippedCards.length >= 2) {
            return;
        }
        setCards(prev => prev.map((card, i) => i === index ? { ...card, isFlipped: true } : card));
        setFlippedCards(prev => [...prev, index]);
    };

    const allMatched = cards.length > 0 && cards.every(c => c.isMatched);

    // Uruchom confetti gdy wszystkie pary zostaną dopasowane
    useEffect(() => {
        if (allMatched && cards.length > 0) {
            setShowConfetti(true);
            // Zatrzymaj animację po 10 sekundach
            const timer = setTimeout(() => setShowConfetti(false), 10000);
            return () => clearTimeout(timer);
        }
    }, [allMatched, cards.length]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)]
                            }}
                        />
                    ))}
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
                    {cards.map((card, index) => {
                        const word = wordsById.get(card.wordId);
                        if (!word) return null;

                        return (
                            <div key={card.id} className="w-[200px] h-[200px]" onClick={() => handleCardClick(index)} style={{ perspective: '1000px' }}>
                                <div className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${card.isFlipped || card.isMatched ? '[transform:rotateY(180deg)]' : ''}`}>
                                    {/* Back (visible initially) */}
                                    <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center bg-indigo-500 rounded-lg shadow-md">
                                        <span className="text-3xl font-bold text-white">CzT</span>
                                    </div>
                                    {/* Front (visible when flipped) */}
                                    <div className="absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-2 [transform:rotateY(180deg)]">
                                        {card.cardType === 'image' ? (
                                            // Wariant: tylko obrazek
                                            <div className="w-full h-full flex items-center justify-center">
                                                <img src={word.image_url} alt={word.text} className="max-w-full max-h-full object-contain rounded-lg"/>
                                            </div>
                                        ) : card.cardType === 'word' ? (
                                            // Wariant: tylko słowo
                                            <div className="w-full h-full flex items-center justify-center">
                                                <p className="learning-text learning-text-card text-2xl sm:text-3xl font-bold text-gray-800 text-center px-2">{word.text}</p>
                                            </div>
                                        ) : (
                                            // Wariant: obrazek + słowo
                                            <>
                                                <div className="w-full h-2/3 flex items-center justify-center">
                                                    <img src={word.image_url} alt={word.text} className="max-w-full max-h-full object-contain rounded-t-lg"/>
                                                </div>
                                                <div className="w-full h-1/3 flex items-center justify-center border-t mt-1">
                                                    <p className="learning-text learning-text-card text-xl sm:text-2xl font-bold text-gray-800 text-center">{word.text}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
            </div>
        </div>
    );
}

interface LearningSessionProps {
    session: ActiveSession;
    words: Word[];
    onExit: () => void;
    sessionImages: Record<string, string>;
}

export const LearningSession: React.FC<LearningSessionProps> = ({ session, words, onExit, sessionImages }) => {
    const sessionWords = session.set.wordIds.map(id => words.find(w => w.id === id)).filter(Boolean) as Word[];

    const renderMode = () => {
        switch (session.mode) {
            case 'Pokaz kart':
                return <CardShowMode words={sessionWords} />;
            case 'Książeczka 2.0 - Odkrywanie':
                return <BookletDiscoveryMode session={session} sentences={session.set.sentences || []} sessionImages={sessionImages} />;
            case 'Sylaby w ruchu':
                return <SyllablesInMotionMode words={sessionWords} />;
            case 'Memory':
                return <MemoryGameMode words={sessionWords} variant={session.memoryVariant} />;
            default:
                return <div className="w-full h-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl font-semibold">Tryb w budowie</h2>
                    <p>{session.mode}</p>
                </div>;
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-200 z-50 flex flex-col">
            <header className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm">
                <div>
                    <h1 className="text-xl font-bold">{session.set.name}</h1>
                    <p className="text-sm text-gray-600">{session.mode}</p>
                </div>
                <button onClick={onExit} className="flex items-center space-x-2 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-600 transition-colors">
                    <Icon name="arrow-left" className="w-5 h-5"/>
                    <span>Zakończ</span>
                </button>
            </header>
            <main className="flex-grow">
                {renderMode()}
            </main>
        </div>
    );
};