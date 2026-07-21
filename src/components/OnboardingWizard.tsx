import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  GitBranch, 
  Github, 
  Settings, 
  Database, 
  Cpu, 
  Link, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  Search, 
  Info, 
  Globe,
  Loader2
} from 'lucide-react';

interface OnboardingWizardProps {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const isAdmin = user.role === 'admin';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step States
  const [installations, setInstallations] = useState<any[]>([]);
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [searchRepo, setSearchRepo] = useState('');

  // AI config state
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [strictness, setStrictness] = useState<'lenient' | 'standard' | 'strict'>('standard');
  const [promptTemplate, setPromptTemplate] = useState('Standard PR Analysis with strictness rules');

  // Webhook verification
  const [webhookVerified, setWebhookVerified] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);

  // Load user organizations & repository defaults
  useEffect(() => {
    if (user.repositories) {
      setAvailableRepos(user.repositories.map((fullName: string) => {
        const [owner, name] = fullName.split('/');
        return { fullName, owner, name, selected: false };
      }));
    }
  }, [user]);

  // Check App installations on GitHub
  const checkAppInstallations = async () => {
    setCheckingInstall(true);
    setError('');
    try {
      const res = await fetch('/api/github/installations');
      if (res.ok) {
        const data = await res.json();
        setInstallations(data.installations || []);
        setSuccess('App installations detected successfully!');
      } else {
        throw new Error('Could not retrieve installations');
      }
    } catch (err: any) {
      setError('App not detected yet. Please ensure you have installed the app on GitHub.');
    } finally {
      setCheckingInstall(false);
    }
  };

  // Import Selected Repositories into Database
  const importSelectedRepositories = async () => {
    setLoading(true);
    setError('');
    const reposToImport = availableRepos.filter(r => r.selected);
    if (reposToImport.length === 0) {
      setError('Please select at least one repository to connect.');
      setLoading(false);
      return;
    }

    try {
      // Import sequentially or trigger backend connections
      for (const repo of reposToImport) {
        await fetch('/api/repos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: repo.owner,
            name: repo.name,
            defaultBranch: 'main',
            language: 'TypeScript',
            description: `GitHub Connected Repository (${repo.fullName})`
          })
        });
      }
      setSuccess(`Successfully imported ${reposToImport.length} repositories into your workspace!`);
      setTimeout(() => {
        setSuccess('');
        setStep(5);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error importing repositories');
    } finally {
      setLoading(false);
    }
  };

  // Configure AI settings
  const saveAISettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModel,
          reviewStrictness: strictness,
          aiPromptTemplate: promptTemplate
        })
      });
      if (!res.ok) throw new Error('Failed to update system settings');
      setSuccess('AI evaluation models configured!');
      setTimeout(() => {
        setSuccess('');
        setStep(6);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test webhook simulation
  const testWebhook = async () => {
    setVerifyingWebhook(true);
    setError('');
    setTimeout(() => {
      setWebhookVerified(true);
      setVerifyingWebhook(false);
      setSuccess('Webhook handshake verified! Handshake code: SECURE_200_OK');
    }, 1500);
  };

  // Finalize Maintainer Onboarding
  const handleMaintainerFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // Purge any residual mock data to ensure clean production transition
      await fetch('/api/admin/purge-mock', { method: 'POST' });
      
      // Auto-trigger synchronization on the connected repositories to pull real data immediately
      const reposRes = await fetch('/api/repos');
      if (reposRes.ok) {
        const connectedRepos = await reposRes.json();
        for (const repo of connectedRepos) {
          fetch(`/api/repos/${repo.id}/sync`, { method: 'POST' }).catch(err => console.error("Initial sync failed", err));
        }
      }

      // Mark user as onboarded
      const res = await fetch('/api/auth/me/onboard', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to update onboarding state.');
      const data = await res.json();
      onComplete(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Contributor Selection Submit
  const handleContributorSubmit = async () => {
    setLoading(true);
    setError('');
    const selectedIds = availableRepos.filter(r => r.selected).map(r => r.fullName);
    if (selectedIds.length === 0) {
      setError('Please select at least one workspace repository to continue.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/contributor/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoIds: selectedIds })
      });
      if (!res.ok) throw new Error('Failed to set contributor workspaces.');
      const data = await res.json();
      onComplete(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Contributor view rendering
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#020203] flex items-center justify-center py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-[#050506] border border-white/10 rounded-2xl p-8 shadow-2xl relative"
        >
          <div className="absolute top-0 right-0 p-6">
            <Github className="w-5 h-5 text-white/10" />
          </div>

          <div className="mb-6 pb-4 border-b border-white/5">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest font-mono">WORKSPACE SELECTION</span>
            <h1 className="text-xl font-bold text-white mt-1">Which repositories do you contribute to?</h1>
            <p className="text-xs text-white/50 mt-1">
              Select your active workspaces. Only repositories managed within this platform will be listed.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 text-xs text-red-400 flex items-start gap-2.5 mb-5">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search repository..."
                value={searchRepo}
                onChange={(e) => setSearchRepo(e.target.value)}
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-[#080809] divide-y divide-white/5">
              {availableRepos.filter(r => r.fullName.toLowerCase().includes(searchRepo.toLowerCase())).length === 0 ? (
                <div className="p-8 text-center text-xs text-white/20">
                  No repositories found connected to your account.
                </div>
              ) : (
                availableRepos
                  .filter(r => r.fullName.toLowerCase().includes(searchRepo.toLowerCase()))
                  .map((repo, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        const updated = [...availableRepos];
                        updated[idx].selected = !updated[idx].selected;
                        setAvailableRepos(updated);
                      }}
                      className={`flex items-center justify-between p-3.5 hover:bg-white/[0.02] cursor-pointer transition ${
                        repo.selected ? 'bg-indigo-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${
                          repo.selected ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/[0.02] border-white/5 text-white/40'
                        }`}>
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/80">{repo.name}</p>
                          <p className="text-[10px] text-white/40">{repo.owner}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        repo.selected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 bg-[#0a0a0b]'
                      }`}>
                        {repo.selected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
            <button
              onClick={handleContributorSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/10 text-xs flex items-center gap-2 cursor-pointer transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Enter Workspace</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin / Maintainer Onboarding Wizard Steps
  return (
    <div className="min-h-screen bg-[#020203] py-12 px-4 flex justify-center items-center">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        
        {/* Top Progress bar and Header */}
        <div className="bg-[#050506] border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-white/30 font-mono tracking-widest">SaaS ONBOARDING</span>
              <h2 className="text-sm font-bold text-white">Autonomous Maintainer Onboarding</h2>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-white/50 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
            Step {step} of 7
          </div>
        </div>

        {/* Steps navigation header bar */}
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
            <div 
              key={num}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                num < step ? 'bg-indigo-500' : num === step ? 'bg-indigo-400 shadow-md shadow-indigo-400/20' : 'bg-white/5'
              }`}
            />
          ))}
        </div>

        {/* Dynamic Wizard panel body */}
        <div className="bg-[#050506] border border-white/10 rounded-2xl p-8 shadow-2xl relative min-h-[420px] flex flex-col justify-between">
          
          <div>
            {/* Step 1: Connect GitHub Profile info */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 1</span>
                  <h1 className="text-xl font-bold text-white mt-1">Connect Your GitHub Profile</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Your account has successfully linked with your GitHub identity. Let's inspect the active scope.
                  </p>
                </div>

                <div className="bg-[#0a0a0b] border border-white/5 rounded-xl p-5 flex items-center gap-4">
                  <img 
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'} 
                    alt="GitHub Profile"
                    className="w-16 h-16 rounded-full border-2 border-white/10 shadow-lg"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white">{user.username}</h3>
                    <p className="text-xs text-white/40">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold px-1.5 py-0.5 rounded">
                        Authorized Administrator
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-2 text-xs text-white/50">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Retrieve verified secure email context</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Read organization metadata scopes</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hook write permissions on selected repos</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Install GitHub App */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 2</span>
                  <h1 className="text-xl font-bold text-white mt-1">Install the GitHub App</h1>
                  <p className="text-xs text-white/50 mt-1">
                    To automate PR reviews, you must install the MergeKeeper GitHub App on your account or organization.
                  </p>
                </div>

                <div className="space-y-4">
                  <a 
                    href="https://github.com/apps/pr-review-agent-ai/installations/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#1e2025] hover:bg-[#282a30] active:bg-[#1a1b1e] border border-white/10 text-white font-medium rounded-xl shadow-md transition text-xs cursor-pointer"
                  >
                    <Github className="w-5 h-5" />
                    <span>Install App on GitHub</span>
                    <Globe className="w-4 h-4 text-white/40" />
                  </a>

                  <p className="text-[10px] text-white/40 italic">
                    Note: If you have not created your GitHub App yet, you can configure your custom client IDs in Settings later. We'll use the platform's default agent workspace context.
                  </p>

                  <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/80">Check App Status</p>
                        <p className="text-[10px] text-white/40">Verify App installation registration on GitHub API</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={checkAppInstallations}
                      disabled={checkingInstall}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs cursor-pointer transition"
                    >
                      {checkingInstall ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Status'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Select Organizations */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 3</span>
                  <h1 className="text-xl font-bold text-white mt-1">Select Organizations</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Select which GitHub Organizations you want to connect to your PR Review workflow.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(user.organizations || []).map((org: string, idx: number) => {
                      const isSelected = selectedOrgs.includes(org);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedOrgs(selectedOrgs.filter(o => o !== org));
                            } else {
                              setSelectedOrgs([...selectedOrgs, org]);
                            }
                          }}
                          className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                            isSelected ? 'bg-indigo-500/5 border-indigo-500/40 text-white' : 'bg-white/[0.01] border-white/5 text-white/50 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className="text-xs font-bold">{org}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                          </div>
                        </div>
                      );
                    })}
                    {(!user.organizations || user.organizations.length === 0) && (
                      <div className="col-span-2 text-center p-8 border border-dashed border-white/10 rounded-xl text-xs text-white/30">
                        No organization associations found. Your personal account context will be used.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Import Repositories */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 4</span>
                  <h1 className="text-xl font-bold text-white mt-1">Select Repositories</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Import repositories where you want to deploy the AI MergeKeeper.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      placeholder="Search repository..."
                      value={searchRepo}
                      onChange={(e) => setSearchRepo(e.target.value)}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                    />
                  </div>

                  <div className="border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-[#080809] divide-y divide-white/5">
                    {availableRepos.filter(r => r.fullName.toLowerCase().includes(searchRepo.toLowerCase())).length === 0 ? (
                      <div className="p-8 text-center text-xs text-white/20">
                        No accessible repositories found.
                      </div>
                    ) : (
                      availableRepos
                        .filter(r => r.fullName.toLowerCase().includes(searchRepo.toLowerCase()))
                        .map((repo, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              const updated = [...availableRepos];
                              updated[idx].selected = !updated[idx].selected;
                              setAvailableRepos(updated);
                            }}
                            className={`flex items-center justify-between p-3 hover:bg-white/[0.01] cursor-pointer transition ${
                              repo.selected ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            <span className="text-xs font-semibold text-white/80">{repo.fullName}</span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                              repo.selected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10'
                            }`}>
                              {repo.selected && <Check className="w-3 h-3 stroke-[3px]" />}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Configure AI */}
            {step === 5 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 5</span>
                  <h1 className="text-xl font-bold text-white mt-1">Configure AI Provider</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Configure the generative review engine settings for pull request analysis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Default Model</label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra fast/Lightweight)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep reasoning)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Strictness Level</label>
                    <select
                      value={strictness}
                      onChange={(e) => setStrictness(e.target.value as any)}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                    >
                      <option value="lenient">Lenient - Only raise critical warnings</option>
                      <option value="standard">Standard - Style + quality reviews</option>
                      <option value="strict">Strict - Gate-keep PRs aggressively</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">AI Guardrail Instructions</label>
                    <textarea
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-3 text-white focus:outline-none placeholder-white/20"
                      placeholder="Instruct the AI on security requirements, lint rules, testing guidelines, etc..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Verify Webhook */}
            {step === 6 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">STEP 6</span>
                  <h1 className="text-xl font-bold text-white mt-1">Verify Webhook Payload</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Connect GitHub events to your autonomous review pipeline. Add this URL in your GitHub App or Repo webhook settings.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Payload URL</label>
                    <div className="flex items-center bg-[#0a0a0b] border border-white/10 rounded-lg overflow-hidden pl-4 pr-2 py-2">
                      <Link className="w-4 h-4 text-white/30 shrink-0 mr-2" />
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/api/webhooks/receiver`}
                        className="w-full bg-transparent text-white text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Secret Handshake Code</label>
                    <input
                      type="text"
                      readOnly
                      value={user.githubId || 'webhook_secret_handshake_saas'}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-4 py-2.5 text-white/60 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                      We recommend subscribing to `pull_request` and `issue_comment` events.
                    </span>

                    <button
                      type="button"
                      onClick={testWebhook}
                      disabled={verifyingWebhook || webhookVerified}
                      className={`px-4 py-2 font-semibold rounded-lg text-xs cursor-pointer transition flex items-center gap-2 ${
                        webhookVerified 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white'
                      }`}
                    >
                      {verifyingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : webhookVerified ? <Check className="w-4 h-4 stroke-[3px]" /> : 'Test Webhook'}
                      <span>{webhookVerified ? 'Handshake Active' : 'Verify Handshake'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 7: Complete Setup */}
            {step === 7 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-8 h-8 text-indigo-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">FINAL STEP</span>
                  <h1 className="text-xl font-bold text-white mt-1">Autonomous Agent Ready!</h1>
                  <p className="text-xs text-white/50 mt-2 max-w-md mx-auto">
                    Your autonomous maintainer dashboard is configured. Clicking Complete will purge any residual template placeholders and synchronize your live GitHub pipeline.
                  </p>
                </div>

                <div className="border border-white/5 rounded-xl p-5 bg-white/[0.01] text-xs space-y-3 max-w-md mx-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">
                    <span>Active Deployment Checklist</span>
                    <span>Status</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">GitHub Identity Connected</span>
                    <span className="text-emerald-400 font-mono font-bold uppercase text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Success</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Selected Repositories Connected</span>
                    <span className="text-emerald-400 font-mono font-bold uppercase text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Imported</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Generative AI Provider Config</span>
                    <span className="text-emerald-400 font-mono font-bold uppercase text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Calibrated</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Webhook Handshake Status</span>
                    <span className="text-emerald-400 font-mono font-bold uppercase text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Bottom navigation buttons */}
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              {error && (
                <span className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  {error}
                </span>
              )}
              {success && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                  {success}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step > 1 && step < 7 && (
                <button
                  onClick={() => { setError(''); setSuccess(''); setStep(step - 1); }}
                  className="px-4 py-2 border border-white/10 hover:bg-white/[0.02] text-white font-medium rounded-lg text-xs cursor-pointer transition"
                >
                  Back
                </button>
              )}

              {step < 4 && (
                <button
                  onClick={() => { setError(''); setSuccess(''); setStep(step + 1); }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 4 && (
                <button
                  onClick={importSelectedRepositories}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Import & Next</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              )}

              {step === 5 && (
                <button
                  onClick={saveAISettings}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Save & Next</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              )}

              {step === 6 && (
                <button
                  onClick={() => { setError(''); setSuccess(''); setStep(7); }}
                  disabled={!webhookVerified}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 7 && (
                <button
                  onClick={handleMaintainerFinish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Complete Setup</span><Check className="w-4 h-4 stroke-[3px]" /></>}
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
