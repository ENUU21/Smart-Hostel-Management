import { useState } from 'react';
import { Eye } from 'lucide-react';

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Enter password',
  required,
  hasError,
}: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex">
      <input
        id={id}
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-l-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 ${
          hasError ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
        }`}
      />
      <button
        type="button"
        title="Hold to reveal password"
        onMouseDown={() => setRevealed(true)}
        onMouseUp={() => setRevealed(false)}
        onMouseLeave={() => setRevealed(false)}
        onTouchStart={(e) => {
          e.preventDefault();
          setRevealed(true);
        }}
        onTouchEnd={() => setRevealed(false)}
        className="flex items-center justify-center rounded-r-lg border border-l-0 border-[#ced4da] bg-slate-50 px-3 text-slate-600 hover:bg-slate-100"
      >
        <Eye className={`h-4 w-4 ${revealed ? 'text-[#0ea5e9]' : 'text-slate-500'}`} />
      </button>
    </div>
  );
}
