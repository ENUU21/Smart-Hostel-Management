import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { NoticeDTO } from '../../../shared/types';
import { StudentTopbar } from '../../components/StudentTopbar';
import { apiFetch, formatDateTime } from '../../lib/api';

interface StudentNoticesProps {
  onNavigate: (path: string) => void;
}

export function StudentNotices({ onNavigate }: StudentNoticesProps) {
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ notices: NoticeDTO[] }>('/api/student/notices').then((res) =>
      setNotices(res.notices),
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title="📢 Hostel Notices"
        backPath="/student/profile"
        onNavigate={onNavigate}
      />

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <div className="space-y-2">
          {notices.map((n) => {
            const isOpen = openId === n.id;
            return (
              <div
                key={n.id}
                className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : n.id)}
                  className={`flex w-full items-center gap-2 px-5 py-4 text-left text-[15px] transition ${
                    isOpen ? 'bg-[#f0f9ff]' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#0ea5e9]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#64748b]" />
                  )}
                  <strong className="flex-1 truncate text-[#1e293b]">{n.title}</strong>
                  <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-[#64748b]">
                    📅 {formatDateTime(n.createdat)}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-[#e2e8f0] px-5 py-4 text-sm text-[#1e293b]">
                    {n.description}
                  </div>
                )}
              </div>
            );
          })}
          {notices.length === 0 && (
            <div className="py-8 text-center text-sm text-[#64748b]">
              📭 No notices yet. Check back later.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
