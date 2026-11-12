import type { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { FlashMessage } from './WardenLayout';

interface StudentTopbarProps {
  title: string;
  backPath?: string;
  onNavigate: (path: string) => void;
  rightSlot?: ReactNode;
  flash?: FlashMessage | null;
  onDismissFlash?: () => void;
}

export function StudentTopbar({
  title,
  backPath,
  onNavigate,
  rightSlot,
  flash,
  onDismissFlash,
}: StudentTopbarProps) {
  return (
    <>
      <div className="no-print mb-5 flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white px-5 py-4">
        {backPath && (
          <button
            type="button"
            onClick={() => onNavigate(backPath)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <h1 className="m-0 text-xl font-bold text-[#1e293b]">{title}</h1>
        {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
      </div>

      {flash && (
        <div
          className={`no-print mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
            flash.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : flash.type === 'danger'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-sky-200 bg-sky-50 text-sky-800'
          }`}
        >
          <span>{flash.text}</span>
          {onDismissFlash && (
            <button
              type="button"
              onClick={onDismissFlash}
              className="ml-3 rounded p-1 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
