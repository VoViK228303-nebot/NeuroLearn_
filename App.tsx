import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ClarificationFlow } from './components/ClarificationFlow';
import { CourseView } from './components/CourseView';
import { CreativeTools } from './components/CreativeTools';
import { ProfileView } from './components/ProfileView';
import { AppState, ClarificationState, Course } from './types';
import { generateClarifyingQuestions, generateRoadmap } from './services/geminiService';
import { Brain, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          <h2 className="text-2xl font-bold text-white mb-2">Произошла ошибка</h2>
          <p className="text-slate-400 mb-8 max-w-md">Возможно, данные сессии были повреждены. Попробуйте сбросить состояние приложения.</p>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 hover:scale-105"
          >
            Сбросить и перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('INITIAL');
  const [activeTab, setActiveTab] = useState<'learn' | 'create' | 'profile'>('learn');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  // Flow State
  const [clarification, setClarification] = useState<ClarificationState>({
    questions: [],
    answers: [],
    currentQuestionIndex: 0
  });

  // Load Persistence on Mount
  useEffect(() => {
    try {
        const savedCourses = localStorage.getItem('neuroLearnCourses');
        const savedState = localStorage.getItem('neuroLearnState') as AppState;
        const savedActiveId = localStorage.getItem('neuroLearnActiveId');

        // Migration: Check for old single course format
        const oldCourse = localStorage.getItem('neuroLearnCourse');
        
        if (savedCourses) {
            setCourses(JSON.parse(savedCourses));
        } else if (oldCourse) {
            // Migrate old single course to array
            const parsed = JSON.parse(oldCourse);
            const migrated: Course = {
                ...parsed,
                id: parsed.id || `course-${Date.now()}`,
                createdAt: parsed.createdAt || Date.now()
            };
            setCourses([migrated]);
            localStorage.setItem('neuroLearnCourses', JSON.stringify([migrated]));
            localStorage.removeItem('neuroLearnCourse'); // Clean up
        }

        if (savedActiveId) {
            setActiveCourseId(savedActiveId);
        }

        // Restore state if valid
        if (savedState && ['LEARNING', 'PROFILE', 'CREATIVE'].includes(savedState)) {
             setAppState(savedState);
             if (savedState === 'PROFILE') setActiveTab('profile');
             else if (savedState === 'CREATIVE') setActiveTab('create');
             else setActiveTab('learn');
        }

    } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.clear();
    }
  }, []);

  // Save Persistence on Change
  useEffect(() => {
    localStorage.setItem('neuroLearnCourses', JSON.stringify(courses));
    if (activeCourseId) localStorage.setItem('neuroLearnActiveId', activeCourseId);
    
    // Only save specific stable states, don't save loading states
    if (['INITIAL', 'LEARNING', 'PROFILE', 'CREATIVE'].includes(appState)) {
         localStorage.setItem('neuroLearnState', appState);
    }
  }, [courses, appState, activeCourseId]);

  // --- Handlers ---

  const handleStartTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const questions = await generateClarifyingQuestions(topic);
      setClarification({
        questions,
        answers: [],
        currentQuestionIndex: 0
      });
      setAppState('CLARIFYING');
    } catch (err) {
      console.error(err);
      alert("Не удалось запустить генерацию. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationAnswer = async (answer: string) => {
    const nextAnswers = [...clarification.answers, answer];
    const nextIndex = clarification.currentQuestionIndex + 1;

    setClarification(prev => ({
      ...prev,
      answers: nextAnswers,
      currentQuestionIndex: nextIndex
    }));

    // If all answered, generate roadmap
    if (nextIndex >= clarification.questions.length) {
      setAppState('GENERATING');
      try {
        const context = clarification.questions.map((q, i) => `Q: ${q} A: ${nextAnswers[i]}`).join('; ');
        
        const modules = await generateRoadmap(topic, context);
        
        const newCourse: Course = {
          id: `course-${Date.now()}`,
          topic,
          modules,
          currentModuleIndex: 0,
          currentLessonIndex: 0,
          createdAt: Date.now()
        };

        setCourses(prev => [...prev, newCourse]);
        setActiveCourseId(newCourse.id);
        setAppState('LEARNING');
        setActiveTab('learn');

      } catch (err) {
        console.error(err);
        alert("Ошибка создания курса. Попробуйте более конкретную тему.");
        setAppState('INITIAL');
      }
    }
  };

  const handleUpdateActiveCourse = (updated: Course) => {
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteCourse = (id: string) => {
      setCourses(prev => prev.filter(c => c.id !== id));
      if (activeCourseId === id) {
          setActiveCourseId(null);
          setAppState('PROFILE');
      }
  };

  // --- Render Logic ---

  const activeCourse = courses.find(c => c.id === activeCourseId);

  const renderContent = () => {
    if (activeTab === 'create') return <CreativeTools />;
    if (activeTab === 'profile') return (
        <ProfileView 
            courses={courses}
            onSelectCourse={(c) => {
                setActiveCourseId(c.id);
                setAppState('LEARNING');
                setActiveTab('learn');
            }}
            onUpdateCourse={handleUpdateActiveCourse}
            onDeleteCourse={handleDeleteCourse}
            onCreateNew={() => {
                setTopic('');
                setAppState('INITIAL');
                setActiveTab('learn');
                setActiveCourseId(null);
            }}
        />
    );

    // Learning Tab Logic
    switch (appState) {
      case 'INITIAL':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Чему вы хотите научиться?
            </h1>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl">
              Наш ИИ создаст персональный курс университетского уровня с глубокими объяснениями и адаптивной структурой.
            </p>
            
            <form onSubmit={handleStartTopic} className="w-full max-w-xl relative group z-10">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative flex bg-slate-900 rounded-xl shadow-2xl">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Например: Квантовая механика, React Native..."
                  className="w-full bg-slate-800 text-white px-6 py-4 rounded-xl rounded-r-none border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={loading || !topic}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-8 rounded-xl rounded-l-none font-bold text-lg flex items-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                </button>
              </div>
            </form>
          </div>
        );

      case 'CLARIFYING':
        return (
          <ClarificationFlow 
            topic={topic} 
            clarificationState={clarification} 
            onAnswer={handleClarificationAnswer}
            isLoading={loading && clarification.answers.length === clarification.questions.length}
          />
        );

      case 'GENERATING':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Создаем структуру курса</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Разрабатываем модули, планируем уроки и адаптируем материал под ваши ответы.
            </p>
          </div>
        );

      case 'LEARNING':
        return activeCourse ? (
          <CourseView 
            course={activeCourse} 
            updateCourse={handleUpdateActiveCourse} 
          />
        ) : (
             <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                 <p className="text-slate-400 mb-4 text-lg">Выберите курс из профиля или создайте новый.</p>
                 <button 
                    onClick={() => setActiveTab('profile')} 
                    className="text-indigo-400 hover:text-indigo-300 underline font-bold"
                >
                    Перейти в профиль
                </button>
             </div>
        );

      default:
        // Fallback to Profile if lost state
        if (courses.length > 0) {
            setAppState('PROFILE'); // This will trigger re-render on next tick roughly speaking, but safe for render fallback
            return <div />; 
        }
        return (
             <div className="text-center p-10">
                 <button onClick={() => setAppState('INITIAL')} className="text-indigo-400 underline">На главную</button>
             </div>
        );
    }
  };

  const showTabs = ['LEARNING', 'PROFILE', 'CREATIVE'].includes(appState) || activeTab === 'profile' || activeTab === 'create';

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={(tab) => {
          setActiveTab(tab);
          // If switching to learn tab but no active course, handle gracefully in renderContent
          if (tab === 'profile') setAppState('PROFILE');
      }} 
      showTabs={courses.length > 0} // Only show tabs if user has at least one course created
    >
      <ErrorBoundary>
        {renderContent()}
      </ErrorBoundary>
    </Layout>
  );
}