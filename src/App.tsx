import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard.js';
import { PRDetailView } from './components/PRDetailView.js';
import { RulesEditor } from './components/RulesEditor.js';
import { LeaderboardView } from './components/LeaderboardView.js';
import { SettingsView } from './components/SettingsView.js';
import { LoginView } from './components/LoginView.js';
import { ContributorDashboard } from './components/ContributorDashboard.js';
import { OnboardingWizard } from './components/OnboardingWizard.js';
import { RepositoryManagement } from './components/RepositoryManagement.js';
import { 
  GitPullRequest, 
  ShieldAlert, 
  Trophy, 
  Activity, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  ShieldCheck,
  GitBranch
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'repos' | 'rules' | 'leaderboard' | 'settings'>('dashboard');
  const [selectedPRId, setSelectedPRId] = useState<string | null>(null);
  const [prRefreshTrigger, setPrRefreshTrigger] = useState<number>(0);

  // Check login on mount
  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setSelectedPRId(null);
      setActiveSection('dashboard');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handlePrRefresh = () => {
    setPrRefreshTrigger(prev => prev + 1);
  };

  const renderActiveSection = () => {
    if (selectedPRId) {
      return (
        <PRDetailView 
          prId={selectedPRId} 
          onBack={() => setSelectedPRId(null)} 
          refreshPRList={handlePrRefresh}
          user={user}
        />
      );
    }

    if (!user.isOnboarded) {
      return (
        <OnboardingWizard 
          user={user} 
          onComplete={(updatedUser) => setUser(updatedUser)} 
        />
      );
    }

    if (user.role !== 'admin') {
      return (
        <ContributorDashboard 
          onSelectPR={(id) => setSelectedPRId(id)}
          user={user}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <AdminDashboard 
            onSelectPR={(id) => setSelectedPRId(id)} 
            prListRefreshTrigger={prRefreshTrigger}
            user={user}
          />
        );
      case 'repos':
        return <RepositoryManagement user={user} />;
      case 'rules':
        return <RulesEditor />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'settings':
        return <SettingsView user={user} onUserUpdate={(updated: any) => setUser(updated)} />;
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#020203] flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="bg-[#0a0a0b] text-[#d1d1d1] min-h-screen font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* SaaS Top Header bar */}
      <header className="bg-[#0a0a0b] border-b border-white/10 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setSelectedPRId(null); setActiveSection('dashboard'); }}>
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest uppercase text-white/90 font-serif italic">
              {isAdmin ? 'MergeKeeper' : 'Contributor Console'}
            </h1>
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block mt-1">
              {isAdmin ? 'Autonomous Maintainer SaaS' : 'Autonomous Developer Hub'}
            </span>
          </div>
        </div>

        {/* Maintainer Info Badge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold px-1.5 py-0.5 rounded">Maintainer</span>
              ) : (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-1.5 py-0.5 rounded">Contributor</span>
              )}
              <span className="font-bold text-white/80">{user.githubUsername ? `@${user.githubUsername}` : user.username}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SaaS Engine Live
            </span>
          </div>
          
          <img 
            src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`} 
            alt="User Profile" 
            className="w-9 h-9 rounded-full border border-white/10"
          />

          <button 
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent hover:border-white/10 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Side Navigation Rail - Rendered ONLY for Admins */}
        {isAdmin && (
          <nav className="w-full md:w-64 shrink-0 flex flex-col gap-2 bg-[#050506] border border-white/10 p-4 rounded-xl md:sticky md:top-24 h-fit">
            <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider px-3 mb-2 hidden md:block font-mono">Navigation Rail</span>
            
            <button
              onClick={() => { setSelectedPRId(null); setActiveSection('dashboard'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeSection === 'dashboard' && !selectedPRId
                  ? 'bg-white/5 text-indigo-400 border border-white/10 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Backlog</span>
            </button>

            <button
              onClick={() => { setSelectedPRId(null); setActiveSection('repos'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeSection === 'repos' && !selectedPRId
                  ? 'bg-white/5 text-indigo-400 border border-white/10 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Repositories</span>
            </button>

            <button
              onClick={() => { setSelectedPRId(null); setActiveSection('rules'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeSection === 'rules' && !selectedPRId
                  ? 'bg-white/5 text-indigo-400 border border-white/10 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Override Rules</span>
            </button>

            <button
              onClick={() => { setSelectedPRId(null); setActiveSection('leaderboard'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeSection === 'leaderboard' && !selectedPRId
                  ? 'bg-white/5 text-indigo-400 border border-white/10 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Streaks & Points</span>
            </button>

            <button
              onClick={() => { setSelectedPRId(null); setActiveSection('settings'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeSection === 'settings' && !selectedPRId
                  ? 'bg-white/5 text-indigo-400 border border-white/10 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>SaaS Settings</span>
            </button>

            <div className="hidden md:block border-t border-white/10 my-4 pt-4">
              <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider px-3 block mb-2 font-mono">Systems Status</span>
              <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Webhooks active</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>AI Workers ready</span>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Right Active Dashboard Stage - Full-width if Contributor */}
        <main className="flex-1 min-w-0">
          {renderActiveSection()}
        </main>

      </div>

      {/* SaaS footer */}
      <footer className="border-t border-white/10 bg-[#050506] py-6 text-center text-xs text-white/30 mt-12">
        <p>© 2026 MergeKeeper SaaS Platform. All AI code-review workers active.</p>
      </footer>
    </div>
  );
}
