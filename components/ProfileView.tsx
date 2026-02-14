import React, { useState } from 'react';
import { Course } from '../types';
import { PlayCircle, PlusCircle, Trash2, Award, Clock, BookOpen, Loader2, Sparkles, X } from 'lucide-react';
import { expandCourse } from '../services/geminiService';

interface ProfileViewProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onCreateNew: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  courses, 
  onSelectCourse, 
  onUpdateCourse, 
  onDeleteCourse,
  onCreateNew 
}) => {
  // Expansion Dialog State
  const [expandDialogCourse, setExpandDialogCourse] = useState<Course | null>(null);
  const [expandTopic, setExpandTopic] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);

  const calculateProgress = (course: Course) => {
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completed = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.status === 'completed').length, 0);
    return totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  };

  const handleOpenExpandDialog = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setExpandDialogCourse(course);
    setExpandTopic("");
  };

  const handleConfirmExpand = async () => {
    if (!expandDialogCourse) return;
    setIsExpanding(true);
    try {
      // Pass the specific topic if provided, otherwise generic expansion
      const newModules = await expandCourse(expandDialogCourse, expandTopic);
      const updatedCourse = {
        ...expandDialogCourse,
        modules: [...expandDialogCourse.modules, ...newModules]
      };
      onUpdateCourse(updatedCourse);
      setExpandDialogCourse(null);
    } catch (error) {
      console.error(error);
      alert("Не удалось расширить курс. Попробуйте позже.");
    } finally {
      setIsExpanding(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Вы уверены, что хотите удалить этот курс?")) {
      onDeleteCourse(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in relative">
      {/* Expand Dialog */}
      {expandDialogCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !isExpanding && setExpandDialogCourse(null)}>
           <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Sparkles className="text-indigo-400" size={20} />
                     Расширить курс
                  </h3>
                  {!isExpanding && (
                     <button onClick={() => setExpandDialogCourse(null)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                     </button>
                  )}
               </div>
               
               <div className="p-6">
                  <p className="text-slate-300 mb-2 font-medium">Курс: <span className="text-white font-bold">{expandDialogCourse.topic}</span></p>
                  <p className="text-slate-400 text-sm mb-6">
                     Хотите углубиться в конкретную тему или довериться ИИ? Введите тему ниже (например, "Pandas Library", "AsyncIO", "Advanced Patterns") или оставьте пустым для общего расширения.
                  </p>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Что изучить дальше?</label>
                     <input 
                        type="text" 
                        value={expandTopic}
                        onChange={(e) => setExpandTopic(e.target.value)}
                        placeholder="Например: Библиотека Pandas"
                        disabled={isExpanding}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                        autoFocus
                     />
                  </div>
               </div>

               <div className="p-6 bg-slate-800/50 border-t border-slate-800 flex gap-3 justify-end">
                  <button 
                     onClick={() => setExpandDialogCourse(null)}
                     disabled={isExpanding}
                     className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                  >
                     Отмена
                  </button>
                  <button 
                     onClick={handleConfirmExpand}
                     disabled={isExpanding}
                     className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                     {isExpanding ? (
                        <>
                           <Loader2 size={18} className="animate-spin" />
                           Генерация модулей...
                        </>
                     ) : (
                        <>
                           <PlusCircle size={18} />
                           Добавить модули
                        </>
                     )}
                  </button>
               </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Мои Курсы</h1>
           <p className="text-slate-400">Управляйте своим обучением и расширяйте знания</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105"
        >
          <PlusCircle size={20} />
          Создать новый
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/30 p-8 text-center">
            <BookOpen className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Нет активных курсов</h3>
            <p className="text-slate-400 mb-6">Начните изучение новой темы прямо сейчас</p>
            <button 
                onClick={onCreateNew}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4"
            >
                Создать первый курс
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const progress = calculateProgress(course);

            return (
              <div 
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="group bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-900/10 cursor-pointer flex flex-col"
              >
                {/* Card Header */}
                <div className="p-6 pb-4 flex-1">
                   <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
                        Курс
                      </div>
                      <div className="flex gap-2">
                         <button 
                            onClick={(e) => handleDelete(e, course.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Удалить курс"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                   
                   <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                     {course.topic}
                   </h3>
                   
                   <div className="flex items-center gap-4 text-slate-400 text-sm mb-6">
                      <div className="flex items-center gap-1.5">
                         <Clock size={14} />
                         <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <BookOpen size={14} />
                         <span>{course.modules.length} Модулей</span>
                      </div>
                   </div>
                </div>

                {/* Progress Section */}
                <div className="px-6 pb-6">
                   <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Прогресс</span>
                      <span className={progress === 100 ? 'text-green-400' : 'text-indigo-400'}>{progress}%</span>
                   </div>
                   <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-6">
                      <div 
                        className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                   </div>

                   <div className="flex gap-3">
                      <button 
                        className="flex-1 bg-slate-700 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                         <PlayCircle size={16} />
                         Продолжить
                      </button>
                      <button 
                        onClick={(e) => handleOpenExpandDialog(e, course)}
                        className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center border border-slate-600 hover:border-slate-500 hover:text-indigo-300"
                        title="Расширить курс новыми модулями"
                      >
                         <PlusCircle size={18} />
                      </button>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};