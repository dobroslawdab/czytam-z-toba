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
    const [showSyllables, setShowSyllables] = useState(true);

    useEffect(() => {
        setShowSyllables(true);
    }, [currentIndex]);

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const prevCard = () => {
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const toggleSyllables = () => {
        setShowSyllables(s => !s);
    }

    const currentWord = words[currentIndex];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none">
            <div 
                className="w-full max-w-4xl aspect-[4/3] bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all duration-300"
                onClick={toggleSyllables}
            >
                <img src={currentWord.image_url} alt={currentWord.text} className="max-w-full max-h-[65%] object-contain rounded-lg" />
                <div className="mt-8 text-6xl md:text-8xl font-bold tracking-wider text-center h-28 flex items-center">
                    {showSyllables ? (
                        <p className="learning-text learning-text-word text-indigo-600 animate-[fadeIn_0.3s_ease-in-out]">
                            {currentWord.syllables.join(' · ')}
                        </p>
                    ) : (
                         <p className="learning-text learning-text-word text-gray-800 animate-[fadeIn_0.3s_ease-in-out]">
                            {currentWord.text}
                        </p>
                    )}
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); prevCard(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors z-10">
                <Icon name="arrow-left" className="w-8 h-8"/>
            </button>
             <button onClick={(e) => { e.stopPropagation(); nextCard(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors transform rotate-180 z-10">
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
            words.forEach((word, wordIndex) => {
                const wordSyllables = word.split('·').filter(s => s.trim().length > 0);
                allSyllables.push(...wordSyllables);

                // Dodaj znacznik spacji (oprócz ostatniego słowa)
                if (wordIndex < words.length - 1) {
                    allSyllables.push(' '); // specjalny "element" dla spacji
                }
            });

            setSyllablesArray(allSyllables);
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

        // Znajdź następną sylabę (pomijając spacje)
        let nextIndex = currentSyllableIndex + 1;
        while (nextIndex < syllablesArray.length && syllablesArray[nextIndex] === ' ') {
            nextIndex++;
        }

        if (nextIndex < syllablesArray.length) {
            // Przejdź do następnej sylaby
            setCurrentSyllableIndex(nextIndex);
        } else if (currentSyllableIndex < syllablesArray.length - 1) {
            // Wszystkie sylaby przeczytane
            setCurrentSyllableIndex(syllablesArray.length);
        } else {
            // Reset - rozpocznij od początku
            setCurrentSyllableIndex(-1);
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

                    let opacity = 0.5; // Domyślnie szare (nieprzeczytane)

                    if (currentSyllableIndex === -1) {
                        // Nie rozpoczęto czytania - wszystkie szare
                        opacity = 0.5;
                    } else if (index <= currentSyllableIndex) {
                        // Przeczytane + aktualna - czarne
                        opacity = 1;
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

interface CompareWordsModeProps {
    words: Word[];
}

const CompareWordsMode: React.FC<CompareWordsModeProps> = ({ words }) => {
    return (
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="flex flex-wrap items-stretch justify-center gap-4 sm:gap-8">
                {words.map(word => (
                    <div key={word.id} className="bg-white rounded-2xl shadow-xl flex flex-col items-center p-6 w-52 sm:w-64">
                        <img src={word.image_url} alt={word.text} className="w-full aspect-video object-cover rounded-lg mb-4" />
                        <p className="learning-text learning-text-word text-3xl sm:text-4xl font-bold text-gray-800 tracking-wider">{word.text}</p>
                    </div>
                ))}
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

const MemoryGameMode: React.FC<MemoryGameModeProps> = ({ words, variant = 'image-image' }) => {
    const [cards, setCards] = useState<MemoryCard[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const wordsById = useMemo(() =>
        new Map(words.map(word => [word.id, word])),
    [words]);

    useEffect(() => {
        let gameCards: MemoryCard[];

        if (variant === 'image-word') {
            // Wariant: obrazek + słowo
            gameCards = words.flatMap(word => ([
                { id: `${word.id}-image`, wordId: word.id, cardType: 'image' as const, isFlipped: false, isMatched: false },
                { id: `${word.id}-word`, wordId: word.id, cardType: 'word' as const, isFlipped: false, isMatched: false }
            ]));
        } else {
            // Wariant domyślny: obrazek + słowo na karcie (para identycznych)
            gameCards = words.flatMap(word => ([
                { id: `${word.id}-a`, wordId: word.id, cardType: 'full' as const, isFlipped: false, isMatched: false },
                { id: `${word.id}-b`, wordId: word.id, cardType: 'full' as const, isFlipped: false, isMatched: false }
            ]));
        }

        setCards(shuffleArray(gameCards));
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

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
             {allMatched ? (
                 <div className="text-center">
                     <h2 className="text-4xl font-bold text-green-500 mb-4">Gratulacje!</h2>
                     <p className="text-xl text-gray-700">Wszystkie pary zostały dopasowane.</p>
                 </div>
            ) : (
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
             )}
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
            case 'Książeczka':
                return <BookletMode session={session} sentences={session.set.sentences || []} sessionImages={sessionImages} />;
            case 'Sylaby w ruchu':
                return <SyllablesInMotionMode words={sessionWords} />;
            case 'Porównaj słowa':
                return <CompareWordsMode words={sessionWords} />;
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