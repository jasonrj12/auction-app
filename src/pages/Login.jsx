import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Input from '../components/Input';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { TrophyIcon } from '../components/Icons';
import { friendlyError } from '../lib/errors';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      addToast('Welcome back!', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first to reset your password.');
      return;
    }

    setError('');
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      addToast(`Password reset link sent to ${email.trim()}`, 'success');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(friendlyError(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Log in to Bidly Sports
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Access your team purse, squad, or athlete profile
          </p>
        </div>

        {error && (
          <Notice type="error" className="mb-6">
            {error}
          </Notice>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email address"
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                {resetting ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>
            <Input
              id="password"
              type="password"
              showPasswordToggle
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full bg-slate-900 hover:bg-black font-bold shadow-md mt-2"
          >
            {loading ? 'Authenticating…' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-blue-600 hover:text-blue-800 transition"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
