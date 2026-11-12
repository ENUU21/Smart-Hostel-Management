import { useEffect, useState, type FormEvent } from 'react';
import { Check, Eye, Ticket, X } from 'lucide-react';
import type { LeaveRequestDTO, SidebarCounts } from '../../../shared/types';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatFullDateTime, formatMonthDay } from '../../lib/api';

interface LeaveResponse {
  pending: LeaveRequestDTO[];
  approved: LeaveRequestDTO[];
  rejected: LeaveRequestDTO[];
  sidebar_counts: SidebarCounts;
}

interface WardenLeaveRequestsProps {
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenLeaveRequests({
  onFlash,
  onCountsUpdate,
}: WardenLeaveRequestsProps) {
  const [data, setData] = useState<LeaveResponse | null>(null);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [detailTarget, setDetailTarget] = useState<LeaveRequestDTO | null>(null);
  const [actionModal, setActionModal] = useState<{
    action: 'approve' | 'reject';
    leave: LeaveRequestDTO;
  } | null>(null);
  const [remark, setRemark] = useState('');

  const loadLeaves = async () => {
    const res = await apiFetch<LeaveResponse>('/api/warden/leave-requests');
    setData(res);
    onCountsUpdate(res.sidebar_counts);
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    try {
      const res = await apiFetch<{ message: string; sidebar_counts: SidebarCounts }>(
        `/api/warden/leave-requests/${actionModal.leave.id}/${actionModal.action}`,
        {
          method: 'POST',
          body: JSON.stringify({ remark }),
        },
      );
      onFlash({ type: 'success', text: res.message });
      onCountsUpdate(res.sidebar_counts);
      setActionModal(null);
      setRemark('');
      await loadLeaves();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-[#64748b]">
        Approve or reject student leave requests. Approved requests generate a gate pass.
      </p>

      <div className="mb-4 flex gap-1 border-b border-[#e2e8f0]">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'pending'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          Pending{' '}
          {data && data.pending.length > 0 && (
            <span className="ml-1 rounded bg-[#f59e0b] px-1.5 py-0.5 text-xs text-slate-900">
              {data.pending.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('approved')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'approved'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          Approved{' '}
          {data && data.approved.length > 0 && (
            <span className="ml-1 rounded bg-[#10b981] px-1.5 py-0.5 text-xs text-white">
              {data.approved.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('rejected')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'rejected'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          Rejected{' '}
          {data && data.rejected.length > 0 && (
            <span className="ml-1 rounded bg-[#ef4444] px-1.5 py-0.5 text-xs text-white">
              {data.rejected.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'pending' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">Student</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.pending.map((l) => (
                  <tr key={l.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-medium">{l.student_name}</td>
                    <td className="p-3">{l.roomnumber || '—'}</td>
                    <td className="p-3">{l.from_date}</td>
                    <td className="p-3">{l.to_date}</td>
                    <td className="p-3">{l.destination}</td>
                    <td className="max-w-[200px] truncate p-3" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="p-3">{formatMonthDay(l.createdat)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailTarget(l)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Approve"
                          onClick={() => {
                            setRemark('');
                            setActionModal({ action: 'approve', leave: l });
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Reject"
                          onClick={() => {
                            setRemark('');
                            setActionModal({ action: 'reject', leave: l });
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.pending.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#64748b]">
                      No pending leave requests. 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'approved' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">Student</th>
                  <th className="p-3">From → To</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Approved On</th>
                  <th className="p-3">Warden Remark</th>
                  <th className="p-3">Gate Pass</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.approved.map((l) => (
                  <tr key={l.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-medium">{l.student_name}</td>
                    <td className="p-3">
                      {l.from_date} → {l.to_date}
                    </td>
                    <td className="p-3">{l.destination}</td>
                    <td className="p-3 text-xs text-[#64748b]">
                      {formatFullDateTime(l.approved_at)}
                    </td>
                    <td className="p-3">{l.warden_remark || '—'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
                        <Ticket className="h-3.5 w-3.5" />
                        Pass #{l.id}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => setDetailTarget(l)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {data && data.approved.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748b]">
                      No approved leave requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rejected' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">Student</th>
                  <th className="p-3">From → To</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Warden Remark</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.rejected.map((l) => (
                  <tr key={l.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-medium">{l.student_name}</td>
                    <td className="p-3">
                      {l.from_date} → {l.to_date}
                    </td>
                    <td className="p-3">{l.destination}</td>
                    <td className="max-w-[200px] truncate p-3">{l.reason}</td>
                    <td className="p-3">{l.warden_remark || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => setDetailTarget(l)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {data && data.rejected.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748b]">
                      No rejected leave requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#1e293b]">Leave Request Details</h5>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-32 py-2 font-semibold text-[#64748b]">Student</td>
                    <td className="py-2">{detailTarget.student_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Room</td>
                    <td className="py-2">{detailTarget.roomnumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">From Date</td>
                    <td className="py-2">{detailTarget.from_date}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">To Date</td>
                    <td className="py-2">{detailTarget.to_date}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Destination</td>
                    <td className="py-2">{detailTarget.destination}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Submitted</td>
                    <td className="py-2">{formatFullDateTime(detailTarget.createdat)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 align-top font-semibold text-[#64748b]">Reason</td>
                    <td className="py-2">{detailTarget.reason}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleAction}>
              <div
                className={`flex items-center justify-between px-6 py-4 text-white ${
                  actionModal.action === 'approve' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`}
              >
                <h5 className="m-0 text-lg font-bold">
                  {actionModal.action === 'approve'
                    ? 'Approve Leave Request'
                    : 'Reject Leave Request'}
                </h5>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="rounded p-1 text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <p>
                  {actionModal.action === 'approve'
                    ? `Approve the leave request from ${actionModal.leave.student_name}? A gate pass will be generated.`
                    : `Reject the leave request from ${actionModal.leave.student_name}?`}
                </p>
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">
                    Warden Remark{' '}
                    <span className="font-normal">
                      (optional for approve, recommended for reject)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Enter a remark for the student..."
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    actionModal.action === 'approve'
                      ? 'bg-[#10b981] hover:bg-[#059669]'
                      : 'bg-[#ef4444] hover:bg-[#dc2626]'
                  }`}
                >
                  {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
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
