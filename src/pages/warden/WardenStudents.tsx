import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { RoomDTO, SidebarCounts, StudentDTO } from '../../../shared/types';
import type { FlashMessage } from '../../components/WardenLayout';
import { PasswordInput } from '../../components/PasswordInput';
import { ApiError, apiFetch } from '../../lib/api';

interface StudentsResponse {
  students: StudentDTO[];
  query: string;
  shown: number;
  total: number;
  search_kind: string | null;
  all_rooms: RoomDTO[];
  rooms_with_space: RoomDTO[];
  all_rooms_full: boolean;
  sidebar_counts: SidebarCounts;
}

interface WardenStudentsProps {
  onNavigate: (path: string) => void;
  onFlash: (flash: FlashMessage) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenStudents({
  onNavigate,
  onFlash,
  onCountsUpdate,
}: WardenStudentsProps) {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<StudentDTO | null>(null);

  const loadStudents = async (q = debouncedQuery) => {
    const res = await apiFetch<StudentsResponse>(
      `/api/warden/students?q=${encodeURIComponent(q)}`,
    );
    setData(res);
    onCountsUpdate(res.sidebar_counts);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    loadStudents(debouncedQuery);
  }, [debouncedQuery]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 3,
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  const openAdd = () => {
    setModalMode('add');
    setEditId(null);
    setFullname('');
    setUsername('');
    setPassword('');
    setEmail('');
    setAcademicYear(String(currentYear));
    setPhone('');
    setGuardianName('');
    setGuardianPhone('');
    setRoomId(data?.rooms_with_space[0] ? String(data.rooms_with_space[0].id) : '');
    setFormErrors({});
  };

  const openEdit = (s: StudentDTO) => {
    setModalMode('edit');
    setEditId(s.id);
    setFullname(s.fullname);
    setUsername(s.username);
    setPassword('');
    setEmail(s.email);
    setAcademicYear(String(s.academic_year || currentYear));
    setPhone(s.phone);
    setGuardianName(s.guardian_name);
    setGuardianPhone(s.guardian_phone);
    setRoomId(s.room_id ? String(s.room_id) : '');
    setFormErrors({});
  };

  const dropdownRooms = (() => {
    if (!data) return [];
    if (modalMode === 'add') return data.rooms_with_space;
    const editingStudent = data.students.find((s) => s.id === editId);
    const currentRoomId = editingStudent?.room_id;
    return data.all_rooms.filter((r) => r.available > 0 || r.id === currentRoomId);
  })();

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      const payload = {
        fullname,
        username,
        password,
        email,
        academic_year: Number(academicYear),
        phone,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        room_id: roomId ? Number(roomId) : null,
      };
      if (modalMode === 'add') {
        const res = await apiFetch<{ message: string }>('/api/warden/students', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onFlash({ type: 'success', text: res.message });
      } else if (modalMode === 'edit' && editId) {
        const res = await apiFetch<{ message: string }>(`/api/warden/students/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onFlash({ type: 'success', text: res.message });
      }
      setModalMode(null);
      await loadStudents();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFormErrors(err.errors);
      } else if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch<{ message: string }>(
        `/api/warden/students/${deleteTarget.id}`,
        { method: 'DELETE' },
      );
      onFlash({ type: 'success', text: res.message });
      setDeleteTarget(null);
      await loadStudents();
    } catch (err) {
      if (err instanceof ApiError) {
        onFlash({ type: 'danger', text: err.message });
      }
    }
  };

  const sanitizePhone = (val: string) => val.replace(/\D/g, '').slice(0, 10);

  return (
    <div>
      <p className="mb-3 text-sm text-[#64748b]">
        Add, edit and search students by name or room number
      </p>

      {data?.all_rooms_full && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <strong>All rooms are full!</strong> You cannot admit new students until more rooms
            are added.{' '}
            <button
              type="button"
              onClick={() => onNavigate('/warden/rooms')}
              className="font-semibold underline"
            >
              Go to Rooms →
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h5 className="m-0 text-base font-bold text-[#1e293b]">👨‍🎓 All Students</h5>
          <span className="text-sm text-[#64748b]">
            {data ? (
              data.query ? (
                <>
                  · {data.shown} of {data.total} ({data.search_kind})
                </>
              ) : (
                <>· {data.total} total</>
              )
            ) : null}
          </span>
          <button
            type="button"
            disabled={data?.all_rooms_full}
            onClick={openAdd}
            title={data?.all_rooms_full ? 'All rooms are full' : 'Add Student'}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              data?.all_rooms_full
                ? 'cursor-not-allowed bg-slate-400'
                : 'bg-[#10b981] hover:bg-[#059669]'
            }`}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-[#64748b]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name, or digits to search by room number"
            autoComplete="off"
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm outline-none transition focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold text-[#1e293b]">
                <th className="p-3">ID</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Year</th>
                <th className="p-3">Room</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Guardian</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.students.map((s) => (
                <tr key={s.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                  <td className="p-3 text-[#64748b]">{s.id}</td>
                  <td className="p-3 font-medium">{s.fullname}</td>
                  <td className="p-3">{s.username}</td>
                  <td className="p-3 text-[#64748b]">{s.email || '—'}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-slate-600 px-2 py-1 text-xs font-semibold text-white">
                      {s.academic_year}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{s.room?.roomnumber || '—'}</td>
                  <td className="p-3">{s.phone || '—'}</td>
                  <td className="p-3">
                    {s.guardian_name ? (
                      <div>
                        <div>{s.guardian_name}</div>
                        <small className="text-xs text-[#64748b]">📞 {s.guardian_phone}</small>
                      </div>
                    ) : (
                      <span className="text-[#64748b]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        title="Edit student"
                        className="rounded-lg bg-[#0ea5e9] p-2 text-white hover:bg-[#0284c7]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        title="Delete student"
                        className="rounded-lg bg-[#ef4444] p-2 text-white hover:bg-[#dc2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.students.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748b]">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSave}>
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                <h5 className="m-0 text-lg font-bold text-[#1e293b]">
                  {modalMode === 'add' ? '➕ Add New Student' : `✏️ Edit Student — ${fullname}`}
                </h5>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 p-6">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      formErrors.fullname ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {formErrors.fullname && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.fullname}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      formErrors.username ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {formErrors.username && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Password
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    required={modalMode === 'add'}
                    hasError={Boolean(formErrors.password)}
                    placeholder={
                      modalMode === 'edit' ? 'Leave blank to keep current password' : 'Enter password'
                    }
                  />
                  <small className="mt-1 block text-xs text-[#64748b]">
                    {modalMode === 'add'
                      ? 'Required. Min 4 characters.'
                      : 'Leave blank to keep the current password.'}
                  </small>
                  {formErrors.password && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.password}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                        formErrors.email ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-[#ef4444]">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                      Academic Year
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      required
                      className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm outline-none"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Phone (10-digit Indian mobile)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      formErrors.phone ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.phone}</p>
                  )}
                </div>

                <hr className="border-[#e2e8f0]" />

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    placeholder="Parent or guardian full name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      formErrors.guardian_name ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {formErrors.guardian_name && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.guardian_name}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Guardian Phone (10-digit Indian mobile)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(sanitizePhone(e.target.value))}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      formErrors.guardian_phone ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  />
                  {formErrors.guardian_phone && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.guardian_phone}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#64748b]">
                    Room <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                      formErrors.room ? 'border-[#ef4444]' : 'border-[#e2e8f0]'
                    }`}
                  >
                    {dropdownRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomnumber} · {r.occupied}/{r.capacity} beds filled
                      </option>
                    ))}
                  </select>
                  {formErrors.room && (
                    <p className="mt-1 text-xs text-[#ef4444]">{formErrors.room}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
                >
                  {modalMode === 'add' ? 'Add Student' : 'Update Student'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h5 className="m-0 text-lg font-bold text-[#ef4444]">Confirm Delete</h5>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-sm">
              <p className="mb-2">
                Delete student <strong>{deleteTarget.fullname}</strong>?
              </p>
              <p className="m-0 text-xs text-[#64748b]">
                This will also delete their complaints, leave requests, and room transfer requests.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-6 py-4">
              <button
                type="button"
                onClick={handleDelete}
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
    </div>
  );
}
