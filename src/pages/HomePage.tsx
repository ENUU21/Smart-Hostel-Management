import { BadgeCheck, GraduationCap } from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="auth-gradient-bg flex min-h-screen items-center justify-center p-4">
      <div className="welcome-card text-center">
        <img src="/logo.svg" alt="Logo" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="m-0 text-[28px] font-bold text-[#1e293b]">Smart Hostel</h1>
        <h2 className="m-0 text-xl font-semibold text-[#1e293b]">Management System</h2>
        <p className="mt-3 text-sm text-[#64748b]">Select your login to continue</p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/warden/login')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0ea5e9] px-4 py-3.5 text-base font-semibold text-white transition hover:scale-[1.02] hover:bg-[#0284c7]"
          >
            <BadgeCheck className="h-5 w-5" />
            Hostel Warden Login
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/student/login')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#10b981] px-4 py-3.5 text-base font-semibold text-white transition hover:scale-[1.02] hover:bg-[#059669]"
          >
            <GraduationCap className="h-5 w-5" />
            Student Login
          </button>
        </div>

        <p className="mt-8 text-xs text-[#64748b]">© 2026 Smart Hostel Management System</p>
      </div>
    </div>
  );
}
