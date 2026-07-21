import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, User, Mail, Lock, LogIn, UserPlus, AlertCircle, Github } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/github/url');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to get GitHub authorize URL');
      }
      const data = await res.json();
      const url = data.url;

      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'GitHub OAuth Authentication',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked! Please allow popups to continue with GitHub.');
      }

      const messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          onLoginSuccess(event.data.user);
        } else if (event.data && event.data.type === 'OAUTH_AUTH_FAILURE') {
          window.removeEventListener('message', messageListener);
          setError(event.data.error || 'GitHub Authentication failed.');
          setLoading(false);
        }
      };

      window.addEventListener('message', messageListener);

      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setTimeout(() => {
            setLoading(false);
          }, 1000);
        }
      }, 500);

    } catch (err: any) {
      setError(err.message || 'Something went wrong during GitHub login');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, username, password }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020203] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Brand logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/[0.02] border border-white/10 rounded-2xl shadow-xl mb-4">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-serif italic flex items-center justify-center gap-2">
            MergeKeeper
          </h1>
          <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto font-sans">
            The autonomous maintainer pipeline reviewing and merging code with AI decision frameworks.
          </p>
        </div>

        {/* Credentials Form Box */}
        <div className="bg-[#050506] border border-white/10 rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-4">
            <Sparkles className="w-4 h-4 text-white/10" />
          </div>

          <h2 className="text-sm font-semibold text-white/90 border-b border-white/5 pb-3 mb-6 font-mono flex items-center gap-2">
            {isRegister ? <UserPlus className="w-4 h-4 text-indigo-400" /> : <LogIn className="w-4 h-4 text-indigo-400" />}
            {isRegister ? 'Create Account' : 'Security Checkpoint'}
          </h2>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex items-start gap-2.5 mb-5"
            >
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* GitHub OAuth Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full py-3 bg-[#1e2025] hover:bg-[#282a30] active:bg-[#1a1b1e] border border-white/10 text-white font-medium rounded-lg shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer text-xs"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Github className="w-4.5 h-4.5" />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <span className="relative px-3 bg-[#050506] text-[10px] uppercase tracking-wider font-mono text-white/30">
                or use credentials
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="maintainer_dev"
                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/10 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isRegister ? 'Register Maintainer' : 'Enter Workspace'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-[11px] text-white/40 hover:text-white/70 transition cursor-pointer"
            >
              {isRegister ? 'Already registered? Sign in' : 'First time here? Register workspace owner'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
