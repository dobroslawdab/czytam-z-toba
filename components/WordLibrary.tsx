import React, { useState } from 'react';
import { Word } from '../types';
import { Icon } from './ui/Icon';

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
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingWord(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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

                                        {/* Image URL */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                URL obrazka *
                                            </label>
                                            <input
                                                type="url"
                                                required
                                                value={formData.image_url}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="https://example.com/image.jpg"
                                            />
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
