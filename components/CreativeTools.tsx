import React, { useState, useRef } from 'react';
import { Camera, Wand2, Video, Loader2, Upload } from 'lucide-react';
import { editImageWithGemini, generateVeoVideo } from '../services/geminiService';

export const CreativeTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'image' | 'video'>('image');

  // Image State
  const [imgSource, setImgSource] = useState<string | null>(null);
  const [imgPrompt, setImgPrompt] = useState('');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video State
  const [videoSourceFile, setVideoSourceFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImgSource(evt.target?.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async () => {
    if (!imgSource || !imgPrompt) return;
    setIsProcessingImg(true);
    try {
      // Extract base64 part
      const base64 = imgSource.split(',')[1];
      const result = await editImageWithGemini(base64, imgPrompt);
      setEditedImage(result);
    } catch (e) {
      console.error(e);
      alert("Failed to edit image. Ensure you are using a valid image.");
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoSourceFile(file);
      setGeneratedVideoUrl(null);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoSourceFile) return;

    // API Key Check for Veo
    try {
      // Access aistudio via explicit any cast to avoid type conflicts with existing global types
      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await win.aistudio.openSelectKey();
          // Assuming successful selection or user retry
        }
      }
    } catch (e) {
      console.warn("AI Studio check failed, proceeding with env key logic if available", e);
    }

    setIsProcessingVideo(true);
    try {
      const url = await generateVeoVideo(videoSourceFile);
      setGeneratedVideoUrl(url);
    } catch (e) {
      console.error(e);
      alert("Video generation failed. Ensure you have a paid project API Key selected.");
    } finally {
      setIsProcessingVideo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-6">
      <div className="flex gap-4 border-b border-slate-700 pb-4">
        <button
          onClick={() => setActiveTool('image')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTool === 'image' 
            ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' 
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Wand2 size={20} />
          AI Фоторедактор
        </button>
        <button
          onClick={() => setActiveTool('video')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTool === 'video' 
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' 
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Video size={20} />
          Veo Анимация
        </button>
      </div>

      <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 p-6 overflow-y-auto">
        {activeTool === 'image' ? (
          <div className="grid md:grid-cols-2 gap-8 h-full">
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-white mb-2">1. Загрузите фото</h3>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-slate-700/30 transition-all min-h-[300px] relative overflow-hidden group"
              >
                {imgSource ? (
                  <img src={imgSource} className="w-full h-full object-contain absolute inset-0 p-4" alt="Original" />
                ) : (
                  <div className="text-center p-6">
                    <Camera className="w-12 h-12 text-slate-500 mx-auto mb-4 group-hover:text-pink-400" />
                    <p className="text-slate-400 font-medium">Нажмите для загрузки</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mt-auto">
                 <h3 className="text-sm font-bold text-slate-300 mb-2">2. Опишите изменение</h3>
                 <div className="flex gap-2">
                   <input 
                      type="text" 
                      value={imgPrompt}
                      onChange={(e) => setImgPrompt(e.target.value)}
                      placeholder="Например: добавь неоновый свет..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                   />
                   <button 
                      onClick={handleEditImage}
                      disabled={!imgSource || !imgPrompt || isProcessingImg}
                      className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center w-24"
                   >
                     {isProcessingImg ? <Loader2 className="animate-spin" /> : 'Go'}
                   </button>
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
               <h3 className="text-xl font-bold text-white mb-2">Результат (Gemini 2.5)</h3>
               <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center overflow-hidden min-h-[300px]">
                  {isProcessingImg ? (
                    <div className="text-center">
                       <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto mb-2" />
                       <p className="text-slate-500 text-sm">Магия происходит...</p>
                    </div>
                  ) : editedImage ? (
                    <img src={editedImage} className="w-full h-full object-contain" alt="Edited" />
                  ) : (
                    <p className="text-slate-600 text-sm">Здесь появится результат</p>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-8 h-full items-center justify-center text-center">
             <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Veo Video Generator</h2>
                <p className="text-slate-400">Оживите свои изображения с помощью самой продвинутой видео-модели.</p>
             </div>

             <div className="w-full grid md:grid-cols-2 gap-6">
                 <div 
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-2xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:bg-slate-800/80 transition-all overflow-hidden relative"
                 >
                    {videoPreviewUrl ? (
                      <img src={videoPreviewUrl} className="w-full h-full object-cover" alt="Source" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-500 mb-2" />
                        <p className="text-slate-400 text-sm">Загрузить изображение</p>
                      </>
                    )}
                    <input ref={videoInputRef} type="file" accept="image/*" className="hidden" onChange={handleVideoUpload} />
                 </div>

                 <div className="bg-black rounded-2xl aspect-video flex items-center justify-center overflow-hidden border border-slate-700">
                    {isProcessingVideo ? (
                       <div className="text-center p-6">
                          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
                          <p className="text-slate-300 text-sm font-medium">Veo генерирует видео...</p>
                          <p className="text-slate-500 text-xs mt-1">Это может занять 1-2 минуты</p>
                       </div>
                    ) : generatedVideoUrl ? (
                       <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                       <p className="text-slate-600 text-sm">Результат видео</p>
                    )}
                 </div>
             </div>

             <button
                onClick={handleGenerateVideo}
                disabled={!videoSourceFile || isProcessingVideo}
                className="w-full max-w-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-3"
             >
                {isProcessingVideo ? 'Генерация...' : 'Создать видео с Veo'}
             </button>
             
             <p className="text-xs text-slate-500">
               * Требуется выбор платного ключа API (Billing Account)
             </p>
          </div>
        )}
      </div>
    </div>
  );
};