import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';

const cleanJsonString = (str: string): string => {
  // Remove markdown code blocks if present
  let cleaned = str.replace(/```json\n?|```/g, "").trim();
  
  // Find the actual boundaries of the JSON object/array to ignore surrounding text
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

  // Fix trailing commas before closing braces or brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  
  return cleaned;
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

    STRICT TASK:
    1. Identify the top 3 professional career paths that most accurately match or relate to this search term.
    2. The first result MUST be the most direct interpretation of "${query}".
    3. Calculate a high-fidelity "fitScore" (0-100) based strictly on how well each career matches the search intent.
    4. Provide a concise description and a professional "reason" for the match.
    5. Return exactly 3 items.

    Return JSON array: [{"id": "string", "title": "string", "description": "string", "fitScore": number, "reason": "string"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
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
      Total Duration: ${totalDays} Days. Experience Level: ${expLevel}.
      Additional Focus: "${focusAreas}".
      
      STRICT ARCHITECTURAL RULES:
      1. CRITICAL: You MUST generate EXACTLY ${totalDays} items total in the "items" arrays across all phases. Every item represents EXACTLY 1 day.
      2. TASK DESCRIPTION QUALITY: Each item's "description" must be an informative briefing (25-35 words), explaining exactly WHAT the user will learn or build and WHY it matters.
      3. LEARNING REFERENCES: For EVERY task, you MUST provide 2-3 specific "suggestedResources". These MUST be real-world, high-quality learning links (e.g., YouTube, official documentation, or reputable free courses).
      4. RECOMMENDATION LINK VALIDITY: For Certificates and Internships, you MUST ONLY provide working, verified URLs from major platforms like Coursera, edX, LinkedIn Learning, Indeed, or official career pages (e.g., careers.google.com). NO PLACEHOLDERS.
      5. The VERY LAST item of the VERY LAST phase MUST be a "Final Capstone Revision & Confidence Project" (type: project). 
      6. Each task item MUST have:
         {
           "title": "Clear and descriptive task name",
           "description": "Deeply informative briefing on the daily goal",
           "type": "skill" | "project",
           "importance": "high" | "medium" | "low",
           "explanation": "Expert guidance on how to master this specific topic",
           "suggestedResources": [{"title": "Name of Resource", "url": "Direct Working Link"}]
         }
      
      Output JSON format: 
      {
        "phases": [{ "phaseName": "Phase Title", "items": [...] }],
        "recommendedCertificates": [{ "title": "Cert Name", "provider": "Coursera/AWS/etc", "url": "VALID_URL", "relevance": "Why this cert?" }],
        "recommendedInternships": [{ "title": "Role Name", "company": "Example Corp", "url": "VALID_URL", "description": "Short summary" }]
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
        type: item.type === 'project' ? 'project' : 'skill',
        suggestedResources: Array.isArray(item.suggestedResources) ? item.suggestedResources : []
      }))
    }));

    return {
      phases: processedPhases,
      recommendedCertificates: data.recommendedCertificates || [],
      recommendedInternships: data.recommendedInternships || []
    };
  } catch (e) {
    console.error("Roadmap generation failed", e);
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
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
    2. Generate exactly 50 high-quality technical MCQs (Questions). Distribute them across the 12 topics. Format: {id, question, options[4], correctIndex, explanation, topic}.
    3. Generate exactly 50 highly targeted interview questions. You MUST tag them by company.
       Distribution:
       - Google: 8 questions (focus on algorithms/scale)
       - Amazon: 8 questions (focus on leadership/LP)
       - Microsoft: 8 questions (focus on engineering excellence)
       - Meta: 8 questions (focus on product/impact)
       - Netflix: 8 questions (focus on culture/efficiency)
       - Startups: 10 questions (focus on versatility/speed)
       Format: {id, question, answer, explanation, company}.
    
    CRITICAL: Ensure "company" tag is exactly one of: "Google", "Amazon", "Microsoft", "Meta", "Netflix", "Startups".
    Ensure JSON is valid, escaped, and complete. 
    Return exactly ONE JSON object: { "topics": [...], "questions": [...], "interviews": { "Google": [...], "Amazon": [...], "Microsoft": [...], "Meta": [...], "Netflix": [...], "Startups": [...] } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json"
      }
    });
    
    const rawText = response.text || '{}';
    const cleanedText = cleanJsonString(rawText);
    const data = JSON.parse(cleanedText);
    
    const companies = ["Google", "Amazon", "Microsoft", "Meta", "Netflix", "Startups"];
    if (!data.interviews) data.interviews = {};
    companies.forEach(company => {
      if (!data.interviews[company]) data.interviews[company] = [];
    });

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
      contents: `Search for at least 30 the latest professional tech news articles, breakthroughs, job trends, and industry insights about "${topic}". Provide links and diverse sources.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const newsItems: NewsItem[] = [];
    
    // Improved source collection: extract from groundingMetadata
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((c: any) => {
      if (c.web && c.web.uri && c.web.title) {
        let source = 'Insights';
        try {
          const urlObj = new URL(c.web.uri);
          const hostname = urlObj.hostname.toLowerCase().replace('www.', '').replace('news.', '');
          source = hostname.split('.')[0].toUpperCase();
          if (source.length < 2) source = 'TECH';
        } catch (e) {
          source = 'SOURCE';
        }

        let cleanTitle = c.web.title;
        cleanTitle = cleanTitle.replace(/google search|vertexaisearch|internal_id|session_id|google_search_result/gi, "").trim();
        if (cleanTitle.endsWith('-')) cleanTitle = cleanTitle.slice(0, -1).trim();

        if (cleanTitle.length > 10 && !newsItems.some(existing => existing.url === c.web.uri)) {
            newsItems.push({
              title: cleanTitle,
              url: c.web.uri,
              source: source,
              summary: '',
              date: 'Recent'
            });
        }
      }
    });

    return newsItems;
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
      contents: `Create one high-quality technical multiple-choice question for a professional pursuing a career as a ${careerTitle}. 
      The question should be challenging and industry-relevant.
      
      STRICT JSON RESPONSE:
      {
        "question": "The text of the question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "A concise explanation of why the correct option is right"
      }`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      }
    });
    return JSON.parse(cleanJsonString(response.text || 'null'));
  } catch (e) {
    console.error("Daily quiz generation failed", e);
    return null;
  }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  const prompt = `${NOVA_PERSONA} Generate a 5-question skill calibration quiz for: ${careerTitle}. 
  Ensure a range of difficulties: 2 beginner, 2 intermediate, and 1 advanced question.
  JSON: [{id, question, options[], correctIndex, difficulty}].`;
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

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[], context?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "I am currently in architect mode (offline).";
  
  const systemPrompt = `
    ${NOVA_PERSONA}
    You are chatting with a user pursuing a career as a ${careerTitle}.
    
    CURRENT CONTEXT:
    ${context || 'No specific roadmap context provided.'}
    
    STRICT FORMATTING & CONTENT RULES:
    1. EXTREME BREVITY: Provide only the most critical information. Keep responses under 60-80 words.
    2. SIMPLICITY: Use basic language. No long-winded technical jargon unless requested.
    3. STRUCTURE: Use "### Heading" for sub-topics, "**text**" for emphasis, and "-" for bullets.
    4. TASK-AWARENESS: If the user is confused about their task, focus solely on that task using the context provided.
    5. No unnecessary pleasantries. Get straight to the point.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `System: ${systemPrompt}\nUser: ${message}\nHistory: ${JSON.stringify(history.slice(-3))}`,
    });
    return response.text || "Architect busy. Try later.";
  } catch (e) {
    return "Connection error.";
  }
};