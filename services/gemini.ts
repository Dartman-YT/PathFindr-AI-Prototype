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

export const generateRoadmap = async (
  careerTitle: string,
  eduYear: string,
  targetDate: string,
  expLevel: string,
  focusAreas: string
): Promise<RoadmapData> => {
  if (!process.env.API_KEY) {
    console.error("CRITICAL: API_KEY is missing from environment.");
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }

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
    console.error("Roadmap Generation Error:", e);
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }
};

export const generateKnowledgeBatch = async (careerTitle: string): Promise<{
    dailyQuiz: DailyQuizItem;
    practiceQuestions: PracticeQuestion[];
    interviewQuestions: Record<string, InterviewQuestion[]>;
    news: NewsItem[];
    topics: string[];
}> => {
    if (!process.env.API_KEY) throw new Error("API_KEY missing");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        console.error("Knowledge Batch Error:", e);
        throw e;
    }
};

export const analyzeInterests = async (inputs: any[], comment: string, excluded: string[] = []): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ${NOVA_PERSONA}
    Analyze the following psychometric profile and user feedback to suggest exactly 3-6 optimal career paths for 2025.
    
    User Inputs: ${JSON.stringify(inputs)}
    Additional Context/Feedback: "${comment}"
    Excluded Titles (User already rejected these): ${excluded.join(', ')}
    
    Return ONLY a JSON array: [{id, title, description, fitScore, reason}]
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) { 
    console.error("Interest Analysis Error:", e);
    return []; 
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Simulation for ${career}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateChatResponse = async (message: string, career: string, history: ChatMessage[], context?: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Configuration Missing.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `System: ${NOVA_PERSONA} Focus: ${career}. Context: ${context}. History: ${JSON.stringify(history.slice(-3))}. User: ${message}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Busy.";
  } catch (e) { return "Deployment Error."; }
};

export const fetchTechNews = async (t: string) => [];
export const generateDailyQuiz = async (c: string) => null;
export const generatePracticeTopics = async (c: string) => [];
export const generatePracticeQuestions = async (c: string) => [];
export const generateCompanyInterviewQuestions = async (c: string, f: string) => [];
export const generatePracticeDataBatch = async (c: string) => ({});
