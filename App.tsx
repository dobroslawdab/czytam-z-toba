import React, { useState, useEffect } from 'react';
import { initialWordLibrary } from './constants';
import { LearningSet, Word, View, ActiveSession } from './types';
import { Dashboard } from './components/Dashboard';
import { SetCreator } from './components/SetCreator';
import { LearningSession } from './components/LearningSession';
import { WordLibrary } from './components/WordLibrary';
import { Icon } from './components/ui/Icon';
import { supabase, fetchWords, createWord, updateWord, deleteWord } from './supabase';


const App: React.FC = () => {
    const [words, setWords] = useState<Word[]>([]);
    const [sets, setSets] = useState<LearningSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [wordsLoading, setWordsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wordsError, setWordsError] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<View>(View.Dashboard);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [sessionImages, setSessionImages] = useState<Record<string, string>>({});
    const [editingSet, setEditingSet] = useState<LearningSet | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch learning sets
            setLoading(true);
            setError(null);
            try {
                const { data, error: supabaseError } = await supabase
                    .from('learning_sets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (supabaseError) {
                    throw supabaseError;
                }
                setSets(data || []);

                // Populate sessionImages from sentences that have image_url
                const loadedImages: Record<string, string> = {};
                (data || []).forEach(set => {
                    if (set.sentences && Array.isArray(set.sentences)) {
                        set.sentences.forEach((sentence: any, index: number) => {
                            if (sentence.image_url) {
                                loadedImages[`${set.id}-${index}`] = sentence.image_url;
                            }
                        });
                    }
                });
                setSessionImages(loadedImages);
            } catch (err: any) {
                console.error('Error fetching sets:', err);
                setError(`Nie udało się pobrać zestawów z bazy danych. Błąd: ${err.message || 'Wystąpił nieznany błąd.'}`);
            } finally {
                setLoading(false);
            }

            // Fetch words
            setWordsLoading(true);
            setWordsError(null);
            try {
                const wordsData = await fetchWords();
                setWords(wordsData);
            } catch (err: any) {
                console.error('Error fetching words:', err);
                setWordsError(`Nie udało się pobrać słów z bazy danych. Błąd: ${err.message || 'Wystąpił nieznany błąd.'}`);
                // Fallback to initial library if fetch fails
                setWords(initialWordLibrary as any);
            } finally {
                setWordsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSaveSet = async (set: Partial<LearningSet>, images: Record<number, string>) => {
        try {
            let savedSetId: number;

            if (set.id) {
                // Update existing set
                const { data, error: updateError } = await supabase
                    .from('learning_sets')
                    .update(set)
                    .eq('id', set.id)
                    .select()
                    .single();

                if (updateError) throw updateError;

                if (data) {
                    setSets(prev => prev.map(s => s.id === data.id ? data : s));
                    savedSetId = data.id;
                }
            } else {
                // Create new set
                const { data, error: insertError } = await supabase
                    .from('learning_sets')
                    .insert(set as LearningSet)
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (data) {
                    setSets(prev => [data, ...prev]);
                    savedSetId = data.id;
                }
            }

            // NOW add images to sessionImages with the correct set ID
            const newImages: Record<string, string> = {};
            Object.entries(images).forEach(([index, imageUrl]) => {
                newImages[`${savedSetId}-${index}`] = imageUrl;
            });
            setSessionImages(prev => ({ ...prev, ...newImages }));

            setCurrentView(View.Dashboard);
            setEditingSet(null);
        } catch (err: any) {
             console.error("Error saving set:", err);
            alert(`Błąd podczas zapisywania zestawu: ${err.message || 'Wystąpił nieznany błąd.'}`);
        }
    };

    const handleDeleteSet = async (setId: number) => {
        try {
            const { error: deleteError } = await supabase
                .from('learning_sets')
                .delete()
                .eq('id', setId);

            if (deleteError) throw deleteError;
            
            setSets(prev => prev.filter(s => s.id !== setId));
        } catch (err: any) {
            console.error("Error deleting set: ", err);
            alert(`Nie udało się usunąć zestawu: ${err.message || 'Wystąpił nieznany błąd.'}`);
        }
    };
    
    const handleStartSession = (session: ActiveSession) => {
        setActiveSession(session);
        setCurrentView(View.LearningSession);
    }
    
    const handleExitSession = () => {
        setActiveSession(null);
        setCurrentView(View.Dashboard);
    }

    const handleStartCreateSet = () => {
        setEditingSet(null);
        setCurrentView(View.SetCreator);
    };

    const handleStartEditSet = (set: LearningSet) => {
        setEditingSet(set);
        setCurrentView(View.SetCreator);
    };

    const handleSaveWord = async (word: Partial<Word>) => {
        try {
            if (word.id) {
                // Update existing word
                const updatedWord = await updateWord(word.id, word);
                setWords(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
            } else {
                // Create new word
                const newWord = await createWord(word as Omit<Word, 'id' | 'created_at'>);
                setWords(prev => [newWord, ...prev]);
            }
        } catch (err: any) {
            console.error("Error saving word:", err);
            alert(`Błąd podczas zapisywania słowa: ${err.message || 'Wystąpił nieznany błąd.'}`);
        }
    };

    const handleDeleteWord = async (id: number) => {
        try {
            await deleteWord(id);
            setWords(prev => prev.filter(w => w.id !== id));
        } catch (err: any) {
            console.error("Error deleting word:", err);
            alert(`Nie udało się usunąć słowa: ${err.message || 'Wystąpił nieznany błąd.'}`);
        }
    };

    const renderView = () => {
        switch (currentView) {
            case View.Dashboard:
                return <Dashboard
                    sets={sets}
                    words={words}
                    loading={loading}
                    error={error}
                    onStartSession={handleStartSession}
                    onCreateSet={handleStartCreateSet}
                    onEditSet={handleStartEditSet}
                    onDeleteSet={handleDeleteSet}
                />;
            case View.SetCreator:
                return <SetCreator
                    words={words}
                    onSave={handleSaveSet}
                    onCancel={() => setCurrentView(View.Dashboard)}
                    set_to_edit={editingSet}
                />;
            case View.LearningSession:
                if(activeSession) {
                    return <LearningSession session={activeSession} words={words} onExit={handleExitSession} sessionImages={sessionImages} />;
                }
                setCurrentView(View.Dashboard);
                return null;
            case View.WordLibrary:
                return <WordLibrary
                    words={words}
                    loading={wordsLoading}
                    error={wordsError}
                    onSaveWord={handleSaveWord}
                    onDeleteWord={handleDeleteWord}
                />;
            default:
                return <Dashboard
                    sets={sets}
                    words={words}
                    loading={loading}
                    error={error}
                    onStartSession={handleStartSession}
                    onCreateSet={handleStartCreateSet}
                    onEditSet={handleStartEditSet}
                    onDeleteSet={handleDeleteSet}
                />;
        }
    };

    const NavItem: React.FC<{ icon: any, label: string, view?: View, onClick?: () => void }> = ({ icon, label, view, onClick }) => {
        const isActive = view !== undefined && currentView === view;
        const action = onClick ? onClick : () => view !== undefined && setCurrentView(view);
        return (
            <button
                onClick={action}
                className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                <Icon name={icon} className="w-6 h-6 mr-3" />
                <span className="font-medium">{label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen flex bg-gray-100">
            <aside className="w-64 bg-white shadow-md p-4 flex-shrink-0">
                <div className="flex items-center mb-8">
                    <span className="text-2xl font-bold text-indigo-600 bg-indigo-100 p-2 rounded-lg">CzT</span>
                    <h1 className="text-xl font-bold ml-3">Czytam z Tobą</h1>
                </div>
                <nav className="space-y-2">
                    <NavItem icon="home" label="Pulpit" view={View.Dashboard} />
                    <NavItem icon="book" label="Baza słów" view={View.WordLibrary} />
                    <NavItem icon="guide" label="Przewodnik" view={View.MethodGuide} />
                    <NavItem icon="chart" label="Postępy" view={View.ProgressJournal} />
                    <NavItem icon="plus" label="Stwórz zestaw" onClick={handleStartCreateSet} />
                </nav>
            </aside>
            <main className="flex-grow overflow-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default App;