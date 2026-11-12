import { useEffect, useState } from 'react';
import { Check, Eye, Inbox, RefreshCw, RotateCcw, X } from 'lucide-react';
import type { ComplaintDTO, ComplaintStatus, SidebarCounts } from '../../../shared/types';
import { ComplaintStatusBadge } from '../../components/StatusBadges';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatFullDateTime, formatShortDate, formatTime } from '../../lib/api';

interface ComplaintsResponse {
  complaints: ComplaintDTO[];
  overdue_count: number;
  sidebar_counts: SidebarCounts;
}

interface WardenComplaintsProps {
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenComplaints({ onFlash, onCountsUpdate }: WardenComplaintsProps) {
  const [data, setData] = useState<ComplaintsResponse | null>(null);
  const [detailTarget, setDetailTarget] = useState<ComplaintDTO | null>(null);
  const [confirmState, setConfirmState] = useState<{
    complaint: ComplaintDTO;
    nextStatus: ComplaintStatus;
    message: string;
  } | null>(null);

  const loadComplaints = async () => {
    const res = await apiFetch<ComplaintsResponse>('/api/warden/complaints');
    setData(res);
    onCountsUpdate(res.sidebar_counts);
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleStatusChange = async () => {
    if (!confirmState) return;
    try {
      const res = await apiFetch<{ message: string; sidebar_counts: SidebarCounts }>(
        `/api/warden/complaints/${confirmState.complaint.id}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ status: confirmState.nextStatus }),
        },
      );
      onFlash({ type: 'success', text: res.message });
      onCountsUpdate(res.sidebar_counts);
      setConfirmState(null);
      await loadComplaints();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm text-[#64748b]">
        <span>All complaints submitted by students</span>
        {data && data.overdue_count > 0 && (
          <>
            <span>·</span>
            <span className="rounded-md bg-[#ef4444] px-2 py-0.5 text-xs font-semibold text-white">
              {data.overdue_count} overdue
            </span>
          </>
        )}
      </p>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <h5 className="mb-4 text-base font-bold text-[#1e293b]">📝 All Complaints</h5>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] text-xs uppercase tracking-wider text-[#64748b]">
                <th className="w-12 p-3">#</th>
                <th className="p-3">Student</th>
                <th className="p-3">Room</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="w-48 p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.complaints.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-[#e2e8f0] last:border-0 ${
                    c.is_overdue
                      ? 'bg-[#fffbeb] hover:bg-[#fef3c7]'
                      : 'hover:bg-[#f8fafc]'
                  }`}
                >
                  <td className="p-3 text-[#64748b]">{c.id}</td>
                  <td className="p-3">
                    <div className="font-semibold text-[#1e293b]">{c.student_name}</div>
                    <small className="text-xs text-[#64748b]">@{c.student_username}</small>
                  </td>
                  <td className="p-3">{c.roomnumber || '—'}</td>
                  <td className="p-3">
                    <div className="font-semibold text-[#1e293b]">{c.title}</div>
                    <small
                      className="block max-w-[300px] truncate text-xs text-[#64748b]"
                      title={c.description}
                    >
                      {c.description}
                    </small>
                  </td>
                  <td className="p-3">
                    <ComplaintStatusBadge
                      status={c.status}
                      isOverdue={c.is_overdue}
                      ageDays={c.age_days}
                    />
                  </td>
                  <td className="p-3">
                    <div>{formatShortDate(c.createdat)}</div>
                    <small className="text-xs text-[#64748b]">{formatTime(c.createdat)}</small>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => setDetailTarget(c)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {c.status !== 'In Progress' && (
                        <button
                          type="button"
                          title="Mark as In Progress"
                          onClick={() =>
                            setConfirmState({
                              complaint: c,
                              nextStatus: 'In Progress',
                              message: 'Start working on this complaint?',
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}

                      {c.status !== 'Resolved' && (
                        <button
                          type="button"
                          title="Mark as Resolved"
                          onClick={() =>
                            setConfirmState({
                              complaint: c,
                              nextStatus: 'Resolved',
                              message: 'Mark this complaint as resolved?',
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      {c.status !== 'Pending' && (
                        <button
                          type="button"
                          title="Reopen"
                          onClick={() =>
                            setConfirmState({
                              complaint: c,
                              nextStatus: 'Pending',
                              message: 'Reopen this complaint?',
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.complaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748b]">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
                    <p className="m-0">No complaints yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#1e293b]">Complaint Details</h5>
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
                    <td className="w-28 py-2 font-semibold text-[#64748b]">Title</td>
                    <td className="py-2">{detailTarget.title}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Student</td>
                    <td className="py-2">{detailTarget.student_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Room</td>
                    <td className="py-2">{detailTarget.roomnumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Status</td>
                    <td className="py-2">
                      <ComplaintStatusBadge
                        status={detailTarget.status}
                        isOverdue={detailTarget.is_overdue}
                        ageDays={detailTarget.age_days}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Submitted</td>
                    <td className="py-2">{formatFullDateTime(detailTarget.createdat)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 align-top font-semibold text-[#64748b]">Description</td>
                    <td className="py-2">{detailTarget.description}</td>
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

      {/* Status Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#1e293b]">Update Complaint Status</h5>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm text-[#1e293b]">
              <p className="mb-2">{confirmState.message}</p>
              <p className="m-0 text-xs text-[#64748b]">
                Complaint: <strong>{confirmState.complaint.title}</strong> →{' '}
                <strong>{confirmState.nextStatus}</strong>
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={handleStatusChange}
                className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
