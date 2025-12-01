
import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage } from '../types';
import { Roadmap } from './Roadmap';
import { fetchTechNews, generateRoadmap, calculateRemainingDays, generateDailyQuiz, generatePracticeTopics, generatePracticeQuestions, generateCompanyInterviewQuestions, generateSimulationScenario, generateChatResponse } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser, getNewsCache, saveNewsCache, getDailyQuizCache, saveDailyQuizCache, deleteUser, getPracticeData, savePracticeData } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, RefreshCw, MessageSquare, CheckCircle2, Pencil, BrainCircuit, GraduationCap, Flame, Star, Search, Link, Building2, PlayCircle, Eye, EyeOff, ShieldAlert, Palette, Settings, Mail, Lock, CalendarDays, AlertTriangle, Moon, Sun, Send, Cpu, Sparkles, Compass } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  career: CareerOption;
  roadmap: RoadmapPhase[] | null;
  onLogout: () => void;
  setRoadmap: (r: RoadmapPhase[] | null) => void;
  setUser: (u: UserProfile) => void;
  setCareer: (c: CareerOption | null) => void;
  onAddCareer: (mode?: 'analysis' | 'search') => void;
  onDeleteAccount: () => void;
}

interface QuizOptionProps {
  option: string;
  index: number;
  correctIndex: number;
  explanation: string;
}

const QuizOption: React.FC<QuizOptionProps> = ({ option, index, correctIndex, explanation }) => {
    const [selected, setSelected] = useState<boolean | null>(null);
    
    const handleClick = () => {
        if (selected !== null) return;
        setSelected(index === correctIndex);
    };

    const isCorrect = index === correctIndex;
    const isSelected = selected !== null; 

    let className = "w-full text-left p-4 rounded-xl border transition-all mb-2 flex justify-between items-center ";
    
    if (!isSelected) {
        className += "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-indigo-500";
    } else {
        if (isCorrect) {
             className += "bg-emerald-500/20 border-emerald-500 text-white";
        } else if (selected === false) { 
             className += "bg-red-500/20 border-red-500 text-white";
        } else {
             className += "bg-slate-900 border-slate-700 text-slate-500 opacity-50";
        }
    }

    return (
        <div className="mb-2">
            <button 
                onClick={handleClick}
                disabled={isSelected}
                className={className}
            >
                <span>{option}</span>
                {isSelected && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {isSelected && selected === false && <AlertCircle className="h-5 w-5 text-red-400" />}
            </button>
            {isSelected && (selected === false || isCorrect) && index === correctIndex && (
                 <div className="text-sm text-emerald-400 mt-1 pl-2 animate-fade-in">
                     <span className="font-bold">Correct:</span> {explanation}
                 </div>
            )}
            {isSelected && selected === false && (
                 <div className="text-sm text-red-400 mt-1 pl-2 animate-fade-in">
                     Incorrect.
                 </div>
            )}
        </div>
    );
};

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const diff = tomorrow.getTime() - now.getTime();
            
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            
            return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, []);

    return <span className="text-white font-mono font-bold tracking-widest">{timeLeft}</span>;
};

const ChatWindow: React.FC<{ isOpen: boolean; onClose: () => void; careerTitle: string; history: ChatMessage[]; onSend: (msg: string) => void; isTyping: boolean }> = ({ isOpen, onClose, careerTitle, history, onSend, isTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-80 md:w-96 h-[500px] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[70] animate-fade-in">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Nova Support</h3>
                        <p className="text-xs text-slate-500">Online</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white">
                    <X className="h-5 w-5" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {history.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                            {msg.text.split('\n').map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isTyping && input.trim() && (onSend(input), setInput(''))}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                    <button 
                        onClick={() => { if(input.trim()) { onSend(input); setInput(''); }}}
                        disabled={!input.trim() || isTyping}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white disabled:opacity-50"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const QuestionSkeletonCard = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-3/4 mb-6"></div>
        <div className="space-y-3">
            <div className="h-10 bg-slate-800 rounded-xl"></div>
            <div className="h-10 bg-slate-800 rounded-xl"></div>
            <div className="h-10 bg-slate-800 rounded-xl"></div>
            <div className="h-10 bg-slate-800 rounded-xl"></div>
        </div>
    </div>
);

const InterviewSkeletonCard = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="h-4 bg-slate-800 rounded w-24"></div>
        </div>
        <div className="h-5 bg-slate-800 rounded w-full mb-6"></div>
        <div className="h-10 bg-slate-800 rounded-xl"></div>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ 
  user, career, roadmap, onLogout, setRoadmap, setUser, setCareer, onAddCareer, onDeleteAccount 
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'roadmap' | 'career' | 'profile' | 'practice'>('home');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  
  // Daily Quiz State
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuizItem | null>(null);
  const [quizState, setQuizState] = useState<'loading' | 'active' | 'completed' | 'already_done'>('loading');
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // --- NEW PRACTICE TAB STATE ---
  const [practiceTab, setPracticeTab] = useState<'quiz' | 'interview' | 'simulation'>('quiz');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceTopics, setPracticeTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Question Banks (Full Data)
  const [practiceQuestionBank, setPracticeQuestionBank] = useState<PracticeQuestion[]>([]);
  const [interviewQuestionBank, setInterviewQuestionBank] = useState<InterviewQuestion[]>([]);
  
  // Filtered/Displayed Questions
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  
  // Custom AI Generator State
  const [customGenTopic, setCustomGenTopic] = useState('');
  const [customGenDifficulty, setCustomGenDifficulty] = useState('Medium');

  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario | null>(null);
  const [simAnswer, setSimAnswer] = useState<number | null>(null);
  
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // --- END PRACTICE TAB STATE ---

  // Adaptation State
  const [isAdapting, setIsAdapting] = useState(false);

  // Phase Completion State
  const [showPhaseCompletionModal, setShowPhaseCompletionModal] = useState(false);
  
  // Date Edit State
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [showDateStrategyModal, setShowDateStrategyModal] = useState(false);
  const [dateStrategyType, setDateStrategyType] = useState<'extension' | 'shortening' | null>(null);

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Critical Action Confirmation State
  const [confirmAction, setConfirmAction] = useState<{type: 'reset_all' | 'delete_account', inputValue: string} | null>(null);
  const [careerToDelete, setCareerToDelete] = useState<string | null>(null);

  // Career Stats (Progress Map)
  const [careerStats, setCareerStats] = useState<Record<string, { progress: number, daysLeft: number }>>({});
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  // Home Search
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Get current career details
  const currentCareerDetails = user.activeCareers.find(c => c.careerId === career.id);

  const showToastMsg = (msg: string) => {
      setToast({ message: msg, type: 'success' });
      setTimeout(() => setToast(null), 3000);
  };

  // Theme Init and Switching
  useEffect(() => {
      const themes = ['theme-emerald', 'theme-rose', 'theme-amber', 'theme-cyan'];
      document.body.classList.remove(...themes);
      if (user.theme && user.theme !== 'indigo') { 
          document.body.classList.add(`theme-${user.theme}`);
      }
  }, [user.theme]);

  const setAccentColor = (color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan') => {
      const updatedUser = { ...user, theme: color };
      setUser(updatedUser);
      saveUser(updatedUser);
  };
  
  // Chat Context Effect
  useEffect(() => {
      const initialGreeting = {
          id: Date.now().toString(),
          role: 'bot' as const,
          text: `Hello ${user.username}! I see you're currently focusing on ${career.title}. How can I assist you with your roadmap or career questions today?`,
          timestamp: Date.now()
      };
      
      setChatHistory(prev => {
          if (prev.length === 0) return [initialGreeting];
          return [...prev, {
              id: Date.now().toString(),
              role: 'bot',
              text: `Switched focus to ${career.title}.`,
              timestamp: Date.now()
          }];
      });
  }, [career.id, user.username]);

  const handleSendMessage = async (text: string) => {
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMsg]);
      setIsChatTyping(true);
      
      try {
          const responseText = await generateChatResponse(text, career.title, chatHistory);
          const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: responseText, timestamp: Date.now() };
          setChatHistory(prev => [...prev, botMsg]);
      } catch (e) {
           const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: "I'm having trouble connecting right now. Please try again.", timestamp: Date.now() };
           setChatHistory(prev => [...prev, errMsg]);
      } finally {
          setIsChatTyping(false);
      }
  };

  useEffect(() => {
    if (roadmap) {
      let total = 0;
      let completed = 0;
      roadmap.forEach(phase => {
        phase.items.forEach(item => {
          total++;
          if (item.status === 'completed') completed++;
        });
      });
      
      const calculatedProgress = total === 0 ? 0 : Math.round((completed / total) * 100);
      if (calculatedProgress === 100 && progress !== 100 && progress !== 0) {
          setShowCelebration(true);
      }
      setProgress(calculatedProgress);
    } else {
        setProgress(0);
    }
  }, [roadmap, progress]);

  useEffect(() => {
      if (activeTab === 'career') {
          const stats: Record<string, { progress: number, daysLeft: number }> = {};
          user.activeCareers.forEach(c => {
              const r = getRoadmap(user.id, c.careerId) || [];
              let total = 0;
              let completed = 0;
              r.forEach(p => {
                  p.items.forEach(i => {
                      total++;
                      if (i.status === 'completed') completed++;
                  });
              });
              
              const prog = total === 0 ? 0 : Math.round((completed / total) * 100);
              const parts = c.targetCompletionDate.split('-');
              let days = 0;
              if (parts.length === 3) {
                const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0); 
                const today = new Date();
                today.setHours(12, 0, 0, 0);
                const diff = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                days = diff >= 0 ? diff + 1 : 0;
              }
              stats[c.careerId] = { progress: prog, daysLeft: days };
          });
          setCareerStats(stats);
      }
  }, [activeTab, user]);

  const loadNews = async (query?: string) => {
      if (!career?.title) return;
      const searchTopic = query || career.title;
      if (!query) {
          const cachedNews = getNewsCache(user.id, career.id);
          if (cachedNews && cachedNews.length > 0) {
              setNews(cachedNews);
              return;
          }
      }
      setIsNewsLoading(true);
      setNews([]); 
      try {
        const newsItems = await fetchTechNews(searchTopic);
        setNews(newsItems);
        if (!query) saveNewsCache(user.id, career.id, newsItems);
      } catch (e) {
        console.error("Failed to load news", e);
      } finally {
        setIsNewsLoading(false);
      }
  };

  useEffect(() => {
    if (activeTab === 'home') loadNews();
  }, [career.id, career.title, activeTab, user.id]);

  const handleHomeSearch = () => {
      loadNews(homeSearchQuery);
  };

  const handlePracticeSearch = () => {};

  // --- REFACTORED PRACTICE TAB LOGIC ---
  useEffect(() => {
    const initPracticeBank = async () => {
        if (activeTab === 'practice') {
            setIsPracticeLoading(true);
            const savedData = getPracticeData(user.id, career.id);
            
            if (savedData && savedData.questions.length > 0) {
                setPracticeTopics(savedData.topics || []);
                setPracticeQuestionBank(savedData.questions || []);
                setInterviewQuestionBank(savedData.interviews || []);
            } else {
                try {
                    const [topics, qs, iqs] = await Promise.all([
                        generatePracticeTopics(career.title),
                        generatePracticeQuestions(career.title),
                        generateCompanyInterviewQuestions(career.title, 'All')
                    ]);
                    
                    setPracticeTopics(topics);
                    setPracticeQuestionBank(qs);
                    setInterviewQuestionBank(iqs);
                    
                    savePracticeData(user.id, career.id, {
                        topics: topics,
                        questions: qs,
                        interviews: iqs
                    });
                } catch(e) { console.error("Failed to init practice bank", e); }
            }
            setIsPracticeLoading(false);
        }
    };
    initPracticeBank();
  }, [career.id, activeTab]);

  // Client-side filtering effect
  useEffect(() => {
      let filteredQs = practiceQuestionBank;
      if (selectedTopic) {
          filteredQs = practiceQuestionBank.filter(q => q.topic === selectedTopic);
      }
      if (practiceSearch && practiceTab === 'quiz') {
          filteredQs = practiceQuestionBank.filter(q => q.question.toLowerCase().includes(practiceSearch.toLowerCase()));
      }
      setPracticeQuestions(filteredQs);

      let filteredIQs = interviewQuestionBank;
      if (companyFilter !== 'All' && companyFilter !== 'AI Challenge') {
          filteredIQs = interviewQuestionBank.filter(q => q.company === companyFilter);
      }
       if (practiceSearch && practiceTab === 'interview') {
          filteredIQs = interviewQuestionBank.filter(q => q.question.toLowerCase().includes(practiceSearch.toLowerCase()));
      }
      setInterviewQuestions(filteredIQs);
  }, [selectedTopic, companyFilter, practiceSearch, practiceQuestionBank, interviewQuestionBank, practiceTab]);

  const handleLoadMorePractice = async () => {
    setIsLoadingMore(true);
    try {
        const newQs = await generatePracticeQuestions(career.title, selectedTopic || undefined);
        const updatedBank = [...practiceQuestionBank, ...newQs];
        setPracticeQuestionBank(updatedBank);
        savePracticeData(user.id, career.id, { questions: updatedBank });
    } catch(e) { console.error(e); } finally { setIsLoadingMore(false); }
  };

  const handleLoadMoreInterview = async () => {
    setIsLoadingMore(true);
    try {
        const newQs = await generateCompanyInterviewQuestions(career.title, companyFilter);
        const updatedBank = [...interviewQuestionBank, ...newQs];
        setInterviewQuestionBank(updatedBank);
        savePracticeData(user.id, career.id, { interviews: updatedBank });
    } catch(e) { console.error(e); } finally { setIsLoadingMore(false); }
  };
  
  const handleAICustomChallenge = async () => {
      setIsPracticeLoading(true);
      try {
          const params = { topic: customGenTopic || career.title, difficulty: customGenDifficulty };
          const iqs = await generateCompanyInterviewQuestions(career.title, 'AI Challenge', params);
          setInterviewQuestions(iqs); // Show only these, don't add to bank
      } catch (e) { console.error(e); } finally { setIsPracticeLoading(false); }
  };
  
  // --- END REFACTORED PRACTICE LOGIC ---


  useEffect(() => {
    const checkDailyQuiz = async () => {
        if (activeTab !== 'home') return;
        const today = new Date().toISOString().split('T')[0];
        
        if (user.lastQuizDate === today) {
            setQuizState('already_done');
            return;
        }

        const cachedQuiz = getDailyQuizCache(user.id, career.id);
        if (cachedQuiz) {
            setDailyQuiz(cachedQuiz);
            setQuizState('active');
            return;
        }

        setQuizState('loading');
        try {
            const quiz = await generateDailyQuiz(career.title);
            if (quiz) {
                setDailyQuiz(quiz);
                saveDailyQuizCache(user.id, career.id, quiz);
                setQuizState('active');
            } else {
                setQuizState('already_done');
            }
        } catch (e) {
            setQuizState('already_done');
        }
    };
    checkDailyQuiz();
  }, [activeTab, career.title, user.lastQuizDate, user.id, career.id]);

  const handleQuizAnswer = (index: number) => {
      if (!dailyQuiz || selectedQuizOption !== null) return;
      setSelectedQuizOption(index);
      const isRight = index === dailyQuiz.correctIndex;
      setIsQuizCorrect(isRight);

      if (isRight) {
          setShowConfetti(true);
          const today = new Date().toISOString().split('T')[0];
          let newStreak = (user.streak || 0);
          if (user.lastQuizDate) {
              const last = new Date(user.lastQuizDate);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              if (user.lastQuizDate === yesterdayStr) newStreak += 1;
              else newStreak = 1; 
          } else {
              newStreak = 1;
          }

          const newXp = (user.xp || 0) + 10;
          const updatedUser = { ...user, streak: newStreak, xp: newXp, lastQuizDate: today };
          setUser(updatedUser);
          saveUser(updatedUser);
          setTimeout(() => setShowConfetti(false), 3000);
      } else {
          const today = new Date().toISOString().split('T')[0];
          const updatedUser = { ...user, lastQuizDate: today, streak: 0 }; 
          setUser(updatedUser);
          saveUser(updatedUser);
      }
      setTimeout(() => setQuizState('completed'), 2000);
  };

  const handleSimulationSearch = async () => {
    setIsPracticeLoading(true);
    const sim = await generateSimulationScenario(career.title);
    setSimulationScenario(sim);
    setSimAnswer(null);
    setIsPracticeLoading(false);
  }

  const handleSimAnswer = (index: number) => {
      if (!simulationScenario || simAnswer !== null) return;
      setSimAnswer(index);
      if (index === simulationScenario.correctIndex) {
          const updatedUser = { ...user, xp: (user.xp || 0) + 10 };
          setUser(updatedUser);
          saveUser(updatedUser);
          showToastMsg("Sim Success! +10 XP");
      }
  };

  const toggleAnswerReveal = (id: string) => {
      const next = new Set(visibleAnswers);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setVisibleAnswers(next);
  };

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    const updatedUser = { ...user, subscriptionStatus: plan };
    setUser(updatedUser);
    saveUser(updatedUser);
  };

  const handleProgress = (itemId: string) => {
    if (!roadmap) return;
    const now = Date.now();

    // Find which phase the item belongs to and check its "before" completion status
    let phaseIndexToCheck = -1;
    let wasPhaseCompleted = false;
    for (let i = 0; i < roadmap.length; i++) {
        if (roadmap[i].items.some(item => item.id === itemId)) {
            phaseIndexToCheck = i;
            wasPhaseCompleted = roadmap[i].items.every(item => item.status === 'completed');
            break;
        }
    }

    const newRoadmap = roadmap.map(phase => ({
      ...phase,
      items: phase.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: item.status === 'completed' ? 'pending' : 'completed',
              completedAt: item.status === 'completed' ? undefined : now 
            } as RoadmapItem
          : item
      )
    }));
    
    setRoadmap(newRoadmap);
    saveRoadmap(user.id, career.id, newRoadmap);

    // Now check the "after" completion status
    if (phaseIndexToCheck !== -1) {
        const isNowCompleted = newRoadmap[phaseIndexToCheck].items.every(i => i.status === 'completed');
        const isAllCompleted = newRoadmap.every(p => p.items.every(i => i.status === 'completed'));

        if (isNowCompleted && !wasPhaseCompleted && !isAllCompleted) {
            // Use a timeout to ensure the state update has rendered before showing modal
            setTimeout(() => setShowPhaseCompletionModal(true), 100);
        }
    }
  };

  const handleResetPhase = (phaseIndex: number) => {
      if (!roadmap) return;
      const newRoadmap = roadmap.map((phase, idx) => {
          if (idx === phaseIndex) {
              return {
                  ...phase,
                  items: phase.items.map(item => ({
                      ...item,
                      status: 'pending' as const,
                      completedAt: undefined
                  }))
              };
          }
          return phase;
      });
      setRoadmap(newRoadmap);
      saveRoadmap(user.id, career.id, newRoadmap);
  };

  const handleResetRoadmap = () => {
      if (!roadmap) return;
      const resetMap = roadmap.map(phase => ({
          ...phase,
          items: phase.items.map(item => ({
              ...item, 
              status: 'pending' as const, 
              completedAt: undefined
          } as RoadmapItem))
      }));
      setRoadmap(resetMap);
      saveRoadmap(user.id, career.id, resetMap);
  };

  const executeResetAll = () => {
      user.activeCareers.forEach(c => {
          const r = getRoadmap(user.id, c.careerId);
          if (r) {
              const resetR = r.map(p => ({...p, items: p.items.map(i => ({...i, status: 'pending', completedAt: undefined} as RoadmapItem))}));
              saveRoadmap(user.id, c.careerId, resetR);
          }
      });
      handleResetRoadmap();
      showToastMsg("All career progress has been reset.");
      setConfirmAction(null);
  };

  const executeDeleteAccount = () => {
      onDeleteAccount();
      setConfirmAction(null);
  };

  const handleAdaptation = async (type: any, customTargetDate?: string) => {
      if (!currentCareerDetails || !roadmap) return;
      
      // Close modals before starting
      setShowDateStrategyModal(false);
      setShowPhaseCompletionModal(false);
      setIsAdapting(true);

      try {
          const completedPhases = roadmap.filter(p => p.items.every(i => i.status === 'completed'));
          const lastCompletedPhaseIndex = completedPhases.length; 
          const { educationYear, targetCompletionDate, experienceLevel, focusAreas } = currentCareerDetails;
          let targetDateToUse = customTargetDate || targetCompletionDate;

          // If date changed via modal, update user profile
          if (targetDateToUse !== targetCompletionDate) {
              const updatedCareers = user.activeCareers.map(c => 
                  c.careerId === career.id ? { ...c, targetCompletionDate: targetDateToUse } : c
              );
              const updatedUser = { ...user, activeCareers: updatedCareers };
              setUser(updatedUser);
              saveUser(updatedUser);
          }

          const contextStr = `User has completed ${completedPhases.length} phases. Proceed to generate the REMAINING phases starting from Phase ${lastCompletedPhaseIndex + 1}.`;
          const newPhases = await generateRoadmap(career.title, educationYear, targetDateToUse, experienceLevel, focusAreas || '', { type, progressStr: contextStr, startingPhaseNumber: lastCompletedPhaseIndex + 1 });
          
          const finalMap = [...completedPhases, ...newPhases];
          setRoadmap(finalMap);
          saveRoadmap(user.id, career.id, finalMap);
          showToastMsg("Nova has re-architected your roadmap.");
      } catch (e) {
          console.error("Adaptation failed", e);
          showToastMsg("AI is busy. Please try again later.");
      } finally {
          setIsAdapting(false);
      }
  };

  const handleDateUpdateWithoutAI = (newDate: string) => {
      if (!currentCareerDetails) return;
      const updatedCareers = user.activeCareers.map(c => 
          c.careerId === career.id ? { ...c, targetCompletionDate: newDate } : c
      );
      const updatedUser = { ...user, activeCareers: updatedCareers };
      setUser(updatedUser);
      saveUser(updatedUser);
      setShowDateStrategyModal(false);
      showToastMsg("Target date updated.");
  };
  
  const handleFinishQuicker = () => {
      if (!currentCareerDetails || !roadmap) return;
      const daysNeeded = calculateRemainingDays(roadmap);
      const newTarget = new Date();
      newTarget.setHours(12, 0, 0, 0);
      const offset = Math.max(0, daysNeeded - 1);
      newTarget.setDate(newTarget.getDate() + offset);
      
      const year = newTarget.getFullYear();
      const month = String(newTarget.getMonth() + 1).padStart(2, '0');
      const day = String(newTarget.getDate()).padStart(2, '0');
      const newDateStr = `${year}-${month}-${day}`;

      const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: newDateStr } : c);
      const u = { ...user, activeCareers: updatedCareers };
      setUser(u);
      saveUser(u);
      setShowPhaseCompletionModal(false);
      showToastMsg("Target date updated to finish quicker.");
  };

  const initiateDateUpdate = () => {
      if (!pendingTargetDate || !currentCareerDetails) return;
      const oldDateParts = currentCareerDetails.targetCompletionDate.split('-');
      const oldDate = new Date(parseInt(oldDateParts[0]), parseInt(oldDateParts[1]) - 1, parseInt(oldDateParts[2])).getTime();
      const newDateParts = pendingTargetDate.split('-');
      const newDate = new Date(parseInt(newDateParts[0]), parseInt(newDateParts[1]) - 1, parseInt(newDateParts[2])).getTime();
      
      setShowDateEditModal(false);
      setShowDateStrategyModal(true);
      setDateStrategyType(newDate > oldDate ? 'extension' : 'shortening');
  };

  const handleSwitchCareer = (careerId: string) => {
    setIsRoadmapLoading(true);
    setShowCareerMenu(false);
    setRoadmap(null);
    setNews([]); 
    setTimeout(() => {
        const savedCareer = getCareerData(user.id, careerId);
        const savedRoadmap = getRoadmap(user.id, careerId);
        if (savedCareer) {
          setCareer(savedCareer);
          setRoadmap(savedRoadmap || []); 
          const updatedUser = { ...user, currentCareerId: careerId };
          setUser(updatedUser);
          saveUser(updatedUser);
          showToastMsg(`Nova: Switched focus to ${savedCareer.title}`);
        }
        setIsRoadmapLoading(false);
        setActiveTab('home'); 
    }, 50);
  };

  const handleSwitchCareerFromRoadmap = (careerId: string) => {
    setIsRoadmapLoading(true);
    setRoadmap(null);
    setTimeout(() => {
        const savedCareer = getCareerData(user.id, careerId);
        const savedRoadmap = getRoadmap(user.id, careerId);
        if (savedCareer) {
          setCareer(savedCareer);
          setRoadmap(savedRoadmap || []);
          const updatedUser = { ...user, currentCareerId: careerId };
          setUser(updatedUser);
          saveUser(updatedUser);
          showToastMsg(`Nova: Switched focus to ${savedCareer.title}`);
        }
        setIsRoadmapLoading(false);
    }, 50);
  };

  const handleDeleteCareerRequest = (careerId: string) => setCareerToDelete(careerId);
  const executeDeleteCareer = () => {
      if (!careerToDelete) return;
      const careerId = careerToDelete;
      const updatedActiveCareers = user.activeCareers.filter(c => c.careerId !== careerId);
      localStorage.removeItem(`pathfinder_career_data_${user.id}_${careerId}`);
      localStorage.removeItem(`pathfinder_roadmap_${user.id}_${careerId}`);
      if (updatedActiveCareers.length === 0) {
          const updatedUser = { ...user, activeCareers: [], currentCareerId: undefined };
          setUser(updatedUser);
          saveUser(updatedUser);
          setCareer(null);
          setRoadmap(null);
          onAddCareer();
          showToastMsg("Career deleted.");
      } else {
          let nextCareerId = user.currentCareerId;
          if (careerId === user.currentCareerId) nextCareerId = updatedActiveCareers[0].careerId;
          const updatedUser = { ...user, activeCareers: updatedActiveCareers, currentCareerId: nextCareerId };
          setUser(updatedUser);
          saveUser(updatedUser);
          if (careerId === user.currentCareerId && nextCareerId) handleSwitchCareer(nextCareerId);
          showToastMsg("Career deleted successfully.");
      }
      setCareerToDelete(null);
  };

  const getDaysRemaining = () => {
      if (roadmap && roadmap.length > 0) {
          const allCompleted = roadmap.every(phase => phase.items.every(item => item.status === 'completed'));
          if (allCompleted) return 0;
      }
      if (!currentCareerDetails?.targetCompletionDate) return 0;
      const parts = currentCareerDetails.targetCompletionDate.split('-');
      if (parts.length !== 3) return 0;
      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0); 
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays + 1 : 0;
  }

  const daysRemaining = getDaysRemaining();
  
  // FIX: Stricter day-based pacing calculation
  const getPacingStatus = () => {
      if (!currentCareerDetails) return { status: 'on-track', days: 0, message: '' } as const;
      
      const startDate = new Date(currentCareerDetails.addedAt);
      startDate.setHours(12, 0, 0, 0);
      
      const targetParts = currentCareerDetails.targetCompletionDate.split('-');
      const targetDate = new Date(parseInt(targetParts[0]), parseInt(targetParts[1]) - 1, parseInt(targetParts[2]), 12, 0, 0);
      
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const totalDurationMs = targetDate.getTime() - startDate.getTime();
      const totalDays = Math.max(1, Math.round(totalDurationMs / (1000 * 60 * 60 * 24)));
      
      const elapsedMs = today.getTime() - startDate.getTime();
      const daysElapsed = Math.max(0, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));

      if (daysElapsed > totalDays) return { status: 'critical', days: daysElapsed - totalDays, message: 'Target date passed' } as const;

      const expectedProgressRatio = daysElapsed / totalDays;
      const actualProgressRatio = progress / 100;

      // Positive diffRatio means ahead, negative means behind
      const diffRatio = actualProgressRatio - expectedProgressRatio;
      const diffDays = Math.round(diffRatio * totalDays);

      if (diffDays >= 1) {
           return { status: 'ahead', days: diffDays, message: `${diffDays} days ahead` } as const;
      } else if (diffDays <= -1) { 
           // Strictly trigger behind if late by 1 day or more
           return { status: 'behind', days: Math.abs(diffDays), message: `${Math.abs(diffDays)} days behind` } as const;
      }

      return { status: 'on-track', days: 0, message: 'On track' } as const;
  };
  
  const pacing = getPacingStatus();

  // --- MODAL COMPONENTS ---

  const CelebrationModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)]">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/40">
                  <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Career Mastered!</h2>
              <p className="text-slate-300 mb-8">You have completed 100% of the {career.title} roadmap.</p>
              <button onClick={() => setShowCelebration(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Continue Journey</button>
          </div>
      </div>
  );
  
  const AdaptingOverlay = () => (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-fade-in">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-slate-800">
                <BrainCircuit className="h-12 w-12 text-indigo-400 animate-[spin_3s_linear_infinite]" />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Re-architecting your path...</h2>
        <p className="text-slate-400 max-w-md mx-auto text-center">Nova is analyzing your progress and adapting the roadmap for optimal performance.</p>
    </div>
  );

  const PhaseCompletionModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Phase Completed!</h2>
              <p className="text-slate-300 mb-8">
                  {pacing.status === 'behind' ? "You've caught up a bit, but still behind schedule. Adapt?" : pacing.status === 'ahead' ? "You are crushing it! Want to speed up or go deeper?" : "Great pace! How would you like to proceed?"}
              </p>
              <div className="space-y-3 text-left">
                  {pacing.status === 'behind' && (
                      <>
                        <button onClick={() => handleAdaptation('maintain_pressure')} className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all flex items-center justify-between group">
                            <div><div className="font-bold text-white mb-1">Maintain Timeline</div><div className="text-xs text-slate-400">Keep target date. Rearrange tasks to fit.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                        </button>
                        <button onClick={() => handleAdaptation('reduce_difficulty')} className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-between group">
                            <div><div className="font-bold text-white mb-1">Reduce Difficulty</div><div className="text-xs text-slate-400">Simplify remaining tasks to catch up.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                        </button>
                      </>
                  )}
                  {pacing.status !== 'behind' && (
                      <>
                        <button onClick={() => handleAdaptation('relax_pace')} className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all flex items-center justify-between group">
                            <div><div className="font-bold text-white mb-1">Change Pace (Relax)</div><div className="text-xs text-slate-400">Keep date. Spread tasks out more.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                        </button>
                        <button onClick={() => handleAdaptation('increase_difficulty_same_time')} className="w-full p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl transition-all flex items-center justify-between group">
                            <div><div className="font-bold text-white mb-1">Increase Difficulty</div><div className="text-xs text-slate-400">Keep date. Add advanced challenges.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-400" />
                        </button>
                        <button onClick={handleFinishQuicker} className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-between group">
                            <div><div className="font-bold text-white mb-1">Finish Quicker</div><div className="text-xs text-slate-400">Update target date to now.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                        </button>
                      </>
                  )}
              </div>
              <button onClick={() => setShowPhaseCompletionModal(false)} className="mt-6 text-slate-500 text-sm hover:text-white">Dismiss</button>
          </div>
      </div>
  );

  const FeedbackModal = () => (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative shadow-2xl">
              <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"><X className="h-5 w-5"/></button>
              <h2 className="text-2xl font-bold text-white mb-2">Feedback</h2>
              <p className="text-slate-400 mb-6 text-sm">Help improve PathFinder AI. Report a bug or suggest a feature.</p>
              <textarea className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none mb-4" placeholder="Describe your issue or idea..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
              <button onClick={() => { showToastMsg("Feedback sent! Nova thanks you."); setShowFeedbackModal(false); setFeedbackText(''); }} disabled={!feedbackText.trim()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50">Send Feedback</button>
          </div>
      </div>
  );

  const DateEditModal = () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative shadow-2xl">
              <button onClick={() => setShowDateEditModal(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"><X className="h-5 w-5"/></button>
              <h2 className="text-2xl font-bold text-white mb-4">Update Target Date</h2>
              <p className="text-slate-400 text-sm mb-6">Select a new completion date for your roadmap.</p>
              <input 
                type="date" 
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 outline-none color-scheme-dark mb-6"
                value={pendingTargetDate}
                onChange={e => setPendingTargetDate(e.target.value)}
              />
              <button onClick={initiateDateUpdate} disabled={!pendingTargetDate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50">
                  Confirm Date & Adapt
              </button>
          </div>
      </div>
  );

  const DateStrategyModal = () => (
      <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">{dateStrategyType === 'extension' ? "Target Date Extended" : "Timeline Shortened"}</h2>
              <p className="text-slate-300 mb-8">{dateStrategyType === 'extension' ? "You have more time. How should Nova adapt?" : "You have less time. How should Nova adapt?"}</p>
              <div className="space-y-3 text-left">
                  {dateStrategyType === 'extension' ? (
                      <>
                          <button onClick={() => handleAdaptation('increase_difficulty', pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl transition-all flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Increase Difficulty</div><div className="text-xs text-slate-400">Add new advanced tasks to fill extra days.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-400" />
                          </button>
                          <button onClick={() => handleAdaptation('relax_pace', pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Relax Pace</div><div className="text-xs text-slate-400">Redistribute existing tasks over more time.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                          </button>
                          <button onClick={() => handleDateUpdateWithoutAI(pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Keep It Free</div><div className="text-xs text-slate-400">Just update the date. No roadmap changes.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                          </button>
                      </>
                  ) : (
                      <>
                          <button onClick={() => handleAdaptation('challenge_me', pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-orange-900/20 border border-slate-700 hover:border-orange-500 rounded-xl transition-all text-left flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Challenge Me</div><div className="text-xs text-slate-400">Compress tasks to fit. Harder pace.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-orange-400" />
                          </button>
                          <button onClick={() => handleAdaptation('reduce_difficulty_and_scope', pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all text-left flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Reduce Difficulty</div><div className="text-xs text-slate-400">Simplify the roadmap to maintain pace.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                          </button>
                           <button onClick={() => handleDateUpdateWithoutAI(pendingTargetDate)} className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-between group">
                              <div><div className="font-bold text-white mb-1">Let It Free</div><div className="text-xs text-slate-400">Just update the date. No roadmap changes.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                          </button>
                      </>
                  )}
              </div>
              <button onClick={() => setShowDateStrategyModal(false)} className="mt-8 text-slate-500 text-sm hover:text-white">Cancel</button>
          </div>
      </div>
  );

  const ConfirmationModal = () => {
      if (!confirmAction) return null;
      const { type, inputValue } = confirmAction;
      const requiredText = type === 'reset_all' ? 'RESET' : 'DELETE';
      const isMatch = inputValue === requiredText;
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Are you absolutely sure?</h3>
                  <p className="text-slate-400 text-sm mb-6">{type === 'reset_all' ? "This will wipe all progress for all careers." : "This will permanently delete your account."}</p>
                  <div className="mb-6 text-left">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type <span className="text-white select-all">{requiredText}</span> to confirm</label>
                      <input type="text" className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-red-500 outline-none uppercase tracking-widest font-bold text-center" value={inputValue} onChange={e => setConfirmAction({...confirmAction, inputValue: e.target.value.toUpperCase()})} placeholder={requiredText} autoFocus />
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl">Cancel</button>
                      <button onClick={type === 'reset_all' ? executeResetAll : executeDeleteAccount} disabled={!isMatch} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">{type === 'reset_all' ? 'Reset All' : 'Delete Account'}</button>
                  </div>
              </div>
          </div>
      );
  };
  
  const DeleteCareerConfirmationModal = () => {
      if (!careerToDelete) return null;
      const careerTitle = user.activeCareers.find(c => c.careerId === careerToDelete)?.title || "this career";
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
                  <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-red-500/20 rounded-xl text-red-400 shrink-0"><Trash2 className="h-6 w-6" /></div>
                      <div><h3 className="text-lg font-bold text-white">Delete Career?</h3><p className="text-slate-400 text-sm mt-1">Are you sure you want to remove <span className="text-white font-medium">"{careerTitle}"</span>?</p></div>
                  </div>
                  <div className="flex gap-3 mt-4">
                      <button onClick={() => setCareerToDelete(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm">Cancel</button>
                      <button onClick={executeDeleteCareer} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg text-sm flex items-center justify-center gap-2">Delete</button>
                  </div>
              </div>
          </div>
      );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        // ... (Home Render Logic kept identical)
        return (
          <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div><h1 className="text-3xl font-bold text-white">Dashboard</h1><p className="text-slate-400 mt-1">Welcome back, <span className="text-white font-medium">{user.username}</span>.</p></div>
              <div className="relative z-30">
                 <button onClick={() => setShowCareerMenu(!showCareerMenu)} className="flex items-center gap-2 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium w-full md:w-auto justify-between min-w-[200px]">
                   <div className="flex items-center gap-2 truncate"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div><span className="truncate">{career.title}</span></div><ChevronDown className="h-4 w-4 shrink-0" />
                 </button>
                 {showCareerMenu && (
                   <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                     <div className="p-2 space-y-1">
                       <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Focus</div>
                       {user.activeCareers.map(c => (
                         <button key={c.careerId} onClick={() => handleSwitchCareer(c.careerId)} className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === career.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                            <span className="truncate">{c.title}</span>{c.careerId === career.id && <Target className="h-3 w-3 shrink-0" />}
                         </button>
                       ))}
                       <div className="h-px bg-slate-800 my-2" /><button onClick={() => onAddCareer()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-slate-800 flex items-center gap-2 font-medium"><PlusCircle className="h-4 w-4" /> Add New Path</button>
                     </div>
                   </div>
                 )}
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 relative overflow-hidden shadow-lg shadow-indigo-900/10 min-h-[300px] flex flex-col justify-center">
                     {showConfetti && <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"><div className="animate-ping w-32 h-32 bg-emerald-500/20 rounded-full absolute"></div></div>}
                     <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-2 text-indigo-400"><BrainCircuit className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-wider">Daily Challenge</span></div>
                         <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700"><Flame className={`h-4 w-4 ${user.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-500'}`} /><span className="text-white font-bold text-sm">{user.streak || 0}</span></div>
                             <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /><span className="text-white font-bold text-sm">{user.xp || 0} XP</span></div>
                         </div>
                     </div>
                     {quizState === 'loading' && <div className="text-center py-8"><RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" /><p className="text-slate-400">Preparing your challenge...</p></div>}
                     {quizState === 'already_done' && <div className="text-center py-8"><div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8 text-emerald-400" /></div><h3 className="text-xl font-bold text-white mb-2">You're all set for today!</h3><p className="text-slate-400 mb-6">Come back tomorrow.</p><div className="inline-block bg-slate-800 px-4 py-2 rounded-xl text-sm text-slate-300">Next quiz available in <CountdownTimer /></div></div>}
                     {quizState === 'completed' && dailyQuiz && (
                         <div className="text-center py-6 animate-fade-in">
                             {isQuizCorrect ? <><div className="text-4xl mb-4">🎉</div><h3 className="text-2xl font-bold text-white mb-2">Correct! +10 XP</h3><p className="text-slate-300 mb-6">{dailyQuiz.explanation}</p></> : <><div className="text-4xl mb-4">💪</div><h3 className="text-2xl font-bold text-white mb-2">Not quite.</h3><p className="text-slate-300 mb-6">Streak reset to 0.</p><div className="w-full bg-slate-800/50 p-4 rounded-xl text-left border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold mb-1">Correct Answer</div><div className="text-emerald-400 font-bold mb-2">{dailyQuiz.options[dailyQuiz.correctIndex]}</div><div className="text-sm text-slate-300">{dailyQuiz.explanation}</div></div></>}
                         </div>
                     )}
                     {quizState === 'active' && dailyQuiz && (
                         <div className="animate-fade-in">
                             <h3 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">{dailyQuiz.question}</h3>
                             <div className="grid grid-cols-1 gap-3">
                                 {dailyQuiz.options.map((opt, i) => <button key={i} onClick={() => handleQuizAnswer(i)} disabled={selectedQuizOption !== null} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedQuizOption !== null ? i === dailyQuiz.correctIndex ? 'bg-emerald-500/20 border-emerald-500 text-white' : i === selectedQuizOption ? 'bg-red-500/20 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-50' : 'bg-slate-900/50 border-slate-700 text-slate-200 hover:bg-indigo-900/30 hover:border-indigo-500 hover:text-white'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${selectedQuizOption !== null && i === dailyQuiz.correctIndex ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600 text-slate-400'}`}>{['A','B','C','D'][i]}</div>{opt}</div></button>)}
                             </div>
                         </div>
                     )}
                 </div>
                 <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                     <div className="mb-6"><h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400" /> Career Progress</h3><div className="flex items-end gap-2 mb-2"><span className="text-5xl font-bold text-white">{progress}%</span><span className="text-sm text-slate-500 mb-1.5">complete</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${progress}%`}}></div></div></div>
                     <div className="space-y-4">
                         <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"><div><div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Time Left</div><div className="text-xl font-bold text-white">{daysRemaining} Days</div></div><Clock className="h-5 w-5 text-slate-600" /></div>
                         <div className={`p-4 rounded-2xl border flex items-center justify-between ${pacing.status === 'ahead' ? 'bg-emerald-500/10 border-emerald-500/20' : pacing.status === 'behind' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}><div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${pacing.status === 'ahead' ? 'text-emerald-400' : pacing.status === 'behind' ? 'text-red-400' : 'text-blue-400'}`}>Current Pace</div><div className="text-sm font-bold text-white">{pacing.message}</div></div><TrendingUp className="h-5 w-5" /></div>
                     </div>
                 </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                     <div className="flex items-center gap-3"><div className="p-2 bg-indigo-500/10 rounded-lg"><Zap className="h-5 w-5 text-indigo-400" /></div><h2 className="text-xl font-bold text-white">Headlines</h2></div>
                     <div className="relative group w-full sm:w-64"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" /><input type="text" placeholder="Search news..." className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 outline-none transition-all text-sm" value={homeSearchQuery} onChange={(e) => setHomeSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleHomeSearch()} /></div>
                 </div>
                 <div className="space-y-1">
                     {isNewsLoading ? [1,2,3].map(i => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse my-2"></div>) : news.length === 0 ? <div className="text-slate-500 text-center py-8">No recent headlines found.</div> : news.map((item, i) => <a key={i} href={item.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"><div className="flex items-center gap-4"><span className="text-xs font-bold text-slate-500 w-24 truncate text-right">{item.source}</span><h3 className="text-sm md:text-base font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-1">{item.title}</h3></div><ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" /></a>)}
                 </div>
            </div>
          </div>
        );
      case 'roadmap':
        return <Roadmap roadmap={roadmap} user={user} onSubscribe={handleSubscribe} onUpdateProgress={handleProgress} onReset={handleResetRoadmap} onResetPhase={handleResetPhase} onSwitchCareer={handleSwitchCareerFromRoadmap} onEditTargetDate={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEditModal(true); }} pacing={pacing} isLoading={isRoadmapLoading} daysRemaining={daysRemaining} />;
      case 'practice':
          return (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 min-h-[80vh] flex flex-col overflow-hidden">
                  {/* Practice Header & Nav */}
                  <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                           <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><GraduationCap className="h-6 w-6 text-indigo-500" /> Practice Arena</h2><p className="text-slate-400 text-sm mt-1">Master your skills in {career.title}</p></div>
                           <div className="relative group w-full md:w-80"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" /><input type="text" placeholder="Search concepts, questions..." className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm" value={practiceSearch} onChange={e => setPracticeSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePracticeSearch()} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 w-full md:w-auto self-start">
                          {[{ id: 'quiz', icon: BrainCircuit, label: 'Questions' }, { id: 'interview', icon: MessageSquare, label: 'Interview' }, { id: 'simulation', icon: PlayCircle, label: 'Simulation' }].map(tab => (
                              <button key={tab.id} onClick={() => setPracticeTab(tab.id as any)} className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${practiceTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}><tab.icon className="h-4 w-4 md:h-4 md:w-4" /><span className="text-[10px] md:text-sm whitespace-nowrap">{tab.label}</span></button>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 md:p-8 flex-1 bg-slate-900">
                      {isPracticeLoading ? (
                           <div className="space-y-6">
                               {practiceTab === 'quiz' && Array.from({ length: 3 }).map((_, i) => <QuestionSkeletonCard key={i} />)}
                               {practiceTab === 'interview' && Array.from({ length: 4 }).map((_, i) => <InterviewSkeletonCard key={i} />)}
                               {practiceTab === 'simulation' && <div className="flex flex-col items-center justify-center py-20"><RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" /><p className="text-slate-400 animate-pulse">Nova is generating your simulation...</p></div>}
                           </div>
                      ) : (
                          <>
                              {practiceTab === 'quiz' && (
                                  <div className="animate-fade-in space-y-8">
                                      <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggested Topics</h3><div className="flex flex-wrap gap-2"><button onClick={() => setSelectedTopic(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!selectedTopic ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>General</button>{practiceTopics.map(t => <button key={t} onClick={() => setSelectedTopic(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTopic === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>{t}</button>)}</div></div>
                                      <div className="space-y-6">
                                          {practiceQuestions.length > 0 ? practiceQuestions.map((q, qIdx) => (<div key={q.id || qIdx} className="bg-slate-950 border border-slate-800 rounded-2xl p-6"><h4 className="text-lg font-bold text-white mb-4">{q.question}</h4><div className="grid gap-3">{q.options.map((opt, oIdx) => (<QuizOption key={`${q.id || qIdx}-${oIdx}`} option={opt} index={oIdx} correctIndex={q.correctIndex} explanation={q.explanation} />))}</div></div>)) : <div className="text-center py-10 text-slate-500">No questions available for this filter.</div>}
                                      </div>
                                      <button onClick={handleLoadMorePractice} disabled={isLoadingMore} className="w-full py-3 mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">{isLoadingMore ? <RefreshCw className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>} Load More Questions</button>
                                  </div>
                              )}

                              {practiceTab === 'interview' && (
                                  <div className="animate-fade-in space-y-8">
                                      <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filter by Company / Mode</h3><div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">{['All', 'Google', 'Amazon', 'Microsoft', 'Netflix', 'Meta', 'Startups', 'Aptitude', 'AI Challenge'].map(mode => (<button key={mode} onClick={() => setCompanyFilter(mode)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${companyFilter === mode ? mode === 'AI Challenge' ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-lg' : 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>{mode === 'AI Challenge' && <Sparkles className="h-3 w-3" />}{mode === 'Aptitude' && <Cpu className="h-3 w-3" />}{mode}</button>))}</div></div>
                                      
                                      {/* AI CHALLENGE UI */}
                                      {companyFilter === 'AI Challenge' && (
                                          <div className="bg-slate-950 border border-fuchsia-500/30 rounded-2xl p-6 animate-fade-in relative overflow-hidden">
                                              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                                              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-fuchsia-500" /> Custom AI Generator</h3>
                                              <div className="grid md:grid-cols-3 gap-4 mb-4"><div className="md:col-span-2"><label className="text-xs text-slate-500 block mb-1 uppercase font-bold">Topic</label><input type="text" placeholder={`e.g. Advanced ${career.title} concepts`} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 outline-none" value={customGenTopic} onChange={e => setCustomGenTopic(e.target.value)} /></div><div><label className="text-xs text-slate-500 block mb-1 uppercase font-bold">Difficulty</label><select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 outline-none" value={customGenDifficulty} onChange={e => setCustomGenDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option><option>Expert</option></select></div></div>
                                              <button onClick={handleAICustomChallenge} className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-fuchsia-900/20">Generate Challenge Questions</button>
                                          </div>
                                      )}

                                      <div className="grid md:grid-cols-2 gap-4">
                                          {interviewQuestions.length > 0 ? interviewQuestions.map((q, i) => (
                                              <div key={q.id || i} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-colors group">
                                                  <div>
                                                      <div className="flex justify-between items-start mb-4"><div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${q.company?.includes('Aptitude') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : q.company?.includes('AI Challenge') ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{q.company || 'General'}</div></div>
                                                      <h4 className="font-bold text-white mb-4">{q.question}</h4>
                                                  </div>
                                                  <div>{visibleAnswers.has(q.id) ? <div className="bg-slate-900 p-4 rounded-xl text-sm text-slate-300 border border-slate-800 animate-fade-in"><span className="font-bold text-indigo-400 block mb-1">Answer Guide:</span>{q.answer}</div> : <button onClick={() => toggleAnswerReveal(q.id)} className="w-full py-3 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium flex items-center justify-center gap-2"><Eye className="h-4 w-4" /> Reveal Answer</button>}</div>
                                              </div>
                                          )) : <div className="col-span-2 text-center py-10 text-slate-500">No questions found. Try changing filters or loading more.</div>}
                                      </div>
                                      {companyFilter !== 'AI Challenge' && (
                                          <button onClick={handleLoadMoreInterview} disabled={isLoadingMore} className="w-full py-3 mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">{isLoadingMore ? <RefreshCw className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>} Load More Questions</button>
                                      )}
                                  </div>
                              )}

                              {practiceTab === 'simulation' && (
                                  <div className="animate-fade-in max-w-3xl mx-auto">
                                    {!simulationScenario ? (
                                        <div className="text-center py-20">
                                            <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto mb-6 flex items-center justify-center"><PlayCircle className="h-10 w-10 text-indigo-500" /></div>
                                            <h3 className="text-xl font-bold text-white mb-2">Simulation Arena</h3>
                                            <p className="text-slate-400 mb-6">Test your decision-making in real-world job scenarios.</p>
                                            <button onClick={handleSimulationSearch} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20">Start New Scenario</button>
                                        </div>
                                    ) : (
                                      <div className="bg-slate-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl relative">
                                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                                          <div className="p-8">
                                              <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><PlayCircle className="h-8 w-8" /></div><div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Simulation Arena</h3><h2 className="text-xl font-bold text-white">Scenario Challenge</h2></div></div>
                                              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8 italic text-slate-300 leading-relaxed">"{simulationScenario.scenario}"</div>
                                              <h3 className="text-lg font-bold text-white mb-6">{simulationScenario.question}</h3>
                                              <div className="space-y-3">
                                                  {simulationScenario.options.map((opt, idx) => {
                                                      const isSelected = simAnswer === idx;
                                                      const isCorrect = idx === simulationScenario.correctIndex;
                                                      const showResult = simAnswer !== null;
                                                      return (
                                                          <button key={idx} onClick={() => handleSimAnswer(idx)} disabled={simAnswer !== null} className={`w-full text-left p-5 rounded-xl border transition-all relative overflow-hidden ${showResult ? isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-white' : isSelected ? 'bg-red-500/20 border-red-500 text-white opacity-50' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-50' : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-800'}`}>
                                                              {opt}{showResult && isCorrect && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                              {simAnswer !== null && <div className="mt-8 p-6 bg-slate-900 rounded-2xl border border-indigo-500/20 animate-fade-in"><h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2"><Zap className="h-4 w-4" /> Nova Analysis</h4><p className="text-slate-300">{simulationScenario.explanation}</p><button onClick={handleSimulationSearch} className="mt-4 text-sm text-slate-400 hover:text-white underline decoration-slate-600 hover:decoration-white underline-offset-4">Next Scenario</button></div>}
                                          </div>
                                      </div>
                                    )}
                                  </div>
                              )}
                          </>
                      )}
                  </div>
              </div>
          );
      case 'career':
          return (
              <div className="space-y-6 pb-20 animate-fade-in">
                  <div className="flex justify-between items-end"><div><h2 className="text-3xl font-bold text-white">Your Paths</h2><p className="text-slate-400 mt-1">Manage your active career journeys.</p></div><button onClick={() => onAddCareer()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20"><PlusCircle className="h-5 w-5" /> Add Career</button></div>
                  <div className="grid gap-6">
                      {user.activeCareers.map((c, i) => {
                          const stats = careerStats[c.careerId] || { progress: 0, daysLeft: 0 };
                          const isCurrent = c.careerId === user.currentCareerId;
                          return (
                              <div key={c.careerId} className={`relative bg-slate-900 border rounded-3xl p-6 transition-all ${isCurrent ? 'border-indigo-500 shadow-xl shadow-indigo-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                                  {isCurrent && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl">CURRENT FOCUS</div>}
                                  <div className="flex flex-col md:flex-row justify-between gap-6 mb-6"><div><h3 className="text-2xl font-bold text-white mb-2">{c.title}</h3><div className="flex flex-wrap gap-3 text-sm text-slate-400"><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"><CalendarDays className="h-4 w-4 text-indigo-400" /> Start: {new Date(c.addedAt).toLocaleDateString()}</span><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"><Target className="h-4 w-4 text-indigo-400" /> Target: {c.targetCompletionDate}</span><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 capitalize"><Zap className="h-4 w-4 text-yellow-400" /> {c.experienceLevel}</span></div></div><div className="flex items-center gap-4"><div className="text-right"><div className="text-3xl font-bold text-white">{stats.daysLeft}</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Days Left</div></div><div className="w-px h-12 bg-slate-800 mx-2 hidden md:block"></div><div className="text-right"><div className="text-3xl font-bold text-emerald-400">{stats.progress}%</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Complete</div></div></div></div>
                                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-6"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div></div>
                                  <div className="flex gap-4">{isCurrent ? <button disabled className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl cursor-default">Active</button> : <button onClick={() => handleSwitchCareer(c.careerId)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Switch Focus</button>}<button onClick={() => handleDeleteCareerRequest(c.careerId)} className="px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-red-900/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded-xl transition-colors" title="Delete Career"><Trash2 className="h-5 w-5" /></button></div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          );
      case 'profile':
          // ... (Profile Render Logic kept identical)
          return (
              <div className="space-y-8 pb-20 animate-fade-in">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-900 to-purple-900 opacity-50"></div>
                      <div className="relative z-10 flex flex-col md:flex-row items-end gap-6 pt-12"><div className="w-24 h-24 bg-slate-800 rounded-2xl border-4 border-slate-900 shadow-xl flex items-center justify-center text-3xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</div><div className="flex-1 mb-2"><h2 className="text-3xl font-bold text-white">{user.username}</h2><div className="flex items-center gap-4 text-slate-400 text-sm mt-1"><span>Member since {user.joinedAt ? new Date(user.joinedAt).getFullYear() : 2024}</span><span>•</span><span className="capitalize">{user.subscriptionStatus} Plan</span></div></div><div className="flex gap-2"><div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /><span className="text-white font-bold">{user.streak} Streak</span></div><div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /><span className="text-white font-bold">{user.xp} XP</span></div></div></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6"><h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Palette className="h-5 w-5 text-indigo-400" /> Accent Color</h3><div className="space-y-4"><div className="p-4 bg-slate-950 rounded-xl border border-slate-800"><div className="text-slate-400 text-sm mb-3">Choose your vibe</div><div className="flex flex-wrap gap-3">{(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as const).map(color => (<button key={color} onClick={() => setAccentColor(color)} className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${user.theme === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{backgroundColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#06b6d4'}}>{user.theme === color && <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />}</button>))}</div></div><div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800"><div className="flex items-center gap-3 text-slate-300"><Mail className="h-5 w-5 text-slate-500" /> Email</div><span className="text-slate-500 font-mono text-sm">{user.id.includes('@') ? user.id.replace(/(.{2})(.*)(@.*)/, "$1***$3") : user.id}</span></div></div></div>
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6"><h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-400" /> Danger Zone</h3><div className="space-y-4"><button onClick={() => setConfirmAction({type: 'reset_all', inputValue: ''})} className="w-full text-left p-4 bg-slate-950 hover:bg-red-900/10 border border-slate-800 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 transition-all flex items-center justify-between group"><span>Reset All Progress</span><RotateCcw className="h-5 w-5 group-hover:rotate-180 transition-transform" /></button><button onClick={() => setConfirmAction({type: 'delete_account', inputValue: ''})} className="w-full text-left p-4 bg-slate-950 hover:bg-red-900/10 border border-slate-800 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 transition-all flex items-center justify-between group"><span>Delete Account</span><Trash2 className="h-5 w-5" /></button></div></div>
                  </div>
                  <div className="text-center pt-8"><button onClick={onLogout} className="text-slate-500 hover:text-white flex items-center gap-2 mx-auto transition-colors"><LogOut className="h-5 w-5" /> Log Out</button><div className="mt-8 text-xs text-slate-600">PathFinder AI v1.0.0 • Developed by Hameed Afsar K M</div><button onClick={() => setShowFeedbackModal(true)} className="mt-4 text-xs text-indigo-500 hover:text-indigo-400">Send Feedback</button></div>
              </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen">
      <div className="md:pl-20">
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            {renderContent()}
            <footer className="mt-8 pt-8 border-t border-slate-900 text-center">
                <p className="text-slate-600 text-sm">Developed by © <span className="font-semibold text-indigo-400">Hameed Afsar K M</span></p>
            </footer>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-2 md:hidden z-40">
        <div className="flex justify-around items-center">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl transition-all ${activeTab === 'home' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Home className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('roadmap')} className={`p-3 rounded-xl transition-all ${activeTab === 'roadmap' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Map className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('practice')} className={`p-3 rounded-xl transition-all ${activeTab === 'practice' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><GraduationCap className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('career')} className={`p-3 rounded-xl transition-all ${activeTab === 'career' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><Briefcase className="h-6 w-6" /></button>
          <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-xl transition-all ${activeTab === 'profile' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}><User className="h-6 w-6" /></button>
        </div>
      </nav>
      
      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-900 border-r border-slate-800 flex-col items-center py-8 hidden md:flex z-50">
        <div className="mb-8 p-2 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <Compass className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col gap-4 w-full px-3">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Home</span></button>
          <button onClick={() => setActiveTab('roadmap')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Map className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Roadmap</span></button>
          <button onClick={() => setActiveTab('practice')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'practice' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><GraduationCap className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Practice</span></button>
          <button onClick={() => setActiveTab('career')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'career' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Briefcase className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Career</span></button>
          <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><User className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Profile</span></button>
        </div>
      </nav>

      <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-[60] transition-transform hover:scale-105 active:scale-95">{isChatOpen ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}</button>
      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} careerTitle={career.title} history={chatHistory} onSend={handleSendMessage} isTyping={isChatTyping} />
      {showCelebration && <CelebrationModal />}
      {showPhaseCompletionModal && <PhaseCompletionModal />}
      {showFeedbackModal && <FeedbackModal />}
      {confirmAction && <ConfirmationModal />}
      {careerToDelete && <DeleteCareerConfirmationModal />}
      {showDateEditModal && <DateEditModal />}
      {showDateStrategyModal && <DateStrategyModal />}
      {isAdapting && <AdaptingOverlay />}
      {toast && <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in z-[100]"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="font-medium text-sm">{toast.message}</span></div>}
    </div>
  );
};
