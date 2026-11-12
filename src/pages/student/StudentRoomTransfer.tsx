import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  Check,
  Repeat,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import type {
  RoomChangeRequestDTO,
  RoomDTO,
  RoomSwapRequestDTO,
  StudentDTO,
} from '../../../shared/types';
import {
  RoomChangeStatusBadge,
  RoomSwapStatusBadge,
} from '../../components/StatusBadges';
import { StudentTopbar } from '../../components/StudentTopbar';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch, formatMonthDay, formatShortDate } from '../../lib/api';

interface RoomTransferResponse {
  student: StudentDTO;
  my_moves: RoomChangeRequestDTO[];
  my_swaps_sent: RoomSwapRequestDTO[];
  my_swaps_received: RoomSwapRequestDTO[];
  rooms_with_space: RoomDTO[];
  other_students: StudentDTO[];
  can_request: boolean;
}

interface StudentRoomTransferProps {
  flash: FlashMessage | null;
  onFlash: (flash: FlashMessage) => void;
  onDismissFlash: () => void;
  onNavigate: (path: string) => void;
}

export function StudentRoomTransfer({
  flash,
  onFlash,
  onDismissFlash,
  onNavigate,
}: StudentRoomTransferProps) {
  const [data, setData] = useState<RoomTransferResponse | null>(null);
  const [tab, setTab] = useState<'moves' | 'sent' | 'received'>('moves');

  // Move modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [requestedRoom, setRequestedRoom] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [moveErrors, setMoveErrors] = useState<Record<string, string>>({});

  // Swap modal
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [swapErrors, setSwapErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    const res = await apiFetch<RoomTransferResponse>('/api/student/room-transfer');
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMoveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMoveErrors({});
    try {
      const res = await apiFetch<{ message: string }>('/api/student/room-transfer/move', {
        method: 'POST',
        body: JSON.stringify({
          requested_room: requestedRoom,
          reason: moveReason,
        }),
      });
      onFlash({ type: 'success', text: res.message });
      setShowMoveModal(false);
      setRequestedRoom('');
      setMoveReason('');
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setMoveErrors(err.errors);
      } else if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  const handleSwapSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSwapErrors({});
    try {
      const res = await apiFetch<{ message: string }>('/api/student/room-transfer/swap', {
        method: 'POST',
        body: JSON.stringify({
          target: targetStudent,
          reason: swapReason,
        }),
      });
      onFlash({ type: 'success', text: res.message });
      setShowSwapModal(false);
      setTargetStudent('');
      setSwapReason('');
      setTab('sent');
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setSwapErrors(err.errors);
      } else if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  const postAction = async (url: string) => {
    try {
      const res = await apiFetch<{ message: string }>(url, { method: 'POST' });
      onFlash({ type: 'success', text: res.message });
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title="🔄 Room Transfer"
        backPath="/student/profile"
        onNavigate={onNavigate}
        flash={flash}
        onDismissFlash={onDismissFlash}
      />

      <p className="mb-2 text-sm text-[#64748b]">
        Request to move to an empty room, or swap rooms with another student. You can only have{' '}
        <strong>one active request</strong> at a time.
      </p>
      {data?.student.room && (
        <p className="mb-4 text-xs text-[#64748b]">
          Your current room: <strong>Room {data.student.room.roomnumber}</strong>
        </p>
      )}

      {data && !data.can_request && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            You already have an active room transfer request. You must wait for it to be
            resolved (approved or rejected) before creating a new one.
          </span>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={data ? !data.can_request : true}
          onClick={() => {
            setMoveErrors({});
            setShowMoveModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowRightCircle className="h-4 w-4" />
          Move to Empty Room
        </button>
        <button
          type="button"
          disabled={data ? !data.can_request : true}
          onClick={() => {
            setSwapErrors({});
            setShowSwapModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Repeat className="h-4 w-4" />
          Swap with Student
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-[#e2e8f0]">
        <button
          type="button"
          onClick={() => setTab('moves')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'moves'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b]'
          }`}
        >
          📋 Move Requests{' '}
          {data && data.my_moves.length > 0 && (
            <span className="ml-1 rounded bg-slate-600 px-1.5 py-0.5 text-xs text-white">
              {data.my_moves.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('sent')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'sent'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b]'
          }`}
        >
          📤 Swaps Sent{' '}
          {data && data.my_swaps_sent.length > 0 && (
            <span className="ml-1 rounded bg-slate-600 px-1.5 py-0.5 text-xs text-white">
              {data.my_swaps_sent.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('received')}
          className={`rounded-t-lg border px-4 py-2 text-sm font-semibold ${
            tab === 'received'
              ? 'border-[#e2e8f0] border-b-white bg-white text-[#1e293b]'
              : 'border-transparent text-[#64748b]'
          }`}
        >
          📥 Swaps Received{' '}
          {data && data.my_swaps_received.length > 0 && (
            <span className="ml-1 rounded bg-slate-600 px-1.5 py-0.5 text-xs text-white">
              {data.my_swaps_received.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'moves' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">Requested Room</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Warden Remark</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.my_moves.map((r) => (
                  <tr key={r.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-bold">Room {r.requested_roomnumber}</td>
                    <td className="max-w-[250px] truncate p-3">{r.reason}</td>
                    <td className="p-3">
                      <RoomChangeStatusBadge status={r.status} />
                    </td>
                    <td className="p-3 text-[#64748b]">{formatShortDate(r.createdat)}</td>
                    <td className="p-3">{r.warden_remark || '—'}</td>
                    <td className="p-3 text-right">
                      {r.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() =>
                            postAction(`/api/student/room-transfer/move/${r.id}/cancel`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ef4444] px-2.5 py-1 text-xs font-semibold text-[#ef4444] hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-[#64748b]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data && data.my_moves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748b]">
                      No room move requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sent' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">Swap With</th>
                  <th className="p-3">Their Room</th>
                  <th className="p-3">Your Room</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.my_swaps_sent.map((s) => (
                  <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-medium">{s.target_name}</td>
                    <td className="p-3">Room {s.target_roomnumber || '—'}</td>
                    <td className="p-3">Room {s.requester_roomnumber || '—'}</td>
                    <td className="max-w-[200px] truncate p-3">{s.reason}</td>
                    <td className="p-3">
                      <RoomSwapStatusBadge status={s.status} perspective="sender" />
                    </td>
                    <td className="p-3 text-[#64748b]">{formatMonthDay(s.createdat)}</td>
                    <td className="p-3 text-right">
                      {s.status === 'Pending' || s.status === 'Accepted by Peer' ? (
                        <button
                          type="button"
                          onClick={() =>
                            postAction(`/api/student/room-transfer/swap/${s.id}/cancel`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ef4444] px-2.5 py-1 text-xs font-semibold text-[#ef4444] hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-[#64748b]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data && data.my_swaps_sent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748b]">
                      No swap requests sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'received' && (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold">
                  <th className="p-3">From</th>
                  <th className="p-3">Their Room</th>
                  <th className="p-3">Your Room</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.my_swaps_received.map((s) => (
                  <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                    <td className="p-3 font-medium">{s.requester_name}</td>
                    <td className="p-3">Room {s.requester_roomnumber || '—'}</td>
                    <td className="p-3">Room {s.target_roomnumber || '—'}</td>
                    <td className="max-w-[200px] truncate p-3">{s.reason}</td>
                    <td className="p-3">
                      <RoomSwapStatusBadge status={s.status} perspective="receiver" />
                    </td>
                    <td className="p-3 text-right">
                      {s.status === 'Pending' ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              postAction(`/api/student/room-transfer/swap/${s.id}/accept`)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#059669]"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              postAction(`/api/student/room-transfer/swap/${s.id}/reject`)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#dc2626]"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748b]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data && data.my_swaps_received.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748b]">
                      No swap requests received.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleMoveSubmit}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">📦 Move to Empty Room</h5>
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6 text-sm">
                {data?.student.room && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900">
                    <strong>Current room:</strong> Room {data.student.room.roomnumber}
                  </div>
                )}
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">
                    Requested Room
                  </label>
                  <select
                    value={requestedRoom}
                    onChange={(e) => setRequestedRoom(e.target.value)}
                    required
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${
                      moveErrors.requested_room ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  >
                    <option value="">— Select a room —</option>
                    {data?.rooms_with_space.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomnumber} · {r.occupied}/{r.capacity} occupied
                      </option>
                    ))}
                  </select>
                  {moveErrors.requested_room && (
                    <p className="mt-1 text-xs text-[#ef4444]">{moveErrors.requested_room}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">Reason</label>
                  <textarea
                    rows={4}
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    placeholder="Why do you want to change rooms?"
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      moveErrors.reason ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {moveErrors.reason && (
                    <p className="mt-1 text-xs text-[#ef4444]">{moveErrors.reason}</p>
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
                  onClick={() => setShowMoveModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSwapSubmit}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">
                  🔄 Swap with Another Student
                </h5>
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6 text-sm">
                {data?.student.room && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900">
                    <strong>Your room:</strong> Room {data.student.room.roomnumber}
                  </div>
                )}
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">Swap With</label>
                  <select
                    value={targetStudent}
                    onChange={(e) => setTargetStudent(e.target.value)}
                    required
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${
                      swapErrors.target ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  >
                    <option value="">— Select a student —</option>
                    {data?.other_students.map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.fullname} — Room {other.room?.roomnumber || '—'}
                      </option>
                    ))}
                  </select>
                  {swapErrors.target && (
                    <p className="mt-1 text-xs text-[#ef4444]">{swapErrors.target}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">Reason</label>
                  <textarea
                    rows={4}
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="Why do you want to swap rooms?"
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      swapErrors.reason ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {swapErrors.reason && (
                    <p className="mt-1 text-xs text-[#ef4444]">{swapErrors.reason}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  <Send className="h-4 w-4" />
                  Send Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
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
