import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { ClarificationState } from '../types';

interface ClarificationFlowProps {
  topic: string;
  clarificationState: ClarificationState;
  onAnswer: (answer: string) => void;
  isLoading: boolean;
}

export const ClarificationFlow: React.FC<ClarificationFlowProps> = ({ 
  topic, 
  clarificationState, 
  onAnswer,
  isLoading 
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAnswer(input);
    setInput('');
  };

  const currentQ = clarificationState.questions[clarificationState.currentQuestionIndex];
  // Calculate progress
  const total = clarificationState.questions.length;
  const current = clarificationState.currentQuestionIndex + 1;

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col h-[70vh]">
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto p-4 rounded-2xl bg-slate-800/50 border border-slate-700 mb-4">
        {/* History */}
        <div className="flex gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="bg-slate-700 rounded-2xl rounded-tl-none p-4 text-slate-200 shadow-md">
            <p className="mb-2 font-semibold text-indigo-300">План обучения: {topic}</p>
            <p>Прежде чем мы начнем, я задам пару вопросов, чтобы составить идеальный курс для вас.</p>
          </div>
        </div>

        {clarificationState.answers.map((ans, i) => (
          <React.Fragment key={i}>
            <div className="flex gap-4 flex-row-reverse animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none p-4 shadow-md max-w-[80%]">
                {ans}
              </div>
            </div>
            {i + 1 < clarificationState.questions.length && (
              <div className="flex gap-4 animate-fade-in">
                 <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="bg-slate-700 rounded-2xl rounded-tl-none p-4 text-slate-200 shadow-md">
                   {clarificationState.questions[i+1]}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Current Question */}
        {!isLoading && clarificationState.currentQuestionIndex < total && (
           <div className="flex gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-tl-none p-4 text-slate-200 shadow-md">
              <p className="text-sm text-indigo-400 mb-1">Вопрос {current} из {total}</p>
              {currentQ}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-indigo-600/50"></div>
            <div className="h-12 bg-slate-700/50 rounded-2xl w-1/2"></div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Введите ваш ответ..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 transition-colors flex items-center gap-2 font-medium"
        >
          <Send className="w-5 h-5" />
          <span className="hidden sm:inline">Ответить</span>
        </button>
      </form>
    </div>
  );
};