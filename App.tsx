import React, { useState, useEffect } from 'react';
import { initialWordLibrary } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { LearningSet, Word, View, ActiveSession } from './types';
import { Dashboard } from './components/Dashboard';
import { SetCreator } from './components/SetCreator';
import { LearningSession } from './components/LearningSession';
import { Icon } from './components/ui/Icon';
import { supabase } from './supabase';


const App: React.FC = () => {
    const [words, setWords] = useLocalStorage<Word[]>('word-library', initialWordLibrary);
    const [sets, setSets] = useState<LearningSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<View>(View.Dashboard);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [sessionImages, setSessionImages] = useState<Record<string, string>>({});
    const [editingSet, setEditingSet] = useState<LearningSet | null>(null);

    useEffect(() => {
        const fetchSets = async () => {
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
            } catch (err: any) {
                console.error('Error fetching sets:', err);
                setError(`Nie udało się pobrać zestawów z bazy danych. Błąd: ${err.message || 'Wystąpił nieznany błąd.'}`);
            } finally {
                setLoading(false);
            }
        };

        fetchSets();
    }, []);

    const handleSaveSet = async (set: Partial<LearningSet>, images: Record<number, string>) => {
        // In a real app, images would be uploaded to Supabase Storage.
        // For this demo, we'll continue to handle them in session state.
        const newImages: Record<string, string> = {};
        Object.entries(images).forEach(([index, imageUrl]) => {
             // We need an ID for the key, but a new set doesn't have one yet.
             // This part of the logic would need revision with real storage.
             if (set.id) {
                newImages[`${set.id}-${index}`] = imageUrl;
             }
        });
        setSessionImages(prev => ({ ...prev, ...newImages }));

        try {
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
                }
            }
            
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