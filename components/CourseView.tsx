import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { 
    CheckCircle, Lock, PlayCircle, ChevronRight, ChevronDown, 
    Book, Award, Terminal, Copy, Check, X, RefreshCw, Play,
    ImageIcon, Menu, X as CloseIcon, Lightbulb, ArrowRightCircle, FastForward, Loader2,
    Settings, Type, Palette, AlignJustify, Video
} from 'lucide-react';
import { Course, Lesson, QuizQuestion, CodingChallenge } from '../types';
import { generateLessonContent, generateQuiz, generateCodingChallenges, validateUserCode, generateLessonIllustration, runCodeSimulation, generateLessonVideoSummary } from '../services/geminiService';

// --- Editor Settings & Context ---

interface EditorTheme {
    name: string;
    bg: string;
}

const EDITOR_THEMES: EditorTheme[] = [
    { name: 'VS Code', bg: '#1e1e1e' },
    { name: 'Midnight', bg: '#000000' },
    { name: 'Dracula', bg: '#282a36' },
    { name: 'GitHub Dark', bg: '#0d1117' },
    { name: 'Monokai', bg: '#272822' },
    { name: 'Solarized Dark', bg: '#002b36' },
    { name: 'Atom One Dark', bg: '#282c34' },
    { name: 'Material Theme', bg: '#263238' },
];

interface EditorSettings {
    fontSize: number;
    lineHeight: number;
    theme: EditorTheme;
}

const DEFAULT_SETTINGS: EditorSettings = {
    fontSize: 14,
    lineHeight: 1.5,
    theme: EDITOR_THEMES[0]
};

const EditorSettingsContext = React.createContext<{
    settings: EditorSettings;
    updateSettings: (s: Partial<EditorSettings>) => void;
}>({
    settings: DEFAULT_SETTINGS,
    updateSettings: () => {}
});

const useEditorSettings = () => useContext(EditorSettingsContext);

interface CourseViewProps {
  course: Course;
  updateCourse: (course: Course) => void;
}

// --- Enhanced Code Editor Component (Overlay Method) ---
interface CodeEditorProps {
    value: string;
    onChange?: (val: string) => void;
    language: string;
    readOnly?: boolean;
    autoHeight?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, readOnly = false, autoHeight = false }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const { settings } = useEditorSettings();

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    useEffect(() => {
        if (preRef.current && (window as any).Prism) {
            (window as any).Prism.highlightElement(preRef.current.querySelector('code'));
        }
    }, [value, language]);

    // Calculate height for auto-expanding functionality
    const lineHeightPx = settings.fontSize * settings.lineHeight;
    const padding = 32; // 1rem top + 1rem bottom
    const lineCount = value.split('\n').length;
    const heightStyle = autoHeight 
        ? { height: `${Math.max(100, lineCount * lineHeightPx + padding)}px` } 
        : { height: '100%' };

    const editorStyle = {
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    };

    return (
        <div 
            className="relative w-full overflow-hidden group transition-all duration-300 rounded-b-xl" 
            style={{ ...heightStyle, backgroundColor: settings.theme.bg }}
        >
             {/* Syntax Highlight Layer - Behind */}
            <pre
                ref={preRef}
                className={`language-${language} absolute inset-0 m-0 p-4 pointer-events-none overflow-hidden font-mono custom-scrollbar`}
                aria-hidden="true"
                style={{ 
                    ...editorStyle,
                    backgroundColor: settings.theme.bg, // Force background match
                }} 
            >
                <code className={`language-${language}`}>
                    {value + '\n'} {/* Extra newline to match textarea behavior */}
                </code>
            </pre>

            {/* Input Layer - Front */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                onScroll={handleScroll}
                readOnly={readOnly}
                spellCheck={false}
                className={`absolute inset-0 w-full h-full m-0 p-4 bg-transparent text-transparent caret-white resize-none border-none outline-none font-mono custom-scrollbar z-10 ${readOnly ? 'cursor-default' : ''}`}
                 style={{ 
                    ...editorStyle,
                    color: 'transparent' 
                }} 
            />
        </div>
    );
};

// --- Interactive Code Block for Lessons ---
const InteractiveCodeBlock = ({ children, className }: { children?: React.ReactNode, className?: string }) => {
    const language = className?.replace('language-', '') || 'text';
    const initialCode = String(children).replace(/\n$/, '');
    const [code, setCode] = useState(initialCode);
    const [output, setOutput] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [copied, setCopied] = useState(false);
    const { settings } = useEditorSettings();

    // Check if we support running this language
    const isRunnable = ['javascript', 'typescript', 'python', 'bash'].includes(language);

    const handleRun = async () => {
        setIsRunning(true);
        setOutput(null);
        try {
            const res = await runCodeSimulation(code, language);
            setOutput(res);
        } catch (e) {
            setOutput("Error executing code.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div 
            className="my-8 rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0d1117] group transition-all hover:border-slate-700"
            style={{ backgroundColor: settings.theme.bg }}
        >
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5 select-none">
                <div className="flex items-center gap-4">
                     {/* MacOS-style Traffic Lights */}
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm"></div>
                    </div>
                    {/* Language Badge */}
                    <div className="flex items-center gap-2 opacity-50 pl-2 border-l border-white/10">
                        {language === 'bash' ? <Terminal size={13} className="text-slate-400" /> : <div className="w-3 h-3 rounded-sm bg-indigo-500/50"></div>}
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">{language}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                     {isRunnable && (
                         <button 
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all
                                ${isRunning 
                                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40'
                                }`}
                        >
                            {isRunning ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor" />}
                            Run
                        </button>
                     )}
                     
                    <button 
                        onClick={handleCopy}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/10 active:scale-95"
                        title="Copy code"
                    >
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
            
            {/* Editor Area */}
            <div className="relative group/editor">
                <CodeEditor 
                    value={code} 
                    onChange={setCode} 
                    language={language} 
                    autoHeight={true}
                    readOnly={!isRunnable} 
                />
            </div>

            {/* Output Area */}
            {output && (
                <div className="border-t border-white/10 bg-black/40 p-4 animate-slide-up">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                        <Terminal size={12} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Console Output</span>
                    </div>
                    <pre className="font-mono text-sm text-green-300 whitespace-pre-wrap pl-1 leading-relaxed border-l-2 border-green-500/30 pl-3">{output}</pre>
                </div>
            )}
        </div>
    );
};

// --- Practical Coding Lab Component ---
const CodingLab = ({ 
    challenges, 
    onComplete 
}: { 
    challenges: CodingChallenge[], 
    onComplete: () => void 
}) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [userCode, setUserCode] = useState(challenges[0]?.starterCode || '');
    const [isValidating, setIsValidating] = useState(false);
    const [feedback, setFeedback] = useState<{passed: boolean, msg: string} | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const { settings } = useEditorSettings();

    const activeChallenge = challenges[activeIdx];

    useEffect(() => {
        setUserCode(activeChallenge.starterCode);
        setFeedback(null);
    }, [activeChallenge]);

    const handleRun = async () => {
        setIsValidating(true);
        setFeedback(null);
        try {
            const result = await validateUserCode(activeChallenge.description, userCode, activeChallenge.solutionReference);
            setFeedback({ passed: result.passed, msg: result.feedback });
            
            if (result.passed) {
                const newCompleted = new Set(completedIds);
                newCompleted.add(activeChallenge.id);
                setCompletedIds(newCompleted);

                // If all done
                if (newCompleted.size === challenges.length) {
                    setTimeout(onComplete, 2000);
                }
            }
        } catch (e) {
            setFeedback({ passed: false, msg: "Ошибка проверки кода." });
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div 
            className="rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col h-[700px] lg:h-[650px] my-6 transition-colors duration-300"
            style={{ backgroundColor: settings.theme.bg }}
        >
            <div className="bg-[#2d2d2d] p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-white font-bold">
                    <Terminal size={18} className="text-indigo-400" />
                    Практическая Лаборатория
                </div>
                <div className="flex gap-2">
                    {challenges.map((_, i) => (
                        <div 
                            key={i} 
                            onClick={() => setActiveIdx(i)}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                                i === activeIdx ? 'bg-indigo-500 scale-125' : 
                                completedIds.has(challenges[i].id) ? 'bg-green-500' : 'bg-slate-600'
                            }`} 
                        />
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Task Description Side */}
                <div className="w-full lg:w-1/3 bg-slate-800/50 p-6 border-b lg:border-b-0 lg:border-r border-slate-700 overflow-y-auto max-h-[35%] lg:max-h-full">
                    <h3 className="text-lg font-bold text-white mb-3">{activeChallenge.title}</h3>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">{activeChallenge.description}</p>
                    
                    <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={16} className="text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Подсказка</span>
                        </div>
                        <p className="text-indigo-200 text-sm leading-relaxed">{activeChallenge.hint}</p>
                    </div>

                    {feedback && (
                        <div className={`mt-4 p-4 rounded-xl border animate-fade-in ${feedback.passed ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {feedback.passed ? <CheckCircle className="text-green-400" size={18}/> : <X className="text-red-400" size={18}/>}
                                <span className={`font-bold ${feedback.passed ? 'text-green-400' : 'text-red-400'}`}>
                                    {feedback.passed ? 'Верно!' : 'Ошибка'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">{feedback.msg}</p>
                            {feedback.passed && completedIds.size < challenges.length && (
                                <button 
                                    onClick={() => setActiveIdx((prev) => Math.min(prev + 1, challenges.length - 1))}
                                    className="mt-3 text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                                >
                                    Следующая задача
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Editor Side */}
                <div className="flex-1 flex flex-col relative min-h-[300px]" style={{ backgroundColor: settings.theme.bg }}>
                    <div className="flex-1 relative">
                        <CodeEditor 
                            value={userCode} 
                            onChange={setUserCode} 
                            language="javascript"
                        />
                    </div>
                    
                    <div className="absolute bottom-6 right-6 flex gap-3 z-20">
                        <button 
                            onClick={() => setUserCode(activeChallenge.starterCode)}
                            className="bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw size={14} /> <span className="hidden sm:inline">Сброс</span>
                        </button>
                        <button 
                            onClick={handleRun}
                            disabled={isValidating}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            {isValidating ? '...' : <><Play size={16} /> Проверить</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Settings Dialog ---
const EditorSettingsDialog = ({ 
    isOpen, 
    onClose 
}: { 
    isOpen: boolean; 
    onClose: () => void 
}) => {
    const { settings, updateSettings } = useEditorSettings();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-indigo-400" />
                        Настройки редактора
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Theme */}
                    <div>
                        <label className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                            <Palette size={16} /> Тема оформления
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {EDITOR_THEMES.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => updateSettings({ theme: t })}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                        settings.theme.name === t.name 
                                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border border-slate-500" style={{ backgroundColor: t.bg }}></div>
                                        {t.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Size */}
                    <div>
                         <label className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                            <Type size={16} /> Размер шрифта: {settings.fontSize}px
                        </label>
                        <input 
                            type="range" 
                            min="12" 
                            max="24" 
                            step="1" 
                            value={settings.fontSize}
                            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                         <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                            <span>12px</span>
                            <span>18px</span>
                            <span>24px</span>
                        </div>
                    </div>

                    {/* Line Height */}
                    <div>
                         <label className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                            <AlignJustify size={16} /> Межстрочный интервал: {settings.lineHeight}
                        </label>
                        <div className="flex gap-2">
                            {[1.2, 1.5, 1.8, 2.0].map(lh => (
                                <button
                                    key={lh}
                                    onClick={() => updateSettings({ lineHeight: lh })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-mono font-medium transition-all border ${
                                        settings.lineHeight === lh 
                                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {lh}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Готово
                    </button>
                </div>
            </div>
        </div>
    );
}

// ... CourseView Component Wrapper ...
export const CourseView: React.FC<CourseViewProps> = (props) => {
    // State initialization from localStorage
    const [settings, setSettings] = useState<EditorSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('neuroLearnEditorSettings');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) { console.error(e); }
            }
        }
        return DEFAULT_SETTINGS;
    });

    const updateSettings = (newSettings: Partial<EditorSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...newSettings };
            localStorage.setItem('neuroLearnEditorSettings', JSON.stringify(next));
            return next;
        });
    };

    return (
        <EditorSettingsContext.Provider value={{ settings, updateSettings }}>
            <CourseViewContent {...props} />
        </EditorSettingsContext.Provider>
    );
};

// ... Real CourseView Content ...
const CourseViewContent: React.FC<CourseViewProps> = ({ course, updateCourse }) => {
  const activeModule = course.modules[course.currentModuleIndex];
  const activeLesson = activeModule.lessons[course.currentLessonIndex];
  
  const [content, setContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  
  // Stages: READING -> CHALLENGE -> QUIZ -> COMPLETE
  const [viewStage, setViewStage] = useState<'READING' | 'CHALLENGE' | 'QUIZ'>('READING');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  
  // UI State
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([activeModule.id]));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // Modal state

  // Progress Calculation
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.status === 'completed').length, 0);
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  const toggleModule = (modId: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(modId)) newSet.delete(modId);
    else newSet.add(modId);
    setExpandedModules(newSet);
  };

  useEffect(() => {
    const loadLesson = async () => {
      if (!activeLesson) return;
      
      // Reset view state when lesson changes
      setViewStage('READING');
      setQuizSubmitted(false);
      setQuizAnswers([]);
      setChallenges([]); // Clear old challenges
      setGeneratedImage(activeLesson.imageUrl || null);
      
      // Close mobile menu on lesson select
      setMobileMenuOpen(false);

      if (activeLesson.content) {
        setContent(activeLesson.content);
        setQuiz(activeLesson.quiz || []);
        setChallenges(activeLesson.codingChallenges || []);
        
        if (!activeLesson.imageUrl && !activeLesson.videoUrl) {
             generateLessonIllustration(course.topic, activeLesson.title).then(img => {
                 if (img) {
                     setGeneratedImage(img);
                     const updatedModules = [...course.modules];
                     updatedModules[course.currentModuleIndex].lessons[course.currentLessonIndex].imageUrl = img;
                     updateCourse({ ...course, modules: updatedModules });
                 }
             });
        }
        return;
      }

      setLoadingContent(true);
      
      try {
        const text = await generateLessonContent(course.topic, activeLesson.title, activeModule.title);
        setContent(text);

        const [quizData, challengeData, imgData] = await Promise.all([
             generateQuiz(text),
             generateCodingChallenges(text),
             generateLessonIllustration(course.topic, activeLesson.title)
        ]);
        
        setQuiz(quizData);
        setChallenges(challengeData);
        setGeneratedImage(imgData);

        const updatedModules = [...course.modules];
        const currentLessonRef = updatedModules[course.currentModuleIndex].lessons[course.currentLessonIndex];
        currentLessonRef.content = text;
        currentLessonRef.quiz = quizData;
        currentLessonRef.codingChallenges = challengeData;
        currentLessonRef.imageUrl = imgData || undefined;
        
        updateCourse({ ...course, modules: updatedModules });

      } catch (error) {
        console.error("Error loading lesson:", error);
      } finally {
        setLoadingContent(false);
      }
    };

    if (activeLesson && activeLesson.status !== 'locked') {
      loadLesson();
    }
  }, [activeLesson?.id]);

  const handleLessonSelect = (modIdx: number, lessIdx: number) => {
    const targetLesson = course.modules[modIdx].lessons[lessIdx];
    if (targetLesson.status === 'locked') return;
    updateCourse({ ...course, currentModuleIndex: modIdx, currentLessonIndex: lessIdx });
  };

  const markLessonCompleted = () => {
    const updatedModules = [...course.modules];
    updatedModules[course.currentModuleIndex].lessons[course.currentLessonIndex].status = 'completed';
    updateCourse({ ...course, modules: updatedModules });
  };

  const handleSkipToPractice = () => {
    markLessonCompleted();
    setViewStage('CHALLENGE');
  };

  const handleQuizAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    const newAnswers = [...quizAnswers];
    newAnswers[qIndex] = optionIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const updatedModules = [...course.modules];
    updatedModules[course.currentModuleIndex].lessons[course.currentLessonIndex].status = 'completed';
    
    let nextModIdx = course.currentModuleIndex;
    let nextLessIdx = course.currentLessonIndex + 1;
    if (nextLessIdx >= updatedModules[nextModIdx].lessons.length) {
        nextModIdx++;
        nextLessIdx = 0;
    }
    if (nextModIdx < updatedModules.length && nextLessIdx < updatedModules[nextModIdx].lessons.length) {
        updatedModules[nextModIdx].lessons[nextLessIdx].status = 'unlocked';
        if (nextModIdx !== course.currentModuleIndex) {
             setExpandedModules(prev => new Set(prev).add(updatedModules[nextModIdx].id));
        }
    }
    updateCourse({ ...course, modules: updatedModules });
  };

  const moveToNextLesson = () => {
      let nextModIdx = course.currentModuleIndex;
      let nextLessIdx = course.currentLessonIndex + 1;
      if (nextLessIdx >= course.modules[nextModIdx].lessons.length) {
          nextModIdx++;
          nextLessIdx = 0;
      }
      if (nextModIdx < course.modules.length) {
          updateCourse({ ...course, currentModuleIndex: nextModIdx, currentLessonIndex: nextLessIdx });
      }
  };

  const handleGenerateVideo = async () => {
    // Check key
    try {
        const win = window as any;
        if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
            }
        }
    } catch (e) {
        console.warn("Key check failed", e);
    }

    setGeneratingVideo(true);
    try {
        const videoUrl = await generateLessonVideoSummary(course.topic, activeLesson.title);
        // Update lesson with video
        const updatedModules = [...course.modules];
        updatedModules[course.currentModuleIndex].lessons[course.currentLessonIndex].videoUrl = videoUrl;
        updateCourse({ ...course, modules: updatedModules });
    } catch (e) {
        console.error("Failed to generate video", e);
        alert("Не удалось создать видео. Убедитесь, что выбран ключ API с поддержкой Veo (Billing Account).");
    } finally {
        setGeneratingVideo(false);
    }
  };

  // --- Typography & Markdown Configuration ---
  const markdownComponents: Components = {
      p: ({children}) => (
        <p className="mb-8 text-lg md:text-xl leading-relaxed md:leading-loose text-slate-300 tracking-wide font-light">{children}</p>
      ),
      h1: ({children}) => (
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-white mb-8 mt-4 tracking-tight">{children}</h1>
      ),
      h2: ({children}) => (
        <div className="mt-16 mb-8 group">
           <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 pb-4 border-b border-slate-700/60">
             <span className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full inline-block shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
             {children}
           </h2>
        </div>
      ),
      h3: ({children}) => (
        <h3 className="text-xl md:text-2xl font-semibold text-indigo-300 mt-10 mb-5 flex items-center gap-2">
          <ChevronRight size={20} className="text-indigo-500" />
          {children}
        </h3>
      ),
      ul: ({children}) => <ul className="space-y-4 mb-10 pl-2">{children}</ul>,
      ol: ({children}) => <ol className="space-y-4 mb-10 pl-2 list-none counter-reset-list">{children}</ol>,
      li: ({children}) => (
        <li className="flex gap-3 text-lg text-slate-300 leading-relaxed items-start">
           <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
           <div>{children}</div>
        </li>
      ),
      blockquote: ({children}) => (
        <blockquote className="my-10 border-l-4 border-indigo-500 bg-slate-800/40 p-6 md:p-8 rounded-r-2xl relative overflow-hidden group">
           <div className="absolute top-4 right-4 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
               <Lightbulb size={48} />
           </div>
           <div className="relative z-10 italic text-lg md:text-xl text-indigo-100 font-medium leading-relaxed">{children}</div>
        </blockquote>
      ),
      strong: ({children}) => (
        <strong className="font-bold text-white bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{children}</strong>
      ),
      code(props) {
          const {children, className, node, ...rest} = props
          const match = /language-(\w+)/.exec(className || '')
          if (match || String(children).includes('\n')) {
            return <InteractiveCodeBlock className={className || ''}>{children}</InteractiveCodeBlock>
          }
          return <code className="bg-slate-700/60 text-indigo-300 px-2 py-1 rounded-md text-sm font-mono border border-slate-600/50" {...rest}>{children}</code>
      }
  };

  const isAllAnswered = quiz.length > 0 && quizAnswers.filter(a => a !== undefined).length === quiz.length;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-100px)] gap-6 relative">
      <EditorSettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Mobile Menu Button */}
      <div className="lg:hidden mb-4 flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
         <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Текущий урок</span>
            <span className="font-bold text-white truncate max-w-[200px]">{activeLesson?.title || "Урок"}</span>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
                <Menu size={20} />
            </button>
         </div>
      </div>

      {/* Sidebar - Responsive Drawer */}
      <aside className={`
          fixed inset-y-0 left-0 z-50 w-full md:w-80 bg-slate-900/95 backdrop-blur-xl lg:bg-slate-900/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block
          flex flex-col rounded-none lg:rounded-2xl border-r lg:border border-slate-700 overflow-hidden shadow-2xl lg:shadow-xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700 bg-slate-800/80 flex flex-col gap-4 relative">
          <button 
             onClick={() => setMobileMenuOpen(false)}
             className="absolute top-4 right-4 lg:hidden p-2 text-slate-400 hover:text-white"
          >
             <CloseIcon size={24} />
          </button>
          <div>
            <h2 className="font-bold text-2xl text-white tracking-tight">Программа</h2>
            <p className="text-xs text-indigo-400 font-bold tracking-widest uppercase truncate pr-8 mt-1">{course.topic}</p>
          </div>
          <div className="w-full">
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Прогресс курса</span>
                <span className="text-white">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out"
                    style={{width: `${progressPercent}%`}}
                ></div>
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {course.modules.map((module, mIdx) => {
             const isExpanded = expandedModules.has(module.id);
             const activeInModule = course.currentModuleIndex === mIdx;
             const modLessons = module.lessons.length;
             const modCompleted = module.lessons.filter(l => l.status === 'completed').length;
             const modPercent = modLessons > 0 ? (modCompleted / modLessons) * 100 : 0;
             
             return (
                 <div key={module.id} className="border-b border-slate-800/50 last:border-0">
                    <button 
                        onClick={() => toggleModule(module.id)}
                        className={`w-full text-left p-5 flex flex-col transition-all duration-200 group ${activeInModule ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                    >
                        <div className="flex items-center justify-between w-full mb-3">
                            <span className={`text-xs font-bold uppercase tracking-wider ${activeInModule ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`}>Модуль {mIdx + 1}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <span className="font-bold text-slate-100 text-sm leading-snug mb-3 pr-2">{module.title}</span>
                        <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${modPercent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                style={{width: `${modPercent}%`}}
                            ></div>
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="bg-black/20 py-2 shadow-inner">
                            {module.lessons.map((lesson, lIdx) => {
                                const isActive = course.currentModuleIndex === mIdx && course.currentLessonIndex === lIdx;
                                const isLocked = lesson.status === 'locked';
                                const isCompleted = lesson.status === 'completed';

                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => handleLessonSelect(mIdx, lIdx)}
                                        disabled={isLocked}
                                        className={`w-full text-left px-5 py-3.5 flex items-center justify-between transition-all relative group
                                            ${isActive ? 'bg-indigo-600/10 border-r-2 border-indigo-500' : 'hover:bg-slate-800/40 border-r-2 border-transparent'}
                                            ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                                 {isLocked ? <Lock size={18} /> : <PlayCircle size={18} />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium leading-snug transition-colors ${isActive ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                    {lIdx + 1}. {lesson.title}
                                                </p>
                                            </div>
                                        </div>
                                        {isCompleted && (
                                            <div className="bg-green-500/10 p-1 rounded-full border border-green-500/30">
                                                <CheckCircle size={14} className="text-green-500" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                 </div>
             )
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden flex flex-col relative h-full shadow-2xl min-h-[60vh] backdrop-blur-sm">
        {loadingContent ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-fade-in">
            <div className="relative">
                 <div className="w-24 h-24 border-4 border-slate-700 rounded-full"></div>
                 <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Book className="w-8 h-8 text-indigo-400 animate-pulse" />
                 </div>
            </div>
            <div className="text-center max-w-md">
                <h3 className="text-2xl font-bold text-white mb-3">Создаем магию...</h3>
                <p className="text-slate-400 text-lg leading-relaxed">ИИ пишет теорию, рисует иллюстрации и готовит задачи специально для вас.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col scroll-smooth">
             
             {/* Sticky Lesson Progress Header */}
             <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 p-4 sticky top-0 z-10 transition-all flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center justify-between gap-3 md:gap-8 max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all shadow-lg ${viewStage === 'READING' ? 'bg-indigo-600 text-white scale-110 shadow-indigo-500/20' : 'bg-slate-700 text-slate-400'}`}>1</div>
                        <span className={`text-sm md:text-base font-medium hidden sm:block ${viewStage === 'READING' ? 'text-white' : 'text-slate-500'}`}>Теория</span>
                    </div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${viewStage === 'CHALLENGE' || viewStage === 'QUIZ' ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all shadow-lg ${viewStage === 'CHALLENGE' ? 'bg-indigo-600 text-white scale-110 shadow-indigo-500/20' : 'bg-slate-700 text-slate-400'}`}>2</div>
                         <span className={`text-sm md:text-base font-medium hidden sm:block ${viewStage === 'CHALLENGE' ? 'text-white' : 'text-slate-500'}`}>Практика</span>
                    </div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${viewStage === 'QUIZ' ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                    <div className="flex items-center gap-3 group cursor-default">
                         <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all shadow-lg ${viewStage === 'QUIZ' ? 'bg-indigo-600 text-white scale-110 shadow-indigo-500/20' : 'bg-slate-700 text-slate-400'}`}>3</div>
                         <span className={`text-sm md:text-base font-medium hidden sm:block ${viewStage === 'QUIZ' ? 'text-white' : 'text-slate-500'}`}>Тест</span>
                    </div>
                </div>
                {/* Desktop Settings Trigger */}
                <button 
                    onClick={() => setShowSettings(true)}
                    className="hidden md:flex p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Настройки редактора"
                >
                    <Settings size={20} />
                </button>
             </div>

             {/* Content Blocks */}
             {viewStage === 'READING' && (
                <div className="p-6 md:p-12 max-w-4xl mx-auto animate-fade-in w-full pb-24">
                   <div className="mb-12 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-6">
                            <Book size={14} />
                            <span>Модуль {course.currentModuleIndex + 1}: {activeModule.title}</span>
                        </div>
                        <h1 className="text-3xl md:text-6xl font-extrabold text-white leading-tight mb-8 tracking-tight drop-shadow-sm">{activeLesson?.title}</h1>
                        
                        {/* Media Section: Image or Video */}
                        <div className="w-full mb-10 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 relative group bg-black/40 min-h-[250px] md:min-h-[400px]">
                            {activeLesson.videoUrl ? (
                                <video 
                                    src={activeLesson.videoUrl} 
                                    controls 
                                    className="w-full h-full object-contain max-h-[500px]"
                                />
                            ) : generatedImage ? (
                                <>
                                    <img src={generatedImage} alt={activeLesson.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 pointer-events-none"></div>
                                    <div className="absolute bottom-4 right-4 z-20">
                                        <button 
                                            onClick={handleGenerateVideo}
                                            disabled={generatingVideo}
                                            className="bg-black/60 hover:bg-violet-600 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-white/10 transition-all hover:scale-105"
                                        >
                                            {generatingVideo ? <Loader2 className="animate-spin" size={16}/> : <Video size={16} />}
                                            Создать видео-саммари
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[250px]">
                                     <span className="text-slate-500 text-sm font-medium tracking-wide animate-pulse">Генерация иллюстрации...</span>
                                </div>
                            )}
                        </div>
                   </div>
                   <div className="prose prose-invert prose-sm md:prose-xl max-w-none">
                        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
                    </div>
                    <div className="mt-20 pt-10 border-t border-slate-700 flex flex-col md:flex-row justify-center md:justify-end gap-4">
                        <button 
                            onClick={handleSkipToPractice}
                            className="text-slate-400 hover:text-white px-6 py-4 rounded-2xl font-semibold flex items-center gap-2 transition-colors hover:bg-slate-700/30"
                        >
                            <FastForward size={20} />
                            <span>Пропустить и отметить</span>
                        </button>
                        <button 
                            onClick={() => setViewStage('CHALLENGE')}
                            className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 md:px-12 md:py-5 rounded-2xl font-bold text-lg flex items-center gap-4 transition-all shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_40px_-5px_rgba(79,70,229,0.6)] hover:-translate-y-1"
                        >
                            <span>Перейти к практике</span>
                            <ArrowRightCircle size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
             )}

             {viewStage === 'CHALLENGE' && (
                 <div className="p-4 md:p-8 flex-1 flex flex-col animate-fade-in pb-12">
                    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                        <div className="mb-6 flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                                Практическое задание
                            </h2>
                            <button onClick={() => setViewStage('READING')} className="text-slate-400 hover:text-white text-xs md:text-sm font-medium px-4 py-2 hover:bg-slate-700 rounded-lg transition-all">← Вернуться к теории</button>
                        </div>
                        {challenges.length > 0 ? (
                            <CodingLab challenges={challenges} onComplete={() => setViewStage('QUIZ')} />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
                                <Terminal className="w-10 h-10 text-slate-400 mb-6" />
                                <h3 className="text-2xl font-bold text-white mb-2">Код не требуется</h3>
                                <p className="text-slate-300 mb-8 text-lg max-w-md leading-relaxed">Для этого урока практические задачи на написание кода не предусмотрены.</p>
                                <button onClick={() => setViewStage('QUIZ')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/30 transition-transform hover:-translate-y-1">Перейти к тесту</button>
                            </div>
                        )}
                    </div>
                 </div>
             )}

             {viewStage === 'QUIZ' && (
                 <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-slate-900/50 animate-fade-in pb-12">
                     <div className="max-w-3xl w-full bg-slate-800 p-8 md:p-12 rounded-[2rem] border border-slate-700 shadow-2xl relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>
                         <div className="flex flex-col items-center gap-4 mb-10 text-center">
                            <Award className="w-8 h-8 text-white mb-2" />
                            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Проверка знаний</h2>
                            <p className="text-slate-400">Ответьте на вопросы, чтобы закрепить материал</p>
                        </div>
                        
                        <div className="space-y-10">
                            {quiz.map((q, qIdx) => (
                                <div key={qIdx} className="space-y-5 animate-slide-up" style={{animationDelay: `${qIdx * 100}ms`}}>
                                    <div className="flex gap-4">
                                        <span className="text-slate-500 font-mono text-xl pt-0.5 opacity-50">0{qIdx + 1}</span>
                                        <p className="font-bold text-xl md:text-2xl text-slate-100 leading-relaxed">{q.question}</p>
                                    </div>
                                    <div className="grid gap-3 pl-10">
                                        {q.options.map((opt, optIdx) => {
                                            let btnClass = "text-left p-4 md:p-5 rounded-xl border-2 transition-all font-medium text-base md:text-lg relative overflow-hidden ";
                                            if (quizSubmitted) {
                                                if (optIdx === q.correctAnswerIndex) btnClass += "bg-green-500/10 border-green-500/50 text-green-100";
                                                else if (quizAnswers[qIdx] === optIdx) btnClass += "bg-red-500/10 border-red-500/50 text-red-100";
                                                else btnClass += "bg-slate-800 border-slate-700/50 opacity-40";
                                            } else {
                                                if (quizAnswers[qIdx] === optIdx) btnClass += "bg-indigo-600 text-white border-indigo-500 shadow-lg scale-[1.01]";
                                                else btnClass += "bg-slate-800 hover:bg-slate-700/80 border-slate-700 hover:border-slate-600 text-slate-300";
                                            }
                                            return (
                                                <button key={optIdx} disabled={quizSubmitted} onClick={() => handleQuizAnswer(qIdx, optIdx)} className={btnClass}>
                                                    {opt}
                                                    {quizSubmitted && optIdx === q.correctAnswerIndex && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 flex flex-col-reverse md:flex-row justify-between items-center pt-8 border-t border-slate-700/50 gap-4">
                            <button onClick={() => setViewStage('CHALLENGE')} className="text-slate-400 hover:text-white font-medium transition-colors text-sm px-4 py-2 hover:bg-slate-700/50 rounded-lg">← Назад к задачам</button>
                            {!quizSubmitted ? (
                                <button disabled={!isAllAnswered} onClick={submitQuiz} className="w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-green-900/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                                    <CheckCircle size={20} /> Завершить урок
                                </button>
                            ) : (
                                <button onClick={moveToNextLesson} className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/30 transition-all hover:-translate-y-1">
                                    Следующий урок <ChevronRight size={22}/>
                                </button>
                            )}
                        </div>
                     </div>
                 </div>
             )}
          </div>
        )}
      </section>
    </div>
  );
};