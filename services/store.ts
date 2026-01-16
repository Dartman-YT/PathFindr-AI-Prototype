import { UserProfile, CareerOption, RoadmapPhase, NewsItem, DailyQuizItem, PracticeQuestion, InterviewQuestion, RoadmapData } from '../types';

const KEYS = {
  USERS: 'pathfinder_users',
  CURRENT_USER_ID: 'pathfinder_current_user_id',
  CAREER_DATA: 'pathfinder_career_data_', // Keyed by userId_careerId
  ROADMAP: 'pathfinder_roadmap_', // Keyed by userId_careerId
  NEWS_CACHE: 'pathfinder_news_cache_', // Keyed by userId_careerId
  DAILY_QUIZ_CACHE: 'pathfinder_daily_quiz_cache_', // Keyed by userId_careerId_date
  PRACTICE_DATA: 'pathfinder_practice_data_', // Keyed by userId_careerId
};

export const saveUser = (user: UserProfile & { password?: string }) => {
  const users = getUsers();
  users[user.id] = user;
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getUsers = (): Record<string, UserProfile & { password?: string }> => {
  const str = localStorage.getItem(KEYS.USERS);
  return str ? JSON.parse(str) : {};
};

export const setCurrentUser = (id: string | null) => {
  if (id) localStorage.setItem(KEYS.CURRENT_USER_ID, id);
  else localStorage.removeItem(KEYS.CURRENT_USER_ID);
};

export const getCurrentUserId = (): string | null => {
  return localStorage.getItem(KEYS.CURRENT_USER_ID);
};

export const deleteUser = (userId: string) => {
    const users = getUsers();
    if (users[userId]) {
        delete users[userId];
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
        Object.keys(localStorage).forEach(key => {
            if (key.includes(userId)) {
                localStorage.removeItem(key);
            }
        });
        localStorage.removeItem(KEYS.CURRENT_USER_ID);
    }
};

export const saveCareerData = (userId: string, careerId: string, data: CareerOption) => {
  localStorage.setItem(`${KEYS.CAREER_DATA}${userId}_${careerId}`, JSON.stringify(data));
};

export const getCareerData = (userId: string, careerId: string): CareerOption | null => {
  const str = localStorage.getItem(`${KEYS.CAREER_DATA}${userId}_${careerId}`);
  return str ? JSON.parse(str) : null;
};

export const saveRoadmap = (userId: string, careerId: string, roadmap: RoadmapData) => {
  localStorage.setItem(`${KEYS.ROADMAP}${userId}_${careerId}`, JSON.stringify(roadmap));
};

export const getRoadmap = (userId: string, careerId: string): RoadmapData | null => {
  const str = localStorage.getItem(`${KEYS.ROADMAP}${userId}_${careerId}`);
  if (!str) return null;
  const data = JSON.parse(str);
  // Migrate legacy data
  if (Array.isArray(data)) {
    return { phases: data, recommendedCertificates: [], recommendedInternships: [] };
  }
  if (!data.recommendedInternships) {
    return { ...data, recommendedInternships: [] };
  }
  return data;
};

export const saveNewsCache = (userId: string, careerId: string, news: NewsItem[]) => {
  const data = { timestamp: Date.now(), news };
  localStorage.setItem(`${KEYS.NEWS_CACHE}${userId}_${careerId}`, JSON.stringify(data));
};

export const getNewsCache = (userId: string, careerId: string): NewsItem[] | null => {
  const str = localStorage.getItem(`${KEYS.NEWS_CACHE}${userId}_${careerId}`);
  if (!str) return null;
  const data = JSON.parse(str);
  if (Date.now() - data.timestamp > 6 * 60 * 60 * 1000) return null;
  return data.news;
};

export const saveDailyQuizCache = (userId: string, careerId: string, quiz: DailyQuizItem) => {
  const dateStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(`${KEYS.DAILY_QUIZ_CACHE}${userId}_${careerId}_${dateStr}`, JSON.stringify(quiz));
};

export const getDailyQuizCache = (userId: string, careerId: string): DailyQuizItem | null => {
  const dateStr = new Date().toISOString().split('T')[0];
  const str = localStorage.getItem(`${KEYS.DAILY_QUIZ_CACHE}${userId}_${careerId}_${dateStr}`);
  return str ? JSON.parse(str) : null;
};

export interface PracticeDataStore {
    topics: string[];
    questions: PracticeQuestion[];
    interviews: Record<string, InterviewQuestion[]>; // Filter -> Questions
}

export const savePracticeData = (userId: string, careerId: string, data: Partial<PracticeDataStore>) => {
    const existing = getPracticeData(userId, careerId) || { topics: [], questions: [], interviews: {} };
    const merged = { ...existing, ...data };
    
    // Handle interview merge correctly
    if (data.interviews) {
        merged.interviews = { ...existing.interviews };
        Object.entries(data.interviews).forEach(([key, val]) => {
            merged.interviews[key] = val;
        });
    }

    localStorage.setItem(`${KEYS.PRACTICE_DATA}${userId}_${careerId}`, JSON.stringify(merged));
};

export const getPracticeData = (userId: string, careerId: string): PracticeDataStore | null => {
    const str = localStorage.getItem(`${KEYS.PRACTICE_DATA}${userId}_${careerId}`);
    return str ? JSON.parse(str) : null;
};