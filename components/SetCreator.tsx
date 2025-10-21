import React, { useState, useEffect } from 'react';
import { LearningSet, Word, SetType } from '../types';
import { Icon } from './ui/Icon';
import { GoogleGenAI, Type, Modality } from "@google/genai";

interface SetCreatorProps {
    words: Word[];
    onSave: (set: Partial<LearningSet>, images: Record<number, string>) => void;
    onCancel: () => void;
    set_to_edit?: LearningSet | null;
}

type Sentence = { text: string; image?: string };

export const SetCreator: React.FC<SetCreatorProps> = ({ words, onSave, onCancel, set_to_edit }) => {
    const [step, setStep] = useState(set_to_edit ? 2 : 1);
    const [setName, setSetName] = useState('');
    const [setType, setSetType] = useState<SetType | null>(null);
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [manualSentence, setManualSentence] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [mainCharacterWordId, setMainCharacterWordId] = useState<string | null>(null);
    const [characterReferenceImage, setCharacterReferenceImage] = useState<string | null>(null);

    useEffect(() => {
        if (set_to_edit) {
            setSetName(set_to_edit.name);
            setSetType(set_to_edit.type);
            setSelectedWordIds(set_to_edit.wordIds);
            if (set_to_edit.type === SetType.Booklet && set_to_edit.sentences) {
                 setSentences(set_to_edit.sentences.map(s => ({ text: s.text })));
            }
        }
    }, [set_to_edit]);


    const handleNextStep = () => {
        if (step === 2 && setType === SetType.Booklet) {
            setStep(3);
            return;
        }
        handleSave();
    };

    const handleSave = () => {
        if (!setName || !setType || selectedWordIds.length === 0) return;
        if (setType === SetType.Booklet && sentences.length === 0) return;

        const imagesToPass: Record<number, string> = {};
        const sentencesToStore = sentences.map((sentence, index) => {
            if (sentence.image) {
                imagesToPass[index] = sentence.image;
            }
            return { text: sentence.text };
        });

        const setToSave: Partial<LearningSet> = {
            ...(set_to_edit && { id: set_to_edit.id }),
            name: setName,
            type: setType,
            wordIds: selectedWordIds,
            ...(setType === SetType.Booklet && { sentences: sentencesToStore })
        };
        onSave(setToSave, imagesToPass);
    };

    const handleGenerateSentences = async () => {
        setIsGeneratingText(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const selectedWords = selectedWordIds.map(id => words.find(w => w.id === id)?.text).filter(Boolean);
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Jesteś asystentem tworzącym materiały edukacyjne dla dzieci uczących się czytać. Na podstawie podanej listy słów, utwórz 3 proste, krótkie zdania. Każde zdanie powinno być odpowiednie dla małego dziecka i składać się głównie z podanych słów. Słowa: ${selectedWords.join(', ')}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            sentences: {
                                type: Type.ARRAY,
                                description: 'Tablica 3 prostych zdań dla dzieci.',
                                items: { type: Type.STRING }
                            }
                        }
                    },
                },
            });

            const jsonResponse = JSON.parse(response.text);
            if (jsonResponse.sentences && Array.isArray(jsonResponse.sentences)) {
                const newSentences = jsonResponse.sentences.map((s: string) => ({ text: s }));
                setSentences(prev => [...prev, ...newSentences]);
            }

        } catch (error) {
            console.error("Error generating sentences:", error);
            setError("Wystąpił błąd podczas generowania zdań. Spróbuj ponownie.");
        } finally {
            setIsGeneratingText(false);
        }
    };
    
    const handleGenerateImage = async (sentenceIndex: number) => {
        if (!mainCharacterWordId) {
            setError("Wybierz postać główną, aby generować spójne obrazki.");
            return;
        }

        setGeneratingImageIndex(sentenceIndex);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sentenceText = sentences[sentenceIndex].text;
            const mainCharacterWord = words.find(w => w.id === mainCharacterWordId);
            
            let response;

            if (!characterReferenceImage) {
                const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki, przedstawiający tylko i wyłącznie: ${mainCharacterWord!.text}. Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku.`;
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
            } else {
                const prompt = `Używając tej postaci jako wzoru, narysuj ją wykonującą czynność z tego zdania: "${sentenceText}". Styl ma być identyczny jak na obrazku wzorcowym: prosty, przyjazny dziecku rysunek w stylu kreskówki. Białe tło. Bez żadnego tekstu na obrazku.`;
                const imagePart = {
                    inlineData: {
                        data: characterReferenceImage.split(',')[1],
                        mimeType: 'image/png'
                    }
                };
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
            }


            if (response.promptFeedback?.blockReason) {
                throw new Error(`Nie udało się wygenerować obrazka. Powód: ${response.promptFeedback.blockReason}.`);
            }

            const candidate = response.candidates?.[0];

            if (!candidate || (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'UNSPECIFIED')) {
                 let errorMessage;
                 if (candidate) {
                    if (candidate.finishReason === 'NO_IMAGE') {
                        errorMessage = "Nie udało się wygenerować obrazka. Model AI nie był w stanie zwizualizować tej treści. Spróbuj uprościć zdanie lub spróbować ponownie.";
                    } else {
                        errorMessage = `Nie udało się wygenerować obrazka. Otrzymano nieoczekiwaną odpowiedź (powód: ${candidate.finishReason}). Spróbuj ponownie.`;
                    }
                 } else {
                     errorMessage = `Nie udało się wygenerować obrazka. API nie zwróciło żadnych wyników. Spróbuj ponownie.`;
                 }
                 throw new Error(errorMessage);
            }
            
            const imagePart = candidate.content?.parts?.find(p => p.inlineData);
            if (imagePart && imagePart.inlineData) {
                const base64Image = imagePart.inlineData.data;
                const imageUrl = `data:image/png;base64,${base64Image}`;
                
                if (!characterReferenceImage) {
                    setCharacterReferenceImage(imageUrl);
                }
                
                setSentences(prev => prev.map((s, i) => i === sentenceIndex ? { ...s, image: imageUrl } : s));
            } else {
                 throw new Error("API nie zwróciło danych obrazka, mimo że odpowiedź była pomyślna. Spróbuj ponownie, być może zmieniając treść zdania.");
            }

        } catch (error) {
             console.error("Error generating image:", error);
             const message = error instanceof Error ? error.message : "Wystąpił nieznany błąd podczas generowania obrazka.";
             setError(message);
        } finally {
            setGeneratingImageIndex(null);
        }
    }


    const toggleWordSelection = (wordId: string) => {
        setSelectedWordIds(prev =>
            prev.includes(wordId) ? prev.filter(id => id !== wordId) : [...prev, wordId]
        );
    };

    const handleAddManualSentence = () => {
        if (manualSentence.trim()) {
            setSentences(prev => [...prev, { text: manualSentence.trim() }]);
            setManualSentence('');
        }
    };

    const handleRemoveSentence = (index: number) => {
        setSentences(prev => prev.filter((_, i) => i !== index));
    };

    const filteredWords = words.filter(word =>
        word.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderStep1 = () => (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Krok 1: Wybierz typ zestawu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(SetType).map(type => (
                    <button
                        key={type}
                        onClick={() => { setSetType(type); setStep(2); }}
                        className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl hover:scale-105 transition-all text-center group"
                    >
                        <p className="font-semibold text-lg text-gray-700 group-hover:text-indigo-600">{type}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{set_to_edit ? 'Edytuj zestaw' : 'Krok 2: Nazwij zestaw i wybierz słowa'}</h2>
            <div className="mb-4">
                <label htmlFor="setName" className="block text-sm font-medium text-gray-700">Nazwa zestawu</label>
                <input
                    type="text"
                    id="setName"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={`Np. "Rodzina", "Zwierzęta w zoo"`}
                />
            </div>
            <div>
                <label htmlFor="searchWords" className="block text-sm font-medium text-gray-700">Wybierz słowa ({selectedWordIds.length})</label>
                 <input
                    type="text"
                    id="searchWords"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 mb-2 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Szukaj słów..."
                />
                <div className="max-h-60 overflow-y-auto p-2 border rounded-md bg-gray-50">
                    {filteredWords.map(word => (
                        <div
                            key={word.id}
                            onClick={() => toggleWordSelection(word.id)}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer mb-1 ${selectedWordIds.includes(word.id) ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-200'}`}
                        >
                            <div className="flex items-center">
                                <img src={word.image} alt={word.text} className="w-10 h-10 rounded-md mr-3 object-cover"/>
                                <span>{word.text}</span>
                            </div>
                            {selectedWordIds.includes(word.id) && <span className="text-indigo-600 font-bold">✓</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div>
             <h2 className="text-2xl font-bold mb-6 text-gray-800">{set_to_edit ? 'Edytuj zdania i obrazki' : 'Krok 3: Dodaj zdania i obrazki'}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold mb-2">Wygeneruj zdania z AI</h3>
                    <p className="text-sm text-gray-600 mb-3">Wykorzystaj wybrane słowa, aby stworzyć proste zdania.</p>
                    <button 
                        onClick={handleGenerateSentences}
                        disabled={isGeneratingText || selectedWordIds.length < 2}
                        className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGeneratingText ? 'Generowanie...' : 'Wygeneruj 3 zdania'}
                    </button>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow">
                     <h3 className="font-semibold mb-2">Dodaj ręcznie</h3>
                     <div className="flex items-center space-x-2">
                        <input 
                            type="text"
                            value={manualSentence}
                            onChange={(e) => setManualSentence(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddManualSentence()}
                            className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Wpisz zdanie..."
                        />
                        <button onClick={handleAddManualSentence} className="p-2 bg-gray-200 rounded-md hover:bg-gray-300">
                            <Icon name="plus" className="w-5 h-5"/>
                        </button>
                     </div>
                </div>
             </div>
              <div className="mt-6 bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold">Postać główna</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">Wybierz postać, która będzie pojawiać się na wszystkich obrazkach. To zapewni spójność ilustracji. Zmiana postaci zresetuje referencyjny obrazek.</p>
                <div className="flex flex-wrap gap-2">
                    {(selectedWordIds.map(id => words.find(w => w.id === id)).filter(Boolean) as Word[]).map(word => (
                        <button 
                            key={word.id} 
                            onClick={() => {
                                setMainCharacterWordId(word.id);
                                setCharacterReferenceImage(null);
                            }}
                            className={`flex items-center space-x-2 p-2 rounded-lg border-2 transition-colors ${mainCharacterWordId === word.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}
                        >
                            <img src={word.image} alt={word.text} className="w-8 h-8 rounded-md object-cover"/>
                            <span>{word.text}</span>
                        </button>
                    ))}
                </div>
             </div>

              {error && <p className="text-red-500 text-sm mt-4 text-center p-2 bg-red-50 rounded-md">{error}</p>}
             <div className="mt-6">
                <h3 className="font-semibold mb-2">Zdania w książeczce ({sentences.length})</h3>
                <div className="max-h-48 overflow-y-auto p-2 border rounded-md bg-gray-50 space-y-2">
                    {sentences.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Brak zdań. Dodaj je ręcznie lub wygeneruj.</p>
                    ) : (
                        sentences.map((sentence, index) => (
                            <div key={index} className="flex justify-between items-center p-2 rounded-md bg-white shadow-sm">
                                <div className="flex items-center flex-grow">
                                    {sentence.image ? (
                                        <img src={sentence.image} alt="Wygenerowany obrazek" className="w-12 h-12 rounded-md mr-3 object-cover"/>
                                    ) : (
                                         <div className="w-12 h-12 rounded-md mr-3 bg-gray-200 flex items-center justify-center text-gray-400">?</div>
                                    )}
                                    <p className="flex-grow">{sentence.text}</p>
                                </div>
                                <div className="flex items-center space-x-2 ml-2">
                                    <button 
                                        onClick={() => handleGenerateImage(index)}
                                        disabled={generatingImageIndex !== null}
                                        className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 disabled:bg-gray-200 disabled:cursor-wait"
                                    >
                                        {generatingImageIndex === index ? '...' : (sentence.image ? 'Zmień' : 'Generuj obrazek')}
                                    </button>
                                    <button onClick={() => handleRemoveSentence(index)} className="text-gray-400 hover:text-red-500 p-1">
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
        </div>
    );

    const isNextDisabled = () => {
        if (step === 2) return !setName || selectedWordIds.length === 0;
        if (step === 3) return sentences.length === 0;
        return false;
    };
    
    const getButtonText = () => {
        if (set_to_edit) return "Zapisz zmiany";
        if (setType === SetType.Booklet) {
            return step === 2 ? "Dalej" : "Zapisz zestaw";
        }
        return "Zapisz zestaw";
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-100 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex-grow overflow-y-auto pr-2">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div>
                    {step > 1 && !set_to_edit && <button onClick={() => setStep(step-1)} className="py-2 px-4 rounded-md text-gray-600 hover:bg-gray-200">Wróć</button>}
                    </div>
                    <div className="space-x-4">
                        <button onClick={onCancel} className="py-2 px-4 rounded-md text-gray-600 hover:bg-gray-200">Anuluj</button>
                        <button
                            onClick={handleNextStep}
                            disabled={isNextDisabled()}
                            className="py-2 px-6 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};