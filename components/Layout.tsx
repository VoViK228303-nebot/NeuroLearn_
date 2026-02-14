import React, { ReactNode } from 'react';
import { Sparkles, BookOpen, Video, Image as ImageIcon, User, Layers } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab?: 'learn' | 'create' | 'profile';
  onTabChange?: (tab: 'learn' | 'create' | 'profile') => void;
  showTabs?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, showTabs = false }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => onTabChange && onTabChange('profile')} // Go to profile on logo click
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">NeuroLearn</span>
          </div>
          
          {showTabs && onTabChange && (
            <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => onTabChange('learn')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'learn' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">Обучение</span>
              </button>
              <button
                onClick={() => onTabChange('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'create' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Layers size={16} />
                <span className="hidden sm:inline">Инструменты</span>
              </button>
               <button
                onClick={() => onTabChange('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'profile' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <User size={16} />
                <span className="hidden sm:inline">Профиль</span>
              </button>
            </nav>
          )}

          {!showTabs && (
             <div className="w-8"></div> 
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};