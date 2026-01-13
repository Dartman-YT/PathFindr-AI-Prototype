import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getUsers, saveUser, setCurrentUser } from '../services/store';
import { Lock, User as UserIcon, Key, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [formData, setFormData] = useState({ id: '', password: '', securityKey: '', username: '' });
  const [error, setError] = useState('');

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters long";
    if (!/\d/.test(pass)) return "Password must contain at least one number";
    return null;
  };

  const handleSignup = () => {
    const users = getUsers();
    if (users[formData.id]) {
      setError('User ID already exists');
      return;
    }
    if (!formData.id || !formData.password || !formData.securityKey) {
      setError('All fields are required');
      return;
    }

    const passError = validatePassword(formData.password);
    if (passError) {
      setError(passError);
      return;
    }

    const newUser: UserProfile & { password?: string } = {
      id: formData.id,
      username: formData.username || formData.id,
      password: formData.password,
      securityKey: formData.securityKey,
      subscriptionStatus: 'free',
      onboardingComplete: false,
      activeCareers: [],
      xp: 0,
      streak: 0
    };
    
    saveUser(newUser);
    setCurrentUser(newUser.id);
    onLogin(newUser);
  };

  const handleLogin = () => {
    const users = getUsers();
    const user = users[formData.id];
    
    if (user && user.password === formData.password) {
      setCurrentUser(user.id);
      onLogin(user);
    } else {
      setError('Invalid credentials');
    }
  };

  const handleReset = () => {
     const users = getUsers();
     const user = users[formData.id];
     if (user && user.securityKey === formData.securityKey) {
         alert(`Verification Successful. Your password is: ${user.password}`);
         setView('login');
         setError('');
     } else {
         setError('Verification failed. Invalid ID or Security Key.');
     }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-950 bg-[linear-gradient(45deg,#0f172a,#1e1b4b,#312e81,#0f172a)] animate-gradient-xy">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500"></div>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 border border-slate-800 relative group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-fuchsia-500/10"></div>
               <Compass className="text-indigo-400 h-8 w-8 group-hover:rotate-45 transition-transform duration-700 ease-out" />
               <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl"></div>
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">
                PathFindr<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">.AI</span>
            </h1>
            <p className="text-slate-400 text-sm">
              {view === 'login' && 'Welcome back, Architect.'}
              {view === 'signup' && 'Design your future today.'}
              {view === 'forgot' && 'Account Recovery Mode'}
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg text-center animate-fade-in flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="relative group">
              <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="User ID / Email" 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
            </div>

            {view === 'signup' && (
              <div className="relative group">
                <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Display Name" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            )}

            {view !== 'forgot' && (
                <div className="relative group">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
                </div>
            )}

            {(view === 'signup' || view === 'forgot') && (
              <div className="relative group">
                <Key className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder={view === 'forgot' ? "Your Secret Security Key" : "Security Key (For Recovery)"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.securityKey}
                  onChange={e => setFormData({...formData, securityKey: e.target.value})}
                />
              </div>
            )}

            <button 
              onClick={view === 'login' ? handleLogin : view === 'signup' ? handleSignup : handleReset}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Verify & Recover'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 text-center space-y-2">
            {view === 'login' && (
              <>
                <p className="text-sm text-slate-400">
                  New here? <button onClick={() => {setError(''); setView('signup');}} className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline">Create an account</button>
                </p>
                <button onClick={() => {setError(''); setView('forgot');}} className="text-xs text-slate-500 hover:text-slate-300">Forgot Password?</button>
              </>
            )}
            {(view === 'signup' || view === 'forgot') && (
              <p className="text-sm text-slate-400">
                Already have an account? <button onClick={() => {setError(''); setView('login');}} className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline">Log in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};