import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, "").trim();
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
  You are "Nova", a world-class AI Career Architect and Psychologist. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  You use industry data and psychological profiling to architect careers.
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
    Perform a multi-dimensional analysis (Skills, Interests, Personality, Market Demand).
    Provide the top 3 most scientifically aligned career paths. 
    Calculate a fitScore (0-100) using a weighted algorithm.
    Provide a deeply analytical "reason" for each match.

    Return JSON array: [{id, title, description, fitScore, reason}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
    Include a high-fidelity fitScore and analytical reasoning.
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
): Promise<RoadmapData> => {
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

  const prompt = `
      ${NOVA_PERSONA}
      Architect a professional roadmap for: "${careerTitle}".
      Total Duration to Cover: ${totalDays} Days. Experience Level: ${expLevel}.
      Additional Focus: "${focusAreas}".
      
      STRICT ARCHITECTURAL RULES:
      1. Every task is essentially a 1-day milestone.
      2. Tasks MUST ONLY be of these three types:
         - "skill": Learning core concepts or technical topics.
         - "project": Building practical features, MVPs, or scripts.
         - "internship": Searching, applying, or simulating workplace tasks.
      3. DO NOT include "certificate" as a task within the phases. Instead, suggest them in the "recommendedCertificates" section.
      4. The VERY LAST item of the VERY LAST phase MUST be a "Capstone Revision & Confidence Project" (type: project). 
         It must be comprehensive, requiring the user to apply everything learned in previous phases to build confidence.
      5. Each task item MUST have:
         {
           "title": "Clear and descriptive task name",
           "description": "Short summary",
           "type": "skill" | "project" | "internship",
           "importance": "high" | "medium" | "low",
           "explanation": "Deep professional guidance",
           "suggestedResources": [{"title": "Name", "url": "URL"}]
         }
      
      Output JSON format: 
      {
        "phases": [{ "phaseName": "Phase Title", "items": [...] }],
        "recommendedCertificates": [{ "title": "Cert Name", "provider": "Coursera/AWS/etc", "url": "URL", "relevance": "Why this cert?" }]
      }
    `;

  try {
    if (!ai) throw new Error("AI missing");
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    
    let taskIdCounter = 1;
    const generationId = Date.now().toString(36);

    const processedPhases = (data.phases || []).map((phase: any, pIdx: number) => ({
      ...phase,
      items: (phase.items || []).map((item: any) => ({
        ...item,
        id: `task-${generationId}-${pIdx}-${taskIdCounter++}`,
        status: 'pending',
        duration: '1 day',
        type: item.type || 'skill',
        suggestedResources: Array.isArray(item.suggestedResources) ? item.suggestedResources : []
      }))
    }));

    return {
      phases: processedPhases,
      recommendedCertificates: data.recommendedCertificates || []
    };
  } catch (e) {
    console.error("Roadmap generation failed", e);
    return { phases: [], recommendedCertificates: [] };
  }
};

export const generatePracticeDataBatch = async (careerTitle: string): Promise<any> => {
  const ai = getAI();
  if (!ai) return { topics: [], questions: [], interviews: {} };
  
  const prompt = `
    ${NOVA_PERSONA}
    Generate a massive, high-fidelity practice and interview set for: "${careerTitle}".
    
    REQUIREMENTS:
    1. List 12 specific technical sub-topics for this career.
    2. Generate 50 high-quality technical MCQs across all levels (Easy, Medium, Hard). Format: {id, question, options[4], correctIndex, explanation, topic}.
    3. Generate 12 interview questions for EACH of these categories: "Google", "Amazon", "Microsoft", "Netflix", "Meta", "Startups". 
       Total of 72 distinct interview questions. Format: {id, question, answer, explanation, company}.
    
    Return exactly ONE JSON object: { "topics": [...], "questions": [...], "interviews": { "Google": [...], "Amazon": [...], "Microsoft": [...], "Netflix": [...], "Meta": [...], "Startups": [...] } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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

export const calculateRemainingDays = (roadmap: RoadmapPhase[]): number => {
  if (!roadmap) return 0;
  let totalDays = 0;
  roadmap.forEach(p => {
    if (p.items) {
      p.items.forEach(i => {
        if (i.status !== 'completed') {
          totalDays += 1;
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
      contents: `Find exactly 10 high-quality, professional news headlines about "${topic}" from industry leaders. Focus on breakthroughs, market shifts, and expert insights.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const newsItems: NewsItem[] = [];
    
    chunks.forEach((c: any) => {
      if (c.web && c.web.uri && c.web.title) {
        let source = 'Insights';
        try {
          const urlObj = new URL(c.web.uri);
          const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
          
          if (hostname.includes('vertexaisearch') || hostname.includes('google.com') || hostname.includes('googleapis')) {
            source = 'Tech Feed';
          } else {
            source = hostname.split('.')[0].toUpperCase();
          }
        } catch (e) {
          source = 'Verified';
        }

        let cleanTitle = c.web.title;
        // Aggressive cleaning for technical metadata
        cleanTitle = cleanTitle.replace(/vertexaisearch|internal_id|session_id|google_search_result/gi, "").trim();
        if (cleanTitle.endsWith('-')) cleanTitle = cleanTitle.slice(0, -1).trim();

        newsItems.push({
          title: cleanTitle,
          url: c.web.uri,
          source: source,
          summary: '',
          date: 'Recent'
        });
      }
    });

    return newsItems.slice(0, 10);
  } catch (e) {
    console.error("News fetch failed", e);
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
      model: 'gemini-3-pro-preview',
      contents: `Generate 15 additional technical MCQs for ${careerTitle} focusing on ${topic || 'diverse concepts'}. JSON array: {id, question, options[4], correctIndex, explanation, topic}`,
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
  const prompt = `Generate 15 additional targeted interview questions for ${careerTitle} specifically for ${filter} style interviews. JSON array: {id, question, answer, explanation, company}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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