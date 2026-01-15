import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage } from '../types';

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, "").trim();
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
};

const getAI = () => {
  try {
    if (!process.env.API_KEY) throw new Error("Missing API Key");
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.warn("API Key missing or invalid. App will use fallback mode.");
    return null;
  }
};

const NOVA_PERSONA = `
  You are "Nova", a world-class AI Career Architect. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  You provide high-fidelity professional guidance.
`;

export const analyzeInterests = async (
  inputs: { question: string, answer: string }[],
  additionalComments: string,
  excludedCareerTitles: string[] = []
): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];

  const exclusionContext = excludedCareerTitles.length > 0
    ? `IMPORTANT: Do NOT suggest the following careers as they are already listed: ${excludedCareerTitles.join(', ')}.`
    : '';

  const prompt = `
    ${NOVA_PERSONA}
    Analyze the user's psychological and professional profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    Additional User Context: "${additionalComments}"
    ${exclusionContext}

    STRICT TASK:
    Provide the top 3 most scientifically aligned career paths for this user. 
    Calculate a fitScore (0-100) based on their logic, learning style, and motivation.
    Provide a professional reason for each match.

    Return JSON array: [{id, title, description, fitScore, reason}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      },
    });
    const text = cleanJsonString(response.text || "[]");
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis failed:", e);
    return [];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];

  const prompt = `
    ${NOVA_PERSONA}
    The user is searching for: "${query}".
    Provide exactly 3 professional variations or specializations related to this search.
    Include a realistic fitScore (100 for the exact match, slightly less for variants).
    Return JSON array: [{id, title, description, fitScore, reason}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) {
    return [];
  }
};

export const generateRoadmap = async (
  careerTitle: string,
  eduYear: string,
  targetDate: string,
  expLevel: string,
  focusAreas: string,
  adaptationContext?: any
): Promise<RoadmapPhase[]> => {
  const ai = getAI();
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  let totalDays = 30;
  if (targetDate) {
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const diffTime = end.getTime() - start.getTime();
      totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  // Use higher granularity for long timelines to avoid exceeding context while filling the days
  const isLongTerm = totalDays > 60;
  const durationType = isLongTerm ? "blocks like '1 week', '10 days', or '2 weeks'" : "'1 day'";

  const prompt = `
      ${NOVA_PERSONA}
      Create a comprehensive professional roadmap for: "${careerTitle}".
      Duration: ${totalDays} Days. Level: ${expLevel}. Focus: "${focusAreas}".
      
      STRICT ARCHITECTURAL RULES:
      1. You MUST generate a sequence of phases and tasks that fill the ENTIRE ${totalDays} day period.
      2. For each task, assign a "duration" as a string (e.g. "1 day", "1 week", "10 days").
      3. The SUM of all durations across all tasks MUST equal exactly ${totalDays} days.
      4. If the duration is long (e.g. 300+ days), use larger task blocks (1-2 weeks each) to cover the time.
      5. Each task MUST have:
         - "title": Clear, professional task name
         - "duration": String
         - "explanation": Detailed guidance on what to achieve.
         - "suggestedResources": Array of {title, url}.
      
      Output JSON format: [{ phaseName: string, items: RoadmapItem[] }]
    `;

  try {
    if (!ai) throw new Error("AI missing");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '[]'));
    
    let taskIdCounter = 1;
    const generationId = Date.now().toString(36);

    return data.map((phase: any, pIdx: number) => ({
      ...phase,
      items: (phase.items || []).map((item: any) => ({
        ...item,
        id: `task-${generationId}-${pIdx}-${taskIdCounter++}`,
        status: 'pending',
        duration: item.duration || (isLongTerm ? '1 week' : '1 day'),
        suggestedResources: Array.isArray(item.suggestedResources) ? item.suggestedResources : []
      }))
    }));
  } catch (e) {
    console.error("Roadmap generation failed", e);
    return [];
  }
};

export const generatePracticeDataBatch = async (careerTitle: string): Promise<any> => {
  const ai = getAI();
  if (!ai) return { topics: [], questions: [], interviews: {} };
  
  const prompt = `
    ${NOVA_PERSONA}
    Generate a high-volume professional practice set for: "${careerTitle}".
    
    REQUIREMENTS:
    1. List 10 specific core sub-topics.
    2. Generate 30 MCQs across different difficulty levels (Beginner to Expert).
    3. Generate 10 interview questions for each of these: "Google", "Amazon", "Microsoft", "Startups".
    
    Each MCQ must have: {id, question, options[4], correctIndex, explanation, topic}.
    Each Interview Question must have: {id, question, answer, explanation, company}.

    Return exactly ONE JSON object: { "topics": [...], "questions": [...], "interviews": { "Google": [...], "Amazon": [...], ... } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    return data;
  } catch (e) {
    console.error("Batch generation failed", e);
    return { topics: [], questions: [], interviews: {} };
  }
};

const parseDurationInDays = (durationStr: string): number => {
  const str = durationStr.toLowerCase();
  const num = parseInt(str) || 1;
  if (str.includes('week')) return num * 7;
  if (str.includes('month')) return num * 30;
  return num;
};

export const calculateRemainingDays = (roadmap: RoadmapPhase[]): number => {
  if (!roadmap) return 0;
  let totalDays = 0;
  roadmap.forEach(p => {
    if (p.items) {
      p.items.forEach(i => {
        if (i.status !== 'completed') {
          totalDays += parseDurationInDays(i.duration);
        }
      });
    }
  });
  return totalDays;
};

export const fetchTechNews = async (topic: string): Promise<NewsItem[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 5 recent news headlines about "${topic}".`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const ground = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return ground
      .filter((c: any) => c.web)
      .map((c: any) => ({ 
        title: c.web.title, 
        url: c.web.uri, 
        source: new URL(c.web.uri).hostname, 
        summary: '', 
        date: 'Recent' 
      }));
  } catch (e) {
    return [];
  }
};

export const generateDailyQuiz = async (careerTitle: string): Promise<DailyQuizItem | null> => {
  const ai = getAI();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create one technical MCQ for ${careerTitle}. JSON: {question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || 'null'));
  } catch (e) {
    return null;
  }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  const prompt = `${NOVA_PERSONA} Generate a 5-question skill calibration quiz for: ${careerTitle}. JSON: [{id, question, options[], correctIndex, difficulty}].`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    return [];
  }
};

export const generatePracticeTopics = async (careerTitle: string): Promise<string[]> => {
  const ai = getAI();
  if (!ai) return ["Core Concepts"];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 10 specific topics for ${careerTitle}. JSON array of strings.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    return ["Core Concepts"];
  }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string, searchQuery?: string): Promise<PracticeQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 10 technical MCQs for ${careerTitle} ${topic || ''}. JSON array: {id, question, options[4], correctIndex, explanation, topic}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    return [];
  }
};

export const generateCompanyInterviewQuestions = async (careerTitle: string, filter: string, customParams?: any): Promise<InterviewQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  const prompt = `Generate 10 targeted interview questions for ${careerTitle} specifically for ${filter} style interviews. JSON array: {id, question, answer, explanation, company}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const results = JSON.parse(cleanJsonString(response.text || '[]'));
    return results.map((r: any, idx: number) => ({
        ...r,
        id: r.id || `iq-${Date.now()}-${idx}`,
        company: r.company || filter
    }));
  } catch (e) {
    return [];
  }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
  const ai = getAI();
  try {
    if (!ai) throw new Error();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a job simulation scenario for ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    return { id: '1', scenario: 'Simulation error.', question: 'Error?', options: ['A','B','C','D'], correctIndex: 0, explanation: 'Error' };
  }
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[]): Promise<string> => {
  const ai = getAI();
  if (!ai) return "I am currently in architect mode (offline).";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User: ${message}. Current focus: ${careerTitle}. Context: This is a professional career architect chat. Answer concisely and helpful.`
    });
    return response.text || "I'm processing that. One moment.";
  } catch (e) {
    return "The architect is busy. Try again soon.";
  }
};
