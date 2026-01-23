import React, { useEffect, useState, useRef, useMemo } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';
import { Roadmap } from './Roadmap';
import { fetchTechNews, generateRoadmap, calculateRemainingDays, generateDailyQuiz, generatePracticeTopics, generatePracticeQuestions, generateCompanyInterviewQuestions, generateSimulationScenario, generateChatResponse, generatePracticeDataBatch } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser, getNewsCache, saveNewsCache, getDailyQuizCache, saveDailyQuizCache, deleteUser, getPracticeData, savePracticeData, PracticeDataStore } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, RefreshCw, MessageSquare, CheckCircle2, Pencil, BrainCircuit, GraduationCap, Flame, Star, Search, Link, Building2, PlayCircle, Eye, EyeOff, ShieldAlert, Palette, Settings, Mail, Lock, CalendarDays, AlertTriangle, Moon, Sun, Send, Cpu, Sparkles, Compass, LayoutDashboard, BookOpen, Info } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  career: CareerOption;
  roadmap: RoadmapData | null;
  onLogout: () => void;
  setRoadmap: (r: RoadmapData | null) => void;
  setUser: (u: UserProfile) => void;
  setCareer: (c: CareerOption | null) => void;
  onAddCareer: (mode?: 'analysis' | 'search') => void;
  onDeleteAccount: () => void;
}

const PracticeQuestionCard: React.FC<{ question: PracticeQuestion, index: number }> = ({ question, index }) => {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const handleSelect = (idx: number) => { if (selectedIdx !== null) return; setSelectedIdx(idx); };
    const correctIdx = question.correctIndex;
    const isAnswered = selectedIdx !== null;
    const isUserCorrect = selectedIdx === correctIdx;
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700 w-full">
            <h4 className="text-lg font-bold text-white mb-6 flex items-start gap-3"><span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-1 rounded pt-0.5 shrink-0 border border-indigo-500/20">Q{index + 1}</span>{question.question}</h4>
            <div className="grid gap-3">
                {question.options?.map((opt, idx) => {
                    let btnClass = "w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ";
                    let icon = null;
                    if (isAnswered) {
                        if (idx === correctIdx) { btnClass += "!bg-emerald-500/20 !border-emerald-500 text-white ring-1 ring-emerald-500/50"; icon = <CheckCircle2 className="h-5 w-5 text-emerald-400" />; } 
                        else if (idx === selectedIdx) { btnClass += "!bg-red-500/20 !border-red-500 text-white ring-1 ring-red-500/50"; icon = <AlertCircle className="h-5 w-5 text-red-400" />; } 
                        else { btnClass += "bg-slate-900 border-slate-800 text-slate-500 opacity-50"; }
                    } else { btnClass += "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-indigo-500 hover:text-white"; }
                    return <button key={idx} onClick={() => handleSelect(idx)} disabled={isAnswered} className={btnClass}><span className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${isAnswered && idx === correctIdx ? '!bg-emerald-500 !border-emerald-500 text-slate-950' : isAnswered && idx === selectedIdx ? '!bg-red-500 !border-red-500 text-white' : 'border-slate-600 text-slate-400'}`}>{['A','B','C','D'][idx]}</span>{opt}</span>{icon}</button>;
                })}
            </div>
            {isAnswered && (<div className={`mt-6 p-4 rounded-xl border animate-fade-in ${isUserCorrect ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}><div className="flex items-center gap-2 mb-2">{isUserCorrect ? <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Correct!</span> : <span className="text-red-400 font-bold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Incorrect</span>}</div>{!isUserCorrect && <div className="mb-2 text-sm"><span className="font-semibold text-slate-400 text-xs uppercase tracking-wider block">Correct Answer</span><p className="text-emerald-300 font-medium">{question.options?.[correctIdx]}</p></div>}<p className="text-slate-300 text-sm leading-relaxed pt-2 border-t border-slate-700/50 mt-2"><span className="font-semibold text-slate-400 text-xs uppercase tracking-wider block mb-1">Explanation</span>{question.explanation}</p></div>)}
        </div>
    );
};

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        const timer = setInterval(() => { const now = new Date(); const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0); const diff = tomorrow.getTime() - now.getTime(); const h = Math.floor((diff / (1000 * 60 * 60)) % 24); const m = Math.floor((diff / (1000 * 60)) % 60); const s = Math.floor((diff / 1000) % 60); setTimeLeft(`${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`); }, 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="text-white font-mono font-bold tracking-widest">{timeLeft}</span>;
};

const ChatWindow: React.FC<{ isOpen: boolean; onClose: () => void; careerTitle: string; history: ChatMessage[]; onSend: (msg: string) => void; isTyping: boolean }> = ({ isOpen, onClose, careerTitle, history, onSend, isTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (isOpen && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [history, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-80 md:w-96 h-[500px] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[70] animate-fade-in">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center"><div className="flex items-center gap-2"><div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><MessageSquare className="h-5 w-5" /></div><div><h3 className="font-bold text-white text-sm">Nova Support</h3><p className="text-xs text-slate-500">Online</p></div></div><button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">{history.map(msg => (<div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>{msg.text.split('\n').map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}</div></div>))}{isTyping && (<div className="flex justify-start"><div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span><span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span></div></div>)}<div ref={messagesEndRef} /></div>
            <div className="p-4 bg-slate-950 border-t border-slate-800"><div className="flex gap-2"><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isTyping && input.trim() && (onSend(input), setInput(''))} placeholder="Type a message..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" /><button onClick={() => { if(input.trim()) { onSend(input); setInput(''); }}} disabled={!input.trim() || isTyping} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white disabled:opacity-50"><Send className="h-5 w-5" /></button></div></div>
        </div>
    );
};

const QuestionSkeletonCard = () => (<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse"><div className="h-4 bg-slate-800 rounded w-3/4 mb-6"></div><div className="space-y-3"><div className="h-10 bg-slate-800 rounded-xl"></div><div className="h-10 bg-slate-800 rounded-xl"></div><div className="h-10 bg-slate-800 rounded-xl"></div><div className="h-10 bg-slate-800 rounded-xl"></div></div></div>);
const InterviewSkeletonCard = () => (<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse"><div className="flex justify-between items-start mb-4"><div className="h-4 bg-slate-800 rounded w-24"></div></div><div className="h-5 bg-slate-800 rounded w-full mb-6"></div><div className="h-10 bg-slate-800 rounded-xl"></div></div>);
const CelebrationModal = ({ onClose }: { onClose: () => void }) => (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}><div className="text-center pointer-events-auto bg-slate-900 border border-yellow-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10"></div><div className="relative z-10"><div className="text-6xl mb-6 animate-bounce">🏆</div><h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2><p className="text-slate-300 mb-8">You've completed the entire roadmap!</p><button onClick={onClose} className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors">Continue</button></div></div></div>);

const PhaseAdaptationModal = ({ status, diff, onOptionSelect, onClose }: { status: 'ahead' | 'behind', diff: number, onOptionSelect: (option: string) => void, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className={`bg-slate-900 border ${status === 'ahead' ? 'border-emerald-500/30' : 'border-amber-500/30'} p-8 rounded-3xl max-w-md w-full shadow-2xl relative`}>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                {status === 'ahead' ? <><Zap className="h-6 w-6 text-emerald-400" /> Amazing Pace!</> : <><AlertTriangle className="h-6 w-6 text-amber-400" /> Schedule Update</>}
            </h2>
            <p className="text-slate-400 mb-6">
                You are {diff} days {status} of schedule. How should Nova adapt your journey?
            </p>
            <div className="space-y-3">
                {status === 'ahead' ? (
                    <>
                        <button onClick={() => onOptionSelect('finish_quicker')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">Finish Quickly (Update Date)</button>
                        <button onClick={() => onOptionSelect('increase_difficulty')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Increase Difficulty (Fill Time)</button>
                        <button onClick={() => onOptionSelect('change_pace')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Change Pace (Relax)</button>
                    </>
                ) : (
                    <>
                         <button onClick={() => onOptionSelect('keep_same')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Keep Same Timeline</button>
                         <button onClick={() => onOptionSelect('reduce_difficulty')} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors">Reduce Difficulty</button>
                         <button onClick={() => onOptionSelect('adapt_roadmap')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Adapt Roadmap (Essentials Only)</button>
                    </>
                )}
                <button onClick={onClose} className="mt-4 text-xs text-slate-500 hover:text-white mx-auto block">Dismiss</button>
            </div>
        </div>
    </div>
);

const FeedbackModal = ({ onClose, text, setText }: { onClose: () => void, text: string, setText: (s: string) => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Send Feedback</h2>
                <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <textarea 
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none mb-4" 
                placeholder="Tell us what you think..." 
                value={text} 
                onChange={e => setText(e.target.value)} 
            />
            <button onClick={() => { alert('Feedback sent!'); onClose(); setText(''); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">Send Message</button>
        </div>
    </div>
);

const ConfirmationModal = ({ action, onConfirm, onCancel }: { action: {type: string, inputValue: string}, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 border border-red-500/30 p-6 rounded-3xl max-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Are you sure?</h2>
            </div>
            <p className="text-slate-300 mb-6">
                {action.type === 'reset_all' ? "This will wipe all progress across all careers." : "This will permanently delete your account and all data."}
            </p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl">Confirm</button>
            </div>
        </div>
    </div>
);

const DeleteCareerConfirmationModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 border border-red-500/30 p-6 rounded-3xl max-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
                <Trash2 className="h-6 w-6" />
                <h2 className="text-xl font-bold">Delete Career Path?</h2>
            </div>
            <p className="text-slate-300 mb-6">This will remove this career and its roadmap history.</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl">Delete</button>
            </div>
        </div>
    </div>
);

const DateEditModal = ({ date, setDate, onConfirm, onCancel }: { date: string, setDate: (d: string) => void, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Change Target Date</h2>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-6 color-scheme-dark" />
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">Update</button>
            </div>
        </div>
    </div>
);

const DateStrategyModal = ({ type, onAdapt, onManual, onClose }: { type: 'extension' | 'shortening' | null, onAdapt: (t: any) => void, onManual: () => void, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Timeline Changed</h2>
            <p className="text-slate-400 mb-6">How should Nova handle the roadmap changes?</p>
            <div className="space-y-3">
                {type === 'extension' ? (
                    <>
                        <button onClick={() => onAdapt('increase_difficulty')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                            <div className="font-bold text-white mb-1 group-hover:text-indigo-400">Fill with Advanced Content</div>
                            <div className="text-xs text-slate-500">Keep daily pace, add more depth.</div>
                        </button>
                        <button onClick={() => onAdapt('relax_pace')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                            <div className="font-bold text-white mb-1 group-hover:text-indigo-400">Relax the Pace</div>
                            <div className="text-xs text-slate-500">Spread existing tasks over more days.</div>
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onAdapt('challenge_me')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                            <div className="font-bold text-white mb-1 group-hover:text-indigo-400">Increase Intensity (Challenge Mode)</div>
                            <div className="text-xs text-slate-500">Compress tasks into shorter time.</div>
                        </button>
                        <button onClick={() => onAdapt('reduce_difficulty_and_scope')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                            <div className="font-bold text-white mb-1 group-hover:text-indigo-400">Reduce Scope</div>
                            <div className="text-xs text-slate-500">Remove optional/advanced topics.</div>
                        </button>
                    </>
                )}
                <button onClick={onManual} className="w-full p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-left group">
                    <div className="font-bold text-slate-400 mb-1 group-hover:text-white">Just Update Date</div>
                    <div className="text-xs text-slate-600">Don't change the roadmap items.</div>
                </button>
            </div>
            <button onClick={onClose} className="mt-6 w-full text-slate-500 hover:text-white text-sm">Cancel</button>
        </div>
    </div>
);

const AdaptingOverlay = () => (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-fade-in">
        <RefreshCw className="h-16 w-16 text-indigo-500 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Nova is Adapting...</h2>
        <p className="text-slate-400">Re-architecting your roadmap based on new constraints.</p>
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
  
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuizItem | null>(null);
  const [quizState, setQuizState] = useState<'loading' | 'active' | 'completed' | 'already_done'>('loading');
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [practiceTab, setPracticeTab] = useState<'quiz' | 'interview' | 'simulation'>('quiz');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceTopics, setPracticeTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [practiceQuestionBank, setPracticeQuestionBank] = useState<PracticeQuestion[]>([]);
  const [interviewQuestionBank, setInterviewQuestionBank] = useState<Record<string, InterviewQuestion[]>>({});
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [customGenTopic, setCustomGenTopic] = useState('');
  const [customGenDifficulty, setCustomGenDifficulty] = useState('Medium');
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario | null>(null);
  const [simAnswer, setSimAnswer] = useState<number | null>(null);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [phaseAdaptationState, setPhaseAdaptationState] = useState<{status: 'ahead'|'behind', diff: number, phaseIndex: number} | null>(null);

  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [showDateStrategyModal, setShowDateStrategyModal] = useState(false);
  const [dateStrategyType, setDateStrategyType] = useState<'extension' | 'shortening' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [confirmAction, setConfirmAction] = useState<{type: 'reset_all' | 'delete_account', inputValue: string} | null>(null);
  const [careerToDelete, setCareerToDelete] = useState<string | null>(null);
  const [careerStats, setCareerStats] = useState<Record<string, { progress: number, daysLeft: number }>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const currentCareerDetails = user.activeCareers.find(c => c.careerId === career.id);
  const prevCareerIdRef = useRef(career.id);

  const showToastMsg = (msg: string) => { setToast({ message: msg, type: 'success' }); setTimeout(() => setToast(null), 3000); };
  
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
  
  useEffect(() => { 
      const initialGreeting = { id: Date.now().toString(), role: 'bot' as const, text: `Hello ${user.username}! I see you're currently focusing on ${career.title}. How can I assist you with your roadmap or career questions today?`, timestamp: Date.now() }; 
      setChatHistory(prev => { 
        if (prev.length === 0) return [initialGreeting]; 
        return [...prev, { id: Date.now().toString(), role: 'bot', text: `Switched focus to ${career.title}.`, timestamp: Date.now() }]; 
      }); 
  }, [career.id, user.username, career.title]);

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
      if (roadmap && roadmap.phases) { 
          let total = 0; let completed = 0; roadmap.phases.forEach(phase => { phase.items.forEach(item => { total++; if (item.status === 'completed') completed++; }); }); 
          const calculatedProgress = total === 0 ? 0 : Math.round((completed / total) * 100); 
          if (calculatedProgress === 100 && progress !== 100 && progress !== 0) { setShowCelebration(true); } 
          setProgress(calculatedProgress); 
      } else { setProgress(0); } 
  }, [roadmap, progress]);

  useEffect(() => { 
      if (activeTab === 'career') { 
          const stats: Record<string, { progress: number, daysLeft: number }> = {}; 
          user.activeCareers.forEach(c => { 
              const r = getRoadmap(user.id, c.careerId); 
              const phases = r?.phases || [];
              const daysLeft = calculateRemainingDays(phases);
              let total = 0; let completed = 0; phases.forEach(p => { p.items.forEach(i => { total++; if (i.status === 'completed') completed++; }); }); 
              const prog = total === 0 ? 0 : Math.round((completed / total) * 100); 
              stats[c.careerId] = { progress: prog, daysLeft }; 
          }); 
          setCareerStats(stats); 
      } 
  }, [activeTab, user]);

  const loadNews = async (query?: string) => { 
      if (!career?.title) return; 
      const searchTopic = query || career.title; 
      if (!query) { const cachedNews = getNewsCache(user.id, career.id); if (cachedNews && cachedNews.length > 0) { setNews(cachedNews); return; } } 
      setIsNewsLoading(true); setNews([]); 
      try { 
          const newsItems = await fetchTechNews(searchTopic); setNews(newsItems); 
          if (!query) saveNewsCache(user.id, career.id, newsItems); 
      } catch (e) { console.error("Failed to load news", e); } finally { setIsNewsLoading(false); } 
  };
  useEffect(() => { if (activeTab === 'home') loadNews(); }, [career.id, career.title, activeTab, user.id]);

  const handleHomeSearch = () => { loadNews(homeSearchQuery); };

  // Derived Filtered Lists (Satisfies local filtering from "cache memory")
  const filteredPracticeQuestions = useMemo(() => {
      let results = practiceQuestionBank;
      if (selectedTopic) results = results.filter(q => q.topic === selectedTopic);
      if (practiceSearch.trim()) {
          const q = practiceSearch.toLowerCase();
          results = results.filter(qObj => qObj.question.toLowerCase().includes(q) || (qObj.explanation && qObj.explanation.toLowerCase().includes(q)));
      }
      return results;
  }, [practiceQuestionBank, selectedTopic, practiceSearch]);

  const filteredInterviewQuestions = useMemo(() => {
      let bank: InterviewQuestion[] = [];
      if (companyFilter === 'All') {
          // Fix: Explicitly typing reduction and concatenation to avoid unknown inference issues
          bank = Object.keys(interviewQuestionBank).reduce((acc: InterviewQuestion[], key: string) => {
              const currentList = interviewQuestionBank[key];
              return acc.concat(Array.isArray(currentList) ? currentList : []);
          }, [] as InterviewQuestion[]);
      } else {
          bank = interviewQuestionBank[companyFilter] || [];
      }
      
      if (!practiceSearch.trim()) return bank;
      
      const q = practiceSearch.toLowerCase();
      return bank.filter(iq => iq.question.toLowerCase().includes(q) || (iq.answer && iq.answer.toLowerCase().includes(q)));
  }, [interviewQuestionBank, companyFilter, practiceSearch]);

  // Practice bank initialization strictly checks cache first (AI Once rule)
  useEffect(() => { 
      const initPracticeBank = async () => { 
          if (activeTab === 'practice') { 
              const savedData = getPracticeData(user.id, career.id); 
              if (savedData && (savedData.questions?.length > 0 || Object.keys(savedData.interviews || {}).length > 0)) { 
                  setPracticeTopics(savedData.topics || []); 
                  setPracticeQuestionBank(savedData.questions || []); 
                  setInterviewQuestionBank(savedData.interviews || {}); 
                  return; // Don't call AI if we have cached data
              } 
              
              // No cache found, trigger the massive initial fetch (Uses AI Once)
              setIsPracticeLoading(true); 
              try { 
                  const data = await generatePracticeDataBatch(career.title);
                  setPracticeTopics(data.topics || []); 
                  setPracticeQuestionBank(data.questions || []); 
                  setInterviewQuestionBank(data.interviews || ({} as Record<string, InterviewQuestion[]>)); 
                  savePracticeData(user.id, career.id, data); 
              } catch(e) { console.error("Failed to init practice bank", e); } 
              setIsPracticeLoading(false); 
          } 
      }; 
      initPracticeBank(); 
  }, [career.id, activeTab, career.title, user.id]);

  const handleLoadMorePractice = async () => { 
      setIsLoadingMore(true); 
      try { 
          const newQs = await generatePracticeQuestions(career.title, selectedTopic || undefined); 
          const updatedBank = [...practiceQuestionBank, ...newQs]; 
          setPracticeQuestionBank(updatedBank); 
          savePracticeData(user.id, career.id, { questions: updatedBank }); 
          showToastMsg("Added new MCQs to local bank.");
      } catch(e) { console.error(e); } finally { setIsLoadingMore(false); } 
  };

  const handleLoadMoreInterview = async () => { 
      setIsLoadingMore(true); 
      try { 
          const currentMode = companyFilter === 'All' ? 'Startups' : companyFilter;
          const newQs = await generateCompanyInterviewQuestions(career.title, currentMode); 
          const existingForFilter = interviewQuestionBank[currentMode] || [];
          const updatedForFilter = [...existingForFilter, ...newQs];
          const updatedBank = { ...interviewQuestionBank, [currentMode]: updatedForFilter };
          setInterviewQuestionBank(updatedBank); 
          savePracticeData(user.id, career.id, { interviews: updatedBank }); 
          showToastMsg(`Added new ${currentMode} questions to local bank.`);
      } catch(e) { console.error(e); } finally { setIsLoadingMore(false); } 
  };

  const handleAICustomChallenge = async () => { 
      setIsPracticeLoading(true); 
      try { 
          const params = { topic: customGenTopic || career.title, difficulty: customGenDifficulty }; 
          const iqs = await generateCompanyInterviewQuestions(career.title, 'AI Challenge', params); 
          setInterviewQuestionBank(prev => ({ ...prev, 'AI Challenge': iqs }));
          setCompanyFilter('AI Challenge');
          showToastMsg("Custom AI Challenge protocol generated.");
      } catch (e) { console.error(e); } finally { setIsPracticeLoading(false); } 
  };

  useEffect(() => {
    const checkDailyQuiz = async () => {
        if (activeTab !== 'home') return;
        
        if (prevCareerIdRef.current !== career.id) {
            setDailyQuiz(null);
            setSelectedQuizOption(null);
            setIsQuizCorrect(null);
            setShowConfetti(false);
            setQuizState('loading');
            prevCareerIdRef.current = career.id;
        }

        const today = new Date().toISOString().split('T')[0];
        if (currentCareerDetails?.lastQuizDate === today) {
            if (!showConfetti && quizState !== 'completed') {
                setQuizState('already_done');
            }
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
            } else { setQuizState('already_done'); }
        } catch (e) { setQuizState('already_done'); }
    };
    checkDailyQuiz();
  }, [activeTab, career.title, user.id, career.id, currentCareerDetails?.lastQuizDate]);

  const handleQuizAnswer = (index: number) => { 
      if (!dailyQuiz || selectedQuizOption !== null) return; 
      setSelectedQuizOption(index); 
      const isRight = index === dailyQuiz.correctIndex; 
      setIsQuizCorrect(isRight); 
      const today = new Date().toISOString().split('T')[0]; 
      const updatedActiveCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, lastQuizDate: today } : c); 
      if (isRight) { 
          setShowConfetti(true); 
          let newStreak = user.streak || 0; 
          const alreadyDidQuizToday = user.activeCareers.some(c => c.lastQuizDate === today);
          if (!alreadyDidQuizToday) newStreak += 1;
          const newXp = (user.xp || 0) + 10; 
          const updatedUser = { ...user, activeCareers: updatedActiveCareers, streak: newStreak, xp: newXp }; 
          setUser(updatedUser); 
          saveUser(updatedUser); 
          setTimeout(() => setShowConfetti(false), 3000); 
      } else { 
          const updatedUser = { ...user, activeCareers: updatedActiveCareers, streak: 0 }; 
          setUser(updatedUser); 
          saveUser(updatedUser); 
      } 
      setTimeout(() => setQuizState('completed'), 2000); 
  };

  const handleSimulationSearch = async () => { 
      setIsPracticeLoading(true); 
      const sim = await generateSimulationScenario(career.title); 
      setSimulationScenario(sim); setSimAnswer(null); 
      setIsPracticeLoading(false); 
  }
  
  const handleSimAnswer = (index: number) => { 
      if (!simulationScenario || simAnswer !== null) return; 
      setSimAnswer(index); 
      if (index === Number(simulationScenario.correctIndex)) { 
          const updatedUser = { ...user, xp: (user.xp || 0) + 10 }; 
          setUser(updatedUser); 
          saveUser(updatedUser); 
          showToastMsg("Sim Success! +10 XP"); 
      } 
  };

  const toggleAnswerReveal = (id: string) => { 
      const next = new Set(visibleAnswers); 
      if (next.has(id)) next.delete(id); else next.add(id); 
      setVisibleAnswers(next); 
  };

  const handleSubscribe = (plan: 'monthly' | 'yearly') => { 
    const updatedUser = { ...user, subscriptionStatus: plan }; 
    setUser(updatedUser); 
    saveUser(updatedUser); 
  };
  
  const getCalendarDaysRemaining = () => {
      if (!currentCareerDetails?.targetCompletionDate) return 0;
      const parts = currentCareerDetails.targetCompletionDate.split('-');
      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1;
  };

  const workDaysLeft = roadmap?.phases ? calculateRemainingDays(roadmap.phases) : 0;
  const daysRemaining = workDaysLeft; 

  const getPacingStatus = () => {
      if (!currentCareerDetails || !roadmap) return { status: 'on-track', days: 0, message: 'On track' } as const;
      const calendarDaysLeft = getCalendarDaysRemaining();
      const rawDiff = calendarDaysLeft - workDaysLeft;
      const diff = rawDiff > 0 ? rawDiff - 1 : rawDiff;
      if (diff > 0) return { status: 'ahead', days: diff, message: `${diff} day${diff > 1 ? 's' : ''} ahead` } as const;
      else if (diff < 0) return { status: 'behind', days: Math.abs(diff), message: `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} behind` } as const;
      else return { status: 'on-track', days: 0, message: 'On track' } as const;
  };
  
  const pacing = getPacingStatus();

  const handleProgress = (itemId: string) => { 
      if (!roadmap || !roadmap.phases) return; 
      const now = Date.now(); 
      let phaseIndexToCheck = -1; 
      let wasPhaseCompleted = false; 
      
      for (let i = 0; i < roadmap.phases.length; i++) { 
          if (roadmap.phases[i].items.some(item => item.id === itemId)) { 
              phaseIndexToCheck = i; 
              wasPhaseCompleted = roadmap.phases[i].items.every(item => item.status === 'completed'); 
              break; 
          } 
      } 
      
      const newPhases = roadmap.phases.map(phase => ({ 
          ...phase, 
          items: phase.items.map(item => item.id === itemId ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed', completedAt: item.status === 'completed' ? undefined : now } as RoadmapItem : item) 
      })); 
      
      const newRoadmap = { ...roadmap, phases: newPhases };
      setRoadmap(newRoadmap); 
      saveRoadmap(user.id, career.id, newRoadmap); 
      
      if (phaseIndexToCheck !== -1) { 
          const phase = newRoadmap.phases[phaseIndexToCheck];
          const isNowCompleted = phase.items.every(i => i.status === 'completed'); 
          
          if (isNowCompleted && !wasPhaseCompleted) { 
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
              const currentWorkDaysLeft = calculateRemainingDays(newRoadmap.phases);
              const currentCalendarDaysLeft = getCalendarDaysRemaining(); 
              const rawDiff = currentCalendarDaysLeft - currentWorkDaysLeft;
              const diff = rawDiff > 0 ? rawDiff - 1 : rawDiff;
              
              if (diff > 0) setPhaseAdaptationState({ status: 'ahead', diff, phaseIndex: phaseIndexToCheck });
              else if (diff < 0) setPhaseAdaptationState({ status: 'behind', diff: Math.abs(diff), phaseIndex: phaseIndexToCheck });
              else showToastMsg(`Phase ${phaseIndexToCheck + 1} Completed! You are exactly on track.`);
          } 
      } 
  };

  const handleResetPhase = (phaseIndex: number) => { 
    if (!roadmap || !roadmap.phases) return; 
    const newPhases = roadmap.phases.map((phase, idx) => { 
      if (idx === phaseIndex) { 
        return { ...phase, items: phase.items.map(item => ({ ...item, status: 'pending' as const, completedAt: undefined })) }; 
      } 
      return phase; 
    }); 
    const newRoadmap = { ...roadmap, phases: newPhases };
    setRoadmap(newRoadmap); 
    saveRoadmap(user.id, career.id, newRoadmap); 
  };

  const handleResetRoadmap = () => { 
    if (!roadmap || !roadmap.phases) return; 
    const resetPhases = roadmap.phases.map(phase => ({ ...phase, items: phase.items.map(item => ({ ...item, status: 'pending' as const, completedAt: undefined } as RoadmapItem)) })); 
    const resetMap = { ...roadmap, phases: resetPhases };
    setRoadmap(resetMap); 
    saveRoadmap(user.id, career.id, resetMap); 
  };

  const executeResetAll = () => { 
    user.activeCareers.forEach(c => { 
      const r = getRoadmap(user.id, c.careerId); 
      if (r && r.phases) { 
        const resetPhases = r.phases.map(p => ({...p, items: p.items.map(i => ({...i, status: 'pending', completedAt: undefined} as RoadmapItem))})); 
        saveRoadmap(user.id, c.careerId, { ...r, phases: resetPhases }); 
      } 
    }); 
    handleResetRoadmap(); 
    showToastMsg("All career progress has been reset."); 
    setConfirmAction(null); 
  };

  const executeDeleteAccount = () => { onDeleteAccount(); setConfirmAction(null); };
  
  const initiateDateUpdate = () => {
    if (!currentCareerDetails) return;
    const oldDate = new Date(currentCareerDetails.targetCompletionDate);
    const newDate = new Date(pendingTargetDate);
    setShowDateEditModal(false);
    if (newDate.getTime() === oldDate.getTime()) return;
    if (user.subscriptionStatus !== 'free') {
      setDateStrategyType(newDate > oldDate ? 'extension' : 'shortening');
      setShowDateStrategyModal(true);
    } else {
      handleDateUpdateWithoutAI(pendingTargetDate);
    }
  };

  const executeDeleteCareer = () => {
    if (!careerToDelete) return;
    const updatedCareers = user.activeCareers.filter(c => c.careerId !== careerToDelete);
    const isDeletingCurrent = careerToDelete === user.currentCareerId;
    let nextCareerId = user.currentCareerId;
    if (isDeletingCurrent) {
      nextCareerId = updatedCareers.length > 0 ? updatedCareers[0].careerId : undefined;
    }
    const updatedUser = { 
      ...user, 
      activeCareers: updatedCareers, 
      currentCareerId: nextCareerId,
      onboardingComplete: updatedCareers.length > 0
    };
    setUser(updatedUser);
    saveUser(updatedUser);
    localStorage.removeItem(`pathfinder_career_data_${user.id}_${careerToDelete}`);
    localStorage.removeItem(`pathfinder_roadmap_${user.id}_${careerToDelete}`);
    localStorage.removeItem(`pathfinder_practice_data_${user.id}_${careerToDelete}`);
    setCareerToDelete(null);
    if (updatedCareers.length === 0) {
      setCareer(null);
      setRoadmap(null);
    } else if (isDeletingCurrent && nextCareerId) {
      handleSwitchCareer(nextCareerId);
    }
    showToastMsg("Career path removed.");
  };

  const handleAdaptation = async (type: any, customTargetDate?: string, extraContext?: string) => { 
      if (!currentCareerDetails || !roadmap || !roadmap.phases) return; 
      setShowDateStrategyModal(false); 
      setPhaseAdaptationState(null);
      setIsAdapting(true); 
      try { 
          const preservedPhases: RoadmapPhase[] = [];
          for (const phase of roadmap.phases) {
              const completedItems = phase.items.filter(i => i.status === 'completed');
              if (completedItems.length === phase.items.length) preservedPhases.push(phase);
              else if (completedItems.length > 0) { preservedPhases.push({ ...phase, items: completedItems }); break; }
              else break;
          }
          const { educationYear, targetCompletionDate, experienceLevel, focusAreas } = currentCareerDetails; 
          let targetDateToUse = customTargetDate || targetCompletionDate; 
          if (targetDateToUse !== targetCompletionDate) { 
              const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: targetDateToUse } : c); 
              const updatedUser = { ...user, activeCareers: updatedCareers }; 
              setUser(updatedUser); saveUser(updatedUser); 
          } 
          const completedCount = preservedPhases.reduce((acc, p) => acc + p.items.length, 0);
          const contextStr = `${extraContext || ''} User has completed ${completedCount} tasks. We are preserving these. Please generate the REMAINING roadmap tasks to reach the goal. Adapt the difficulty/pace according to mode: ${type}.`; 
          const startPhaseNum = preservedPhases.length + 1;
          const newData = await generateRoadmap(career.title, educationYear, targetDateToUse, experienceLevel, focusAreas || '', { type, progressStr: contextStr, startingPhaseNumber: startPhaseNum }); 
          const finalMap = { ...newData, phases: [...preservedPhases, ...newData.phases] }; 
          setRoadmap(finalMap); saveRoadmap(user.id, career.id, finalMap); 
          showToastMsg("Nova has re-architected your roadmap."); 
      } catch (e) { console.error("Adaptation failed", e); showToastMsg("AI is busy. Please try again later."); } finally { setIsAdapting(false); } 
  };
  
  const handleDateUpdateWithoutAI = (newDate: string) => { 
    if (!currentCareerDetails) return; 
    const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: newDate } : c); 
    const updatedUser = { ...user, activeCareers: updatedCareers }; 
    setUser(updatedUser); 
    saveUser(updatedUser); 
    setShowDateStrategyModal(false); 
    showToastMsg("Target date updated."); 
  };
  
  const handleFinishQuicker = () => { 
      if (!currentCareerDetails || !roadmap || !roadmap.phases) return; 
      const workDaysNeeded = calculateRemainingDays(roadmap.phases);
      const newTarget = new Date(); newTarget.setHours(12, 0, 0, 0); newTarget.setDate(newTarget.getDate() + workDaysNeeded);
      const year = newTarget.getFullYear(); const month = String(newTarget.getMonth() + 1).padStart(2, '0'); const day = String(newTarget.getDate()).padStart(2, '0');
      const newDateStr = `${year}-${month}-${day}`;
      const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: newDateStr } : c); 
      const u = { ...user, activeCareers: updatedCareers }; 
      setUser(u); saveUser(u); setPhaseAdaptationState(null);
      showToastMsg("Target date updated to finish quicker."); 
  };

  const handlePhaseAdaptationOption = (option: string) => {
      if (!phaseAdaptationState) return;
      const { status, diff } = phaseAdaptationState;
      if (option === 'finish_quicker') handleFinishQuicker();
      else if (option === 'increase_difficulty') handleAdaptation('increase_difficulty_fill_gap', undefined, `User is ahead by ${diff} days. Generate meaningful, advanced tasks for exactly ${diff} days to fill this gap.`);
      else if (option === 'change_pace') handleAdaptation('relax_pace', undefined, `User is ahead. Redistribute tasks.`);
      else if (option === 'keep_same') { setPhaseAdaptationState(null); showToastMsg("Schedule maintained."); }
      else if (option === 'reduce_difficulty') handleAdaptation('reduce_difficulty', undefined, `User is behind by ${diff} days. Simplify remaining tasks.`);
      else if (option === 'adapt_roadmap') handleAdaptation('adapt_roadmap_shorten', undefined, `User is behind. Essentials only.`);
  };

  const handleSwitchCareer = (careerId: string) => { 
      setIsRoadmapLoading(true); setShowCareerMenu(false); setRoadmap(null); setNews([]); setPracticeQuestionBank([]); setInterviewQuestionBank({});
      setTimeout(() => { 
          const savedCareer = getCareerData(user.id, careerId); const savedRoadmap = getRoadmap(user.id, careerId); 
          if (savedCareer) { 
              setCareer(savedCareer); setRoadmap(savedRoadmap || null); 
              const updatedUser = { ...user, currentCareerId: careerId }; setUser(updatedUser); saveUser(updatedUser); 
              showToastMsg(`Nova: Switched focus to ${savedCareer.title}`); 
          } 
          setIsRoadmapLoading(false); setActiveTab('home'); 
      }, 50); 
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
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
                             {isQuizCorrect ? <><div className="text-4xl mb-4">🎉</div><h3 className="text-2xl font-bold text-white mb-2">Correct! +10 XP</h3><p className="text-slate-300 mb-6">{dailyQuiz.explanation}</p></> : <><div className="text-4xl mb-4">💪</div><h3 className="text-2xl font-bold text-white mb-2">Not quite.</h3><p className="text-slate-300 mb-6">Streak reset to 0.</p><div className="w-full bg-slate-800/50 p-4 rounded-xl text-left border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold mb-1">Correct Answer</div><div className="text-emerald-400 font-bold mb-2">{dailyQuiz.options?.[dailyQuiz.correctIndex]}</div><div className="text-sm text-slate-300">{dailyQuiz.explanation}</div></div></>}
                         </div>
                     )}
                     {quizState === 'active' && dailyQuiz && (
                         <div className="animate-fade-in">
                             <h3 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">{dailyQuiz.question}</h3>
                             <div className="grid grid-cols-1 gap-3">
                                 {dailyQuiz.options?.map((opt, i) => <button key={i} onClick={() => handleQuizAnswer(i)} disabled={selectedQuizOption !== null} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedQuizOption !== null ? i === dailyQuiz.correctIndex ? 'bg-emerald-500/20 border-emerald-500 text-white' : i === selectedQuizOption ? 'bg-red-500/20 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 opacity-50' : 'bg-slate-900/50 border-slate-700 text-slate-200 hover:bg-indigo-900/30 hover:border-indigo-500 hover:text-white'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${selectedQuizOption !== null && i === dailyQuiz.correctIndex ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600 text-slate-400'}`}>{['A','B','C','D'][i]}</div>{opt}</div></button>)}
                             </div>
                         </div>
                     )}
                 </div>
                 <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                     <div className="mb-6"><h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400" /> Career Progress</h3><div className="flex items-end gap-2 mb-2"><span className="text-5xl font-bold text-white">{progress}%</span><span className="text-sm text-slate-500 mb-1.5">complete</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${progress}%`}}></div></div></div>
                     <div className="space-y-4">
                         <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"><div><div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Days Pending</div><div className="text-xl font-bold text-white">{daysRemaining} Days</div></div><Clock className="h-5 w-5 text-slate-600" /></div>
                         <div className={`p-4 rounded-2xl border flex items-center justify-between ${pacing.status === 'ahead' ? 'bg-emerald-500/10 border-emerald-500/20' : pacing.status === 'behind' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}><div><div className={`text-xs font-bold uppercase tracking-wider mb-1 ${pacing.status === 'ahead' ? 'text-emerald-400' : pacing.status === 'behind' ? 'text-red-400' : 'text-blue-400'}`}>Current Pace</div><div className="text-sm font-bold text-white">{pacing.message}</div></div><TrendingUp className="h-5 w-5" /></div>
                     </div>
                 </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                     <div className="flex items-center gap-3"><div className="p-2 bg-indigo-500/10 rounded-lg"><Zap className="h-5 w-5 text-indigo-400" /></div><h2 className="text-xl font-bold text-white">Global Briefing</h2></div>
                     <div className="relative group w-full sm:w-64"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" /><input type="text" placeholder="Search insights..." className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 outline-none transition-all text-sm" value={homeSearchQuery} onChange={(e) => setHomeSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleHomeSearch()} /></div>
                 </div>
                 <div className="space-y-1">
                     {isNewsLoading ? Array.from({length: 10}).map((_, i) => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse my-2"></div>) : news.length === 0 ? <div className="text-slate-500 text-center py-8">No recent headlines found.</div> : news.map((item, i) => <a key={i} href={item.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"><div className="flex items-center gap-4"><span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 w-24 truncate text-center shrink-0 uppercase tracking-tighter">{item.source}</span><h3 className="text-sm md:text-base font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-1">{item.title}</h3></div><ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" /></a>)}
                 </div>
            </div>
          </div>
        );
      case 'roadmap':
        return <Roadmap roadmap={roadmap} user={user} onSubscribe={handleSubscribe} onUpdateProgress={handleProgress} onReset={handleResetRoadmap} onResetPhase={handleResetPhase} onSwitchCareer={handleSwitchCareer} onEditTargetDate={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEditModal(true); }} pacing={pacing} isLoading={isRoadmapLoading} daysRemaining={daysRemaining} />;
      case 'practice':
          return (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 min-h-[80vh] flex flex-col overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                           <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><GraduationCap className="h-6 w-6 text-indigo-500" /> Practice Arena</h2><p className="text-slate-400 text-sm mt-1">Master your skills in {career.title}</p></div>
                           <div className="relative group w-full md:w-80"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" /><input type="text" placeholder="Search local bank..." className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm" value={practiceSearch} onChange={e => setPracticeSearch(e.target.value)} /></div>
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
                                      <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggested Topics</h3><div className="flex flex-wrap gap-2"><button onClick={() => setSelectedTopic(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!selectedTopic ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>All Topics</button>{practiceTopics.map(t => <button key={t} onClick={() => setSelectedTopic(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTopic === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>{t}</button>)}</div></div>
                                      <div className="space-y-6">
                                          {filteredPracticeQuestions?.length > 0 ? filteredPracticeQuestions.map((q, qIdx) => (
                                              <PracticeQuestionCard key={q.id || qIdx} question={q} index={qIdx} />
                                          )) : <div className="text-center py-10 text-slate-500">No matching questions in local bank. Click below to generate more.</div>}
                                      </div>
                                      <button onClick={handleLoadMorePractice} disabled={isLoadingMore} className="w-full py-4 mt-6 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                          {isLoadingMore ? <RefreshCw className="h-5 w-5 animate-spin"/> : <Sparkles className="h-5 w-5"/>} 
                                          {isLoadingMore ? 'Architecting...' : 'Request New AI Questions'}
                                      </button>
                                  </div>
                              )}

                              {practiceTab === 'interview' && (
                                  <div className="animate-fade-in space-y-8">
                                      <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Companies</h3><div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">{(['All', ...Object.keys(interviewQuestionBank).filter(k => k !== 'AI Challenge'), 'AI Challenge']).map(mode => (<button key={mode} onClick={() => setCompanyFilter(mode)} className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2 ${companyFilter === mode ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>{mode === 'AI Challenge' && <Sparkles className="h-3 w-3" />}{mode}</button>))}</div></div>
                                      {companyFilter === 'AI Challenge' && (
                                          <div className="bg-slate-950 border border-fuchsia-500/30 rounded-2xl p-6 animate-fade-in relative overflow-hidden mb-8">
                                              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                                              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-fuchsia-500" /> Targeted AI Challenge</h3>
                                              <div className="grid md:grid-cols-3 gap-4 mb-4"><div className="md:col-span-2"><label className="text-xs text-slate-500 block mb-1 uppercase font-bold">Concept Focus</label><input type="text" placeholder={`e.g. Advanced System Design in ${career.title}`} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 outline-none" value={customGenTopic} onChange={e => setCustomGenTopic(e.target.value)} /></div><div><label className="text-xs text-slate-500 block mb-1 uppercase font-bold">Severity</label><select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 outline-none" value={customGenDifficulty} onChange={e => setCustomGenDifficulty(e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option><option>Expert</option></select></div></div>
                                              <button onClick={handleAICustomChallenge} className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-fuchsia-900/20 active:scale-95">Initiate Custom Protocol</button>
                                          </div>
                                      )}
                                      <div className="grid md:grid-cols-2 gap-4">
                                          {filteredInterviewQuestions?.length > 0 ? filteredInterviewQuestions.map((q, i) => (
                                              <div key={q.id || i} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-colors group relative overflow-hidden">
                                                  <div className="mb-4 relative z-10">
                                                      <div className="flex justify-between items-start mb-4"><div className={`px-2 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border bg-indigo-500/10 text-indigo-400 border-indigo-500/20`}>{q.company || 'General'}</div></div>
                                                      <h4 className="font-bold text-white mb-2 leading-relaxed">{q.question}</h4>
                                                      {q.explanation && visibleAnswers.has(q.id) && <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1 uppercase tracking-tighter"><CheckCircle2 className="h-3 w-3" /> Technical Analysis Ready</div>}
                                                  </div>
                                                  <div className="relative z-10">{visibleAnswers.has(q.id) ? (
                                                      <div className="bg-slate-900 p-5 rounded-xl text-sm text-slate-300 border border-slate-800 animate-fade-in space-y-4">
                                                          <div><span className="font-black text-indigo-400 block mb-2 uppercase text-[10px] tracking-widest">Master Answer</span><p className="leading-relaxed">{q.answer}</p></div>
                                                          {q.explanation && (
                                                              <div className="pt-4 border-t border-white/5">
                                                                  <span className="font-black text-emerald-400 block mb-2 uppercase text-[10px] tracking-widest">Industry Context</span>
                                                                  <p className="text-xs leading-relaxed opacity-80 italic">{q.explanation}</p>
                                                              </div>
                                                          )}
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => toggleAnswerReveal(q.id)} className="w-full py-3.5 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                          <Eye className="h-4 w-4" /> Reveal Protocol
                                                      </button>
                                                  )}</div>
                                              </div>
                                          )) : <div className="col-span-2 text-center py-10 text-slate-500">No matching interview questions in local bank.</div>}
                                      </div>
                                      {companyFilter !== 'AI Challenge' && (
                                          <button onClick={handleLoadMoreInterview} disabled={isLoadingMore} className="w-full py-4 mt-8 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                              {isLoadingMore ? <RefreshCw className="h-5 w-5 animate-spin"/> : <PlusCircle className="h-5 w-5"/>} 
                                              {isLoadingMore ? 'Processing...' : 'Architect More Interview Data'}
                                          </button>
                                      )}
                                  </div>
                              )}

                              {practiceTab === 'simulation' && (
                                  <div className="animate-fade-in max-w-3xl mx-auto">
                                    {!simulationScenario ? (
                                        <div className="text-center py-20">
                                            <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto mb-6 flex items-center justify-center"><PlayCircle className="h-10 w-10 text-indigo-500" /></div>
                                            <h3 className="text-xl font-bold text-white mb-2">Tactical Simulation</h3>
                                            <p className="text-slate-400 mb-8">Test your operational decision-making in real-world scenarios.</p>
                                            <button onClick={handleSimulationSearch} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">Initiate Simulation</button>
                                        </div>
                                    ) : (
                                      <div className="bg-slate-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl relative">
                                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                                          <div className="p-8">
                                              <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><PlayCircle className="h-8 w-8" /></div><div><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Arena</h3><h2 className="text-xl font-bold text-white">Scenario Update</h2></div></div>
                                              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8 italic text-slate-300 leading-relaxed font-medium">"{simulationScenario.scenario}"</div>
                                              <h3 className="text-lg font-bold text-white mb-6 leading-tight">{simulationScenario.question}</h3>
                                              <div className="space-y-3">
                                                  {simulationScenario.options?.map((opt, idx) => {
                                                      const isSelected = simAnswer === idx;
                                                      const isCorrect = idx === Number(simulationScenario.correctIndex);
                                                      const showResult = simAnswer !== null;
                                                      let btnClass = "w-full text-left p-5 rounded-xl border transition-all relative overflow-hidden flex items-center justify-between ";
                                                      if (showResult) {
                                                          if (isCorrect) btnClass += "bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                                                          else if (isSelected) btnClass += "bg-red-500/20 border-red-500 text-white ring-1 ring-red-500/50";
                                                          else btnClass += "bg-slate-900 border-slate-800 text-slate-500 opacity-40 grayscale";
                                                      } else { btnClass += "bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-800 hover:shadow-lg hover:shadow-indigo-500/10"; }
                                                      return (<button key={idx} onClick={() => handleSimAnswer(idx)} disabled={simAnswer !== null} className={btnClass}><span className="font-bold text-sm md:text-base pr-8">{opt}</span>{showResult && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />}{showResult && isSelected && !isCorrect && <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />}</button>);
                                                  })}
                                              </div>
                                              {simAnswer !== null && (
                                                  <div className={`mt-8 p-6 rounded-2xl border animate-fade-in ${simAnswer === Number(simulationScenario.correctIndex) ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                                                          <div className="flex items-center gap-3">{simAnswer === Number(simulationScenario.correctIndex) ? (<><div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div><div><h4 className="text-emerald-400 font-black text-lg uppercase tracking-tight">Optimal Choice</h4><p className="text-slate-400 text-xs font-bold">+10 XP Synchronized</p></div></>) : (<><div className="p-2 bg-red-500/20 rounded-lg text-red-400"><AlertTriangle className="h-6 w-6" /></div><div><h4 className="text-red-400 font-black text-lg uppercase tracking-tight">Incomplete Logic</h4><p className="text-slate-400 text-xs font-bold">Review debriefing below</p></div></>)}</div>
                                                          <button onClick={handleSimulationSearch} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700 flex items-center gap-2 text-xs shadow-lg active:scale-95">Next Deployment <ArrowRight className="h-4 w-4" /></button>
                                                      </div>
                                                      <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800"><h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Zap className="h-3 w-3" /> Nova Strategic Analysis</h4><p className="text-slate-300 text-sm leading-relaxed font-medium">{simulationScenario.explanation}</p></div>
                                                  </div>
                                              )}
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
                      {user.activeCareers.map((c) => {
                          const stats = careerStats[c.careerId] || { progress: 0, daysLeft: 0 };
                          const isCurrent = c.careerId === user.currentCareerId;
                          return (
                              <div key={c.careerId} className={`relative bg-slate-900 border rounded-3xl p-6 transition-all ${isCurrent ? 'border-indigo-500 shadow-xl shadow-indigo-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                                  {isCurrent && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl">CURRENT FOCUS</div>}
                                  <div className="flex flex-col md:flex-row justify-between gap-6 mb-6"><div><h3 className="text-2xl font-bold text-white mb-2">{c.title}</h3><div className="flex flex-wrap gap-3 text-sm text-slate-400"><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"><CalendarDays className="h-4 w-4 text-indigo-400" /> Start: {new Date(c.addedAt).toLocaleDateString()}</span><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"><Target className="h-4 w-4 text-indigo-400" /> Target: {c.targetCompletionDate}</span><span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 capitalize"><Zap className="h-4 w-4 text-yellow-400" /> {c.experienceLevel}</span></div></div><div className="flex items-center gap-4"><div className="text-right"><div className="text-3xl font-bold text-white">{stats.daysLeft}</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Days Left</div></div><div className="w-px h-12 bg-slate-800 mx-2 hidden md:block"></div><div className="text-right"><div className="text-3xl font-bold text-emerald-400">{stats.progress}%</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Complete</div></div></div></div>
                                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-6"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div></div>
                                  <div className="flex gap-4">{isCurrent ? <button disabled className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl cursor-default">Active</button> : <button onClick={() => handleSwitchCareer(c.careerId)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Switch Focus</button>}<button onClick={() => setCareerToDelete(c.careerId)} className="px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-red-900/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded-xl transition-colors" title="Delete Career"><Trash2 className="h-5 w-5" /></button></div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          );
      case 'profile':
          return (
              <div className="space-y-8 pb-20 animate-fade-in">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-900 to-purple-900 opacity-50"></div>
                      <div className="relative z-10 flex flex-col md:flex-row items-end gap-6 pt-12"><div className="w-24 h-24 bg-slate-800 rounded-2xl border-4 border-slate-900 shadow-xl flex items-center justify-center text-3xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</div><div className="flex-1 mb-2"><h2 className="text-3xl font-bold text-white">{user.username}</h2><div className="flex items-center gap-4 text-slate-400 text-sm mt-1"><span>Member since {user.joinedAt ? new Date(user.joinedAt).getFullYear() : 2024}</span><span>•</span><span className="capitalize">{user.subscriptionStatus} Plan</span></div></div><div className="flex gap-2"><div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /><span className="text-white font-bold">{user.streak} Streak</span></div><div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /><span className="text-white font-bold">{user.xp} XP</span></div></div></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6"><h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Palette className="h-5 w-5 text-indigo-400" /> Accent Color</h3><div className="space-y-4"><div className="p-4 bg-slate-950 rounded-xl border border-slate-800"><div className="text-slate-400 text-sm mb-3">Choose your vibe</div><div className="flex flex-wrap gap-3">{(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as const).map(color => (<button key={color} onClick={() => setAccentColor(color)} className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${user.theme === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{backgroundColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#06b6d4'}}>{user.theme === color && <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />}</button>))}</div></div><div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800"><div className="flex items-center gap-3 text-slate-300"><Mail className="h-5 w-5 text-slate-500" /> Email</div><span className="text-slate-500 font-mono text-sm">{user.id.includes('@') ? user.id.replace(/(.{2})(.*)(@.*)/, "$1***$3") : user.id}</span></div></div></div>
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6"><h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-400" /> Danger Zone</h3><div className="space-y-4"><button onClick={() => setConfirmAction({type: 'reset_all', inputValue: ''})} className="w-full text-left p-4 bg-slate-950 hover:bg-red-900/10 border border-slate-800 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 transition-all flex items-center justify-between group"><span>Reset All Progress</span><RotateCcw className="h-5 w-5 group-hover:rotate-180 transition-transform" /></button><button onClick={() => setConfirmAction({type: 'delete_account', inputValue: ''})} className="w-full text-left p-4 bg-slate-950 hover:bg-red-900/10 border border-slate-800 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 transition-all flex items-center justify-between group"><span>Delete Account</span><Trash2 className="h-5 w-5" /></button></div></div>
                  </div>
                  <div className="text-center pt-8"><button onClick={onLogout} className="text-slate-500 hover:text-white flex items-center gap-2 mx-auto transition-colors"><LogOut className="h-5 w-5" /> Log Out</button><div className="mt-8 text-xs text-slate-600">PathFindr AI v1.0.0 • Developed by Hameed Afsar K M</div><button onClick={() => setShowFeedbackModal(true)} className="mt-4 text-xs text-indigo-500 hover:text-indigo-400">Send Feedback</button></div>
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
        <div className="mb-8 p-2 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30"><Compass className="h-6 w-6 text-white" /></div>
        <div className="flex flex-col gap-4 w-full px-3">
          <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Home</span></button>
          <button onClick={() => setActiveTab('roadmap')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Map className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Roadmap</span></button>
          <button onClick={() => setActiveTab('practice')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'practice' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><GraduationCap className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Practice</span></button>
          <button onClick={() => setActiveTab('career')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'career' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Briefcase className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Career</span></button>
          <button onClick={() => setActiveTab('profile')} className={`p-3 rounded-xl transition-all group relative ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><User className="h-5 w-5 mx-auto" /><span className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Profile</span></button>
        </div>
      </nav>
      <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-[60] transition-transform hover:scale-105 active:scale-95">{isChatOpen ? <X className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}</button>
      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} careerTitle={career.title} history={chatHistory} onSend={handleSendMessage} isTyping={isChatTyping} />
      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}
      {phaseAdaptationState && <PhaseAdaptationModal status={phaseAdaptationState.status} diff={phaseAdaptationState.diff} onOptionSelect={handlePhaseAdaptationOption} onClose={() => setPhaseAdaptationState(null)} />}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} text={feedbackText} setText={setFeedbackText} />}
      {confirmAction && <ConfirmationModal action={confirmAction} onConfirm={confirmAction.type === 'reset_all' ? executeResetAll : executeDeleteAccount} onCancel={() => setConfirmAction(null)} />}
      {careerToDelete && <DeleteCareerConfirmationModal onConfirm={executeDeleteCareer} onCancel={() => setCareerToDelete(null)} />}
      {showDateEditModal && <DateEditModal date={pendingTargetDate} setDate={setPendingTargetDate} onConfirm={initiateDateUpdate} onCancel={() => setShowDateEditModal(false)} />}
      {showDateStrategyModal && <DateStrategyModal type={dateStrategyType} onAdapt={(t) => handleAdaptation(t, pendingTargetDate)} onManual={() => handleDateUpdateWithoutAI(pendingTargetDate)} onClose={() => setShowDateStrategyModal(false)} />}
      {isAdapting && <AdaptingOverlay />}
      {toast && <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in z-[100]"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="font-medium text-sm">{toast.message}</span></div>}
    </div>
  );
};