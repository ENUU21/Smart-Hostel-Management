import { useEffect, useState, type FormEvent } from 'react';
import { Check, Eye, X } from 'lucide-react';
import type {
  RoomChangeRequestDTO,
  RoomSwapRequestDTO,
  SidebarCounts,
} from '../../../shared/types';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatMonthDay, formatShortDate } from '../../lib/api';

interface RoomTransfersResponse {
  move_pending: RoomChangeRequestDTO[];
  move_approved: RoomChangeRequestDTO[];
  move_rejected: RoomChangeRequestDTO[];
  swap_pending: RoomSwapRequestDTO[];
  swap_approved: RoomSwapRequestDTO[];
  swap_rejected: RoomSwapRequestDTO[];
  sidebar_counts: SidebarCounts;
}

interface WardenRoomTransfersProps {
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenRoomTransfers({
  onFlash,
  onCountsUpdate,
}: WardenRoomTransfersProps) {
  const [data, setData] = useState<RoomTransfersResponse | null>(null);
  const [tab, setTab] = useState<'moves' | 'swaps'>('moves');
  const [detailMove, setDetailMove] = useState<RoomChangeRequestDTO | null>(null);
  const [detailSwap, setDetailSwap] = useState<RoomSwapRequestDTO | null>(null);
  const [actionModal, setActionModal] = useState<{
    kind: 'move' | 'swap';
    action: 'approve' | 'reject';
    id: number;
  } | null>(null);
  const [remark, setRemark] = useState('');

  const loadTransfers = async () => {
    const res = await apiFetch<RoomTransfersResponse>('/api/warden/room-transfers');
    setData(res);
    onCountsUpdate(res.sidebar_counts);
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    try {
      const url =
        actionModal.kind === 'move'
          ? `/api/warden/room-change-requests/${actionModal.id}/${actionModal.action}`
          : `/api/warden/room-swaps/${actionModal.id}/${actionModal.action}`;
      const res = await apiFetch<{ message: string; sidebar_counts: SidebarCounts }>(url, {
        method: 'POST',
        body: JSON.stringify({ remark }),
      });
      onFlash({ type: 'success', text: res.message });
      onCountsUpdate(res.sidebar_counts);
      setActionModal(null);
      setRemark('');
      await loadTransfers();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
        setActionModal(null);
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-[#64748b]">Approve or reject room move and swap requests.</p>

      <div className="mb-4 flex gap-1 border-b border-[#e2e8f0]">
        <button
          type="button"
          onClick={() => setTab('moves')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'moves'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          📦 Move Requests{' '}
          {data && data.move_pending.length > 0 && (
            <span className="ml-1 rounded bg-[#f59e0b] px-1.5 py-0.5 text-xs text-slate-900">
              {data.move_pending.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('swaps')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'swaps'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
          }`}
        >
          🔄 Swap Requests{' '}
          {data && data.swap_pending.length > 0 && (
            <span className="ml-1 rounded bg-[#f59e0b] px-1.5 py-0.5 text-xs text-slate-900">
              {data.swap_pending.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'moves' && (
        <div>
          <h6 className="mb-2 text-sm font-semibold text-[#64748b]">Pending Move Requests</h6>
          <div className="mb-4 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                    <th className="p-3">Student</th>
                    <th className="p-3">Current Room</th>
                    <th className="p-3">Requested Room</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.move_pending.map((r) => (
                    <tr key={r.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                      <td className="p-3 font-medium">{r.student_name}</td>
                      <td className="p-3">{r.current_roomnumber || '—'}</td>
                      <td className="p-3 font-bold">Room {r.requested_roomnumber}</td>
                      <td className="max-w-[200px] truncate p-3">{r.reason}</td>
                      <td className="p-3">{formatMonthDay(r.createdat)}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setDetailMove(r)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Approve"
                            onClick={() => {
                              setRemark('');
                              setActionModal({ kind: 'move', action: 'approve', id: r.id });
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
                              setActionModal({ kind: 'move', action: 'reject', id: r.id });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data && data.move_pending.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#64748b]">
                        No pending move requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-[#64748b]">
              Approved ({data?.move_approved.length ?? 0}) · Rejected (
              {data?.move_rejected.length ?? 0})
            </summary>
            {data && data.move_approved.length > 0 && (
              <div className="mt-2">
                <h6 className="mb-1 text-xs font-semibold text-[#64748b]">Approved Moves</h6>
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">New Room</th>
                        <th className="p-2.5">Approved On</th>
                        <th className="p-2.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.move_approved.map((r) => (
                        <tr key={r.id} className="border-b border-[#e2e8f0] last:border-0">
                          <td className="p-2.5">{r.student_name}</td>
                          <td className="p-2.5">Room {r.requested_roomnumber}</td>
                          <td className="p-2.5">{formatMonthDay(r.approved_at)}</td>
                          <td className="p-2.5">{r.warden_remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {data && data.move_rejected.length > 0 && (
              <div className="mt-2">
                <h6 className="mb-1 text-xs font-semibold text-[#64748b]">Rejected Moves</h6>
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">Requested Room</th>
                        <th className="p-2.5">Rejected On</th>
                        <th className="p-2.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.move_rejected.map((r) => (
                        <tr key={r.id} className="border-b border-[#e2e8f0] last:border-0">
                          <td className="p-2.5">{r.student_name}</td>
                          <td className="p-2.5">Room {r.requested_roomnumber}</td>
                          <td className="p-2.5">{formatMonthDay(r.createdat)}</td>
                          <td className="p-2.5">{r.warden_remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </details>
        </div>
      )}

      {tab === 'swaps' && (
        <div>
          <h6 className="mb-2 text-sm font-semibold text-[#64748b]">
            Pending Swap Requests (both students agreed)
          </h6>
          <div className="mb-4 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                    <th className="p-3">Student A</th>
                    <th className="p-3">Room A</th>
                    <th className="p-3 text-center">↔</th>
                    <th className="p-3">Student B</th>
                    <th className="p-3">Room B</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.swap_pending.map((s) => (
                    <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                      <td className="p-3 font-medium">{s.requester_name}</td>
                      <td className="p-3">Room {s.requester_roomnumber || '—'}</td>
                      <td className="p-3 text-center text-[#64748b]">⇄</td>
                      <td className="p-3 font-medium">{s.target_name}</td>
                      <td className="p-3">Room {s.target_roomnumber || '—'}</td>
                      <td className="max-w-[180px] truncate p-3">{s.reason}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setDetailSwap(s)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Approve swap"
                            onClick={() => {
                              setRemark('');
                              setActionModal({ kind: 'swap', action: 'approve', id: s.id });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Reject swap"
                            onClick={() => {
                              setRemark('');
                              setActionModal({ kind: 'swap', action: 'reject', id: s.id });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data && data.swap_pending.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#64748b]">
                        No pending swap requests (both students must agree first).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-[#64748b]">
              Approved ({data?.swap_approved.length ?? 0}) · Rejected (
              {data?.swap_rejected.length ?? 0})
            </summary>
            {data && data.swap_approved.length > 0 && (
              <div className="mt-2">
                <h6 className="mb-1 text-xs font-semibold text-[#64748b]">Approved Swaps</h6>
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="p-2.5">Student A</th>
                        <th className="p-2.5">Student B</th>
                        <th className="p-2.5">Approved On</th>
                        <th className="p-2.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.swap_approved.map((s) => (
                        <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0">
                          <td className="p-2.5">{s.requester_name}</td>
                          <td className="p-2.5">{s.target_name}</td>
                          <td className="p-2.5">{formatMonthDay(s.approved_at)}</td>
                          <td className="p-2.5">{s.warden_remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {data && data.swap_rejected.length > 0 && (
              <div className="mt-2">
                <h6 className="mb-1 text-xs font-semibold text-[#64748b]">Rejected Swaps</h6>
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="p-2.5">Student A</th>
                        <th className="p-2.5">Student B</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.swap_rejected.map((s) => (
                        <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0">
                          <td className="p-2.5">{s.requester_name}</td>
                          <td className="p-2.5">{s.target_name}</td>
                          <td className="p-2.5">{s.status}</td>
                          <td className="p-2.5">{s.warden_remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </details>
        </div>
      )}

      {/* Move Details Modal */}
      {detailMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#1e293b]">Move Request Details</h5>
              <button
                type="button"
                onClick={() => setDetailMove(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-36 py-2 font-semibold text-[#64748b]">Student</td>
                    <td className="py-2">{detailMove.student_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Current Room</td>
                    <td className="py-2">Room {detailMove.current_roomnumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Requested Room</td>
                    <td className="py-2">Room {detailMove.requested_roomnumber}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Submitted</td>
                    <td className="py-2">{formatShortDate(detailMove.createdat)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 align-top font-semibold text-[#64748b]">Reason</td>
                    <td className="py-2">{detailMove.reason}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailMove(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Details Modal */}
      {detailSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#1e293b]">Swap Request Details</h5>
              <button
                type="button"
                onClick={() => setDetailSwap(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-36 py-2 font-semibold text-[#64748b]">Student A</td>
                    <td className="py-2">{detailSwap.requester_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Room A</td>
                    <td className="py-2">Room {detailSwap.requester_roomnumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Student B</td>
                    <td className="py-2">{detailSwap.target_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Room B</td>
                    <td className="py-2">Room {detailSwap.target_roomnumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">Submitted</td>
                    <td className="py-2">{formatShortDate(detailSwap.createdat)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 align-top font-semibold text-[#64748b]">Reason</td>
                    <td className="py-2">{detailSwap.reason}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailSwap(null)}
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
                  {actionModal.kind === 'move'
                    ? actionModal.action === 'approve'
                      ? 'Approve Move Request'
                      : 'Reject Move Request'
                    : actionModal.action === 'approve'
                    ? 'Approve Room Swap'
                    : 'Reject Room Swap'}
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
                  {actionModal.kind === 'move'
                    ? actionModal.action === 'approve'
                      ? 'Approve this room move? The student will be moved to the new room.'
                      : 'Reject this room move request?'
                    : actionModal.action === 'approve'
                    ? "Approve this swap? Both students will be moved to each other's rooms."
                    : 'Reject this room swap request?'}
                </p>
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">
                    Warden Remark <span className="font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Enter a remark..."
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
