import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem, RoadmapData } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, Briefcase, Award, Zap, Clock, ChevronDown, ChevronUp, Lock, Search, Target as TargetIcon, Boxes, GraduationCap, Sparkles, LayoutGrid, Calendar, ChevronRight, Info, PlayCircle, Youtube } from 'lucide-react';

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
  onEditTargetDate,
  pacing, 
  isLoading = false, 
  daysRemaining 
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);

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
    if (currentTask && viewMode === 'timeline') {
        setSelectedTaskId(currentTask.id);
        // Optional: Scroll to current task in the timeline
    }
  }, [currentTask, viewMode]);

  const getActiveCareer = () => user.activeCareers.find(c => c.careerId === user.currentCareerId);
  const currentCareer = getActiveCareer();
  
  const completionPercentage = useMemo(() => {
      const total = flatRoadmapItems.length;
      if (total === 0) return 0;
      const completed = flatRoadmapItems.filter(i => i.status === 'completed').length;
      return Math.round((completed / total) * 100);
  }, [flatRoadmapItems]);

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

  if (isLoading || !roadmap) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full">
           <Zap className="h-12 w-12 text-indigo-400 animate-pulse" />
           <h3 className="text-xl font-bold text-white mb-2 tracking-tighter">SYNCHRONIZING PATHS...</h3>
           <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]"></div>
           </div>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';
  const selectedTask = flatRoadmapItems.find(it => it.id === selectedTaskId) || currentTask;

  return (
    <div className="relative min-h-[80vh] pb-10 w-full overflow-x-hidden">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center">
                <div className="mx-auto w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 animate-bounce">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Milestone Complete?</h3>
                <p className="text-slate-400 text-sm">Commit your progress to the neural cache.</p>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setItemToConfirm(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all">ABORT</button>
                    <button onClick={confirmCompletion} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-900/40">CONFIRM</button>
                </div>
            </div>
        </div>
      )}

      <div className={`space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        
        {/* TOP STATUS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery Level</span>
                    <span className="text-xs font-black text-indigo-400">{completionPercentage}%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div>
                </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <Clock className="h-5 w-5" />
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tasks Left</div>
                    <div className="text-xl font-black text-white">{daysRemaining} Units</div>
                </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${pacing.status === 'ahead' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <TargetIcon className="h-5 w-5" />
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Velocity</div>
                    <div className="text-xl font-black text-white">{pacing.message}</div>
                </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center justify-between group cursor-pointer" onClick={onEditTargetDate}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objective Date</div>
                        <div className="text-xl font-black text-white">{currentCareer?.targetCompletionDate}</div>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
            </div>
        </div>

        {/* VIEW TOGGLE & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full md:w-auto">
                <button 
                    onClick={() => setViewMode('timeline')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'timeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-white'}`}
                >
                    <Clock className="h-4 w-4" /> Visual Timeline
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-white'}`}
                >
                    <LayoutGrid className="h-4 w-4" /> Grid View
                </button>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search sequence..." 
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:border-indigo-500 outline-none text-xs font-medium transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* MAIN VISUAL AREA */}
        <div className="px-4">
            {viewMode === 'timeline' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    {/* TIMELINE COLUMN */}
                    <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[600px] shadow-inner">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Clock className="h-4 w-4 text-indigo-400" /> Professional Sequence
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Done</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Active</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Locked</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" ref={timelineRef}>
                            <div className="space-y-12">
                                {phases.map((phase, pIdx) => {
                                    const visibleItems = phase.items.filter(filterItem);
                                    if (visibleItems.length === 0) return null;
                                    
                                    return (
                                        <div key={pIdx} className="relative">
                                            {/* Phase Connector Line */}
                                            {pIdx < phases.length - 1 && (
                                                <div className="absolute left-6 top-10 bottom-0 w-px bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
                                            )}
                                            
                                            <div className="flex items-center gap-6 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black shadow-lg shadow-indigo-900/20">
                                                    {pIdx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black uppercase tracking-widest text-sm">{phase.phaseName}</h4>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {phase.items.filter(it => it.status === 'completed').length} / {phase.items.length} COMPLETED
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-12">
                                                {visibleItems.map((item) => {
                                                    const done = item.status === 'completed';
                                                    const active = !done && !isLocked(item);
                                                    const locked = isLocked(item);
                                                    const selected = selectedTaskId === item.id;
                                                    
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            onClick={() => {
                                                                if (!locked) setSelectedTaskId(item.id);
                                                            }}
                                                            className={`relative group cursor-pointer transition-all duration-300 ${
                                                                selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                                                            }`}
                                                        >
                                                            <div className={`absolute inset-0 rounded-2xl blur-md opacity-0 group-hover:opacity-20 transition-opacity ${
                                                                done ? 'bg-emerald-500' : active ? 'bg-indigo-500' : 'bg-slate-700'
                                                            }`}></div>
                                                            
                                                            <div className={`relative h-full p-4 rounded-2xl border transition-all ${
                                                                selected ? 'bg-indigo-600/10 border-indigo-500 shadow-xl' :
                                                                done ? 'bg-emerald-950/20 border-emerald-500/30' :
                                                                locked ? 'bg-slate-900/50 border-slate-800 opacity-50 grayscale' :
                                                                'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                                            }`}>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className={`p-1.5 rounded-lg ${
                                                                        done ? 'bg-emerald-500/20 text-emerald-400' : 
                                                                        active ? 'bg-indigo-500/20 text-indigo-400' : 
                                                                        'bg-slate-800 text-slate-500'
                                                                    }`}>
                                                                        {item.type === 'project' ? <Boxes className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DAY {itemStartDays[item.id]}</span>
                                                                </div>
                                                                <h5 className={`font-bold text-xs mb-1 line-clamp-1 ${done ? 'text-emerald-100' : 'text-white'}`}>{item.title}</h5>
                                                                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-3">{item.description}</p>
                                                                
                                                                <div className="flex justify-between items-center mt-auto">
                                                                    <div className="flex -space-x-1">
                                                                        {done ? (
                                                                            <div className="p-1 bg-emerald-500/20 rounded-full border border-emerald-500/50">
                                                                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                                                            </div>
                                                                        ) : locked ? (
                                                                            <Lock className="h-3 w-3 text-slate-700" />
                                                                        ) : (
                                                                            <div className="w-3 h-3 rounded-full border border-indigo-500/50 animate-pulse"></div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[8px] font-black uppercase text-slate-600 tracking-tighter">1 DAY UNIT</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* DETAILS PANEL COLUMN */}
                    <div className="lg:col-span-4 space-y-6">
                        {selectedTask ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in flex flex-col h-full sticky top-4">
                                <div className="h-32 bg-gradient-to-br from-indigo-600/30 to-purple-600/10 relative overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                    <div className="relative w-20 h-20 rounded-3xl bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center shadow-lg animate-float">
                                        {selectedTask.type === 'project' ? <Boxes className="h-10 w-10 text-indigo-400" /> : <GraduationCap className="h-10 w-10 text-indigo-400" />}
                                    </div>
                                </div>
                                
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            selectedTask.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                        }`}>
                                            {selectedTask.status === 'completed' ? 'UNITS COMMITTED' : 'READY FOR DEPLOYMENT'}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">DAY {itemStartDays[selectedTask.id]}</span>
                                    </div>
                                    
                                    <h2 className="text-2xl font-black text-white mb-3 tracking-tight leading-tight">{selectedTask.title}</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-8">{selectedTask.description}</p>
                                    
                                    <div className="space-y-6 flex-1">
                                        <div>
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4" /> Architect's Insight
                                            </h4>
                                            <div className="bg-slate-950/60 p-5 rounded-3xl border border-white/5 shadow-inner">
                                                <p className="text-slate-300 text-xs leading-relaxed font-medium italic">
                                                    "{selectedTask.explanation || "Nova is preparing the deep contextual mapping for this specific domain milestone. Deploy focus immediately."}"
                                                </p>
                                            </div>
                                        </div>

                                        {Array.isArray(selectedTask.suggestedResources) && selectedTask.suggestedResources.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <PlayCircle className="h-4 w-4" /> Resource Stack
                                                </h4>
                                                <div className="space-y-3">
                                                    {selectedTask.suggestedResources.map((res, i) => (
                                                        <a key={i} href={res.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-red-500/30 transition-all group/res">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-red-500/10 rounded-xl group-hover/res:scale-110 transition-transform">
                                                                    <Youtube className="h-4 w-4 text-red-500" />
                                                                </div>
                                                                <span className="text-xs font-bold text-white truncate max-w-[150px]">{res.title}</span>
                                                            </div>
                                                            <ExternalLink className="h-3.5 w-3.5 text-slate-700 group-hover/res:text-slate-400" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-8 mt-auto">
                                        <button 
                                            onClick={() => handleTaskClick(selectedTask)}
                                            disabled={selectedTask.status === 'completed'}
                                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                                selectedTask.status === 'completed' ? 'bg-slate-800 text-slate-500 cursor-default border border-white/5' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                                            }`}
                                        >
                                            {selectedTask.status === 'completed' ? (
                                                <><CheckCircle2 className="h-5 w-5" /> MASTERED</>
                                            ) : (
                                                <><TargetIcon className="h-5 w-5" /> MARK AS COMPLETE</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[2.5rem] p-12 text-center h-full flex flex-col items-center justify-center">
                                <Info className="h-12 w-12 text-slate-700 mb-4" />
                                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Protocol Ready</h3>
                                <p className="text-slate-500 text-xs">Select a unit from the sequence timeline to view deployment details.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* GRID VIEW (LEGACY STYLE ADAPTED) */
                <div className="space-y-4 animate-fade-in">
                    {phases.map((phase, pIndex) => (
                        <div key={pIndex} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                            <div className="p-6 bg-slate-900/40 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-black text-sm">
                                        {pIndex + 1}
                                    </div>
                                    <h3 className="text-white font-black uppercase tracking-widest">{phase.phaseName}</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PHASE MODULE</span>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {phase.items.filter(filterItem).map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                                            item.status === 'completed' ? 'bg-emerald-950/10 border-emerald-500/20 opacity-60' :
                                            isLocked(item) ? 'bg-slate-950 border-slate-800 opacity-40 grayscale pointer-events-none' :
                                            'bg-slate-800/40 border-slate-700 hover:border-indigo-500'
                                        }`}
                                        onClick={() => handleTaskClick(item)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-xl ${item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                {item.type === 'project' ? <Boxes className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DAY {itemStartDays[item.id]}</span>
                                        </div>
                                        <h4 className="text-white font-bold text-sm mb-2">{item.title}</h4>
                                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* BOTTOM RECOMMENDATIONS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Award className="h-32 w-32 text-indigo-400" />
                </div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white leading-none uppercase tracking-tighter">Credentials</h3>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Neural Sync Certifications</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {roadmap.recommendedCertificates.map((cert, idx) => (
                        <a key={idx} href={cert.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900 transition-all group/card block">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{cert.provider}</span>
                                <ExternalLink className="h-4 w-4 text-slate-700 group-hover/card:text-indigo-400 transition-colors" />
                            </div>
                            <h4 className="font-bold text-white text-sm group-hover/card:text-indigo-200 transition-colors mb-2">{cert.title}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed italic">"{cert.relevance}"</p>
                        </a>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Briefcase className="h-32 w-32 text-emerald-400" />
                </div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white leading-none uppercase tracking-tighter">Placement</h3>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Industry Deployments</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {roadmap.recommendedInternships.map((job, idx) => (
                        <a key={idx} href={job.url} target="_blank" rel="noreferrer" className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-900 transition-all group/card block">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{job.company}</span>
                                <ExternalLink className="h-4 w-4 text-slate-700 group-hover/card:text-emerald-400 transition-colors" />
                            </div>
                            <h4 className="font-bold text-white text-sm group-hover/card:text-emerald-200 transition-colors mb-2">{job.title}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">"{job.description}"</p>
                        </a>
                    ))}
                </div>
            </div>
        </div>

        {/* FOOTER INFO */}
        <div className="px-4 text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Neural Roadmapping Engine v2.1.0 • Verified Sequence</p>
        </div>
      </div>
    </div>
  );
};