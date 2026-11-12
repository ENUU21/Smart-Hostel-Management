import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CalendarX, Plus, Trash2, X } from 'lucide-react';
import type { RoomDTO, SidebarCounts } from '../../../shared/types';
import type { FlashMessage } from '../../components/WardenLayout';
import { ApiError, apiFetch } from '../../lib/api';

interface RoomsResponse {
  rooms: RoomDTO[];
  student_count: number;
  academic_years: number[];
  sidebar_counts: SidebarCounts;
}

interface WardenRoomsProps {
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenRooms({ onFlash, onCountsUpdate }: WardenRoomsProps) {
  const [data, setData] = useState<RoomsResponse | null>(null);

  // Add Room modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [roomnumber, setRoomnumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [roomErrors, setRoomErrors] = useState<Record<string, string>>({});

  // Delete Room confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<RoomDTO | null>(null);

  // New Academic Year modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [confirmText, setConfirmText] = useState('');

  const loadRooms = async () => {
    const res = await apiFetch<RoomsResponse>('/api/warden/rooms');
    setData(res);
    onCountsUpdate(res.sidebar_counts);
    if (res.academic_years.length > 0 && selectedYear === 'all') {
      setSelectedYear(String(res.academic_years[0]));
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleAddRoom = async (e: FormEvent) => {
    e.preventDefault();
    setRoomErrors({});
    try {
      const res = await apiFetch<{ message: string }>('/api/warden/rooms', {
        method: 'POST',
        body: JSON.stringify({ roomnumber, capacity: Number(capacity) }),
      });
      onFlash({ type: 'success', text: res.message });
      setShowAddModal(false);
      setRoomnumber('');
      setCapacity('4');
      await loadRooms();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setRoomErrors(err.errors);
      } else if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch<{ message: string }>(
        `/api/warden/rooms/${deleteTarget.id}`,
        { method: 'DELETE' },
      );
      onFlash({ type: 'success', text: res.message });
      setDeleteTarget(null);
      await loadRooms();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
        setDeleteTarget(null);
      }
    }
  };

  const handleNewAcademicYear = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/warden/new-academic-year', {
        method: 'POST',
        body: JSON.stringify({ year: selectedYear, confirm: confirmText }),
      });
      onFlash({ type: 'success', text: res.message });
      setShowYearModal(false);
      setConfirmText('');
      await loadRooms();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-[#64748b]">Click 'Add Room' to create a new hostel room</p>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h5 className="m-0 text-base font-bold text-[#1e293b]">🏠 All Rooms</h5>
          <span className="text-sm text-[#64748b]">· {data?.rooms.length ?? 0} total</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setShowYearModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#ef4444] px-4 py-2 text-sm font-semibold text-[#ef4444] hover:bg-red-50"
            >
              <CalendarX className="h-4 w-4" />
              New Academic Year
            </button>
            <button
              type="button"
              onClick={() => {
                setRoomErrors({});
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold text-[#1e293b]">
                <th className="p-3">Room #</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Occupied</th>
                <th className="p-3">Available</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.rooms.map((r) => (
                <tr key={r.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                  <td className="p-3 font-bold">{r.roomnumber}</td>
                  <td className="p-3">{r.capacity}</td>
                  <td className="p-3">{r.occupied}</td>
                  <td className="p-3">{r.available}</td>
                  <td className="p-3">
                    {r.status === 'Full' ? (
                      <span className="rounded-md bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white">
                        Full
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      disabled={r.occupied > 0}
                      onClick={() => setDeleteTarget(r)}
                      title={
                        r.occupied > 0 ? 'Cannot delete — room occupied' : 'Delete room'
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] text-slate-600 transition ${
                        r.occupied > 0
                          ? 'cursor-not-allowed opacity-40'
                          : 'hover:border-red-300 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data && data.rooms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64748b]">
                    No rooms yet. Click "Add Room" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleAddRoom}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">➕ Add New Room</h5>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A16"
                    value={roomnumber}
                    onChange={(e) => setRoomnumber(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      roomErrors.roomnumber ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {roomErrors.roomnumber && (
                    <p className="mt-1 text-xs text-[#ef4444]">{roomErrors.roomnumber}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      roomErrors.capacity ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {roomErrors.capacity && (
                    <p className="mt-1 text-xs text-[#ef4444]">{roomErrors.capacity}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className="rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]"
                >
                  Add Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Room Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#ef4444]">Delete Room</h5>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm">
              Delete Room <strong>{deleteTarget.roomnumber}</strong>? This cannot be undone.
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={handleDeleteRoom}
                className="rounded-lg bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Academic Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleNewAcademicYear}>
              <div className="flex items-center justify-between bg-[#ef4444] px-6 py-4 text-white">
                <h5 className="m-0 flex items-center gap-2 text-lg font-bold">
                  <AlertTriangle className="h-5 w-5" />
                  New Academic Year
                </h5>
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="rounded p-1 text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  <strong>Warning!</strong> This will permanently delete students and their
                  associated complaints, leave requests, and room change requests.
                </div>
                <p className="text-[#64748b]">
                  Rooms, notices, and your warden account will be preserved.
                </p>
                <div>
                  <label className="mb-1 block font-semibold text-[#64748b]">
                    Select which year to clear:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm"
                  >
                    {data?.academic_years.map((yr) => (
                      <option key={yr} value={String(yr)}>
                        Batch {yr}
                      </option>
                    ))}
                    <option value="all">
                      All Years (all {data?.student_count ?? 0} students)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block">
                    To confirm, type <code className="font-bold text-[#ef4444]">CLEAR</code> below:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type CLEAR"
                    autoComplete="off"
                    required
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626]"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Students
                </button>
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
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
