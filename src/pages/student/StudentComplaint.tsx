import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { StudentTopbar } from '../../components/StudentTopbar';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch } from '../../lib/api';

interface StudentComplaintProps {
  onFlash: (flash: FlashMessage) => void;
  onNavigate: (path: string) => void;
}

export function StudentComplaint({ onFlash, onNavigate }: StudentComplaintProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/student/complaints', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      onFlash({ type: 'success', text: res.message });
      onNavigate('/student/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title="📝 Submit a Complaint"
        backPath="/student/profile"
        onNavigate={onNavigate}
      />

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
        <p className="mb-4 text-sm text-[#64748b]">Tell us what's wrong</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#64748b]">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for your complaint"
              required
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#64748b]">Description</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail"
              required
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ea5e9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Submit Complaint
          </button>
        </form>
      </div>
    </div>
  );
}
