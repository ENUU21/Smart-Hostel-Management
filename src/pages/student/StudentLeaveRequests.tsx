import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Send, Ticket, X } from 'lucide-react';
import type { LeaveRequestDTO, StudentDTO } from '../../../shared/types';
import { LeaveStatusBadge } from '../../components/StatusBadges';
import { StudentTopbar } from '../../components/StudentTopbar';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatShortDate } from '../../lib/api';

interface StudentLeaveResponse {
  student: StudentDTO;
  my_leaves: LeaveRequestDTO[];
}

interface StudentLeaveRequestsProps {
  flash: FlashMessage | null;
  onFlash: (flash: FlashMessage) => void;
  onDismissFlash: () => void;
  onNavigate: (path: string) => void;
}

export function StudentLeaveRequests({
  flash,
  onFlash,
  onDismissFlash,
  onNavigate,
}: StudentLeaveRequestsProps) {
  const [leaves, setLeaves] = useState<LeaveRequestDTO[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadLeaves = async () => {
    const res = await apiFetch<StudentLeaveResponse>('/api/student/leave-requests');
    setLeaves(res.my_leaves);
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const res = await apiFetch<{ message: string }>('/api/student/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          from_date: fromDate,
          to_date: toDate,
          destination,
          reason,
        }),
      });
      onFlash({ type: 'success', text: res.message });
      setFromDate('');
      setToDate('');
      setDestination('');
      setReason('');
      setShowModal(false);
      await loadLeaves();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      } else if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title="🏖️ Leave Requests"
        backPath="/student/profile"
        onNavigate={onNavigate}
        flash={flash}
        onDismissFlash={onDismissFlash}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-[#64748b]">
          Submit a leave request. The warden must approve it before you get a gate pass.
        </p>
        <button
          type="button"
          onClick={() => {
            setErrors({});
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]"
        >
          <Plus className="h-4 w-4" />
          New Leave Request
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                  <td className="p-3">{l.from_date}</td>
                  <td className="p-3">{l.to_date}</td>
                  <td className="p-3 font-medium">{l.destination}</td>
                  <td className="max-w-[250px] truncate p-3" title={l.reason}>
                    {l.reason}
                  </td>
                  <td className="p-3">
                    <LeaveStatusBadge status={l.status} />
                  </td>
                  <td className="p-3 text-[#64748b]">{formatShortDate(l.createdat)}</td>
                  <td className="p-3 text-right">
                    {l.status === 'Approved' ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(`/student/leave-request/${l.id}/gate-pass`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#059669]"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Gate Pass
                      </button>
                    ) : (
                      <span className="text-xs text-[#64748b]">
                        {l.status === 'Pending'
                          ? 'Waiting for approval'
                          : `Rejected${l.warden_remark ? `: ${l.warden_remark}` : ''}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748b]">
                    No leave requests yet. Click "New Leave Request" to submit one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">🏖️ New Leave Request</h5>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${
                        errors.from_date ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                      }`}
                    />
                    {errors.from_date && (
                      <p className="mt-1 text-xs text-[#ef4444]">{errors.from_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${
                        errors.to_date ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                      }`}
                    />
                    {errors.to_date && (
                      <p className="mt-1 text-xs text-[#ef4444]">{errors.to_date}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Where are you going? (e.g. Home — Bhubaneswar)"
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      errors.destination ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {errors.destination && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.destination}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">Reason</label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why do you need leave?"
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      errors.reason ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {errors.reason && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.reason}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]"
                >
                  <Send className="h-4 w-4" />
                  Submit Request
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
