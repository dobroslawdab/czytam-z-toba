import React, { useState } from 'react';
import { Word } from '../types';
import { Icon } from './ui/Icon';
import { GoogleGenAI, Modality } from "@google/genai";
import { uploadWordImage } from '../supabase';

interface WordLibraryProps {
    words: Word[];
    loading: boolean;
    error: string | null;
    onSaveWord: (word: Partial<Word>) => Promise<void>;
    onDeleteWord: (id: number) => Promise<void>;
}

export const WordLibrary: React.FC<WordLibraryProps> = ({
    words,
    loading,
    error,
    onSaveWord,
    onDeleteWord
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingWord, setEditingWord] = useState<Word | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('Wszystkie');
    const [searchText, setSearchText] = useState('');

    const [formData, setFormData] = useState({
        text: '',
        category: '',
        image_url: '',
        syllables: ['']
    });

    // AI Image Generation state
    const [generatingImage, setGeneratingImage] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    const categories = ['Wszystkie', ...Array.from(new Set(words.map(w => w.category)))];

    const filteredWords = words.filter(word => {
        const matchesCategory = filterCategory === 'Wszystkie' || word.category === filterCategory;
        const matchesSearch = word.text.toLowerCase().includes(searchText.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleOpenForm = (word?: Word) => {
        if (word) {
            setEditingWord(word);
            setFormData({
                text: word.text,
                category: word.category,
                image_url: word.image_url,
                syllables: word.syllables
            });
        } else {
            setEditingWord(null);
            setFormData({
                text: '',
                category: '',
                image_url: '',
                syllables: ['']
            });
        }
        setIsFormOpen(true);
        setImageError(null);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingWord(null);
        setImageError(null);
    };

    const handleGenerateImage = async () => {
        if (!formData.text.trim()) {
            setImageError('Najpierw wpisz słowo, którego obrazek chcesz wygenerować');
            return;
        }

        setGeneratingImage(true);
        setImageError(null);

        try {
            // 1. Call Gemini API to generate image
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Prosty, przyjazny dziecku rysunek w stylu kreskówki, przedstawiający tylko i wyłącznie: ${formData.text}. Czyste linie, proste kolory, białe tło. Bez żadnego tekstu na obrazku.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] }
            });

            // 2. Extract base64 image from response
            const base64Image = response.candidates[0].content.parts[0].inlineData.data;

            // 3. Upload to Supabase Storage
            const imageUrl = await uploadWordImage(base64Image, formData.text);

            // 4. Set URL in form
            setFormData({ ...formData, image_url: imageUrl });

        } catch (err: any) {
            console.error('Image generation error:', err);
            setImageError(err.message || 'Nie udało się wygenerować obrazka. Spróbuj ponownie.');
        } finally {
            setGeneratingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that image is generated
        if (!formData.image_url) {
            setImageError('Musisz wygenerować obrazek przed zapisaniem słowa!');
            return;
        }

        const wordData: Partial<Word> = {
            text: formData.text,
            category: formData.category,
            image_url: formData.image_url,
            syllables: formData.syllables.filter(s => s.trim() !== '')
        };

        if (editingWord?.id) {
            wordData.id = editingWord.id;
        }

        await onSaveWord(wordData);
        handleCloseForm();
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Czy na pewno chcesz usunąć to słowo?')) {
            await onDeleteWord(id);
        }
    };

    const handleSyllableChange = (index: number, value: string) => {
        const newSyllables = [...formData.syllables];
        newSyllables[index] = value;
        setFormData({ ...formData, syllables: newSyllables });
    };

    const handleAddSyllable = () => {
        setFormData({ ...formData, syllables: [...formData.syllables, ''] });
    };

    const handleRemoveSyllable = (index: number) => {
        const newSyllables = formData.syllables.filter((_, i) => i !== index);
        setFormData({ ...formData, syllables: newSyllables });
    };

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Baza Słów</h1>
                        <p className="text-gray-600 mt-1">
                            Zarządzaj biblioteką słów używanych w zestawach edukacyjnych
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Dodaj słowo
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Szukaj słowa..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Error/Loading States */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600">Ładowanie słów...</p>
                    </div>
                ) : (
                    <>
                        {/* Words Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredWords.map((word) => (
                                <div
                                    key={word.id}
                                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
                                >
                                    <div className="aspect-w-16 aspect-h-9 mb-3">
                                        <img
                                            src={word.image_url}
                                            alt={word.text}
                                            className="w-full h-32 object-cover rounded-lg"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Brak+obrazka';
                                            }}
                                        />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{word.text}</h3>
                                    <p className="text-sm text-gray-600 mb-2">{word.category}</p>
                                    <div className="flex gap-1 mb-3">
                                        {word.syllables.map((syllable, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded"
                                            >
                                                {syllable}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenForm(word)}
                                            className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            onClick={() => word.id && handleDelete(word.id)}
                                            className="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredWords.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-600">Brak słów do wyświetlenia</p>
                            </div>
                        )}
                    </>
                )}

                {/* Form Modal */}
                {isFormOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h2 className="text-2xl font-bold mb-4">
                                    {editingWord ? 'Edytuj słowo' : 'Dodaj nowe słowo'}
                                </h2>
                                <form onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        {/* Text */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Słowo *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.text}
                                                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="np. mama"
                                            />
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Kategoria *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="np. Rodzina"
                                            />
                                        </div>

                                        {/* AI Image Generation */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Obrazek *
                                            </label>

                                            {/* Image Preview */}
                                            {formData.image_url && (
                                                <div className="mb-3 p-2 border-2 border-gray-200 rounded-lg">
                                                    <img
                                                        src={formData.image_url}
                                                        alt="Podgląd"
                                                        className="w-full h-48 object-contain rounded-lg bg-white"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Błąd+ładowania';
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Error Message */}
                                            {imageError && (
                                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                                    {imageError}
                                                </div>
                                            )}

                                            {/* Generate / Regenerate Button */}
                                            <button
                                                type="button"
                                                onClick={handleGenerateImage}
                                                disabled={generatingImage || !formData.text.trim()}
                                                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                                    generatingImage
                                                        ? 'bg-gray-300 cursor-wait'
                                                        : formData.image_url
                                                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                {generatingImage ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        <span>Generuję obrazek...</span>
                                                    </>
                                                ) : formData.image_url ? (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        <span>Regeneruj obrazek</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                        </svg>
                                                        <span>Generuj obrazek AI</span>
                                                    </>
                                                )}
                                            </button>

                                            {!formData.text.trim() && (
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Najpierw wpisz słowo, aby wygenerować obrazek
                                                </p>
                                            )}
                                        </div>

                                        {/* Syllables */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sylaby *
                                            </label>
                                            {formData.syllables.map((syllable, index) => (
                                                <div key={index} className="flex gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={syllable}
                                                        onChange={(e) => handleSyllableChange(index, e.target.value)}
                                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        placeholder={`Sylaba ${index + 1}`}
                                                    />
                                                    {formData.syllables.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSyllable(index)}
                                                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                        >
                                                            Usuń
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={handleAddSyllable}
                                                className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            >
                                                + Dodaj sylabę
                                            </button>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleCloseForm}
                                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Anuluj
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            {editingWord ? 'Zapisz zmiany' : 'Dodaj słowo'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
