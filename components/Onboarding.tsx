import React, { useState } from 'react';
import { CareerOption, SkillQuestion } from '../types';
import { analyzeInterests, searchCareers, generateSkillQuiz } from '../services/gemini';
import { Sparkles, CheckCircle, BookOpen, Clock, Target, ChevronRight, ArrowLeft, Search, RefreshCw, BrainCircuit, Lightbulb, UserCheck, AlertCircle, Bot, Plus, Code, Globe, Rocket, Terminal } from 'lucide-react';

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

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isNewUser = true, mode = 'analysis' }) => {
  const [step, setStep] = useState<'intro' | 'psychometric' | 'comment' | 'analysis' | 'selection' | 'skill_quiz' | 'level_verification' | 'logistics'>(
      isNewUser && mode === 'analysis' ? 'intro' : mode === 'search' ? 'selection' : 'psychometric'
  );
  
  // Psychometric State
  const [currentPsychIndex, setCurrentPsychIndex] = useState(0);
  const [psychAnswers, setPsychAnswers] = useState<{question: string, answer: string}[]>([]);
  const [additionalComment, setAdditionalComment] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customAnswer, setCustomAnswer] = useState('');
  
  // Career State
  const [careers, setCareers] = useState<CareerOption[]>([]);
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
  const [eduYear, setEduYear] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // --- HANDLERS ---

  const handleBack = () => {
    if (step === 'psychometric') {
        if (isOtherSelected) {
            setIsOtherSelected(false);
            setCustomAnswer('');
            return;
        }
        if (currentPsychIndex > 0) {
            setCurrentPsychIndex(prev => prev - 1);
            setPsychAnswers(prev => prev.slice(0, -1));
        } else {
            setStep('intro');
        }
    } else if (step === 'comment') {
        setStep('psychometric');
    } else if (step === 'selection') {
        setStep('comment');
    } else if (step === 'skill_quiz') {
        setStep('selection');
    } else if (step === 'level_verification') {
        setStep('selection');
    } else if (step === 'logistics') {
        setStep('level_verification');
    }
  };

  const handlePsychOptionSelect = (option: string) => {
      if (option === 'Other') {
          setIsOtherSelected(true);
          setCustomAnswer('');
          return;
      }
      
      savePsychAnswer(option);
  };

  const savePsychAnswer = (answer: string) => {
      const newAnswers = [...psychAnswers, { question: PSYCH_QUESTIONS[currentPsychIndex].q, answer: answer }];
      setPsychAnswers(newAnswers);
      setIsOtherSelected(false);
      setCustomAnswer('');
      
      if (currentPsychIndex < PSYCH_QUESTIONS.length - 1) {
          setCurrentPsychIndex(prev => prev + 1);
      } else {
          setStep('comment');
      }
  };

  const submitAnalysis = async () => {
      setStep('analysis');
      setIsAnalyzing(true);
      try {
          const results = await analyzeInterests(psychAnswers, additionalComment);
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

  const handleShowMore = async () => {
      setIsAnalyzing(true);
      try {
          const currentTitles = careers.map(c => c.title);
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
          setSkillQuestions(questions);
          setQuizStatus('active');
          setCurrentSkillQIndex(0);
      } catch (e) {
          console.error("Failed to load quiz", e);
          setDetectedLevel('beginner');
          setUserSelectedLevel('beginner');
          setStep('level_verification');
      }
  };

  const handleQuizAnswer = (optionIndex: number) => {
      const currentQ = skillQuestions[currentSkillQIndex];
      
      if (optionIndex !== currentQ.correctIndex) {
          setQuizStatus('failed');
          if (currentSkillQIndex <= 1) setDetectedLevel('beginner');
          else if (currentSkillQIndex <= 3) setDetectedLevel('intermediate');
          else setDetectedLevel('advanced');

          setTimeout(() => {
             setUserSelectedLevel(currentSkillQIndex <= 1 ? 'beginner' : currentSkillQIndex <= 3 ? 'intermediate' : 'advanced');
             setStep('level_verification');
          }, 2000);
      } else {
          if (currentSkillQIndex < skillQuestions.length - 1) {
              setCurrentSkillQIndex(prev => prev + 1);
          } else {
              setQuizStatus('completed');
              setDetectedLevel('advanced');
              setUserSelectedLevel('advanced');
              setTimeout(() => {
                 setStep('level_verification');
              }, 1500);
          }
      }
  };

  const handleFinalSubmit = () => {
    if (selectedCareer && eduYear && targetDate) {
      onComplete(selectedCareer, eduYear, targetDate, userSelectedLevel, focusAreas);
    }
  };

  // --- RENDERERS ---

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 bg-[linear-gradient(45deg,#0f172a,#1e1b4b,#312e81,#0f172a)] animate-gradient-xy text-white overflow-hidden">
        <BackgroundIcons />
        
        {step === 'intro' && (
              <div className="animate-fade-in max-w-lg text-center relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                      <Bot className="h-12 w-12 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold mb-4">Hello. I am Nova.</h1>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                      I am your AI Career Architect. I don't just find jobs; I analyze your potential and architect a future that fits your unique mind.
                      <br/><br/>
                      To begin, I need to understand how you think.
                  </p>
                  <button 
                    onClick={() => setStep('psychometric')}
                    className="px-8 py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-2 mx-auto"
                  >
                      Start Analysis <Sparkles className="h-5 w-5 text-indigo-600" />
                  </button>
              </div>
        )}

        {step === 'psychometric' && (
              <div className="w-full max-w-2xl animate-fade-in relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                      <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                          <ArrowLeft className="h-6 w-6" />
                      </button>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                            {currentPsychIndex + 1}
                        </div>
                        <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentPsychIndex) / PSYCH_QUESTIONS.length) * 100}%` }}></div>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Nova Analysis</span>
                      </div>
                  </div>

                  <h2 className="text-3xl font-bold mb-8 leading-tight text-center">{PSYCH_QUESTIONS[currentPsychIndex].q}</h2>
                  
                  {!isOtherSelected ? (
                      <div className="grid gap-4">
                          {PSYCH_QUESTIONS[currentPsychIndex].options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => handlePsychOptionSelect(opt)}
                                className="w-full text-left p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 transition-all group flex items-center justify-between backdrop-blur-sm"
                              >
                                  <span className="text-lg text-slate-300 group-hover:text-white">{opt}</span>
                                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div className="animate-fade-in">
                          <label className="block text-slate-400 mb-2">Please specify your answer:</label>
                          <textarea 
                              className="w-full h-32 bg-slate-900 border border-indigo-500 rounded-2xl p-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none mb-4"
                              value={customAnswer}
                              onChange={(e) => setCustomAnswer(e.target.value)}
                              autoFocus
                          />
                          <div className="flex gap-4">
                              <button 
                                onClick={() => setIsOtherSelected(false)}
                                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium"
                              >
                                  Back
                              </button>
                              <button 
                                onClick={() => savePsychAnswer(customAnswer)}
                                disabled={!customAnswer.trim()}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  Confirm
                              </button>
                          </div>
                      </div>
                  )}
              </div>
        )}

        {step === 'comment' && (
            <div className="w-full max-w-2xl animate-fade-in relative z-10">
                <button onClick={handleBack} className="absolute -top-12 left-0 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h2 className="text-3xl font-bold mb-4 text-center">Any final thoughts for Nova?</h2>
                <p className="text-slate-400 mb-8 text-center">Is there anything else I should know about your constraints or dreams? (Optional)</p>
                
                <textarea 
                    className="w-full h-40 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-white placeholder-slate-600 focus:border-indigo-500 outline-none resize-none mb-6"
                    placeholder="e.g. I hate math but love art. I want a remote job."
                    value={additionalComment}
                    onChange={e => setAdditionalComment(e.target.value)}
                    autoFocus
                />
                
                <div className="flex justify-end">
                    <button 
                        onClick={submitAnalysis}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        Generate Analysis <Sparkles className="h-5 w-5" />
                    </button>
                </div>
            </div>
        )}

        {step === 'analysis' && (
            <div className="animate-pulse flex flex-col items-center relative z-10">
                <div className="h-24 w-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-8 border border-indigo-500/30">
                    <BrainCircuit className="h-12 w-12 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Nova is thinking...</h2>
                <p className="text-slate-400 max-w-md mx-auto">Connecting your personality traits to industry demands.</p>
            </div>
        )}

        {step === 'selection' && (
            <div className="max-w-6xl mx-auto w-full relative z-10 px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="h-4 w-4" /> Back to Analysis
                        </button>
                        <h2 className="text-3xl font-bold mb-2">Career Architecture</h2>
                        <p className="text-slate-400">Nova suggested these paths based on your profile.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Search specific career..." 
                            className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 w-full md:w-64 focus:border-indigo-500 outline-none backdrop-blur-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCareerSearch()}
                        />
                        <button 
                            onClick={handleCareerSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="bg-slate-800 px-4 rounded-xl hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSearching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {careers.length > 0 ? (
                        <>
                            {careers.map((c, idx) => (
                                <div 
                                    key={c.id || idx} 
                                    onClick={() => handleCareerSelect(c)}
                                    className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl hover:border-indigo-500 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden animate-fade-in"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Target className="h-24 w-24 text-indigo-500" />
                                    </div>
                                    <div className="inline-block bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-emerald-500/20">
                                        {c.fitScore}% Match
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2 text-white">{c.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4 min-h-[40px] leading-relaxed">{c.description}</p>
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs text-slate-500">
                                        <span className="font-semibold text-slate-300">Nova says:</span> {c.reason}
                                    </div>
                                </div>
                            ))}
                            
                            {/* Show More Button */}
                            {isAnalyzing ? (
                                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 animate-pulse">
                                    <RefreshCw className="h-8 w-8 mb-2 animate-spin" />
                                    <span className="text-sm font-medium">Finding more paths...</span>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleShowMore}
                                    className="bg-slate-900/50 border border-slate-700 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 transition-all group"
                                >
                                    <Plus className="h-10 w-10 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold">Show More Matching</span>
                                    <span className="text-xs mt-1">Discover distinct alternatives</span>
                                </button>
                            )}
                        </>
                    ) : !isAnalyzing && !isSearching && (
                        <div className="col-span-full py-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl">
                            <Bot className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No suggestions found</h3>
                            <p className="text-slate-400 mb-6 max-w-sm mx-auto">Nova couldn't find matches for this query. Try a more general term or re-analyze.</p>
                            <button onClick={submitAnalysis} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Try Re-Analysis</button>
                        </div>
                    )}
                    {isSearching && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center animate-pulse">
                             <RefreshCw className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                             <h3 className="text-xl font-bold text-white">Searching the Industry...</h3>
                        </div>
                    )}
                </div>
            </div>
        )}

        {step === 'skill_quiz' && (
             <div className="w-full max-w-2xl relative z-10">
                 {quizStatus === 'loading' && (
                    <div className="text-center animate-pulse">
                        <BrainCircuit className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">Calibrating Expertise...</h2>
                    </div>
                 )}
                 
                 {quizStatus === 'failed' && (
                     <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-red-500/30 p-8 rounded-3xl text-center shadow-2xl mx-auto">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="h-8 w-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Calibration Complete</h2>
                        <p className="text-slate-400 mb-6">I've identified your current knowledge ceiling.</p>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-indigo-500" style={{width: `${(currentSkillQIndex / skillQuestions.length) * 100}%`}}></div>
                        </div>
                        <p className="text-xs text-slate-500">Setting appropriate starting level...</p>
                    </div>
                 )}
                 
                 {quizStatus === 'completed' && (
                      <div className="text-center animate-fade-in">
                          <CheckCircle className="h-20 w-20 text-emerald-400 mx-auto mb-6" />
                          <h2 className="text-3xl font-bold text-white">Excellent Proficiency</h2>
                          <p className="text-slate-400">Nova detects advanced capabilities.</p>
                      </div>
                 )}
                 
                 {quizStatus === 'active' && skillQuestions[currentSkillQIndex] && (
                     <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Skill Calibration</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${skillQuestions[currentSkillQIndex].difficulty === 'beginner' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : skillQuestions[currentSkillQIndex].difficulty === 'intermediate' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                {skillQuestions[currentSkillQIndex].difficulty} Level
                            </span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight text-center">{skillQuestions[currentSkillQIndex].question}</h2>

                        <div className="grid gap-4">
                            {skillQuestions[currentSkillQIndex].options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuizAnswer(i)}
                                    className="w-full text-left p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 transition-all text-slate-300 hover:text-white font-medium backdrop-blur-sm"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        
                        <p className="text-center text-xs text-slate-600 mt-8">
                            Nova stops the quiz on the first mistake to determine your exact level.
                        </p>
                     </div>
                 )}
             </div>
        )}
        
        {step === 'level_verification' && (
             <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                     <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                         <UserCheck className="h-6 w-6" />
                     </div>
                     <div>
                         <h2 className="text-2xl font-bold text-white">Nova's Assessment</h2>
                         <p className="text-slate-400 text-sm">Detected Level: <span className="text-white capitalize font-bold">{detectedLevel}</span></p>
                     </div>
                 </div>

                 <div className="space-y-6">
                     <div>
                         <label className="block text-sm font-medium text-slate-300 mb-3">Adjust if you feel differently:</label>
                         <div className="grid grid-cols-3 gap-3">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setUserSelectedLevel(level)}
                                    className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${userSelectedLevel === level ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {level}
                                </button>
                            ))}
                         </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                             <Lightbulb className="h-4 w-4 text-yellow-400" /> Upskilling Targets
                        </label>
                        <textarea 
                            placeholder="Tell Nova specific things you want to master (e.g. 'I know JS but want to learn React Hooks')."
                            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all h-32 resize-none text-sm placeholder-slate-600"
                            value={focusAreas}
                            onChange={e => setFocusAreas(e.target.value)}
                        />
                     </div>

                     <button 
                        onClick={() => setStep('logistics')}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                     >
                        Confirm Level <ChevronRight className="h-4 w-4" />
                     </button>
                 </div>
             </div>
        )}

        {step === 'logistics' && (
          <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in relative z-10">
             <button 
                onClick={() => setStep('level_verification')}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-sm mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

             <h2 className="text-2xl font-bold text-white mb-6">Final Logistics</h2>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-400" /> Current Status / Role
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Final Year Student, Marketing Manager"
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    value={eduYear}
                    onChange={e => setEduYear(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" /> Target Completion Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none color-scheme-dark"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleFinalSubmit}
                  disabled={!eduYear || !targetDate}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 mt-4"
                >
                  <Target className="h-5 w-5" />
                  Ask Nova to Generate Roadmap
                </button>
             </div>
          </div>
        )}
    </div>
  );
};