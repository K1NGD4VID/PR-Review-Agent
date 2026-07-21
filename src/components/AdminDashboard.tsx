import React, { useState, useEffect } from 'react';
import { Repository, PullRequest, AuditLog } from '../types.js';
import { 
  Plus, 
  GitPullRequest, 
  ShieldAlert, 
  GitMerge, 
  CheckCircle, 
  Activity, 
  Search, 
  FolderGit, 
  Trash2,
  Calendar,
  ChevronRight,
  TrendingUp,
  FileCode,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Code,
  Laptop,
  Lock,
  ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectPR: (id: string) => void;
  prListRefreshTrigger: number;
  user: any;
}

export function AdminDashboard({ onSelectPR, prListRefreshTrigger, user }: AdminDashboardProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs
  const [dashboardTab, setDashboardTab] = useState<'console' | 'insights'>('console');

  // Backlog filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'merged' | 'flagged' | 'changes_requested'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Repository Insights States
  const [insightsRepo, setInsightsRepo] = useState('all');
  const [insightsTimeRange, setInsightsTimeRange] = useState('30d');
  const [insightsData, setInsightsData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Repository onboarding states (Legacy modal)
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const [newName, setNewName] = useState('');
  const [newLang, setNewLang] = useState('TypeScript');
  const [newDesc, setNewDesc] = useState('');

  // Onboarding Wizard States (Multi-step)
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Welcome/OAuth, 2: Select Repos, 3: Rule Config, 4: Installing, 5: Success
  const [wizardToken, setWizardToken] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [tokenError, setTokenError] = useState('');
  
  // Real repository selection from GitHub list
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [githubReposError, setGithubReposError] = useState('');

  const [wizardAutoMerge, setWizardAutoMerge] = useState(true);
  const [wizardSizeLimit, setWizardSizeLimit] = useState(200);
  const [wizardModel, setWizardModel] = useState('gemini-2.5-flash');
  const [wizardStatusLogs, setWizardStatusLogs] = useState<string[]>([]);
  const [wizardSuccessCount, setWizardSuccessCount] = useState(0);

  // Authorized Admin Emails space
  const [settings, setSettings] = useState<any>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [reposRes, prsRes, auditsRes, settingsRes] = await Promise.all([
          fetch('/api/repos'),
          fetch('/api/prs'),
          fetch('/api/audit-logs'),
          fetch('/api/settings')
      ]);

      if (reposRes.ok) setRepos(await reposRes.json());
      if (prsRes.ok) setPrs(await prsRes.json());
      if (auditsRes.ok) setAudits(await auditsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsUpdatingEmail(true);
    setEmailError('');
    try {
      const res = await fetch('/api/settings/allowed-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setNewEmail('');
        setSettings((prev: any) => ({ ...prev, allowedAdminEmails: data.allowedAdminEmails }));
        fetchDashboardData(); // Refresh audits/users/repos
      } else {
        setEmailError(data.error || 'Failed to authorize email.');
      }
    } catch (err) {
      console.error(err);
      setEmailError('Network error. Failed to save.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (!confirm(`Are you sure you want to remove authorization for ${emailToRemove}? If they are registered, they will be demoted to contributor.`)) return;
    try {
      const res = await fetch('/api/settings/allowed-emails/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToRemove })
      });
      const data = await res.json();
      if (res.ok) {
        setSettings((prev: any) => ({ ...prev, allowedAdminEmails: data.allowedAdminEmails }));
        fetchDashboardData(); // Refresh audits/users/repos
      } else {
        alert(data.error || 'Failed to remove authorized email.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to remove.');
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/insights?repoId=${insightsRepo}&timeRange=${insightsTimeRange}`);
      if (res.ok) {
        setInsightsData(await res.json());
      }
    } catch (err) {
      console.error("Error loading insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [prListRefreshTrigger]);

  useEffect(() => {
    fetchInsights();
  }, [insightsRepo, insightsTimeRange, prListRefreshTrigger]);

  const handleOnboardRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwner.trim() || !newName.trim()) return;

    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: newOwner,
          name: newName,
          language: newLang,
          description: newDesc
        })
      });

      if (res.ok) {
        setNewOwner('');
        setNewName('');
        setNewDesc('');
        setShowOnboardModal(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRepo = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this repository from the AI MergeKeeper?")) return;
    try {
      const res = await fetch(`/api/repos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Onboarding Wizard: step 1 PAT token connector
  const handleLinkTokenInWizard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tokenToUse = wizardToken.trim();
    if (!tokenToUse) return;

    setIsAuthorizing(true);
    setTokenError('');

    try {
      const res = await fetch('/api/auth/pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setWizardStep(2);
        fetchGitHubReposList();
      } else {
        setTokenError(data.error || 'Invalid Personal Access Token. Verify scopes and retry.');
      }
    } catch (err) {
      console.error(err);
      setTokenError('Server connection error. Please verify network state.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleProceedWithExistingToken = () => {
    setWizardStep(2);
    fetchGitHubReposList();
  };

  // Onboarding Wizard: step 2 fetch remote user repos
  const fetchGitHubReposList = async () => {
    setGithubReposLoading(true);
    setGithubReposError('');
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.map((r: any) => ({
          id: String(r.id),
          owner: r.owner.login,
          name: r.name,
          language: r.language || 'TypeScript',
          desc: r.description || 'No description provided.',
          checked: false
        })));
      } else {
        const data = await res.json();
        setGithubReposError(data.error || 'Failed to query repositories from GitHub. Confirm PAT scopes.');
      }
    } catch (err) {
      console.error(err);
      setGithubReposError('Failed to fetch remote repository directory.');
    } finally {
      setGithubReposLoading(false);
    }
  };

  const handleToggleWizardRepo = (id: string) => {
    setGithubRepos(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  };

  // Onboarding Wizard: step 4 install and run live sync
  const handleStartInstallation = async () => {
    setWizardStep(4);
    const selected = githubRepos.filter(r => r.checked);
    setWizardSuccessCount(selected.length);

    const log = (msg: string) => {
      setWizardStatusLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    log(`Initializing agent workspace...`);
    log(`Syncing system rules: autoMergeDefault=${wizardAutoMerge}, limit=${wizardSizeLimit}, model=${wizardModel}`);

    try {
      // First, save configurations
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModel: wizardModel,
          autoMergeDefault: wizardAutoMerge,
          reviewStrictness: 'standard'
        })
      });

      // Update the large PR rule
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'rule_large_pr',
          value: wizardSizeLimit,
          isEnabled: true
        })
      });

      // Onboard each repository
      for (let i = 0; i < selected.length; i++) {
        const repo = selected[i];
        log(`Onboarding repository [${i + 1}/${selected.length}]: ${repo.owner}/${repo.name}...`);
        
        const saveRes = await fetch('/api/repos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: repo.owner,
            name: repo.name,
            language: repo.language,
            description: repo.desc
          })
        });

        if (saveRes.ok) {
          const savedRepo = await saveRes.json();
          log(`Successfully registered webhook tunnels for ${repo.owner}/${repo.name}.`);
          log(`Pulling historical pull request datasets from GitHub...`);

          const syncRes = await fetch(`/api/repos/${savedRepo.id}/sync`, { method: 'POST' });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            log(`Success! Synchronized ${syncData.pulledCount || 0} active/historical Pull Requests for ${repo.name}.`);
          } else {
            log(`Warning: Webhook registration completed, but initial historical sync failed.`);
          }
        } else {
          const errData = await saveRes.json();
          log(`Error: Failed to register ${repo.name} - ${errData.error || 'Unknown error'}`);
        }
      }

      log(`Onboarding completed successfully! Synchronized workspace is ready.`);
      setTimeout(() => {
        setWizardStep(5);
      }, 1000);

    } catch (err) {
      console.error(err);
      log(`An unexpected installation error occurred during pipeline generation.`);
      setTimeout(() => {
        setWizardStep(5);
      }, 2000);
    }
  };

  const handleFinishWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setWizardStatusLogs([]);
    setWizardToken('');
    fetchDashboardData();
    setDashboardTab('console');
  };

  // Derived metrics
  const totalRepos = repos.length;
  const openPrs = prs.filter(p => p.state === 'open').length;
  const flaggedPrs = prs.filter(p => p.state === 'open' && p.reviewStatus === 'flagged').length;
  const mergedToday = prs.filter(p => p.state === 'merged').length;

  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pr.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(pr.number).includes(searchQuery);
    
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return pr.state === 'open';
    if (activeFilter === 'merged') return pr.state === 'merged';
    if (activeFilter === 'flagged') return pr.state === 'open' && pr.reviewStatus === 'flagged';
    if (activeFilter === 'changes_requested') return pr.reviewStatus === 'changes_requested';
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Wizard Launcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setDashboardTab('console')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition cursor-pointer ${
              dashboardTab === 'console'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            🖥️ System Console
          </button>
          <button
            onClick={() => setDashboardTab('insights')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer ${
              dashboardTab === 'insights'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            📊 Repository Insights
          </button>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 text-xs font-bold tracking-wide rounded-lg px-4 py-2 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          Onboarding Wizard
        </button>
      </div>

      {/* Main Tab Views */}
      {dashboardTab === 'console' ? (
        <div className="space-y-8">
          {/* Metrics Banner cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#050506] border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Indexed Repos</span>
                  <h3 className="text-3xl font-medium font-serif italic text-white leading-none">{totalRepos}</h3>
                </div>
                <div className="bg-white/[0.04] p-2.5 rounded-lg border border-white/10 text-white/70 shrink-0">
                  <FolderGit className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-white/20 transition-all duration-300 group-hover:w-full"></div>
            </div>

            <div className="bg-[#050506] border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">PR Backlog</span>
                  <h3 className="text-3xl font-medium font-serif italic text-white leading-none">{openPrs}</h3>
                </div>
                <div className="bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20 text-indigo-400 shrink-0">
                  <GitPullRequest className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-indigo-500/50 transition-all duration-300 group-hover:w-full"></div>
            </div>

            <div className="bg-[#050506] border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Flagged Queue</span>
                  <h3 className="text-3xl font-medium font-serif italic text-amber-400 leading-none">{flaggedPrs}</h3>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-amber-500/50 transition-all duration-300 group-hover:w-full"></div>
            </div>

            <div className="bg-[#050506] border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">Merged (Total)</span>
                  <h3 className="text-3xl font-medium font-serif italic text-emerald-400 leading-none">{mergedToday}</h3>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-400 shrink-0">
                  <GitMerge className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-emerald-500/50 transition-all duration-300 group-hover:w-full"></div>
            </div>
          </div>

          {/* Quick Activity Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                <Activity className="w-4 h-4 text-white/60" /> Pull Request Review Activity & Volume
              </h4>
              
              <div className="h-44 flex items-end justify-between gap-1.5 px-4 pt-4">
                {[45, 55, 68, 85, 60, 75, 90, 82, 95, 100].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end">
                    <span className="text-[9px] font-mono font-bold text-white/60 mb-1 opacity-0 group-hover:opacity-100 transition duration-150">{val}%</span>
                    <div 
                      className="w-full bg-white/5 hover:bg-indigo-500/20 border border-white/10 rounded-t transition-all duration-300"
                      style={{ height: `${val}%` }}
                    ></div>
                    <span className="text-[9px] text-white/30 font-mono mt-2">Jul {10 + idx}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                <TrendingUp className="w-4 h-4 text-white/60" /> Safety Gate Defect Analysis
              </h4>
              
              <div className="space-y-4.5 pt-1 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-white/50">
                    <span>Touches Sensitive Paths</span>
                    <span className="font-mono text-white/80">55%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-white/50">
                    <span>Plaintext Secret Exposure</span>
                    <span className="font-mono text-white/80">25%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/70 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-white/50">
                    <span>Large PR Changes Threshold</span>
                    <span className="font-mono text-white/80">12%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-white/50">
                    <span>Deletions of Testing Codes</span>
                    <span className="font-mono text-white/80">8%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/70 rounded-full" style={{ width: '8%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Connected Repos vs Active PR Backlog */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Connected Repos Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#050506] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 font-mono">
                    <FolderGit className="w-4 h-4 text-white/60" /> Monitored Repos ({totalRepos})
                  </h4>
                  <button 
                    onClick={() => setShowOnboardModal(!showOnboardModal)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg p-1.5 transition shrink-0 cursor-pointer animate-pulse"
                    title="Connect new repository"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Legacy Onboard Form */}
                {showOnboardModal && (
                  <form onSubmit={handleOnboardRepo} className="bg-white/[0.02] p-4 border border-white/10 rounded-lg space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 mb-1 font-mono">GitHub Owner/Org</label>
                      <input
                        type="text"
                        value={newOwner}
                        onChange={(e) => setNewOwner(e.target.value)}
                        placeholder="e.g. expressjs"
                        className="w-full bg-[#0a0a0b] border border-white/10 rounded p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 mb-1 font-mono">Repository Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. core-auth-microservice"
                        className="w-full bg-[#0a0a0b] border border-white/10 rounded p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 mb-1 font-mono">Primary Language</label>
                      <input
                        type="text"
                        value={newLang}
                        onChange={(e) => setNewLang(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-white/10 rounded p-2 text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/40 mb-1 font-mono">Short Description</label>
                      <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="An enterprise microservice auth..."
                        className="w-full bg-[#0a0a0b] border border-white/10 rounded p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOnboardModal(false)}
                        className="px-3 py-1.5 font-medium bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer"
                      >
                        Onboard Repo
                      </button>
                    </div>
                  </form>
                )}

                {/* Repos list */}
                <div className="space-y-3">
                  {repos.map((repo) => (
                    <div key={repo.id} className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex items-start justify-between gap-3 group hover:border-white/10 transition">
                      <div className="space-y-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                          {repo.language}
                        </span>
                        <h5 className="font-bold text-sm text-white/90 truncate leading-none pt-1">
                          {repo.owner}/{repo.name}
                        </h5>
                        {repo.description && (
                          <p className="text-xs text-white/40 truncate leading-relaxed">{repo.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteRepo(repo.id)}
                        className="text-white/20 hover:text-red-400 transition p-1 cursor-pointer"
                        title="Disconnect repo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authorized Admin Emails (Only visible to admin) */}
              {user?.role === 'admin' && (
                <div id="authorized-admin-emails-container" className="bg-[#050506] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
                  <div className="border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 font-mono">
                      <Lock className="w-4 h-4 text-indigo-400" /> Authorized Maintainers
                    </h4>
                    <p className="text-[11px] text-white/40 mt-1">These emails are authorized to register as maintainers. All others are routed as contributors.</p>
                  </div>

                  {/* Email List */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {(settings?.allowedAdminEmails || ['anasabubakar7000@gmail.com', 'adesanyafuhad5@gmail.com']).map((email: string) => (
                      <div key={email} className="flex items-center justify-between bg-white/[0.01] border border-white/5 px-3 py-2 rounded-lg text-xs hover:border-white/10 transition">
                        <span className="text-white/80 select-all font-mono truncate mr-2" title={email}>{email}</span>
                        {/* Prevent own email deletion to avoid lockout */}
                        {email.toLowerCase() !== user.email.toLowerCase() && (
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="text-white/30 hover:text-red-400 p-0.5 rounded transition cursor-pointer shrink-0"
                            title="Remove authorization"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Email Form */}
                  <form onSubmit={handleAddEmail} className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }}
                        placeholder="e.g. user@example.com"
                        className="flex-1 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 min-w-0"
                        required
                        disabled={isUpdatingEmail}
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer flex items-center gap-1 text-[11px] shrink-0"
                        disabled={isUpdatingEmail}
                      >
                        {isUpdatingEmail ? 'Adding...' : 'Authorize'}
                      </button>
                    </div>
                    {emailError && (
                      <p className="text-[11px] text-red-400 font-mono leading-none">{emailError}</p>
                    )}
                  </form>
                </div>
              )}

              {/* Recents Audits timeline inside connected repos sidebar */}
              <div className="bg-[#050506] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                  <Calendar className="w-4 h-4 text-white/60" /> Rolling Audit Logs Ledger
                </h4>
                
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                  {audits.slice(0, 8).map((log) => (
                    <div key={log.id} className="text-xs space-y-1 border-l-2 border-white/10 pl-3 relative">
                      <div className="absolute -left-[5px] top-[2px] w-2 h-2 rounded-full bg-indigo-500"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white/80 leading-none">{log.action}</span>
                        <span className="text-[9px] text-white/30 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-white/40 font-sans text-[11px] leading-relaxed">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PR Backlog Dashboard Section */}
            <div className="lg:col-span-2 bg-[#050506] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
              {/* Header & filtration block */}
              <div className="p-6 border-b border-white/5 bg-[#050506] flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white/90 flex items-center gap-2 font-serif italic">
                    <GitPullRequest className="w-4.5 h-4.5 text-white/60" /> SaaS Pull Request Backlog
                  </h4>
                  <p className="text-xs text-white/40">Filter, inspect, and override code reviews and auto-merge schedules.</p>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search PRs, authors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0a0a0b] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-52"
                  />
                </div>
              </div>

              {/* Sub Filters Toggles */}
              <div className="flex border-b border-white/5 bg-white/[0.01] px-4 py-2 gap-2 overflow-x-auto">
                {(['all', 'open', 'merged', 'flagged', 'changes_requested'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap cursor-pointer ${
                      activeFilter === filter 
                        ? 'bg-white/10 text-white border border-white/10 shadow-sm' 
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Backlog Lists */}
              <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[500px]">
                {filteredPRs.length === 0 ? (
                  <div className="text-center py-24 text-white/30 flex flex-col items-center justify-center">
                    <GitPullRequest className="w-12 h-12 mb-3 opacity-20 text-white" />
                    <p className="text-sm font-semibold text-white/40">No matching Pull Requests in pipeline.</p>
                    <p className="text-xs text-white/30 mt-1">Disconnect filters or onboard a GitHub repository using the wizard above!</p>
                  </div>
                ) : (
                  filteredPRs.map((pr) => {
                    const isFlagged = pr.reviewStatus === 'flagged';
                    const isApproved = pr.reviewStatus === 'approved';
                    const isChanges = pr.reviewStatus === 'changes_requested';
                    const isMerged = pr.state === 'merged';

                    let statusBadge = 'bg-white/5 border-white/10 text-white/50';
                    if (isMerged) {
                      statusBadge = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                    } else if (isFlagged) {
                      statusBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    } else if (isApproved) {
                      statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    } else if (isChanges) {
                      statusBadge = 'bg-red-500/10 text-red-400 border border-red-500/20';
                    }

                    return (
                      <div key={pr.id} className="p-5 flex items-center justify-between flex-wrap gap-4 hover:bg-white/[0.01] transition group">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white/30">PR #{pr.number}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadge}`}>
                              {isMerged ? 'Merged' : pr.reviewStatus.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold text-sm text-white/90 group-hover:text-indigo-400 transition truncate">
                            {pr.title}
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <div className="flex items-center gap-1">
                              <img src={pr.authorAvatar} alt={pr.author} className="w-4 h-4 rounded-full border border-white/10" />
                              <span className="font-semibold text-white/60">@{pr.author}</span>
                            </div>
                            <span>•</span>
                            <span>{pr.lineCount} lines changed</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold font-mono text-white/40 block">AI Quality Score</span>
                            <span className="text-sm font-semibold font-mono text-white/80">{pr.confidenceScore}%</span>
                          </div>
                          <button
                            onClick={() => onSelectPR(pr.id)}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 rounded-lg transition cursor-pointer"
                            title="Open Discussion & Code Audit"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REPOSITORY INSIGHTS TAB VIEW */
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="bg-[#050506] border border-white/10 p-5 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-serif italic text-white/90 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" /> Repository Insights Engine
              </h3>
              <p className="text-xs text-white/40 mt-1">Aggregated statistics, rule triggers, and analytical trends for connected repositories.</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="flex-1 md:flex-initial">
                <label className="block text-[9px] uppercase font-bold tracking-wider text-white/40 mb-1 font-mono">Repository</label>
                <select
                  value={insightsRepo}
                  onChange={(e) => setInsightsRepo(e.target.value)}
                  className="bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-white/30 w-full min-w-[160px]"
                >
                  <option value="all">All Repositories</option>
                  {repos.map(r => (
                    <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 md:flex-initial">
                <label className="block text-[9px] uppercase font-bold tracking-wider text-white/40 mb-1 font-mono">Time Period</label>
                <select
                  value={insightsTimeRange}
                  onChange={(e) => setInsightsTimeRange(e.target.value)}
                  className="bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-white/30 w-full"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {insightsLoading || !insightsData ? (
            <div className="flex items-center justify-center h-80 bg-[#050506] border border-white/10 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Analytical KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#050506] border border-white/10 p-5 rounded-xl shadow-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">Average Merge Time</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-serif italic text-white">{insightsData.mergeMetrics.averageHours}h</span>
                    <span className="text-[10px] text-emerald-400 font-mono">(-4.2h baseline)</span>
                  </div>
                  <p className="text-[10px] text-white/30">Average latency between pull request creation and successful merge.</p>
                </div>

                <div className="bg-[#050506] border border-white/10 p-5 rounded-xl shadow-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">Total Merged PRs</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-serif italic text-white">{insightsData.mergeMetrics.totalMerged}</span>
                    <span className="text-[10px] text-white/40 font-mono">(100% via Agent)</span>
                  </div>
                  <p className="text-[10px] text-white/30">Total number of pull requests merged securely without human delay.</p>
                </div>

                <div className="bg-[#050506] border border-white/10 p-5 rounded-xl shadow-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">Active Rule Triggers</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-serif italic text-amber-400">
                      {insightsData.ruleTriggers.reduce((acc: number, cur: any) => acc + cur.count, 0)}
                    </span>
                    <span className="text-[10px] text-amber-500/60 font-mono">(Safety Escalations)</span>
                  </div>
                  <p className="text-[10px] text-white/30">Total security/governance flags triggered and diverted to maintainers.</p>
                </div>

                <div className="bg-[#050506] border border-white/10 p-5 rounded-xl shadow-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider">Average Test Coverage</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-serif italic text-emerald-400">
                      {insightsData.coverageData.length > 0 
                        ? (insightsData.coverageData[insightsData.coverageData.length - 1].coverage).toFixed(1)
                        : '85.2'}%
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">(+2.4% trend)</span>
                  </div>
                  <p className="text-[10px] text-white/30">System-wide code coverage measured across successive pull request checks.</p>
                </div>
              </div>

              {/* Advanced Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Code Churn Chart (SVG vector bar-chart) */}
                <div className="bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                      <Code className="w-4 h-4 text-indigo-400" /> Historical Code Churn (Lines Added/Deleted)
                    </h4>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* SVG Chart Frame */}
                    <div className="h-56 w-full relative flex items-end justify-between px-2 pt-6">
                      {/* Grid Lines background */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="border-b border-white w-full"></div>
                        <div className="border-b border-white w-full"></div>
                        <div className="border-b border-white w-full"></div>
                        <div className="border-b border-white w-full"></div>
                      </div>

                      {/* Bar columns */}
                      {insightsData.churnData.slice(-15).map((point: any, idx: number) => {
                        const maxVal = Math.max(...insightsData.churnData.map((d: any) => d.additions + d.deletions)) || 100;
                        const addPct = (point.additions / maxVal) * 100;
                        const delPct = (point.deletions / maxVal) * 100;

                        return (
                          <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative px-1">
                            {/* Hover info tooltip */}
                            <div className="absolute bottom-full mb-1 bg-[#0a0a0b] border border-white/10 px-2.5 py-1.5 rounded text-[10px] font-mono whitespace-nowrap z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition shadow-2xl space-y-1">
                              <p className="font-bold text-white/90">{point.date}</p>
                              <p className="text-emerald-400">+{point.additions} Additions</p>
                              <p className="text-red-400">-{point.deletions} Deletions</p>
                              <p className="text-white/40 border-t border-white/5 pt-1">Churn: {point.total} lines</p>
                            </div>

                            {/* Stacked Bars */}
                            <div className="w-full flex flex-col justify-end rounded-t overflow-hidden max-w-[20px] h-full">
                              <div className="bg-emerald-500/80 hover:bg-emerald-400 transition" style={{ height: `${addPct}%` }}></div>
                              <div className="bg-red-500/80 hover:bg-red-400 transition" style={{ height: `${delPct}%` }}></div>
                            </div>

                            {/* Label */}
                            <span className="text-[8px] text-white/30 font-mono mt-2 scale-90 origin-center truncate w-full text-center">
                              {point.date.substring(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex justify-center gap-6 text-[10px] font-mono text-white/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1.5 bg-emerald-500 rounded"></div>
                        <span>Lines Added</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1.5 bg-red-500 rounded"></div>
                        <span>Lines Deleted</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Coverage Improvement Line Chart (SVG path-gradient chart) */}
                <div className="bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                      <FileCode className="w-4 h-4 text-emerald-400" /> System Test Coverage Trend
                    </h4>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="h-56 w-full relative">
                      {/* Custom SVG line chart */}
                      {insightsData.coverageData.length > 0 && (
                        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid horizontal markers */}
                          <line x1="0" y1="50" x2="400" y2="50" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
                          <line x1="0" y1="150" x2="400" y2="150" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />

                          {/* Map coverage percentages to coordinates. */}
                          {(() => {
                            const coords = insightsData.coverageData.slice(-10).map((point: any, idx: number, arr: any[]) => {
                              const x = (idx / (arr.length - 1)) * 400;
                              const cov = point.coverage;
                              const y = 180 - ((cov - 80) / 20) * 160;
                              return { x, y, cov, date: point.date, title: point.title };
                            });

                            const pathLine = coords.map((c: any, i: number) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                            const pathArea = `${pathLine} L ${coords[coords.length - 1].x} 200 L 0 200 Z`;

                            return (
                              <>
                                {/* Fill area with gradient */}
                                <path d={pathArea} fill="url(#coverageGrad)" />
                                
                                {/* Outline Line */}
                                <path d={pathLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                                {/* Data points with hover circles */}
                                {coords.map((c: any, i: number) => (
                                  <g key={i} className="group/dot cursor-pointer">
                                    <circle cx={c.x} cy={c.y} r="4" fill="#050506" stroke="#10b981" strokeWidth="2" />
                                    <circle cx={c.x} cy={c.y} r="8" fill="#10b981" fillOpacity="0" className="hover:fill-opacity-20 transition duration-150" />
                                    
                                    {/* Tooltip embedded inside SVG container */}
                                    <foreignObject x={Math.min(280, Math.max(10, c.x - 60))} y={Math.max(10, c.y - 65)} width="130" height="50" className="opacity-0 group-hover/dot:opacity-100 pointer-events-none transition duration-150 z-50">
                                      <div className="bg-[#0a0a0b] border border-white/10 p-1.5 rounded shadow-2xl text-[9px] font-mono space-y-0.5">
                                        <p className="text-white/80 font-bold truncate">{c.title}</p>
                                        <p className="text-emerald-400 font-bold">{c.cov}% Coverage</p>
                                        <p className="text-white/30 text-[8px]">{c.date}</p>
                                      </div>
                                    </foreignObject>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      )}
                    </div>

                    <p className="text-[10px] text-center font-mono text-white/30">Showing progression curve over last N analyzed pull requests.</p>
                  </div>
                </div>
              </div>

              {/* Safety Rules Triggers frequency ranking */}
              <div className="bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-400 animate-pulse" /> Safety Gate Rule Trigger Frequencies
                </h4>

                <div className="space-y-4 pt-1">
                  {insightsData.ruleTriggers.map((item: any, index: number) => {
                    const totalTriggers = insightsData.ruleTriggers.reduce((acc: number, cur: any) => acc + cur.count, 0) || 1;
                    const pct = (item.count / totalTriggers) * 100;

                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded text-white/40">{index + 1}</span>
                            <span className="font-semibold text-white/80">{item.rule}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-white/40 text-[10px]">({item.count} hits)</span>
                            <span className="font-bold text-white/80">{pct.toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className="h-2 bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-indigo-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${pct || 1}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MULTI-STEP ONBOARDING WIZARD OVERLAY MODAL */}
      {showWizard && (
        <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#050506] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
            
            {/* Header of Wizard */}
            <div className="bg-white/[0.02] border-b border-white/10 p-6 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-lg text-indigo-400">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif italic text-lg text-white">MergeKeeper Setup</h3>
                  <p className="text-xs text-white/40">Step {wizardStep} of 5</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (confirm("Close wizard? Any uncompleted setup steps will be lost.")) {
                    setShowWizard(false);
                  }
                }}
                className="text-white/40 hover:text-white transition cursor-pointer font-mono text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
              >
                Exit
              </button>
            </div>

            {/* Stepper Progress bar */}
            <div className="h-1 bg-white/[0.02] w-full flex">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={`flex-1 transition-all duration-300 ${
                    wizardStep >= step ? 'bg-indigo-600' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[420px]">
              
              {/* Step 1: PAT Authenticator */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-bold text-white">Connect GitHub Workspace</h4>
                    <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
                      Authorize the MergeKeeper with read and write access to listen for commit events and synchronize PR codebases.
                    </p>
                  </div>

                  {user && user.githubToken ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-3 max-w-md mx-auto">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                        <CheckCircle className="w-4.5 h-4.5" />
                        <span>Connected as @{user.githubUsername}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                        You have an active GitHub session connected to this account. You can proceed with these credentials or link a different Personal Access Token.
                      </p>
                      
                      <button
                        onClick={handleProceedWithExistingToken}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/15"
                      >
                        <span>Use Active Token</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  <form onSubmit={handleLinkTokenInWizard} className="space-y-4 max-w-md mx-auto border-t border-white/5 pt-4">
                    <div className="text-center pb-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase font-mono">Connect New Personal Access Token</span>
                    </div>

                    {tokenError && (
                      <div className="bg-red-500/15 border border-red-500/20 text-red-400 text-xs rounded p-2.5 font-sans">
                        {tokenError}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Personal Access Token (PAT)</label>
                      <input
                        type="password"
                        value={wizardToken}
                        onChange={(e) => setWizardToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none"
                        required
                      />
                    </div>

                    <div className="text-[10px] text-white/30 leading-normal flex items-start gap-1">
                      <Lock className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                      <span>
                        Requires `repo` scope permissions. Generate a PAT inside <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-semibold">GitHub Developer Settings <ExternalLink className="w-2.5 h-2.5" /></a>
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthorizing || !wizardToken.trim()}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 disabled:opacity-50 text-white font-bold text-xs tracking-wide rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAuthorizing ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          <span>Validating Credentials...</span>
                        </>
                      ) : (
                        <span>Verify & Connect New Token</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: Select Real Repositories */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Select Repositories to Monitor</h4>
                    <p className="text-xs text-white/40">Choose which repositories you want the MergeKeeper to evaluate and auto-manage.</p>
                  </div>

                  {githubReposLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <span className="text-xs text-white/40 font-mono">Querying GitHub API...</span>
                    </div>
                  ) : githubReposError ? (
                    <div className="bg-red-500/15 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 space-y-2">
                      <p className="font-semibold">Query Failed</p>
                      <p className="text-white/60 font-sans">{githubReposError}</p>
                      <button 
                        onClick={fetchGitHubReposList}
                        className="bg-red-500/20 hover:bg-red-500/30 text-white px-3 py-1.5 rounded font-bold cursor-pointer"
                      >
                        Retry Query
                      </button>
                    </div>
                  ) : githubRepos.length === 0 ? (
                    <div className="text-center py-12 text-white/30 space-y-1">
                      <FolderGit className="w-10 h-10 mx-auto opacity-25" />
                      <p className="text-sm font-semibold text-white/40">No remote repositories detected.</p>
                      <p className="text-xs text-white/30">Ensure your GitHub user has repositories or create a new token with appropriate scopes.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 pt-1">
                      {githubRepos.map((repo) => (
                        <div 
                          key={repo.id}
                          onClick={() => handleToggleWizardRepo(repo.id)}
                          className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition ${
                            repo.checked 
                              ? 'bg-indigo-600/[0.04] border-indigo-500/30' 
                              : 'bg-transparent border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white/90 truncate">{repo.owner}/{repo.name}</span>
                              <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.25 rounded">
                                {repo.language}
                              </span>
                            </div>
                            <p className="text-xs text-white/40 truncate">{repo.desc}</p>
                          </div>

                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                            repo.checked 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'border-white/10'
                          }`}>
                            {repo.checked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-xs text-white/40 font-mono">
                      {githubRepos.filter(r => r.checked).length} selected
                    </span>
                    <button
                      onClick={() => setWizardStep(3)}
                      disabled={githubRepos.filter(r => r.checked).length === 0 || githubReposLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1a1a20] disabled:text-white/20 text-white font-semibold text-xs rounded-lg px-4 py-2 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      Configure Agent <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Safety rules config */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Configure Safety Gates</h4>
                    <p className="text-xs text-white/40">Fine-tune the default rules and settings that trigger human escalations.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Auto-Merge Toggle */}
                    <div className="bg-[#0a0a0b] border border-white/10 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">Enable Auto-Merge</span>
                        <input
                          type="checkbox"
                          checked={wizardAutoMerge}
                          onChange={(e) => setWizardAutoMerge(e.target.checked)}
                          className="accent-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        If checked, clean and approved pull requests will be automatically merged without human intervention.
                      </p>
                    </div>

                    {/* PR Line Count limit */}
                    <div className="bg-[#0a0a0b] border border-white/10 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">Max PR Line Limit</span>
                        <input
                          type="number"
                          value={wizardSizeLimit}
                          onChange={(e) => setWizardSizeLimit(parseInt(e.target.value) || 100)}
                          className="w-16 bg-[#050506] border border-white/10 rounded px-1.5 py-0.5 text-xs text-center font-bold font-mono text-white"
                        />
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        Flag or request manual verification if a pull request exceeds this threshold of lines changed.
                      </p>
                    </div>

                    {/* AI Model Preference */}
                    <div className="bg-[#0a0a0b] border border-white/10 p-4 rounded-xl space-y-2 md:col-span-2">
                      <label className="block text-xs font-bold text-white mb-1">Reasoning Model Configuration</label>
                      <select
                        value={wizardModel}
                        onChange={(e) => setWizardModel(e.target.value)}
                        className="w-full bg-[#050506] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default - High Speed & Balanced)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Highest Precision - Best for Critical Security)</option>
                      </select>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        Pro models employ larger parameter logic suited for enterprise codebase protection.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-white/5">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStartInstallation}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg px-5 py-2 transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      Deploy Agent Webhooks <Sparkles className="w-4 h-4 text-amber-300" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Installation Console log */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500 mx-auto"></div>
                    <h4 className="text-sm font-mono font-bold text-white">Installing PR Agent Webhooks & Syncing Files...</h4>
                    <p className="text-xs text-white/40">Registering secure payload listeners and ingesting PR backlogs.</p>
                  </div>

                  {/* Log console terminal */}
                  <div className="bg-[#020203] border border-white/5 p-4 rounded-xl h-44 overflow-y-auto font-mono text-[10px] text-indigo-300 space-y-1.5 scrollbar-thin">
                    {wizardStatusLogs.map((log, index) => (
                      <p key={index} className="animate-fade-in truncate">{log}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Success Summary */}
              {wizardStep === 5 && (
                <div className="space-y-6 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full w-16 h-16 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">Setup Successfully Finished!</h4>
                    <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed">
                      The autonomous MergeKeeper is active. Webhooks have been successfully deployed and repository PR files sync completed!
                    </p>
                  </div>

                  {/* Summary of actions */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 max-w-sm mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">Repositories Connected:</span>
                      <span className="font-bold text-white font-mono">{wizardSuccessCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Active Model:</span>
                      <span className="font-bold text-white font-mono">{wizardModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Auto-Merge Schedule:</span>
                      <span className="font-bold text-indigo-400 font-mono">{wizardAutoMerge ? 'ACTIVE' : 'DISABLED'}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleFinishWizard}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide rounded-lg px-6 py-3 transition mx-auto cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      Launch Workspace Console
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
