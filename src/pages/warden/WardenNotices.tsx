import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import type { NoticeDTO, SidebarCounts } from '../../../shared/types';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatDateTime } from '../../lib/api';

interface NoticesResponse {
  notices: NoticeDTO[];
  sidebar_counts: SidebarCounts;
}

interface WardenNoticesProps {
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenNotices({ onFlash, onCountsUpdate }: WardenNoticesProps) {
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadNotices = async () => {
    const res = await apiFetch<NoticesResponse>('/api/warden/notices');
    setNotices(res.notices);
    onCountsUpdate(res.sidebar_counts);
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/warden/notices', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      onFlash({ type: 'success', text: res.message });
      setTitle('');
      setDescription('');
      setShowModal(false);
      await loadNotices();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-[#64748b]">Click a notice title to expand its content</p>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center">
          <h5 className="m-0 text-base font-bold text-[#1e293b]">📢 All Notices</h5>
          <span className="ml-2 text-sm text-[#64748b]">· {notices.length} total</span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]"
          >
            <Plus className="h-4 w-4" />
            Add Notice
          </button>
        </div>

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
              📭 No notices yet. Click "Add Notice" to post one.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleAdd}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">📢 Post a New Notice</h5>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter notice title"
                    required
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Description
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter notice description"
                    required
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className="rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]"
                >
                  Post Notice
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
