import React, { useState, useEffect, useMemo } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem, RoadmapData } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Briefcase, Award, Code, Zap, Clock, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, RotateCcw, Lock, Filter, Search, Info, Check, Pencil, Compass, Youtube, PlayCircle, TrendingUp, TrendingDown, Target as TargetIcon, Boxes, FileBadge, GraduationCap, Sparkles } from 'lucide-react';

interface PacingStatus {
    status: 'ahead' | 'behind' | 'on-track' | 'critical';
    days: number;
    message: string;
}

interface RoadmapProps {
  roadmap: RoadmapData | null;
  user: UserProfile;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
  onUpdateProgress: (itemId: string) => void;
  onReset: () => void;
  onResetPhase: (phaseIndex: number) => void;
  onSwitchCareer: (careerId: string) => void;
  onEditTargetDate: () => void;
  pacing: PacingStatus;
  isLoading?: boolean;
  daysRemaining: number;
}

export const Roadmap: React.FC<RoadmapProps> = ({ 
  roadmap, 
  user, 
  onSubscribe, 
  onUpdateProgress, 
  onReset, 
  onResetPhase,
  onSwitchCareer,
  onEditTargetDate,
  pacing, 
  isLoading = false, 
  daysRemaining 
}) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  const [expandedLearnMoreItems, setExpandedLearnMoreItems] = useState<Set<string>>(new Set());

  const phases = roadmap?.phases || [];
  const flatRoadmapItems = useMemo(() => phases.flatMap(phase => phase.items || []), [phases]);

  const currentTask = useMemo(() => {
    return flatRoadmapItems.find(item => item.status === 'pending');
  }, [flatRoadmapItems]);

  const itemStartDays = useMemo(() => {
    const map: Record<string, number> = {};
    flatRoadmapItems.forEach((item, idx) => {
        map[item.id] = idx + 1;
    });
    return map;
  }, [flatRoadmapItems]);

  const isLocked = (item: RoadmapItem) => {
      if (item.status === 'completed') return false;
      const index = flatRoadmapItems.findIndex(i => i.id === item.id);
      if (index <= 0) return false;
      const prevItem = flatRoadmapItems[index - 1];
      return prevItem.status !== 'completed';
  };

  useEffect(() => {
    if (roadmap && !isLoading) {
        let totalItems = 0;
        let completedItems = 0;
        let firstPendingPhase = 0;
        let foundPending = false;

        phases.forEach((phase, idx) => {
            const pItems = phase.items || [];
            totalItems += pItems.length;
            const cCount = pItems.filter(i => i.status === 'completed').length;
            completedItems += cCount;
            
            if (!foundPending && cCount < pItems.length) {
                firstPendingPhase = idx;
                foundPending = true;
            }
        });

        setExpandedPhase(firstPendingPhase);
        setCompletionPercentage(totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
    }
  }, [roadmap, isLoading, phases]);

  const togglePhase = (index: number) => {
      setExpandedPhase(expandedPhase === index ? null : index);
  };

  const getActiveCareer = () => user.activeCareers.find(c => c.careerId === user.currentCareerId);
  const currentCareer = getActiveCareer();
  const getActiveCareerDate = () => currentCareer?.targetCompletionDate || 'N/A';
  const getStartDateDisplay = () => {
      return currentCareer ? new Date(currentCareer.addedAt).toLocaleDateString() : 'N/A';
  };

  const getCalendarDaysRemaining = () => {
      if (!currentCareer?.targetCompletionDate) return 0;
      const parts = currentCareer.targetCompletionDate.split('-');
      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays + 1);
  };

  const handleResetRequest = () => {
      setResetIntent({ type: 'all', index: -1 });
      setResetConfirmInput('');
  };

  const handleTaskClick = (item: RoadmapItem) => {
      if (isLocked(item)) return;
      if (item.status === 'pending') {
          setItemToConfirm(item);
      } else {
          onUpdateProgress(item.id);
      }
  };

  const confirmCompletion = () => {
      if (itemToConfirm) {
          onUpdateProgress(itemToConfirm.id);
          setItemToConfirm(null);
      }
  };

  const confirmReset = () => {
      if (!resetIntent) return;
      if (resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET') return;
      if (resetIntent.type === 'all') onReset();
      else onResetPhase(resetIntent.index);
      setResetIntent(null);
  };

  const toggleLearnMore = (e: React.MouseEvent, item: RoadmapItem) => {
      e.stopPropagation();
      const newSet = new Set(expandedLearnMoreItems);
      if (newSet.has(item.id)) newSet.delete(item.id);
      else newSet.add(item.id);
      setExpandedLearnMoreItems(newSet);
  };

  const filterItem = (item: RoadmapItem) => {
      const matchesCategory = () => {
          if (activeCategory === 'all') return true;
          if (activeCategory === 'completed') return item.status === 'completed';
          if (activeCategory === 'pending') return item.status !== 'completed';
          return item.type === activeCategory;
      };
      const matchesSearch = () => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
      };
      return matchesCategory() && matchesSearch();
  };

  const getItemIcon = (type: string) => {
      switch(type) {
          case 'project': return <Boxes className="h-3.5 w-3.5" />;
          default: return <GraduationCap className="h-3.5 w-3.5" />;
      }
  };

  if (isLoading || !roadmap) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full">
           <Compass className="h-12 w-12 text-indigo-400 animate-spin" />
           <h3 className="text-xl font-bold text-white mb-2">Architecting Roadmap...</h3>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';
  const calendarDaysLeft = getCalendarDaysRemaining();
  // Ensure we use the actual count of tasks left for the header label
  const tasksRemainingCount = flatRoadmapItems.filter(it => it.status !== 'completed').length;

  return (
    <div className="relative min-h-[80vh] pb-10 w-full overflow-x-hidden">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Complete Milestone?</h3>
                <p className="text-slate-400 text-sm mt-1">Ready to finish "{itemToConfirm.title}"?</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setItemToConfirm(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm">Cancel</button>
                    <button onClick={confirmCompletion} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm">Confirm</button>
                </div>
            </div>
        </div>
      )}

      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-2">Reset Progress?</h3>
                <p className="text-slate-400 text-sm mb-4">{resetIntent.type === 'all' ? "Wipe ALL progress for this path? Type RESET below." : "Reset this phase?"}</p>
                {resetIntent.type === 'all' && (
                    <input type="text" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-red-500 outline-none text-center font-bold mb-4" value={resetConfirmInput} onChange={(e) => setResetConfirmInput(e.target.value)} placeholder="RESET" />
                )}
                <div className="flex gap-3">
                    <button onClick={() => setResetIntent(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm">Cancel</button>
                    <button onClick={confirmReset} disabled={resetIntent.type === 'all' && resetConfirmInput.toUpperCase() !== 'RESET'} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm">Yes, Reset</button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        
        {/* CURRENT OBJECTIVE HERO */}
        {currentTask && (
            <div className="relative group overflow-hidden rounded-[2.5rem] border border-indigo-500/30 bg-indigo-950/20 shadow-2xl shadow-indigo-900/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="shrink-0 flex flex-col items-center">
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-float">
                            <Compass className="h-10 w-10 md:h-14 md:h-14 text-indigo-400" />
                        </div>
                        <div className="mt-4 px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">Next Task</div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-3">
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                                Phase {phases.findIndex(p => p.items.some(it => it.id === currentTask.id)) + 1}
                            </span>
                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                                Day {itemStartDays[currentTask.id]}
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight tracking-tight">
                            {currentTask.title}
                        </h2>
                        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
                            {currentTask.description}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                            <button 
                                onClick={() => handleTaskClick(currentTask)}
                                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 group"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                Mark Day Complete
                            </button>
                            <button 
                                onClick={(e) => toggleLearnMore(e, currentTask)}
                                className="px-6 py-3.5 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                            >
                                {expandedLearnMoreItems.has(currentTask.id) ? 'Hide Briefing' : 'Study Resource'}
                            </button>
                        </div>
                    </div>
                </div>
                {expandedLearnMoreItems.has(currentTask.id) && (
                    <div className="p-8 md:p-12 border-t border-indigo-500/20 bg-indigo-950/40 animate-fade-in">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TargetIcon className="h-4 w-4" /> Strategic Context
                                </h4>
                                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                    {currentTask.explanation || "Nova is preparing your contextual analysis. Focus on mastering the current daily objective to build high-velocity momentum."}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <PlayCircle className="h-4 w-4" /> Critical Assets
                                </h4>
                                <div className="space-y-3">
                                    {Array.isArray(currentTask.suggestedResources) && currentTask.suggestedResources.length > 0 ? (
                                        currentTask.suggestedResources.map((res, i) => (
                                            <a key={i} href={res.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group/res">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                                                        <Youtube className="h-4 w-4 text-indigo-400" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white group-hover/res:text-indigo-400 transition-colors">{res.title}</span>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-slate-700 group-hover/res:text-slate-400" />
                                            </a>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-xs italic">Nova recommends researching the specific technical title on official platform documentation.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{currentCareer?.title || "Professional Path"}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${
                            pacing.status === 'ahead' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10' : 
                            pacing.status === 'behind' ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10' : 
                            'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                        }`}>
                            {pacing.status === 'ahead' ? <TrendingUp className="h-4 w-4" /> : pacing.status === 'behind' ? <TrendingDown className="h-4 w-4" /> : <TargetIcon className="h-4 w-4" />}
                            {pacing.message}
                        </div>
                        <div className="h-4 w-px bg-slate-800"></div>
                        <span className="text-sm font-semibold text-slate-400">{tasksRemainingCount} Tasks Left</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 group">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" placeholder="Search roadmap..." className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 outline-none text-sm transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={handleResetRequest} className="p-2.5 bg-slate-900 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all active:scale-95" title="Reset Roadmap">
                        <RotateCcw className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 flex flex-col justify-center text-center backdrop-blur-sm">
                    <div className="text-2xl font-black text-white">{calendarDaysLeft}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mt-1">Days Left</div>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 flex flex-col justify-center px-5 backdrop-blur-sm">
                     <div className="flex justify-between items-end mb-2">
                        <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest">Mastery</div>
                        <div className="text-xs font-black text-emerald-400">{completionPercentage}%</div>
                     </div>
                     <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out" style={{ width: `${completionPercentage}%` }}></div>
                     </div>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 text-center flex flex-col justify-center backdrop-blur-sm">
                     <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Started</div>
                     <div className="text-sm font-bold text-slate-200">{getStartDateDisplay()}</div>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 flex items-center justify-between px-5 cursor-pointer hover:border-indigo-500/50 transition-all hover:bg-slate-900 backdrop-blur-sm group" onClick={onEditTargetDate}>
                    <div className="text-left">
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">End Goal</div>
                        <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{getActiveCareerDate()}</div>
                    </div>
                    <Pencil className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
            </div>
        </div>

        {/* Global Recommendations Section */}
        <div className="grid md:grid-cols-2 gap-6">
            {roadmap.recommendedCertificates && roadmap.recommendedCertificates.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Award className="h-20 w-20 text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white leading-none">Certifications</h3>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Expert-curated credentials</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {roadmap.recommendedCertificates.map((cert, idx) => (
                            <a key={idx} href={cert.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900 transition-all group/card block">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md">{cert.provider}</span>
                                    <ExternalLink className="h-3 w-3 text-slate-700 group-hover/card:text-indigo-400 transition-colors" />
                                </div>
                                <h4 className="font-bold text-white text-sm group-hover/card:text-indigo-200 transition-colors">{cert.title}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">"{cert.relevance}"</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {roadmap.recommendedInternships && roadmap.recommendedInternships.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Briefcase className="h-20 w-20 text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white leading-none">Industry Placements</h3>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Verified career opportunities</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {roadmap.recommendedInternships.map((job, idx) => (
                            <a key={idx} href={job.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-900 transition-all group/card block">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">{job.company}</span>
                                    <ExternalLink className="h-3 w-3 text-slate-700 group-hover/card:text-emerald-400 transition-colors" />
                                </div>
                                <h4 className="font-bold text-white text-sm group-hover/card:text-emerald-200 transition-colors">{job.title}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">"{job.description}"</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4">
            {phases.map((phase, pIndex) => {
                const isExpanded = expandedPhase === pIndex || activeCategory !== 'all' || searchQuery !== '';
                const phaseItems = phase.items || [];
                const completedCount = phaseItems.filter(i => i.status === 'completed').length;
                const totalCount = phaseItems.length;
                const isPhaseDone = totalCount > 0 && completedCount === totalCount;
                const visibleItems = phaseItems.filter(filterItem);
                const isLastPhase = pIndex === phases.length - 1;
                
                if (visibleItems.length === 0 && (activeCategory !== 'all' || searchQuery !== '')) return null;

                return (
                    <div key={pIndex} className={`bg-slate-900 border transition-all rounded-3xl overflow-hidden ${isExpanded ? 'border-indigo-500/40 shadow-2xl shadow-indigo-900/10' : 'border-slate-800'}`}>
                        <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => togglePhase(pIndex)}>
                             <div className="flex items-center gap-5">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl border-2 text-sm font-black transition-all ${isPhaseDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {isPhaseDone ? <CheckCircle2 className="h-5 w-5" /> : pIndex + 1}
                                </div>
                                <div>
                                    <h3 className={`font-black text-base md:text-lg tracking-tight ${isPhaseDone ? 'text-emerald-400' : 'text-slate-100'}`}>{phase.phaseName}</h3>
                                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{completedCount} of {totalCount} goals met</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-800 bg-slate-950/40 p-4 space-y-3">
                                {visibleItems.map((item, iIndex) => {
                                    const showDetails = expandedLearnMoreItems.has(item.id);
                                    const locked = isLocked(item);
                                    const done = item.status === 'completed';
                                    const startDay = itemStartDays[item.id] || 1;
                                    const dayLabel = `Day ${startDay}`;
                                    const isFinalItemOfPath = isLastPhase && iIndex === visibleItems.length - 1;

                                    return (
                                        <div key={item.id} className={`rounded-2xl border transition-all overflow-hidden ${
                                            isFinalItemOfPath ? 'border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-900/10 ring-1 ring-amber-500/20' : 
                                            done ? 'bg-slate-900/40 border-slate-800/40' : 
                                            locked ? 'bg-slate-950 border-slate-800/50 grayscale' : 
                                            'bg-slate-800/40 border-slate-700/60 hover:border-indigo-500/40 hover:bg-slate-800/60'
                                        }`}>
                                            <div className="flex items-center gap-4 p-4">
                                                <button onClick={() => !locked && handleTaskClick(item)} disabled={locked || done} className={`shrink-0 transition-all ${locked ? 'cursor-not-allowed opacity-30' : 'hover:scale-110 active:scale-95'}`}>
                                                    {done ? <div className="p-1 bg-emerald-500/20 rounded-lg"><CheckCircle2 className="h-6 w-6 text-emerald-400" /></div> : locked ? <Lock className="h-6 w-6 text-slate-700" /> : <Circle className="h-6 w-6 text-slate-500" />}
                                                </button>
                                                <div className={`flex-1 min-w-0 flex flex-col gap-1 ${locked ? 'opacity-40' : 'cursor-pointer'}`} onClick={() => !locked && handleTaskClick(item)}>
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest shrink-0 shadow-sm ${isFinalItemOfPath ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                            {isFinalItemOfPath ? 'FINAL DESTINATION' : dayLabel}
                                                        </span>
                                                        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                                                            isFinalItemOfPath ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                            item.type === 'project' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                            'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                                        }`}>
                                                            {isFinalItemOfPath ? <Sparkles className="h-3.5 w-3.5" /> : getItemIcon(item.type)} {item.type}
                                                        </span>
                                                        <span className={`font-bold text-sm md:text-base tracking-tight leading-none ${done ? 'line-through text-slate-500' : isFinalItemOfPath ? 'text-amber-100' : 'text-slate-100'}`}>
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs ${done ? 'text-slate-600' : 'text-slate-400'} line-clamp-1 font-medium`}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => toggleLearnMore(e, item)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                        showDetails ? (isFinalItemOfPath ? 'bg-amber-600 border-amber-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/20') : 
                                                        'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                                                        {showDetails ? 'Close' : 'View'}
                                                    </button>
                                                </div>
                                            </div>
                                            {showDetails && (
                                                <div className={`border-t border-slate-800 bg-slate-900/20 p-5 space-y-6 animate-fade-in text-sm relative ${isFinalItemOfPath ? 'bg-amber-950/5' : ''}`}>
                                                    {locked && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-bold text-xs flex items-center gap-3 mb-4 shadow-inner"><Lock className="h-4 w-4" /> Prerequisite required. Complete previous day.</div>}
                                                    
                                                    {isFinalItemOfPath && (
                                                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4 shadow-inner mb-4">
                                                            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                                                                <Sparkles className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-amber-400 text-xs uppercase tracking-widest mb-1">Capstone Protocol</h4>
                                                                <p className="text-amber-200/70 text-xs leading-relaxed">This final project integrates all previously mastered domains. Successful deployment confirms your readiness for industry entry.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.explanation && (
                                                        <div className="relative">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className={`h-px flex-1 bg-gradient-to-r from-${isFinalItemOfPath ? 'amber' : 'indigo'}-500/50 to-transparent`}></div>
                                                                <h4 className={`font-black text-${isFinalItemOfPath ? 'amber' : 'indigo'}-400 uppercase tracking-widest text-[10px]`}>Architect's Briefing</h4>
                                                                <div className={`h-px flex-1 bg-gradient-to-l from-${isFinalItemOfPath ? 'amber' : 'indigo'}-500/50 to-transparent`}></div>
                                                            </div>
                                                            <p className="text-slate-300 leading-relaxed font-medium bg-slate-950/30 p-4 rounded-2xl border border-white/5 shadow-inner">
                                                                {item.explanation}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {Array.isArray(item.suggestedResources) && item.suggestedResources.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <div className="h-px flex-1 bg-gradient-to-r from-red-500/50 to-transparent"></div>
                                                                <h4 className="font-black text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                                                    <PlayCircle className="h-3 w-3 text-red-500" /> Learning Assets
                                                                </h4>
                                                                <div className="h-px flex-1 bg-gradient-to-l from-red-500/50 to-transparent"></div>
                                                            </div>
                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                {item.suggestedResources.map((res, idx) => (
                                                                    <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-red-500/30 hover:bg-slate-900 transition-all group overflow-hidden relative">
                                                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                                                        <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                                                            <Youtube className="h-4 w-4 text-red-500" />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-xs font-black text-white truncate group-hover:text-red-300 transition-colors">{res.title}</span>
                                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Source Material</span>
                                                                        </div>
                                                                        <ExternalLink className="h-3 w-3 text-slate-700 ml-auto group-hover:text-slate-400 transition-colors" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};