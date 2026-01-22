import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { UserProfile, CareerOption, RoadmapPhase, RoadmapData } from './types';
import { 
    getCurrentUserId, 
    getUsers, 
    getCareerData, 
    getRoadmap, 
    saveUser, 
    saveCareerData, 
    saveRoadmap,
    setCurrentUser,
    deleteUser,
    savePracticeData
} from './services/store';
import { generateRoadmap, generatePracticeDataBatch } from './services/gemini';
import { Sparkles, Search, X, Compass } from 'lucide-react';

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 overflow-hidden">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

    <div className="relative z-10 flex flex-col items-center">
      <div className="mb-8 relative animate-float">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-[2rem] blur-xl opacity-50 animate-pulse"></div>
        <div className="relative w-32 h-32 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem]"></div>
          <Compass className="h-16 w-16 text-transparent stroke-[1.5] animate-[spin_8s_linear_infinite]" 
                   style={{ stroke: 'url(#gradient-splash)', filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' }} />
          <svg width="0" height="0">
            <linearGradient id="gradient-splash" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop stopColor="#818cf8" offset="0%" />
              <stop stopColor="#e879f9" offset="100%" />
            </linearGradient>
          </svg>
        </div>
      </div>
      <h1 className="text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter text-center">
        PathFindr<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">.AI</span>
      </h1>
      <p className="text-slate-400 text-sm md:text-base tracking-widest uppercase font-medium mb-10 opacity-80">
        Navigate Your Future
      </p>
      <div className="w-48 h-1.5 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-800">
          <div className="w-1/2 h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [career, setCareer] = useState<CareerOption | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingCareer, setIsAddingCareer] = useState(false);
  const [addCareerMode, setAddCareerMode] = useState<'analysis' | 'search' | null>(null);

  const loadCareerContext = (userId: string, careerId: string) => {
      const savedCareer = getCareerData(userId, careerId);
      const savedRoadmap = getRoadmap(userId, careerId);
      
      setCareer(savedCareer);
      setRoadmap(savedRoadmap || null);
  };

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);

    const userId = getCurrentUserId();
    if (userId) {
      const users = getUsers();
      const existingUser = users[userId];
      if (existingUser) {
        setUser(existingUser);
        if (existingUser.activeCareers && existingUser.activeCareers.length > 0) {
            const careerIdToLoad = existingUser.currentCareerId || existingUser.activeCareers[0].careerId;
            loadCareerContext(userId, careerIdToLoad);
        }
      }
    }
    setLoading(false);
    return () => clearTimeout(splashTimer);
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    if (loggedInUser.activeCareers && loggedInUser.activeCareers.length > 0) {
        const careerIdToLoad = loggedInUser.currentCareerId || loggedInUser.activeCareers[0].careerId;
        loadCareerContext(loggedInUser.id, careerIdToLoad);
    }
  };

  const handleOnboardingComplete = async (selectedCareer: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => {
    if (!user) return;
    
    const newCareerEntry = { 
        careerId: selectedCareer.id, 
        title: selectedCareer.title, 
        addedAt: Date.now(),
        educationYear: eduYear,
        targetCompletionDate: targetDate,
        experienceLevel: expLevel,
        focusAreas: focusAreas
    };

    const updatedCareers = user.activeCareers ? [...user.activeCareers, newCareerEntry] : [newCareerEntry];
    const updatedUser = { 
        ...user, 
        onboardingComplete: true,
        activeCareers: updatedCareers,
        currentCareerId: selectedCareer.id,
        joinedAt: user.joinedAt || Date.now()
    };
    
    setUser(updatedUser);
    setCareer(selectedCareer);
    setRoadmap(null);
    setIsAddingCareer(false);
    setAddCareerMode(null);
    
    saveUser(updatedUser);
    saveCareerData(user.id, selectedCareer.id, selectedCareer);

    try {
        const [generatedRoadmap, practiceData] = await Promise.all([
            generateRoadmap(selectedCareer.title, eduYear, targetDate, expLevel, focusAreas),
            generatePracticeDataBatch(selectedCareer.title)
        ]);
        
        setRoadmap(generatedRoadmap);
        saveRoadmap(user.id, selectedCareer.id, generatedRoadmap);
        savePracticeData(user.id, selectedCareer.id, practiceData);
    } catch (e) {
        console.error("Context generation failed", e);
        // Fix: Added missing recommendedInternships property to satisfy the RoadmapData interface
        setRoadmap({ phases: [], recommendedCertificates: [], recommendedInternships: [] });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    setCareer(null);
    setRoadmap(null);
  };

  const handleDeleteAccount = () => {
      if (user) {
          deleteUser(user.id);
          handleLogout();
      }
  };

  const handleAddCareerRequest = (mode?: 'analysis' | 'search') => {
      setIsAddingCareer(true);
      if (mode) setAddCareerMode(mode);
      else setAddCareerMode(null);
      setCareer(null); 
  };

  const cancelAddCareer = () => {
      setIsAddingCareer(false);
      setAddCareerMode(null);
      if (user && user.activeCareers.length > 0) {
           const prevId = user.currentCareerId || user.activeCareers[0].careerId;
           loadCareerContext(user.id, prevId);
      }
  };

  if (showSplash) return <SplashScreen />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500">Loading...</div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  if (isAddingCareer && !addCareerMode && user.onboardingComplete) {
      return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full relative shadow-2xl">
                  <button onClick={cancelAddCareer} className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">Choose Your Path</h2>
                  <div className="grid gap-4">
                      <button onClick={() => setAddCareerMode('analysis')} className="flex items-center gap-4 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-900/10 transition-all group text-left">
                          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Sparkles className="h-6 w-6" /></div>
                          <div>
                              <div className="font-bold text-white text-lg">AI Personality Analysis</div>
                              <div className="text-slate-400 text-sm">Let Nova discover the perfect career.</div>
                          </div>
                      </button>
                      <button onClick={() => setAddCareerMode('search')} className="flex items-center gap-4 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-900/10 transition-all group text-left">
                          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Search className="h-6 w-6" /></div>
                          <div>
                              <div className="font-bold text-white text-lg">Manual Search</div>
                              <div className="text-slate-400 text-sm">Select a specific career path.</div>
                          </div>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const showOnboarding = !user.onboardingComplete || (isAddingCareer && addCareerMode);
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={!user.onboardingComplete} mode={addCareerMode || 'analysis'} />;
  
  if (!career && user.activeCareers.length > 0) {
      loadCareerContext(user.id, user.activeCareers[0].careerId);
      return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500">Loading Career...</div>;
  }

  if (!career) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={false} />;

  const handleUpdateRoadmap = (updatedPhases: RoadmapPhase[]) => {
      if (roadmap) {
          const newData = { ...roadmap, phases: updatedPhases };
          setRoadmap(newData);
          saveRoadmap(user.id, career.id, newData);
      }
  };

  return (
    <Dashboard 
        user={user}
        career={career}
        roadmap={roadmap}
        onLogout={handleLogout}
        setRoadmap={setRoadmap}
        setUser={setUser}
        setCareer={setCareer}
        onAddCareer={handleAddCareerRequest}
        onDeleteAccount={handleDeleteAccount}
    />
  );
};

export default App;