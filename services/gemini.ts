import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';

const cleanJsonString = (str: string): string => {
  let cleaned = str.replace(/```json\n?|```/g, "").trim();
  const startBrace = cleaned.indexOf('{');
  const startBracket = cleaned.indexOf('[');
  let startIndex = -1;
  
  if (startBrace !== -1 && startBracket !== -1) {
    startIndex = Math.min(startBrace, startBracket);
  } else {
    startIndex = Math.max(startBrace, startBracket);
  }

  if (startIndex !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);
    if (endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  return cleaned;
};

const NOVA_PERSONA = `
  You are "Nova", a world-class AI Career Architect and Psychologist. 
  Your personality is futuristic, encouraging, analytical, and highly structured. 
  You specialize in matching obscure psychological traits to high-growth industry roles in the 2024-2025 economy.
`;

export const calculateRemainingDays = (phases: RoadmapPhase[]): number => {
  return phases.reduce((acc, phase) => acc + (phase.items?.filter(item => item.status === 'pending').length || 0), 0);
};

export const analyzeInterests = async (answers: {question: string, answer: string}[], comment: string, excludeTitles?: string[]): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ${NOVA_PERSONA}
    Analyze these psychometric responses: ${JSON.stringify(answers)}.
    Additional context: ${comment}.
    ${excludeTitles ? `Exclude these existing suggestions: ${excludeTitles.join(', ')}.` : ''}
    
    Identify 3 distinct, high-growth career paths in the current global economy that align with these traits.
    Return ONLY a JSON array of objects with these properties:
    { "id": "string", "title": "string", "description": "string", "fitScore": number (0-100), "reason": "string" }
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    console.error("Interest analysis failed:", e);
    return [];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ${NOVA_PERSONA}
    STRICT SEARCH PROTOCOL: Find career paths that are a DIRECT match or high-relevance specialization of the query: "${query}".
    
    ACCURACY RULES:
    1. LITERAL MATCH: If "${query}" is a recognized job title, the first result MUST be that exact role.
    2. DOMAIN RELEVANCE: All 3 results MUST be professional careers within the same industry as "${query}".
    3. NO CREATIVE HALLUCINATIONS: Do not suggest unrelated roles just because they are high-growth (e.g. if searching 'Doctor', do not suggest 'Software Engineer').
    4. VARIATION: Suggest 3 distinct levels or specializations of "${query}" (e.g. if 'Teacher', suggest 'Primary Teacher', 'Special Education Teacher', 'Educational Consultant').
    5. FAIL-SAFE: If the query is nonsense, return an empty array [].
    
    Return ONLY a JSON array of 3 objects with these properties:
    { "id": "string", "title": "string", "description": "string", "fitScore": number (95-100 for direct matches), "reason": "string" }
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    console.error("Career search failed:", e);
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
): Promise<RoadmapData> => {
  if (!process.env.API_KEY) return { phases: [], recommendedCertificates: [], recommendedInternships: [] };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  let totalDays = 30;
  if (targetDate) {
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const prompt = `
      ${NOVA_PERSONA}
      Architect a professional roadmap for: "${careerTitle}".
      Duration: ${totalDays} Days. Level: ${expLevel}. Focus: "${focusAreas}".
      
      STRICT ARCHITECTURAL RULES:
      1. QUANTITY: You MUST generate EXACTLY ${totalDays} total items across all phases. Every single day from 1 to ${totalDays} MUST have exactly one task.
      2. MAPPING: Each task MUST have a "dayIndex" property from 1 to ${totalDays}.
      3. LOGIC: Tasks must progress logically from foundational to advanced.
      4. CONTENT: Each description must be 25-35 words. 2-3 REAL resources per task.
      
      Output JSON format: 
      {
        "phases": [{ 
          "phaseName": "Phase Title", 
          "items": [{ 
            "dayIndex": number,
            "title": "string", 
            "description": "string", 
            "type": "skill" | "project", 
            "explanation": "string", 
            "suggestedResources": [{"title": "string", "url": "string"}] 
          }] 
        }],
        "recommendedCertificates": [{ "title": "string", "provider": "string", "url": "string", "relevance": "string" }],
        "recommendedInternships": [{ "title": "string", "company": "string", "url": "string", "description": "string" }]
      }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    
    let taskIdCounter = 1;
    const genId = Date.now().toString(36);

    const processedPhases = (data.phases || []).map((phase: any, pIdx: number) => ({
      ...phase,
      items: (phase.items || []).map((item: any) => ({
        ...item,
        id: `task-${genId}-${pIdx}-${taskIdCounter++}`,
        status: 'pending',
        duration: '1 day',
        type: item.type === 'project' ? 'project' : 'skill'
      }))
    }));

    return {
      phases: processedPhases,
      recommendedCertificates: data.recommendedCertificates || [],
      recommendedInternships: data.recommendedInternships || []
    };
  } catch (e) {
    console.error("Roadmap generation failed:", e);
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }
};

export const generatePracticeDataBatch = async (careerTitle: string): Promise<any> => {
  if (!process.env.API_KEY) return { topics: [], questions: [], interviews: {} };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    ${NOVA_PERSONA}
    Generate a concise practice set for: "${careerTitle}".
    
    REQUIREMENTS:
    1. List 8 technical sub-topics.
    2. Generate 15 high-quality technical MCQs. {id, question, options[4], correctIndex, explanation, topic}.
    3. Generate 15 targeted interview questions tagged by company (Google, Amazon, Microsoft, Startups).
    
    Return ONE JSON object: { "topics": [...], "questions": [...], "interviews": { "Google": [...], "Amazon": [...], "Microsoft": [...], "Startups": [...] } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    console.error("Batch generation failed:", e);
    return { topics: [], questions: [], interviews: {} };
  }
};

export const fetchTechNews = async (topic: string, userId?: string, careerId?: string): Promise<NewsItem[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Latest professional tech news about "${topic}". Provide working links to articles.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const newsItems: NewsItem[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((c: any) => {
      if (c.web && c.web.uri && c.web.title) {
        if (!newsItems.some(existing => existing.url === c.web.uri)) {
            newsItems.push({
              title: c.web.title,
              url: c.web.uri,
              source: new URL(c.web.uri).hostname.replace('www.', '').split('.')[0].toUpperCase(),
              summary: '',
              date: 'Recent'
            });
        }
      }
    });
    return newsItems;
  } catch (e) { return []; }
};

export const generateDailyQuiz = async (careerTitle: string, userId?: string): Promise<DailyQuizItem | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a challenging technical multiple choice question for a ${careerTitle}. JSON: {question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || 'null'));
  } catch (e) { return null; }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `${NOVA_PERSONA} Generate a 5-question skill calibration quiz for: ${careerTitle}. JSON: [{id, question, options[], correctIndex, difficulty}].`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Simulate a critical workplace scenario for a ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    return { id: '1', scenario: 'Simulation error.', question: 'Error?', options: ['A','B','C','D'], correctIndex: 0, explanation: 'Error' };
  }
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[], context?: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Offline.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `System: ${NOVA_PERSONA} Focus: ${careerTitle}. Context: ${context}. History: ${JSON.stringify(history.slice(-3))}. User: ${message}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Busy.";
  } catch (e) { return "Connection error."; }
};

export const generatePracticeTopics = async (careerTitle: string) => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `List 5 technical sub-topics for a ${careerTitle}. JSON: ["topic1", "topic2", ...]`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string): Promise<PracticeQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate 5 technical MCQs for ${careerTitle} ${topic ? `focused on ${topic}` : ''}. JSON: [{id, question, options[4], correctIndex, explanation, topic}].`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateCompanyInterviewQuestions = async (careerTitle: string, company: string, params?: any): Promise<InterviewQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate 5 interview questions for ${careerTitle} at ${company}. ${params?.topic ? `Focus on ${params.topic}.` : ''} ${params?.difficulty ? `Difficulty: ${params.difficulty}.` : ''} JSON: [{id, question, answer, explanation, company}].`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};
