import React, { useState } from 'react';
import { Heart, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { sessionService } from '../services';
import { tokens } from '../theme/tokens';

export const SignInScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);
    setLoading(true);

    try {
      if (sessionService.signIn) {
        await sessionService.signIn(email, password);
      }
    } catch {
      // Generic sign-in error to prevent account enumeration
      setErrorMsg('Invalid email or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);
    if (!email) {
      setErrorMsg('Please enter your email address to reset your password.');
      return;
    }
    setLoading(true);

    try {
      if (sessionService.sendPasswordReset) {
        await sessionService.sendPasswordReset(email);
      }
    } catch {
      // Silence errors to prevent account enumeration
    } finally {
      // Identical confirmation message whether or not account exists
      setResetSentMsg('If an account exists for this email, password reset instructions have been sent.');
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto my-12 p-8 rounded-2xl border shadow-sm ${tokens.surfaces.card} ${tokens.borders.default}`}>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-base text-text-inverted flex items-center justify-center font-bold mb-3 shadow-md">
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <h1 className={`text-2xl font-bold ${tokens.text.title}`}>CarePlus v2</h1>
        <p className={`text-sm ${tokens.text.muted} mt-1`}>Sign in to access your clinic portal</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/30 flex items-start gap-3 text-status-error text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {resetSentMsg && (
        <div className="mb-6 p-4 rounded-xl bg-status-active/10 border border-status-active/30 flex items-start gap-3 text-status-active text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{resetSentMsg}</span>
        </div>
      )}

      {!isForgotPassword ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold ${tokens.text.title} mb-1.5`}>Email Address</label>
            <div className="relative">
              <Mail className={`w-4 h-4 ${tokens.text.muted} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@clinic.org"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border ${tokens.borders.default} text-sm ${tokens.surfaces.canvas} ${tokens.text.body} focus:outline-none focus:ring-2 focus:ring-primary-base`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold ${tokens.text.title} mb-1.5`}>Password</label>
            <div className="relative">
              <Lock className={`w-4 h-4 ${tokens.text.muted} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border ${tokens.borders.default} text-sm ${tokens.surfaces.canvas} ${tokens.text.body} focus:outline-none focus:ring-2 focus:ring-primary-base`}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                setErrorMsg(null);
                setResetSentMsg(null);
              }}
              className="text-xs text-primary-base font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-primary-base hover:bg-primary-dark text-text-inverted font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold ${tokens.text.title} mb-1.5`}>Email Address</label>
            <div className="relative">
              <Mail className={`w-4 h-4 ${tokens.text.muted} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@clinic.org"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border ${tokens.borders.default} text-sm ${tokens.surfaces.canvas} ${tokens.text.body} focus:outline-none focus:ring-2 focus:ring-primary-base`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-primary-base hover:bg-primary-dark text-text-inverted font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>

          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg(null);
                setResetSentMsg(null);
              }}
              className={`text-xs ${tokens.text.muted} hover:text-text-title font-medium cursor-pointer`}
            >
              Back to Sign In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
