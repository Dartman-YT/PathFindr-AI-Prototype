
import React, { useState, useMemo, useEffect } from 'react';
import { CareerOption, SkillQuestion } from '../types';
import { analyzeInterests, searchCareers, generateSkillQuiz } from '../services/gemini';
import { Sparkles, CheckCircle, BookOpen, Clock, Target, ChevronRight, ArrowLeft, Search, RefreshCw, BrainCircuit, Lightbulb, UserCheck, AlertCircle, Bot, Plus, Code, Globe, Rocket, Terminal, Briefcase, Calendar, X, Info, MessageSquare, Wand2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: (career: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => void;
  isNewUser?: boolean;
  mode?: 'analysis' | 'search';
}

const PSYCH_QUESTIONS = [
    { q: "When solving a problem, do you prefer:", options: ["Analyzing data/logic", "Brainstorming creative ideas", "Researching history/facts", "Talking to people", "Other"] },
    { q: "Your ideal work environment is:", options: ["Quiet & Solitary", "Collaborative & Busy", "Structured & Predictable", "Dynamic & Flexible", "Other"] },
    { q: "Which project role fits you best?", options: ["The Leader/Organizer", "The Builder/Maker", "The Researcher", "The Presenter", "Other"] },
    { q: "How do you handle deadlines?", options: ["Plan weeks ahead", "Work steadily", "Sprint at the end", "Ask for extensions", "Other"] },
    { q: "You encounter a new tech tool. You:", options: ["Read the manual first", "Start clicking buttons", "Watch a tutorial", "Ask a friend", "Other"] },
    { q: "What motivates you most?", options: ["Financial growth", "Social impact", "Solving complex puzzles", "Creative expression", "Other"] },
    { q: "Do you prefer working with:", options: ["Abstract concepts/Code", "Visual designs", "Physical hardware", "People/Clients", "Other"] },
    { q: "In a team conflict, you:", options: ["Use logic to solve it", "Empathize and listen", "Avoid it", "Take charge to fix it", "Other"] },
    { q: "Your learning style is:", options: ["Reading documentation", "Watching videos", "Building projects", "Listening to lectures", "Other"] },
    { q: "Risk tolerance level:", options: ["Safe & Stable", "Calculated Risks", "High Risk / High Reward", "Go with the flow", "Other"] }
];

const BackgroundIcons = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Code className="absolute top-20 left-10 text-indigo-500/20 w-12 h-12 animate-float" />
        <BrainCircuit className="absolute bottom-32 right-20 text-purple-500/20 w-16 h-16 animate-float-delayed" />
        <Globe className="absolute top-40 right-10 text-emerald-500/20 w-10 h-10 animate-float-slow" />
        <Rocket className="absolute bottom-20 left-20 text-orange-500/20 w-14 h-14 animate-float" />
        <Terminal className="absolute top-1/2 left-1/3 text-cyan-500/10 w-20 h-20 animate-float-delayed" />
    </div>
);

type OnboardingStep = 'intro' | 'psychometric' | 'comment' | 'analysis' | 'selection' | 'skill_quiz' | 'level_verification' | 'status_role' | 'goal_selection' | 'goal_confirmation';

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isNewUser = true, mode = 'analysis' }) => {
  const [step, setStep] = useState<OnboardingStep>(
      isNewUser && mode === 'analysis' ? 'intro' : mode === 'search' ? 'selection' : 'psychometric'
  );
  
  // Psychometric State
  const [currentPsychIndex, setCurrentPsychIndex] = useState(0);
  const [psychAnswers, setPsychAnswers] = useState<{question: string, answer: string}[]>([]);
  const [additionalComment, setAdditionalComment] = useState('');
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customAnswer, setCustomAnswer] = useState('');
  
  // Career State
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [rejectedCareers, setRejectedCareers] = useState<string[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Skill Quiz State
  const [skillQuestions, setSkillQuestions] = useState<SkillQuestion[]>([]);
  const [currentSkillQIndex, setCurrentSkillQIndex] = useState(0);
  const [quizStatus, setQuizStatus] = useState<'loading' | 'active' | 'failed' | 'completed'>('loading');
  
  // Final Details State
  const [detectedLevel, setDetectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [userSelectedLevel, setUserSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [focusAreas, setFocusAreas] = useState('');
  const [statusRole, setStatusRole] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState('');

  // --- CALCULATIONS ---

  const estimatedDays = useMemo(() => {
    if (!selectedGoal || !userSelectedLevel || !selectedCareer) return 0;
    const goalBaseDays: Record<string, number> = { 'Basics': 30, 'JobReady': 90, 'Mastery': 180 };
    if (!goalBaseDays[selectedGoal]) return 0;
    const levelMultiplier: Record<string, number> = { 'beginner': 1.0, 'intermediate': 0.6, 'advanced': 0.3 };
    const difficultyMultiplier = selectedCareer.title.length > 20 ? 1.4 : 1.0;
    return Math.max(7, Math.round(goalBaseDays[selectedGoal] * levelMultiplier[userSelectedLevel] * difficultyMultiplier));
  }, [selectedGoal, userSelectedLevel, selectedCareer]);

  const calculatedTargetDate = useMemo(() => {
    if (estimatedDays === 0) return '';
    const date = new Date();
    date.setDate(date.getDate() + estimatedDays);
    return date.toISOString().split('T')[0];
  }, [estimatedDays]);

  // --- HANDLERS ---

  const handleBack = () => {
    const sequence: OnboardingStep[] = ['intro', 'psychometric', 'comment', 'analysis', 'selection', 'skill_quiz', 'level_verification', 'status_role', 'goal_selection', 'goal_confirmation'];
    const currentIdx = sequence.indexOf(step);
    if (currentIdx > 0) setStep(sequence[currentIdx - 1]);
  };

  const handlePsychOptionSelect = (option: string) => {
      if (option === 'Other') { setIsOtherSelected(true); setCustomAnswer(''); return; }
      savePsychAnswer(option);
  };

  const savePsychAnswer = (answer: string) => {
      const newAnswers = [...psychAnswers, { question: PSYCH_QUESTIONS[currentPsychIndex].q, answer: answer }];
      setPsychAnswers(newAnswers);
      setIsOtherSelected(false);
      setCustomAnswer('');
      if (currentPsychIndex < PSYCH_QUESTIONS.length - 1) setCurrentPsychIndex(prev => prev + 1);
      else setStep('comment');
  };

  const submitAnalysis = async () => {
      setStep('analysis');
      setIsAnalyzing(true);
      try {
          const results = await analyzeInterests(psychAnswers, additionalComment, rejectedCareers);
          setCareers(results);
          setStep('selection');
      } catch (e) {
          console.error(e);
          setCareers([]);
          setStep('selection');
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleRefineSuggestions = async () => {
      if (!refinementFeedback.trim()) return;
      setIsAnalyzing(true);
      try {
          const updatedComment = additionalComment ? `${additionalComment} | Feedback: ${refinementFeedback}` : `Feedback: ${refinementFeedback}`;
          setAdditionalComment(updatedComment);
          const results = await analyzeInterests(psychAnswers, updatedComment, rejectedCareers);
          setCareers(results);
          setRefinementFeedback('');
          setIsRefining(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleDismissCareer = (id: string, title: string) => {
      setCareers(prev => prev.filter(c => c.id !== id));
      setRejectedCareers(prev => [...prev, title]);
      // Silently fetch one more to maintain count if we drop too low
      if (careers.length <= 2) {
          handleShowMore();
      }
  };

  const handleShowMore = async () => {
      setIsAnalyzing(true);
      try {
          const currentTitles = [...careers.map(c => c.title), ...rejectedCareers];
          const newResults = await analyzeInterests(psychAnswers, additionalComment, currentTitles);
          setCareers(prev => [...prev, ...newResults]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleCareerSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          const res = await searchCareers(searchQuery.trim());
          setCareers(res);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleCareerSelect = async (career: CareerOption) => {
      setSelectedCareer(career);
      setStep('skill_quiz');
      setQuizStatus('loading');
      try {
          const questions = await generateSkillQuiz(career.title);
          const sortedQuestions = [...questions].sort((a, b) => {
              const difficultyMap: Record<string, number> = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
              return (difficultyMap[a.difficulty.toLowerCase()] || 0) - (difficultyMap[b.difficulty.toLowerCase()] || 0);
          });
          setSkillQuestions(sortedQuestions);
          setQuizStatus('active');
          setCurrentSkillQIndex(0);
      } catch (e) {
          setDetectedLevel('beginner');
          setUserSelectedLevel('beginner');
          setStep('level_verification');
      }
  };

  const handleQuizAnswer = (optionIndex: number) => {
      const currentQ = skillQuestions[currentSkillQIndex];
      if (optionIndex !== currentQ.correctIndex) {
          setQuizStatus('failed');
          const level = currentSkillQIndex <= 1 ? 'beginner' : currentSkillQIndex <= 3 ? 'intermediate' : 'advanced';
          setDetectedLevel(level as any);
          setTimeout(() => { setUserSelectedLevel(level as any); setStep('level_verification'); }, 2000);
      } else {
          if (currentSkillQIndex < skillQuestions.length - 1) setCurrentSkillQIndex(prev => prev + 1);
          else {
              setQuizStatus('completed');
              setDetectedLevel('advanced');
              setUserSelectedLevel('advanced');
              setTimeout(() => setStep('level_verification'), 1500);
          }
      }
  };

  // Fix: Implemented missing handleGoalSelect handler
  const handleGoalSelect = (goalId: string) => {
      setSelectedGoal(goalId);
      setStep('goal_confirmation');
  };

  // Fix: Implemented missing handleFinalSubmit handler
  const handleFinalSubmit = () => {
      if (selectedCareer) {
          const finalDate = selectedGoal === 'Custom' ? targetDate : calculatedTargetDate;
          onComplete(
              selectedCareer,
              statusRole,
              finalDate,
              userSelectedLevel,
              focusAreas
          );
      }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 bg-[linear-gradient(45deg,#0f172a,#1e1b4b,#312e81,#0f172a)] animate-gradient-xy text-white overflow-hidden">
        <BackgroundIcons />
        
        {step === 'intro' && (
              <div className="animate-fade-in max-w-lg text-center relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                      <Bot className="h-12 w-12 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold mb-4">I am Nova.</h1>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                      I don't just find jobs; I analyze your mind and architect a future that fits you perfectly.
                      <br/><br/>
                      Ready to decode your professional trajectory?
                  </p>
                  <button onClick={() => setStep('psychometric')} className="px-10 py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-50 transition-all shadow-2xl active:scale-95 flex items-center gap-3 mx-auto">
                      Initiate Protocol <Sparkles className="h-5 w-5 text-indigo-600" />
                  </button>
              </div>
        )}

        {step === 'psychometric' && (
              <div className="w-full max-w-2xl animate-fade-in relative z-10">
                  <div className="flex items-center gap-4 mb-12">
                      <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"><ArrowLeft className="h-6 w-6" /></button>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">{currentPsychIndex + 1}</div>
                        <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentPsychIndex) / PSYCH_QUESTIONS.length) * 100}%` }}></div></div>
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest shrink-0">Phase: Analysis</span>
                      </div>
                  </div>
                  <h2 className="text-3xl font-black mb-10 leading-tight text-center tracking-tight">{PSYCH_QUESTIONS[currentPsychIndex].q}</h2>
                  {!isOtherSelected ? (
                      <div className="grid gap-4">
                          {PSYCH_QUESTIONS[currentPsychIndex].options.map((opt, i) => (
                              <button key={i} onClick={() => handlePsychOptionSelect(opt)} className="w-full text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800/60 transition-all group flex items-center justify-between backdrop-blur-xl">
                                  <span className="text-lg font-medium text-slate-300 group-hover:text-white">{opt}</span>
                                  <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div className="animate-fade-in">
                          <textarea className="w-full h-32 bg-slate-900 border border-indigo-500 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none mb-4" value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} autoFocus />
                          <div className="flex gap-4">
                              <button onClick={() => setIsOtherSelected(false)} className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs">Back</button>
                              <button onClick={() => savePsychAnswer(customAnswer)} disabled={!customAnswer.trim()} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs disabled:opacity-50">Confirm</button>
                          </div>
                      </div>
                  )}
              </div>
        )}

        {step === 'comment' && (
            <div className="w-full max-w-2xl animate-fade-in relative z-10 text-center">
                <div className="mb-8 p-4 bg-indigo-500/10 rounded-full inline-block"><MessageSquare className="h-10 w-10 text-indigo-400" /></div>
                <h2 className="text-3xl font-black mb-4 tracking-tight">Any specific constraints?</h2>
                <p className="text-slate-400 mb-10">Tell Nova about your remote work preferences, industry interests, or absolute dealbreakers.</p>
                <textarea className="w-full h-40 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 text-white placeholder-slate-600 focus:border-indigo-500 outline-none resize-none mb-8 shadow-inner" placeholder="e.g. I prefer creative roles, I want to work remotely, I have a background in biology..." value={additionalComment} onChange={e => setAdditionalComment(e.target.value)} autoFocus />
                <div className="flex justify-center">
                    <button onClick={submitAnalysis} className="bg-white text-slate-950 px-12 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:scale-105">
                        Architect Suggestions <Sparkles className="h-5 w-5 text-indigo-600" />
                    </button>
                </div>
            </div>
        )}

        {step === 'analysis' && (
            <div className="flex flex-col items-center relative z-10 text-center">
                <div className="h-24 w-24 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-indigo-500/30 animate-pulse">
                    <BrainCircuit className="h-12 w-12 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Analyzing Neural Patterns</h2>
                <p className="text-slate-500 font-medium tracking-widest text-xs uppercase">Mapping profile to 2025 Industry Trends</p>
            </div>
        )}

        {step === 'selection' && (
            <div className="max-w-7xl mx-auto w-full relative z-10 px-4 py-10">
                <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-8">
                    <div className="max-w-xl">
                        <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-white mb-4 transition-colors text-[10px] font-black uppercase tracking-widest"><ArrowLeft className="h-3 w-3" /> Profile</button>
                        <h2 className="text-4xl font-black mb-2 tracking-tighter">SUGGESTED PATHS</h2>
                        <p className="text-slate-500 text-sm font-medium">Nova has synthesized these career architectures for your specific profile.</p>
                    </div>

                    <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                        <div className="relative group flex-1 sm:w-80">
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                            <input type="text" placeholder="Search specific path..." className="bg-slate-900/80 border border-slate-800 rounded-2xl px-12 py-3.5 w-full focus:border-indigo-500 outline-none backdrop-blur-xl text-sm font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCareerSearch()} />
                            {isSearching && <RefreshCw className="absolute right-4 top-3.5 h-4 w-4 text-indigo-400 animate-spin" />}
                        </div>
                        <button onClick={() => setIsRefining(!isRefining)} className={`px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border transition-all ${isRefining ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-indigo-500'}`}>
                            <Wand2 className="h-4 w-4" /> Refine Search
                        </button>
                    </div>
                </div>

                {isRefining && (
                    <div className="mb-12 p-8 bg-indigo-900/10 border border-indigo-500/20 rounded-[2rem] animate-fade-in backdrop-blur-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400"><Bot className="h-6 w-6" /></div>
                            <div>
                                <h3 className="text-lg font-black text-white">How can Nova adjust?</h3>
                                <p className="text-slate-400 text-xs">Tell Nova what you liked or hated about these suggestions.</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input type="text" placeholder="e.g. 'More focus on coding', 'I don't like healthcare', 'Suggest something more creative'..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 text-sm text-white focus:border-indigo-500 outline-none" value={refinementFeedback} onChange={e => setRefinementFeedback(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRefineSuggestions()} />
                            <button onClick={handleRefineSuggestions} disabled={isAnalyzing || !refinementFeedback.trim()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl disabled:opacity-50">Apply Refinement</button>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {careers.map((c, idx) => (
                        <div key={c.id || idx} className="group bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 hover:border-indigo-500 transition-all relative overflow-hidden flex flex-col h-full animate-fade-in">
                            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none">
                                <Target className="h-32 w-32 text-indigo-400" />
                            </div>
                            
                            <button onClick={() => handleDismissCareer(c.id, c.title)} className="absolute top-4 right-4 p-2 text-slate-700 hover:text-red-400 transition-colors z-20"><X className="h-5 w-5" /></button>

                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    {c.fitScore}% Match
                                </div>
                            </div>

                            <h3 className="text-2xl font-black mb-3 text-white tracking-tighter leading-none group-hover:text-indigo-400 transition-colors">{c.title}</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium line-clamp-3">{c.description}</p>
                            
                            <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 text-[11px] text-slate-400 leading-relaxed mb-8 flex-1">
                                <span className="font-black text-indigo-400 uppercase block mb-2 tracking-widest flex items-center gap-2"><Info className="h-3 w-3" /> Nova Analysis:</span> 
                                {c.reason}
                            </div>

                            <button onClick={() => handleCareerSelect(c)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                Select Path <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    
                    {isAnalyzing && (
                        <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-slate-600 animate-pulse min-h-[350px]">
                            <RefreshCw className="h-10 w-10 mb-4 animate-spin text-indigo-500" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Syncing new paths...</span>
                        </div>
                    )}

                    {!isAnalyzing && (
                        <button onClick={handleShowMore} className="bg-slate-900/30 border border-slate-800 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-slate-600 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group min-h-[350px]">
                            <Plus className="h-12 w-12 mb-4 group-hover:scale-110 transition-transform text-slate-700" />
                            <span className="font-black uppercase tracking-widest text-sm">Discover Alternatives</span>
                            <span className="text-[10px] mt-2 font-medium">Browse 3 additional suggested roles</span>
                        </button>
                    )}
                </div>
            </div>
        )}

        {step === 'skill_quiz' && (
             <div className="w-full max-w-2xl relative z-10 px-4">
                 {quizStatus === 'loading' && (
                    <div className="text-center animate-pulse">
                        <BrainCircuit className="h-20 w-20 text-indigo-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Calibrating expertise</h2>
                    </div>
                 )}
                 {quizStatus === 'failed' && (
                     <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-red-500/30 p-10 rounded-[2.5rem] text-center shadow-2xl mx-auto animate-fade-in">
                        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400"><AlertCircle className="h-8 w-8" /></div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">CEILING REACHED</h2>
                        <p className="text-slate-400 mb-8 text-sm">I've identified your current proficiency boundary. Mapping starting point now.</p>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-2"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${(currentSkillQIndex / skillQuestions.length) * 100}%`}}></div></div>
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Architecting customized entry level</p>
                    </div>
                 )}
                 {quizStatus === 'completed' && (
                      <div className="text-center animate-fade-in">
                          <CheckCircle className="h-24 w-24 text-emerald-400 mx-auto mb-8 shadow-2xl shadow-emerald-500/20 rounded-full" />
                          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Elite Proficiency</h2>
                          <p className="text-slate-400 font-medium">Detected high-order technical patterns.</p>
                      </div>
                 )}
                 {quizStatus === 'active' && skillQuestions[currentSkillQIndex] && (
                     <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-12">
                            <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Calibration: Step {currentSkillQIndex + 1}</span>
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                skillQuestions[currentSkillQIndex].difficulty?.toLowerCase() === 'beginner' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                                skillQuestions[currentSkillQIndex].difficulty?.toLowerCase() === 'intermediate' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                                'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                                {skillQuestions[currentSkillQIndex].difficulty} Tier
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black mb-12 leading-tight text-center tracking-tighter">{skillQuestions[currentSkillQIndex].question}</h2>
                        <div className="grid gap-4 max-w-xl mx-auto">
                            {skillQuestions[currentSkillQIndex].options.map((opt, i) => (
                                <button key={i} onClick={() => handleQuizAnswer(i)} className="w-full text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 transition-all text-slate-300 hover:text-white font-bold backdrop-blur-xl group flex items-center justify-between">
                                    {opt} <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-[10px] text-slate-700 font-black uppercase tracking-[0.3em] mt-12">Calibration mode: adaptive difficulty active</p>
                     </div>
                 )}
             </div>
        )}
        
        {step === 'level_verification' && (
             <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[3rem] shadow-2xl p-10 animate-fade-in relative z-10 overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500"></div>
                 <div className="flex items-center gap-5 mb-10">
                     <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><UserCheck className="h-8 w-8" /></div>
                     <div>
                         <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Assessment</h2>
                         <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Detected: <span className="text-indigo-400">{detectedLevel}</span> Tier</p>
                     </div>
                 </div>
                 <div className="space-y-8">
                     <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Manual Override (If required)</label>
                         <div className="grid grid-cols-3 gap-3">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                                <button key={level} onClick={() => setUserSelectedLevel(level)} className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${userSelectedLevel === level ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600'}`}>
                                    {level}
                                </button>
                            ))}
                         </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Lightbulb className="h-3 w-3 text-yellow-500" /> Neural Sync Focus</label>
                        <textarea placeholder="e.g. 'I know basic React but struggle with Redux', 'Mastering the art of storytelling for brands'..." className="w-full p-6 rounded-[2rem] bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 outline-none transition-all h-32 resize-none text-sm placeholder-slate-700 font-medium" value={focusAreas} onChange={e => setFocusAreas(e.target.value)} />
                     </div>
                     <button onClick={() => setStep('status_role')} className="w-full py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3 active:scale-95">
                        Initialize Parameters <ChevronRight className="h-5 w-5" />
                     </button>
                 </div>
             </div>
        )}

        {step === 'status_role' && (
          <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[3rem] shadow-2xl p-10 animate-fade-in relative z-10 text-center">
             <button onClick={handleBack} className="flex items-center gap-2 text-slate-700 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-8"><ArrowLeft className="h-3 w-3" /> Back</button>
             <div className="p-4 bg-indigo-500/10 rounded-2xl inline-block mb-6"><Briefcase className="h-10 w-10 text-indigo-400" /></div>
             <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Current Identity</h2>
             <p className="text-slate-500 text-sm mb-10">What is your current role or academic status?</p>
             <div className="space-y-8">
                <input type="text" placeholder="e.g. Final Year CS Student, Project Manager" className="w-full p-6 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 outline-none transition-all text-center font-bold tracking-tight" value={statusRole} onChange={e => setStatusRole(e.target.value)} autoFocus />
                <button onClick={() => setStep('goal_selection')} disabled={!statusRole.trim()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                  Set Objective <Target className="h-5 w-5" />
                </button>
             </div>
          </div>
        )}

        {step === 'goal_selection' && (
          <div className="w-full max-w-2xl animate-fade-in relative z-10 px-4">
             <button onClick={handleBack} className="flex items-center gap-2 text-slate-700 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-10"><ArrowLeft className="h-3 w-3" /> Back</button>
             <h2 className="text-4xl font-black text-white mb-2 text-center tracking-tighter">MISSION OBJECTIVE</h2>
             <p className="text-slate-500 text-sm font-medium mb-12 text-center">Select the depth of your architecture sequence.</p>
             <div className="grid gap-4">
                {[
                  { id: 'Basics', label: 'COGNITIVE FOUNDATIONS', desc: 'Master core principles and essential tools.' },
                  { id: 'JobReady', label: 'PROFESSIONAL DEPLOYMENT', desc: 'Build technical portfolio and job-readiness.' },
                  { id: 'Mastery', label: 'ARCHITECT MASTERY', desc: 'Achieve high-level senior proficiency.' },
                  { id: 'Custom', label: 'CUSTOM TEMPORAL SYNC', desc: 'Set your own personal deadline.' }
                ].map((goal) => (
                    <button key={goal.id} onClick={() => handleGoalSelect(goal.id)} className="w-full text-left p-8 bg-slate-900/60 border border-slate-800 rounded-[2rem] hover:border-indigo-500 hover:bg-slate-900/90 transition-all group backdrop-blur-xl relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <div className="font-black text-white text-lg tracking-widest uppercase group-hover:text-indigo-400 transition-colors">{goal.label}</div>
                          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{goal.desc}</div>
                        </div>
                        <ChevronRight className="h-6 w-6 text-slate-800 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                ))}
             </div>
          </div>
        )}

        {step === 'goal_confirmation' && (
          <div className="w-full max-lg bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[3rem] shadow-2xl p-10 animate-fade-in relative z-10 text-center">
             <button onClick={handleBack} className="flex items-center gap-2 text-slate-700 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-10"><ArrowLeft className="h-3 w-3" /> Timeline</button>
             <div className="text-center mb-10">
                <div className="p-5 bg-indigo-500/10 rounded-2xl inline-block mb-6 shadow-inner border border-indigo-500/10">{selectedGoal === 'Custom' ? <Calendar className="h-10 w-10 text-indigo-400" /> : <Clock className="h-10 w-10 text-indigo-400" />}</div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">TEMPORAL SYNC</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-4">Calibrating path duration</p>
             </div>
             <div className="space-y-8">
                {selectedGoal === 'Custom' ? (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Manual Date Selection</label>
                    <input type="date" className="w-full bg-transparent text-white font-black text-2xl focus:outline-none color-scheme-dark text-center" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                  </div>
                ) : (
                  <div className="bg-slate-950 p-8 rounded-[2rem] border border-indigo-500/20 shadow-inner">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-4">Nova Estimate</div>
                    <div className="text-5xl font-black text-white mb-2 tracking-tighter">{estimatedDays} UNITS</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{new Date(calculatedTargetDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  <button onClick={handleFinalSubmit} disabled={selectedGoal === 'Custom' ? !targetDate : false} className="w-full py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                    COMMIT ARCHITECTURE
                  </button>
                  <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.4em]">Neural Roadmap Deployment Sequence Initiated</p>
                </div>
             </div>
          </div>
        )}
    </div>
  );
};
