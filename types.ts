

export enum UserRole {
  NEW = 'NEW',
  RETURNING = 'RETURNING'
}

export interface UserProfile {
  id: string;
  username: string;
  securityKey: string; // For password recovery
  subscriptionStatus: 'free' | 'monthly' | 'yearly';
  onboardingComplete: boolean;
  xp: number;
  streak: number;
  // lastQuizDate?: string; // YYYY-MM-DD - REMOVED FROM ROOT
  joinedAt?: number; // Timestamp of account creation
  theme?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
  // Support for multiple careers, each with its own timeline
  activeCareers: {
    careerId: string;
    title: string;
    addedAt: number;
    educationYear: string;
    targetCompletionDate: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string; // specific topics for upskilling
    lastAdaptationCheck?: number; // timestamp of last AI check
    lastQuizDate?: string; // YYYY-MM-DD - ADDED HERE
  }[];
  currentCareerId?: string;
}

export interface CareerOption {
  id: string;
  title: string;
  description: string;
  fitScore: number; // 0-100
  reason: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'project' | 'internship' | 'certificate';
  duration: string; // e.g., "2 weeks"
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: number; // Timestamp for velocity tracking
  link?: string; // For internships/certs
  importance: 'high' | 'medium' | 'low';
  isAIAdaptation?: boolean; // To badge newly added items
  dependencies?: string[]; // IDs of tasks that must be completed first
  // New fields for Learn More
  explanation?: string;
  suggestedResources?: { title: string; url: string }[];
}

export interface RoadmapPhase {
  phaseName: string;
  items: RoadmapItem[];
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
}

export interface SkillQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface DailyQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string;
}

export interface InterviewQuestion {
    id: string;
    question: string;
    answer: string;
    company?: string;
}

export interface SimulationScenario {
  id: string;
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}