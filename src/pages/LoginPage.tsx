import { useState, type FormEvent } from 'react';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError, apiFetch, setSessionToken } from '../lib/api';
import type { SidebarCounts, StudentDTO } from '../../shared/types';

interface LoginPageProps {
  mode: 'warden' | 'student';
  onNavigate: (path: string) => void;
  onWardenSuccess: (wardenName: string, counts?: SidebarCounts) => void;
  onStudentSuccess: (student: StudentDTO) => void;
}

export function LoginPage({
  mode,
  onNavigate,
  onWardenSuccess,
  onStudentSuccess,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isWarden = mode === 'warden';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isWarden) {
        const res = await apiFetch<{
          token: string;
          warden_name: string;
          sidebar_counts?: SidebarCounts;
        }>('/api/auth/warden/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        setSessionToken(res.token);
        onWardenSuccess(res.warden_name, res.sidebar_counts);
      } else {
        const res = await apiFetch<{
          token: string;
          student: StudentDTO;
        }>('/api/auth/student/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        setSessionToken(res.token);
        onStudentSuccess(res.student);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to login. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-gradient-bg flex min-h-screen items-center justify-center p-4">
      <div className="auth-card">
        <div className="mb-2 text-center text-[40px]">{isWarden ? '👨‍💼' : '🎓'}</div>
        <h2 className="mb-5 text-center text-[22px] font-bold text-[#1e293b]">
          {isWarden ? 'Hostel Warden Login' : 'Hostel Student Login'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-[#64748b]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none transition focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-[#64748b]">Password</label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-lg px-4 py-3 text-base font-semibold text-white transition disabled:opacity-60 ${
              isWarden
                ? 'bg-[#0ea5e9] hover:bg-[#0284c7]'
                : 'bg-[#10b981] hover:bg-[#059669]'
            }`}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-[#64748b]">
          {isWarden
            ? 'Demo login: manash / manash123'
            : 'Demo logins: arjun123 / arjun123, rahul123 / rahul123'}
        </p>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-sm text-[#64748b] hover:text-[#1e293b]"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
