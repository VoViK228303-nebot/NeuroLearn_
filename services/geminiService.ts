import { GoogleGenAI } from "@google/genai";
import { Lesson, QuizQuestion, Module, CodingChallenge, CodeValidationResult, Course } from "../types";

// --- API KEYS ---

// NEW: Mistral API Key for Intelligence (Text, Logic, Code)
const MISTRAL_API_KEY = typeof window !== 'undefined' ? 
  (window as any).process?.env?.VITE_MISTRAL_API_KEY || 
  (import.meta as any).env.VITE_MISTRAL_API_KEY || 
  process.env.VITE_MISTRAL_API_KEY || 
  "Bj0gjtyfq2kSPjpd8MhPbAsZxmG2Iny9" : 
  process.env.MISTRAL_API_KEY || "Bj0gjtyfq2kSPjpd8MhPbAsZxmG2Iny9";

// OLD: Gemini API Key kept ONLY for Media (Images/Video) generation
// Mistral cannot generate images, so we need this fallback for the media tools to work.
const GEMINI_MEDIA_API_KEY = typeof window !== 'undefined' ? 
  (window as any).process?.env?.VITE_GEMINI_API_KEY || 
  (import.meta as any).env.VITE_GEMINI_API_KEY || 
  process.env.VITE_GEMINI_API_KEY || 
  "AIzaSyAgSQK8B6Xmt2rB_V43q7eJ5F_tX39JKO4" : 
  process.env.GEMINI_API_KEY || "AIzaSyAgSQK8B6Xmt2rB_V43q7eJ5F_tX39JKO4";

// --- MISTRAL HELPER ---

/**
 * Calls Mistral API via fetch. 
 * Note: Used 'mistral-large-latest' for complex logic and 'mistral-small-latest' for speed.
 */
async function callMistral(
    systemPrompt: string, 
    userPrompt: string, 
    jsonMode: boolean = false
): Promise<string> {
    const url = "https://api.mistral.ai/v1/chat/completions";
    
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: jsonMode ? "mistral-large-latest" : "mistral-small-latest",
                messages: messages,
                temperature: 0.7,
                response_format: jsonMode ? { type: "json_object" } : undefined
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Mistral API Error: ${err.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Mistral Call Failed:", error);
        throw error;
    }
}

// --- HELPER: Clean JSON ---
const cleanJson = (text: string): string => {
  if (!text) return "";
  // Mistral usually returns clean JSON in json_object mode, but just in case
  return text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
};

// --- Text Generation Functions (POWERED BY MISTRAL) ---

export const generateClarifyingQuestions = async (topic: string): Promise<string[]> => {
  const system = `You are an expert curriculum designer. 
  Generate 3 short, distinct clarifying questions (in Russian) to help understand the user's current knowledge level, specific goals, and learning style regarding the topic provided.
  Return a JSON object with a key "questions" containing an array of strings.`;
  
  const user = `Topic: "${topic}"`;

  try {
    const text = await callMistral(system, user, true);
    const parsed = JSON.parse(cleanJson(text));
    return parsed.questions || parsed; // Handle if it returns array directly or wrapped
  } catch (e) {
      console.error("Error generating clarifying questions:", e);
      return [
          "Каков ваш текущий уровень знаний в этой области?",
          "Какова ваша основная цель изучения этой темы?",
          "Как вы предпочитаете учиться (теория или практика)?"
      ];
  }
};

export const generateRoadmap = async (topic: string, clarificationContext: string): Promise<Module[]> => {
  const system = `You are a course creator. Create a comprehensive course roadmap (Russian language).
  CRITICAL: User starts from ZERO.
  Structure:
  - Exactly 6 Modules.
  - Module 1 must be "Foundations/Basics".
  - Each Module has 6-8 Lessons.
  
  Return JSON format strictly:
  [
    {
      "title": "Module Title",
      "description": "Short overview",
      "lessons": [
        { "title": "Lesson Title", "description": "Short description" }
      ]
    }
  ]`;
  
  const user = `Topic: "${topic}". Context: ${clarificationContext}`;

  const text = await callMistral(system, user, true);
  
  let rawModules;
  try {
      const parsed = JSON.parse(cleanJson(text));
      // Mistral might wrap it in a root object key like "modules" even if we asked for array
      rawModules = Array.isArray(parsed) ? parsed : (parsed.modules || parsed.data);
  } catch (e) {
      throw new Error("Failed to parse Mistral roadmap JSON");
  }
  
  return rawModules.map((m: any, mIdx: number) => ({
    id: `mod-${mIdx}`,
    title: m.title,
    description: m.description,
    lessons: m.lessons.map((l: any, lIdx: number) => ({
      id: `mod-${mIdx}-less-${lIdx}`,
      title: l.title,
      description: l.description,
      status: (mIdx === 0 && lIdx === 0) ? 'unlocked' : 'locked'
    }))
  }));
};

export const expandCourse = async (course: Course, specificTopic?: string): Promise<Module[]> => {
    const existingModules = course.modules.map(m => m.title).join(", ");
    
    let instruction = `Generate 2 NEW, ADVANCED modules to continue this course. 
    Do not repeat existing topics. Focus on advanced concepts.`;

    if (specificTopic && specificTopic.trim() !== "") {
        instruction = `The user wants to learn: "${specificTopic}". Create 2 NEW modules covering this in depth.`;
    }
    
    const system = `You are a course creator. 
    Existing modules: ${existingModules}.
    ${instruction}
    Language: Russian.
    Return JSON array of modules (same structure as before).`;

    const user = `Topic: ${course.topic}`;

    const text = await callMistral(system, user, true);
    
    let rawModules;
    try {
        const parsed = JSON.parse(cleanJson(text));
        rawModules = Array.isArray(parsed) ? parsed : (parsed.modules || parsed.data);
    } catch(e) { throw new Error("Failed to parse expansion"); }
    
    const currentModuleCount = course.modules.length;
    
    return rawModules.map((m: any, mIdx: number) => ({
      id: `mod-${currentModuleCount + mIdx}`,
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l: any, lIdx: number) => ({
        id: `mod-${currentModuleCount + mIdx}-less-${lIdx}`,
        title: l.title,
        description: l.description,
        status: 'locked'
      }))
    }));
};

export const generateLessonContent = async (topic: string, lessonTitle: string, moduleTitle?: string): Promise<string> => {
  const system = `You are an educational tutor. Write a lesson in Markdown (Russian).
  Audience: Beginner.
  Length: Medium (~500 words).
  Structure: Intro, Concepts, Examples (with Code blocks if applicable), Summary.`;

  const user = `Topic: "${topic}". Module: "${moduleTitle}". Lesson: "${lessonTitle}".`;

  try {
      return await callMistral(system, user, false); // False = regular text mode
  } catch (e) {
      return "Ошибка загрузки урока. Попробуйте обновить.";
  }
};

export const generateCodingChallenges = async (lessonContent: string): Promise<CodingChallenge[]> => {
  const system = `Generate 2 beginner coding challenges in Russian based on the lesson provided.
  Output JSON format:
  [
    {
      "title": "Task Title",
      "description": "Task description",
      "starterCode": "Code snippet",
      "solutionReference": "Correct code",
      "hint": "Hint string"
    }
  ]`;
  
  const user = `Lesson content: ${lessonContent.substring(0, 2000)}...`;

  try {
    const text = await callMistral(system, user, true);
    let items = JSON.parse(cleanJson(text));
    if (!Array.isArray(items)) items = items.challenges || [];
    
    return items.map((item: any, i: number) => ({ ...item, id: `challenge-${i}` }));
  } catch (e) {
    console.warn("Skipping challenges", e);
    return [];
  }
};

export const validateUserCode = async (taskDescription: string, userCode: string, solutionReference: string): Promise<CodeValidationResult> => {
  const system = `Evaluate user code against a task and solution.
  Output JSON: { "passed": boolean, "feedback": "string (Russian)" }`;
  
  const user = `Task: ${taskDescription}
  Correct Solution: ${solutionReference}
  User Code: ${userCode}`;

  try {
      const text = await callMistral(system, user, true);
      return JSON.parse(cleanJson(text));
  } catch (e) {
      return { passed: false, feedback: "Ошибка проверки." };
  }
};

export const generateQuiz = async (lessonContent: string): Promise<QuizQuestion[]> => {
  const system = `Generate 3 multiple-choice questions (Russian) based on the lesson.
  Output JSON: Array of { "question": string, "options": string[], "correctAnswerIndex": number }`;
  
  const user = `Lesson: ${lessonContent.substring(0, 2000)}...`;

  try {
    const text = await callMistral(system, user, true);
    let data = JSON.parse(cleanJson(text));
    if (!Array.isArray(data)) data = data.questions || [];
    return data;
  } catch (e) {
    console.warn("Skipping quiz", e);
    return [];
  }
};

export const runCodeSimulation = async (code: string, language: string = 'javascript'): Promise<string> => {
  const system = `Act as a ${language} console/interpreter. Execute the code mentally and return ONLY the output string. If there is an error, return the error message. Do not explain.`;
  const user = `Code:\n${code}`;

  try {
      return await callMistral(system, user, false);
  } catch (e) {
      return `Error: ${e}`;
  }
};

// --- Media & Tools (POWERED BY GEMINI) ---
// Mistral cannot generate images/video, so we keep Gemini here.

// Helper to get Gemini client safely
const getGeminiClient = () => {
  // Ensure string is literal to avoid bundler issues
  if (!GEMINI_MEDIA_API_KEY) throw new Error("GEMINI_MEDIA_API_KEY is missing");
  return new GoogleGenAI({ apiKey: GEMINI_MEDIA_API_KEY });
};

export const generateLessonIllustration = async (topic: string, lessonTitle: string): Promise<string | null> => {
  try {
    const ai = getGeminiClient();
    const prompt = `Futuristic educational illustration for "${lessonTitle}" in "${topic}". Style: 3D render, dark, neon.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Dedicated image model
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
  } catch (e) {
      console.warn("Failed to generate illustration:", e);
  }
  return null;
}

export const generateLessonVideoSummary = async (topic: string, lessonTitle: string): Promise<string> => {
  const ai = getGeminiClient();
  
  // Use Gemini for the visual prompt too as it knows Veo better
  // Using 'gemini-2.0-flash-exp' or similar stable model for text prompt generation
  const promptRes = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp', 
    contents: `Visual prompt for AI video about "${lessonTitle}" in "${topic}". Max 20 words.`,
  });
  
  const videoPrompt = promptRes.text?.trim() || `Abstract animation about ${lessonTitle}`;

  // Veo Generation
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: videoPrompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  // We must re-use the specific key for fetch
  const videoResponse = await fetch(`${downloadLink}&key=${GEMINI_MEDIA_API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: `Edit this image: ${prompt}` }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateVeoVideo = async (file: File, prompt?: string): Promise<string> => {
  const ai = getGeminiClient();
  const arrayBuffer = await file.arrayBuffer();
  const base64Image = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || "Animate this image naturally",
    image: { imageBytes: base64Image, mimeType: file.type },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  const videoResponse = await fetch(`${downloadLink}&key=${GEMINI_MEDIA_API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};
