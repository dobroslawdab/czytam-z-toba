import React from 'react';
import { LearningSet, Word, SetType, LearningMode, ActiveSession } from '../types';
import { Icon } from './ui/Icon';

interface DashboardProps {
    sets: LearningSet[];
    words: Word[];
    loading: boolean;
    error: string | null;
    onStartSession: (session: ActiveSession) => void;
    onCreateSet: () => void;
    onEditSet: (set: LearningSet) => void;
    onDeleteSet: (setId: number) => void;
}

const getSetIcon = (type: SetType) => {
    switch (type) {
        case SetType.PictureCards: return 'book';
        case SetType.Booklet: return 'book';
        case SetType.Analysis: return 'syllables';
        case SetType.Comparison: return 'compare';
        default: return 'book';
    }
}

const LearningModeButton: React.FC<{mode: LearningMode, set: LearningSet, onStart: (session: ActiveSession) => void}> = ({mode, set, onStart}) => {
    const isModeAvailable = () => {
        switch(mode) {
            case LearningMode.CardShow:
            case LearningMode.CardsOnTable:
                 return set.type === SetType.PictureCards;
            case LearningMode.Booklet:
                 return set.type === SetType.Booklet;
            case LearningMode.SyllablesInMotion:
                return set.type === SetType.Analysis;
            case LearningMode.CompareWords:
                return set.type === SetType.Comparison;
            case LearningMode.Memory:
                return set.type !== SetType.Booklet;
            default:
                return false;
        }
    }
    
    if (!isModeAvailable()) {
        return null;
    }

    return (
        <button
            onClick={() => onStart({ set, mode })}
            className="flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors"
        >
            <Icon name="play" className="w-4 h-4" />
            <span>{mode}</span>
        </button>
    )
};


export const Dashboard: React.FC<DashboardProps> = ({ sets, words, loading, error, onStartSession, onCreateSet, onEditSet, onDeleteSet }) => {
    const getWordsForSet = (set: LearningSet) => {
        return set.wordIds.map(id => words.find(w => w.id === id)).filter(Boolean) as Word[];
    };
    
    const handleDelete = (set: LearningSet) => {
        if(set.id && window.confirm(`Czy na pewno chcesz usunąć zestaw "${set.name}"?`)) {
            onDeleteSet(set.id);
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Twoje zestawy do nauki</h1>
                <button
                    onClick={onCreateSet}
                    className="flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <Icon name="plus" className="w-5 h-5 mr-2" />
                    Utwórz nowy zestaw
                </button>
            </div>

            {loading && <div className="text-center py-20"><p className="text-lg text-gray-600">Ładowanie zestawów z bazy danych...</p></div>}
            {error && <div className="text-center py-20 bg-red-50 rounded-lg shadow"><p className="text-lg text-red-600">{error}</p></div>}

            {!loading && !error && sets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-gray-700">Nie masz jeszcze żadnych zestawów.</h2>
                    <p className="text-gray-500 mt-2">Kliknij przycisk powyżej, aby stworzyć swój pierwszy zestaw do nauki!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sets.map(set => (
                        <div key={set.id} className="bg-white rounded-xl shadow-lg flex flex-col justify-between transition-transform hover:scale-105 duration-300">
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">{set.type}</p>
                                        <h3 className="text-xl font-bold text-gray-900 mt-1">{set.name}</h3>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onEditSet(set)} className="text-gray-400 hover:text-indigo-600 p-2 rounded-full transition-colors"><Icon name="edit" className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(set)} className="text-gray-400 hover:text-red-600 p-2 rounded-full transition-colors"><Icon name="trash" className="w-5 h-5"/></button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    {set.type === SetType.Booklet && set.sentences && set.sentences.length > 0 ? (
                                        <p className="text-sm text-gray-600 italic">"{set.sentences[0].text}"</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {getWordsForSet(set).slice(0, 5).map(word => (
                                                <span key={word.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{word.text}</span>
                                            ))}
                                            {getWordsForSet(set).length > 5 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">...</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 border-t border-gray-200 mt-auto">
                                <h4 className="text-sm font-semibold text-gray-600 mb-3">Rozpocznij sesję:</h4>
                                <div className="flex flex-wrap gap-2">
                                    <LearningModeButton mode={LearningMode.CardShow} set={set} onStart={onStartSession} />
                                    <LearningModeButton mode={LearningMode.CardsOnTable} set={set} onStart={onStartSession} />
                                    <LearningModeButton mode={LearningMode.Booklet} set={set} onStart={onStartSession} />
                                    <LearningModeButton mode={LearningMode.SyllablesInMotion} set={set} onStart={onStartSession} />
                                    <LearningModeButton mode={LearningMode.CompareWords} set={set} onStart={onStartSession} />
                                    <LearningModeButton mode={LearningMode.Memory} set={set} onStart={onStartSession} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};