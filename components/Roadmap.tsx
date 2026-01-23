
import React, { useState, useEffect, useMemo } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem, RoadmapData } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, Briefcase, Award, Zap, Clock, ChevronDown, ChevronUp, RotateCcw, Lock, Search, Target as TargetIcon, Boxes, GraduationCap, Sparkles, Youtube, PlayCircle, Pencil, Compass } from 'lucide-react';

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
  roadmap, user, onSubscribe, onUpdateProgress, onReset, onResetPhase, onEditTargetDate, pacing, isLoading = false, daysRemaining 
}) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLearnMoreItems, setExpandedLearnMoreItems] = useState<Set<string>>(new Set());

  const phases = roadmap?.phases || [];
  const flatRoadmapItems = useMemo(() => phases.flatMap(phase => phase.items || []), [phases]);

  const currentTask = useMemo(() => flatRoadmapItems.find(item => item.status === 'pending'), [flatRoadmapItems]);

  // CRITICAL: Force day numbering based on physical index to ensure 1 task per day
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
        let firstPendingPhase = 0;
        let foundPending = false;
        phases.forEach((phase, idx) => {
            if (!foundPending && phase.items.some(i => i.status !== 'completed')) {
                firstPendingPhase = idx;
                foundPending = true;
            }
        });
        setExpandedPhase(firstPendingPhase);
    }
  }, [roadmap, isLoading, phases]);

  const togglePhase = (index: number) => setExpandedPhase(expandedPhase === index ? null : index);
  const currentCareer = user.activeCareers.find(c => c.careerId === user.currentCareerId);
  const completionPercentage = flatRoadmapItems.length > 0 ? Math.round((flatRoadmapItems.filter(i => i.status === 'completed').length / flatRoadmapItems.length) * 100) : 0;

  const handleTaskClick = (item: RoadmapItem) => {
      if (isLocked(item)) return;
      if (item.status === 'pending') setItemToConfirm(item);
      else onUpdateProgress(item.id);
  };

  const toggleLearnMore = (e: React.MouseEvent, item: RoadmapItem) => {
      e.stopPropagation();
      const newSet = new Set(expandedLearnMoreItems);
      if (newSet.has(item.id)) newSet.delete(item.id);
      else newSet.add(item.id);
      setExpandedLearnMoreItems(newSet);
  };

  const filterItem = (item: RoadmapItem) => {
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
  };

  if (isLoading || !roadmap) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full">
           <Zap className="h-12 w-12 text-indigo-400 animate-pulse" />
           <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Synchronizing Neural Paths...</h3>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';

  return (
    <div className="relative min-h-[80vh] pb-10 w-full overflow-x-hidden">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-8 max-sm w-full shadow-2xl text-center">
                <div className="mx-auto w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400"><CheckCircle2 className="h-10 w-10" /></div>
                <h3 className="text-2xl font-black text-white">Complete Milestone?</h3>
                <p className="text-slate-400 text-sm mt-1">Ready to finish "{itemToConfirm.title}"?</p>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setItemToConfirm(null)} className="flex-1 py-4 bg-slate-800 text-slate-300 font-black rounded-2xl">ABORT</button>
                    <button onClick={() => { onUpdateProgress(itemToConfirm.id); setItemToConfirm(null); }} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl">CONFIRM</button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl">
                <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery</span><span className="text-xs font-black text-indigo-400">{completionPercentage}%</span></div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div></div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4"><div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><Clock className="h-5 w-5" /></div><div><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tasks Left</div><div className="text-xl font-black text-white">{daysRemaining} Units</div></div></div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4"><div className={`p-3 rounded-2xl ${pacing.status === 'ahead' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}><TargetIcon className="h-5 w-5" /></div><div><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pace</div><div className="text-xl font-black text-white">{pacing.message}</div></div></div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center justify-between group cursor-pointer" onClick={onEditTargetDate}><div className="flex items-center gap-4"><div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400"><Sparkles className="h-5 w-5" /></div><div><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objective</div><div className="text-sm font-black text-white">{currentCareer?.targetCompletionDate}</div></div></div><Pencil className="h-4 w-4 text-slate-700 group-hover:text-white" /></div>
        </div>

        <div className="relative group overflow-hidden rounded-[2.5rem] border border-indigo-500/30 bg-indigo-950/20 shadow-2xl">
            {currentTask && (
                <div className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-float"><Compass className="h-10 w-10 md:h-14 md:w-14 text-indigo-400" /></div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3"><span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg uppercase tracking-widest">Priority Protocol</span><span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg uppercase tracking-widest">Day {itemStartDays[currentTask.id]}</span></div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{currentTask.title}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-2xl">{currentTask.description}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4"><button onClick={() => handleTaskClick(currentTask)} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-3"><CheckCircle2 className="h-5 w-5" />Complete Task</button></div>
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4">
            {phases.map((phase, pIndex) => (
                <div key={pIndex} className={`bg-slate-900 border rounded-3xl overflow-hidden ${expandedPhase === pIndex ? 'border-indigo-500/40' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-800/30" onClick={() => togglePhase(pIndex)}>
                         <div className="flex items-center gap-5">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-2xl border-2 text-sm font-black ${phase.items.every(i => i.status === 'completed') ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{pIndex + 1}</div>
                            <h3 className="font-black text-lg text-slate-100">{phase.phaseName}</h3>
                        </div>
                        {expandedPhase === pIndex ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                    </div>
                    {expandedPhase === pIndex && (
                        <div className="border-t border-slate-800 bg-slate-950/40 p-4 space-y-3">
                            {phase.items.filter(filterItem).map((item) => (
                                <div key={item.id} className={`rounded-2xl border p-4 transition-all ${item.status === 'completed' ? 'bg-emerald-950/10 border-emerald-500/20' : isLocked(item) ? 'opacity-40 grayscale border-slate-800' : 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/40'}`}>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleTaskClick(item)} disabled={isLocked(item) || item.status === 'completed'} className="shrink-0">{item.status === 'completed' ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : isLocked(item) ? <Lock className="h-6 w-6 text-slate-700" /> : <Circle className="h-6 w-6 text-slate-500" />}</button>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">Day {itemStartDays[item.id]}</span><h4 className={`font-bold text-sm ${item.status === 'completed' ? 'text-slate-500' : 'text-white'}`}>{item.title}</h4></div>
                                            <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                                        </div>
                                        <button onClick={(e) => toggleLearnMore(e, item)} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-800 text-slate-400 hover:text-white">Learn</button>
                                    </div>
                                    {expandedLearnMoreItems.has(item.id) && (
                                        <div className="mt-4 pt-4 border-t border-slate-800 animate-fade-in space-y-4">
                                            <p className="text-xs text-slate-300 italic">"{item.explanation || "No additional briefing available."}"</p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {item.suggestedResources?.map((res, ri) => (
                                                    <a key={ri} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all text-xs font-bold text-white"><PlayCircle className="h-4 w-4 text-indigo-400" />{res.title}</a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-4 mb-8"><div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Award className="h-6 w-6" /></div><div><h3 className="text-xl font-black text-white leading-none uppercase">Credentials</h3><p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">Industry Certifications</p></div></div>
                <div className="space-y-3">{roadmap.recommendedCertificates.map((cert, idx) => (<a key={idx} href={cert.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 block"><div className="flex justify-between items-start mb-3"><span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">{cert.provider}</span><ExternalLink className="h-4 w-4 text-slate-700" /></div><h4 className="font-bold text-white text-sm">{cert.title}</h4></a>))}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-4 mb-8"><div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><Briefcase className="h-6 w-6" /></div><div><h3 className="text-xl font-black text-white leading-none uppercase">Placements</h3><p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">Role Deployments</p></div></div>
                <div className="space-y-3">{roadmap.recommendedInternships.map((job, idx) => (<a key={idx} href={job.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/50 block"><div className="flex justify-between items-start mb-3"><span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{job.company}</span><ExternalLink className="h-4 w-4 text-slate-700" /></div><h4 className="font-bold text-white text-sm">{job.title}</h4></a>))}</div>
            </div>
        </div>
      </div>
    </div>
  );
};
