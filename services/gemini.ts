
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
  You are "Nova", an advanced AI Career Architect. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  Keep responses concise but professional and inspiring.
`;

const getFallbackCareers = (query?: string): CareerOption[] => {
  const normalizedQuery = query?.trim();
  if (normalizedQuery && normalizedQuery.length > 0) {
    const q = normalizedQuery;
    const formattedQ = q.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    return [
      { 
        id: `fb-${q}-1`, 
        title: formattedQ, 
        description: `Core professional pathway specializing in ${formattedQ} principles and modern implementation.`, 
        fitScore: 100, 
        reason: `Literal match for your search: ${formattedQ}.` 
      },
      { 
        id: `fb-${q}-2`, 
        title: `${formattedQ} Specialist`, 
        description: `Advanced technical role focusing on specialized deep-dives into ${formattedQ} workflows.`, 
        fitScore: 92, 
        reason: `Direct specialization within the ${formattedQ} ecosystem.` 
      },
      { 
        id: `fb-${q}-3`, 
        title: `${formattedQ} Strategist`, 
        description: `Strategic and consultative approach to deploying ${formattedQ} solutions at scale.`, 
        fitScore: 85, 
        reason: `High-level professional path based on ${formattedQ}.` 
      }
    ];
  }
  return [
    { id: 'fb-def-1', title: 'Software Developer', description: 'Technical professional building digital solutions.', fitScore: 90, reason: 'Strong match for logical problem solving.' },
    { id: 'fb-def-2', title: 'Data Scientist', description: 'Analyzing patterns to drive decision making.', fitScore: 85, reason: 'Matches data-driven curiosity.' },
    { id: 'fb-def-3', title: 'UI/UX Designer', description: 'Designing intuitive user interfaces and experiences.', fitScore: 80, reason: 'Good for creative yet structured minds.' }
  ];
};

export const analyzeInterests = async (
  inputs: { question: string, answer: string }[],
  additionalComments: string,
  excludedCareerTitles: string[] = []
): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return getFallbackCareers();

  const isShowMore = excludedCareerTitles.length > 0;
  const exclusionContext = isShowMore
    ? `IMPORTANT: Do NOT suggest the following careers: ${excludedCareerTitles.join(', ')}. Provide 3 NEW, DISTINCT options.`
    : 'Provide the absolute top 3 career matches with high fit scores.';

  const prompt = `
    ${NOVA_PERSONA}
    User Profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    Comments: "${additionalComments}"
    ${exclusionContext}
    Return JSON array: {id, title, description, fitScore, reason}.
  `;

  try {
    const analysisPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                fitScore: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
            },
          },
        },
      });
      const text = cleanJsonString(response.text || "[]");
      let data = JSON.parse(text);
      if (!Array.isArray(data) && data.careers) data = data.careers;
      if (!Array.isArray(data)) data = [data];

      const generationId = Date.now().toString(36);
      return data.map((c: any, idx: number) => ({
        id: c.id || `career-${generationId}-${idx}`,
        title: c.title || "Career Path",
        description: c.description || "A path discovered by Nova.",
        fitScore: Number(c.fitScore) || 80,
        reason: c.reason || "Matched based on your architectural profile."
      })).sort((a: any, b: any) => b.fitScore - a.fitScore);
    })();

    return await withTimeout(analysisPromise, 15000, getFallbackCareers());
  } catch (e) {
    console.error("Analysis failed:", e);
    return getFallbackCareers();
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return getFallbackCareers();
  if (!ai) return getFallbackCareers(trimmedQuery);
  
  const formattedQuery = trimmedQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const prompt = `
    ${NOVA_PERSONA}
    USER QUERY: "${trimmedQuery}"
    
    STRICT INSTRUCTIONS:
    1. The FIRST result in your list MUST correspond exactly to the search term: "${trimmedQuery}".
    2. Use the most professional standard title for this role.
    3. The first result MUST have a fitScore of exactly 100.
    4. Provide exactly 3 objects in a JSON array: [{id, title, description, fitScore, reason}].
  `;

  try {
    const searchPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json"
        },
      });
      
      const text = cleanJsonString(response.text || "[]");
      let data = JSON.parse(text);
      if (!Array.isArray(data)) data = data.careers || [data];

      const generationId = Date.now().toString(36);
      return data.map((c: any, idx: number) => ({
        id: c.id || `search-${generationId}-${idx}`,
        title: c.title || formattedQuery,
        description: c.description || `Path in ${formattedQuery}.`,
        fitScore: Number(c.fitScore) || (idx === 0 ? 100 : 85),
        reason: c.reason || `Match for "${formattedQuery}".`
      })).slice(0, 3);
    })();
    
    return await withTimeout(searchPromise, 12000, getFallbackCareers(trimmedQuery));
  } catch (e) {
    console.error("Search failed:", e);
    return getFallbackCareers(trimmedQuery);
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

  // Adjust granularity for long timelines to avoid token limit while filling the time
  const isLongTerm = totalDays > 45;
  const itemsCountRequest = isLongTerm ? "at least 20 substantial tasks" : `exactly ${totalDays} daily tasks`;
  const durationType = isLongTerm ? "blocks like '1 week', '10 days', or '1 month'" : "'1 day'";

  const prompt = `
      ${NOVA_PERSONA}
      Create a comprehensive career roadmap for: "${careerTitle}".
      Total Plan Duration: ${totalDays} Days. Level: ${expLevel}. Focus: "${focusAreas}".
      
      CRITICAL INSTRUCTIONS:
      1. You MUST generate a sequence of tasks that covers the ENTIRE ${totalDays} day period.
      2. For this ${totalDays} day plan, ${itemsCountRequest}.
      3. For each task, assign a "duration" using ${durationType}.
      4. The SUM of all task durations MUST equal exactly ${totalDays} days.
      5. Each task MUST have a detailed "explanation" and "suggestedResources" array.
      
      Output JSON format: [{ phaseName: string, items: RoadmapItem[] }]
    `;

  try {
    if (!ai) throw new Error("AI missing");
    const roadmapPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(cleanJsonString(response.text || '[]'));
      if (!Array.isArray(data)) return [];

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
    })();

    return await withTimeout(roadmapPromise, 25000, getFallbackRoadmap(careerTitle));
  } catch (e) {
    console.error("Roadmap generation failed", e);
    return getFallbackRoadmap(careerTitle);
  }
};

export const fetchTechNews = async (topic: string): Promise<NewsItem[]> => {
  const ai = getAI();
  if (!ai) return getFallbackNews(topic);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find 5 recent news headlines about "${topic}".`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const ground = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const items: NewsItem[] = ground
      .filter((c: any) => c.web)
      .map((c: any) => ({ title: c.web.title, url: c.web.uri, source: new URL(c.web.uri).hostname, summary: '', date: 'Recent' }));
    return items.length > 0 ? items : getFallbackNews(topic);
  } catch (e) {
    return getFallbackNews(topic);
  }
};

export const generateDailyQuiz = async (careerTitle: string): Promise<DailyQuizItem | null> => {
  const ai = getAI();
  if (!ai) return getFallbackDailyQuiz(careerTitle);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create one MCQ for ${careerTitle}. JSON: {question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || 'null'));
  } catch (e) {
    return getFallbackDailyQuiz(careerTitle);
  }
};

// Fix: Add missing generateSkillQuiz function to resolve the import error in Onboarding.tsx.
export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return getFallbackSkillQuiz(careerTitle);
  
  const prompt = `
    ${NOVA_PERSONA}
    Generate a 5-question skill calibration quiz for the career: "${careerTitle}".
    The questions should increase in difficulty:
    1. Beginner
    2. Beginner
    3. Intermediate
    4. Intermediate
    5. Advanced
    
    Return a JSON array: [{id, question, options[4], correctIndex, difficulty}].
    Difficulty values MUST be one of: "beginner", "intermediate", "advanced".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctIndex: { type: Type.INTEGER },
              difficulty: { type: Type.STRING },
            },
            required: ["id", "question", "options", "correctIndex", "difficulty"]
          }
        }
      }
    });
    const text = cleanJsonString(response.text || '[]');
    return JSON.parse(text);
  } catch (e) {
    console.error("Skill quiz generation failed", e);
    return getFallbackSkillQuiz(careerTitle);
  }
};

export const generatePracticeTopics = async (careerTitle: string): Promise<string[]> => {
  const ai = getAI();
  if (!ai) return ["Basics"];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 10 topics for ${careerTitle}. JSON array of strings.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    return ["Basics"];
  }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string, searchQuery?: string): Promise<PracticeQuestion[]> => {
  const ai = getAI();
  if (!ai) return getFallbackPracticeQuestions(careerTitle);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 15 MCQs for ${careerTitle} ${topic || ''}. JSON array: {id, question, options[4], correctIndex, explanation, topic}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) {
    return getFallbackPracticeQuestions(careerTitle);
  }
};

export const generateCompanyInterviewQuestions = async (careerTitle: string, filter: string, customParams?: any): Promise<InterviewQuestion[]> => {
  const ai = getAI();
  if (!ai) return getFallbackInterviewQuestions(careerTitle);
  const prompt = filter === 'AI Challenge' 
    ? `Generate 10 advanced custom interview questions about "${customParams?.topic || careerTitle}" with difficulty ${customParams?.difficulty || 'Hard'}. JSON array: {id, question, answer, explanation, company}`
    : `Generate 10 targeted interview questions for ${careerTitle} specifically for ${filter} style interviews. JSON array: {id, question, answer, explanation, company}`;

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
    return getFallbackInterviewQuestions(careerTitle);
  }
};

export interface PracticeBatchData {
    topics: string[];
    questions: PracticeQuestion[];
    interviews: Record<string, InterviewQuestion[]>;
}

export const generatePracticeDataBatch = async (careerTitle: string): Promise<PracticeBatchData> => {
  const ai = getAI();
  if (!ai) return { topics: [], questions: [], interviews: {} };
  
  const prompt = `
    ${NOVA_PERSONA}
    Architect a complete practice set for the career: "${careerTitle}".
    List 8 core sub-topics. Create 10 foundational MCQs.
    Create 5 interview questions for categories: "Google", "Amazon", "Microsoft", "Startups".
    Return in ONE single JSON object: { topics: string[], questions: [...], interviews: { Google: [...], ... } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    
    const normalizedInterviews: Record<string, InterviewQuestion[]> = {};
    if (data.interviews) {
        Object.entries(data.interviews).forEach(([company, qs]) => {
            normalizedInterviews[company] = (qs as any[]).map((q, idx) => ({
                ...q,
                id: q.id || `iq-batch-${company}-${idx}`,
                company: company
            }));
        });
    }

    return {
      topics: data.topics || [],
      questions: data.questions || [],
      interviews: normalizedInterviews
    };
  } catch (e) {
    console.error("Batch practice generation failed", e);
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

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
  const ai = getAI();
  try {
    if (!ai) throw new Error();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a job simulation for ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    return { id: '1', scenario: 'Busy day.', question: 'What do you do?', options: ['Work', 'Sleep', 'Eat', 'Cry'], correctIndex: 0, explanation: 'Working is good.' };
  }
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[]): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Offline.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User: ${message}. Career: ${careerTitle}.`
    });
    return response.text || "...";
  } catch (e) {
    return "Offline.";
  }
};

const getFallbackRoadmap = (title: string): RoadmapPhase[] => [
  {
    phaseName: "Initial Foundations",
    items: [
      { id: `fb-1`, title: `Introduction to ${title}`, description: "Essential starting point.", type: 'skill', duration: '1 week', status: 'pending', importance: 'high', explanation: "Starting is the hardest part. Begin here to build your base.", dependencies: [], suggestedResources: [] }
    ]
  }
];

const getFallbackNews = (topic: string): NewsItem[] => [
  { title: `Advancements in ${topic}`, url: '#', source: 'Industry', summary: '', date: 'Today' }
];

const getFallbackDailyQuiz = (topic: string): DailyQuizItem => ({
  question: `What defines success in ${topic}?`,
  options: ["Consistency", "Luck", "Speed", "Isolation"],
  correctIndex: 0,
  explanation: "Incremental growth builds long-term success."
});

// Fix: Add missing getFallbackSkillQuiz function.
const getFallbackSkillQuiz = (careerTitle: string): SkillQuestion[] => [
  { id: 'sq1', question: `What is a fundamental concept in ${careerTitle}?`, options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0, difficulty: 'beginner' },
  { id: 'sq2', question: `Which tool is most common for ${careerTitle}?`, options: ["Tool 1", "Tool 2", "Tool 3", "Tool 4"], correctIndex: 1, difficulty: 'beginner' },
  { id: 'sq3', question: `How do you handle a typical ${careerTitle} challenge?`, options: ["Method 1", "Method 2", "Method 3", "Method 4"], correctIndex: 2, difficulty: 'intermediate' },
  { id: 'sq4', question: `Advanced optimization in ${careerTitle} usually involves?`, options: ["Step A", "Step B", "Step C", "Step D"], correctIndex: 3, difficulty: 'intermediate' },
  { id: 'sq5', question: `What is a complex edge case in ${careerTitle}?`, options: ["Case 1", "Case 2", "Case 3", "Case 4"], correctIndex: 0, difficulty: 'advanced' }
];

const getFallbackPracticeQuestions = (topic: string): PracticeQuestion[] => [
  { id: 'p1', question: `Core principle of ${topic}?`, options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0, explanation: "Self-explanatory." }
];

const getFallbackInterviewQuestions = (topic: string): InterviewQuestion[] => [
  { id: 'i1', question: "Why this career?", answer: "Passion and skill alignment.", company: "General", explanation: "Confidence and clarity are key in foundational interviews." }
];
