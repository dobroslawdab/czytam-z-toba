import React from 'react';
import { MemoryVariant } from '../types';

interface MemoryVariantModalProps {
    onSelect: (variant: MemoryVariant) => void;
    onCancel: () => void;
}

export const MemoryVariantModal: React.FC<MemoryVariantModalProps> = ({ onSelect, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
            <div
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Wybierz wariant Memory</h2>
                <p className="text-gray-600 mb-6">Jak chcesz dopasowywać karty?</p>

                <div className="space-y-4">
                    <button
                        onClick={() => onSelect('image-image')}
                        className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-4 px-6 rounded-lg transition-colors flex flex-col items-center"
                    >
                        <span className="text-lg mb-2">🖼️ + 🖼️</span>
                        <span className="text-base">Obrazek + Obrazek</span>
                        <span className="text-sm text-indigo-600 mt-1">Dopasuj dwie identyczne karty</span>
                    </button>

                    <button
                        onClick={() => onSelect('image-word')}
                        className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-4 px-6 rounded-lg transition-colors flex flex-col items-center"
                    >
                        <span className="text-lg mb-2">🖼️ + 📝</span>
                        <span className="text-base">Obrazek + Słowo</span>
                        <span className="text-sm text-green-600 mt-1">Dopasuj obrazek do słowa</span>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                    Anuluj
                </button>
            </div>
        </div>
    );
};
