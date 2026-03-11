
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';
import { ToastProvider, useToast } from './Toast';

interface AuthProps {
  onLogin: (user: User) => void;
  isDarkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, isDarkMode }) => {
  const { addToast } = useToast();
  const [view, setView] = useState<'signin' | 'otp' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        setView('otp');
      } else {
        const data = await response.json().catch(() => ({}));
        addToast({
          type: 'error',
          title: 'Authentication Failed',
          message: data.message || 'Incorrect email or password. Please try again.'
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not reach the authentication server. Please check your connection.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    // Simulate API call
    setTimeout(() => {
      setIsSendingReset(false);
      setResetSent(true);
    }, 2000);
  };

  const handleOtpChange = async (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value) || isVerifying) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(o => o !== '')) {
      setIsVerifying(true);
      try {
        const otpCode = newOtp.join('');
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpCode })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('asset_track_token', data.token);
          }

          // Extract AssetTracker role
          let assignedRole = UserRole.USER; // Default fallback
          if (data.user?.roles) {
            const assetRole = data.user.roles.find((r: any) => r.app === 'ASSET_TRACKER');
            if (assetRole) {
              // Map the string role to enum
              const roleMap: Record<string, UserRole> = {
                'Super Admin': UserRole.SUPER_ADMIN,
                'Admin User': UserRole.ADMIN_USER,
                'Auditor': UserRole.AUDITOR,
                'Standard User': UserRole.USER
              };
              assignedRole = roleMap[assetRole.role] || UserRole.USER;
            }
          }

          const appUser: User = {
            id: data.user.id,
            name: data.user.email,
            email: data.user.email,
            role: assignedRole,
            department: 'Unknown',
            avatar: `https://ui-avatars.com/api/?name=${data.user.email}&background=random`,
            employeeId: 'EMP-000',
            location: 'Remote'
          };

          localStorage.setItem('asset_track_user', JSON.stringify(appUser));
          onLogin(appUser);
        } else {
          addToast({
            type: 'error',
            title: 'Verification Failed',
            message: 'The code you entered is incorrect. Please check your email and try again.'
          });
        }
      } catch (err) {
        console.error(err);
        addToast({
          type: 'error',
          title: 'Verification Error',
          message: 'An error occurred during verification. Please try again later.'
        });
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (isVerifying) return;
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#1985f0]/10 blur-[150px] -mr-96 -mt-96 rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] -ml-64 -mb-64 rounded-full pointer-events-none"></div>

      <div className="w-full max-w-xl bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-2xl p-12 md:p-16 rounded-[4rem] relative z-10 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">

        <div className="flex flex-col items-center text-center mb-16 animate-in fade-in zoom-in-95 duration-500">
          {/* HERO LOGO: Icon Container (The Glass Shield) */}
          <div className="w-16 h-16 bg-blue-600/10 dark:bg-white/10 backdrop-blur-xl border border-blue-600/20 dark:border-white/20 rounded-[1.25rem] flex items-center justify-center text-blue-600 dark:text-white mb-8 shadow-2xl shadow-blue-500/10 dark:shadow-black/50">
            <span className="material-symbols-outlined !text-[36px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>

          {/* HERO LOGO: Wordmark Logic */}
          <h1 className="text-[32px] font-black italic text-slate-900 dark:text-white tracking-tighter mb-8 uppercase drop-shadow-sm">
            ASSETTRACK<span className="text-[#1985f0]">PRO</span>
          </h1>

          <h2 className="text-[40px] font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-none">
            {isVerifying ? 'Verifying Identity' : view === 'forgot-password' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-bold max-w-sm leading-relaxed text-lg">
            {isVerifying
              ? ''
              : view === 'signin'
                ? 'Manage your organization\'s assets with precision and intelligence.'
                : view === 'forgot-password'
                  ? 'Enter your registered email address to receive recovery instructions.'
                  : "We've sent a 6-digit code to your primary email address."}
          </p>
        </div>

        {view === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] ml-4">EMAIL ADDRESS</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#1985f0] transition-colors">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-[#1985f0]/10 focus:border-[#1985f0] transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] ml-4">PASSWORD</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#1985f0] transition-colors">lock</span>
                <input
                  type="password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-[#1985f0]/10 focus:border-[#1985f0] transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 opacity-50 cursor-not-allowed"
                />
              </div>
            </div>

            <button disabled={isVerifying} type="submit" className="w-full py-6 rounded-full bg-[#1985f0] text-white font-black text-xl tracking-tight hover:bg-blue-600 shadow-2xl shadow-[#1985f0]/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
              {isVerifying ? <span className="material-symbols-outlined animate-spin hidden sm:block">sync</span> : 'Secure Login'}
            </button>

            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-8">
              <label className="flex items-center gap-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                <input type="checkbox" className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-[#1985f0] focus:ring-0" />
                REMEMBER ME
              </label>
              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-8 decoration-slate-300 dark:decoration-slate-800 hover:decoration-[#1985f0]"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {view === 'forgot-password' && (
          <div className="space-y-10 animate-fade-in">
            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] ml-4">EMAIL ADDRESS</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#1985f0] transition-colors">mail</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-[#1985f0]/10 focus:border-[#1985f0] transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-6 rounded-full bg-[#1985f0] text-white font-black text-xl tracking-tight hover:bg-blue-600 shadow-2xl shadow-[#1985f0]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isSendingReset ? (
                    <span className="material-symbols-outlined animate-spin">sync</span>
                  ) : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => setView('signin')}
                  className="w-full py-6 rounded-full border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-lg tracking-tight hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-sm"
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-8 animate-fade-in text-center">
                <div className="w-20 h-20 bg-green-500/10 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl">mark_email_read</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Check Your Inbox</h3>
                  <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                    We've dispatched a recovery link to <span className="text-slate-900 dark:text-white">{email}</span>. Please check your spam folder if it doesn't arrive within 2 minutes.
                  </p>
                </div>
                <button
                  onClick={() => { setResetSent(false); setView('signin'); }}
                  className="w-full py-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg tracking-tight hover:bg-slate-800 dark:hover:bg-slate-100 transition-all uppercase tracking-widest text-sm"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'otp' && (
          <div className="space-y-12">
            {!isVerifying ? (
              <>
                <div className="flex justify-between gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-full h-24 text-center text-4xl font-black rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 focus:ring-[#1985f0]/10 focus:border-[#1985f0] outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <button className="text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white transition-all text-sm uppercase tracking-widest">
                    Didn't receive code? <span className="text-[#1985f0] font-black ml-1">Resend in 0:45</span>
                  </button>
                </div>

                <button
                  onClick={() => setView('signin')}
                  className="w-full py-6 rounded-full border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-lg tracking-tight hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-8 animate-fade-in">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-[#1985f0]/10 border-t-[#1985f0] animate-spin"></div>
                  <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[#1985f0] text-3xl">sync</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
