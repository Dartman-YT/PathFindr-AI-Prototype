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

const getAI = () => {
  try {
    if (!process.env.API_KEY) throw new Error("Missing API Key");
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    return null;
  }
};

const NOVA_PERSONA = `
  You are "Nova", a world-class AI Career Architect and Psychologist. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  You use industry data and psychological profiling to architect careers.
`;

export const calculateRemainingDays = (phases: RoadmapPhase[]): number => {
  return phases.reduce((acc, phase) => acc + (phase.items?.filter(item => item.status === 'pending').length || 0), 0);
};

/**
 * CALL 1: Roadmap Generation
 * High complexity, prioritized for core UI.
 */
export const generateRoadmap = async (
  careerTitle: string,
  eduYear: string,
  targetDate: string,
  expLevel: string,
  focusAreas: string
): Promise<RoadmapData> => {
  const ai = getAI();
  if (!ai) return { phases: [], recommendedCertificates: [], recommendedInternships: [] };

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
      
      RULES:
      1. Exactly 1 item per day for ${totalDays} days.
      2. Valid, working links for Certs/Internships from Coursera, edX, LinkedIn, or official sites.
      3. No placeholders. 
      
      JSON: {
        "phases": [{ "phaseName", "items": [{ "title", "description", "type", "explanation", "suggestedResources": [{"title", "url"}] }] }],
        "recommendedCertificates": [{ "title", "provider", "url", "relevance" }],
        "recommendedInternships": [{ "title", "company", "url", "description" }]
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
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }
};

/**
 * CALL 2: Knowledge Batch
 * Consolidates all secondary data to save rate limits.
 */
export const generateKnowledgeBatch = async (careerTitle: string): Promise<{
    dailyQuiz: DailyQuizItem;
    practiceQuestions: PracticeQuestion[];
    interviewQuestions: Record<string, InterviewQuestion[]>;
    news: NewsItem[];
    topics: string[];
}> => {
    const ai = getAI();
    if (!ai) throw new Error("AI Offline");

    const prompt = `
        ${NOVA_PERSONA}
        Generate an industry data batch for: "${careerTitle}".
        
        Requirements:
        1. 10 technical sub-topics.
        2. 1 Daily Quiz MCQ + Explanation.
        3. 15 Practice MCQs.
        4. 15 Interview Questions (tagged Google, Amazon, Microsoft, Startups).
        5. 15 News headlines with REAL URLs.
        
        JSON Format:
        {
          "topics": ["string"],
          "dailyQuiz": { "question", "options", "correctIndex", "explanation" },
          "practiceQuestions": [{ "id", "question", "options", "correctIndex", "explanation", "topic" }],
          "interviewQuestions": [{ "id", "question", "answer", "explanation", "company" }],
          "news": [{ "title", "url", "source", "date", "summary" }]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json" 
            }
        });
        
        const data = JSON.parse(cleanJsonString(response.text || '{}'));
        const interviews: Record<string, InterviewQuestion[]> = {};
        (data.interviewQuestions || []).forEach((q: any) => {
            const co = q.company || 'General';
            if (!interviews[co]) interviews[co] = [];
            interviews[co].push(q);
        });

        return {
            topics: data.topics || [],
            dailyQuiz: data.dailyQuiz,
            practiceQuestions: data.practiceQuestions || [],
            interviewQuestions: interviews,
            news: data.news || []
        };
    } catch (e) {
        throw e;
    }
};

export const analyzeInterests = async (inputs: any[], comment: string, excluded: string[] = []): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `${NOVA_PERSONA} Analyze profile: ${JSON.stringify(inputs)}. Context: ${comment}. Exclude: ${excluded.join(', ')}. JSON: [{id, title, description, fitScore, reason}]`,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) { return []; }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${NOVA_PERSONA} Search careers for: "${query}". JSON: [{id, title, description, fitScore, reason}]`,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) { return []; }
};

export const generateSkillQuiz = async (career: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${NOVA_PERSONA} Skill quiz for ${career}. JSON: [{id, question, options[], correctIndex, difficulty}]`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateSimulationScenario = async (career: string): Promise<SimulationScenario> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Simulation for ${career}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateChatResponse = async (message: string, career: string, history: ChatMessage[], context?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Offline.";
  const prompt = `System: ${NOVA_PERSONA} Focus: ${career}. Context: ${context}. History: ${JSON.stringify(history.slice(-3))}. User: ${message}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Busy.";
  } catch (e) { return "Error."; }
};

// Legacy stubs to prevent import errors
export const fetchTechNews = async (t: string) => [];
export const generateDailyQuiz = async (c: string) => null;
export const generatePracticeTopics = async (c: string) => [];
export const generatePracticeQuestions = async (c: string) => [];
export const generateCompanyInterviewQuestions = async (c: string, f: string) => [];
export const generatePracticeDataBatch = async (c: string) => ({});
