import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  DoorClosed,
  GraduationCap,
  LogOut,
  Megaphone,
  MessageSquareText,
  PlaneTakeoff,
  ShieldCheck,
  UserSquare2,
} from 'lucide-react';
import type {
  ComplaintDTO,
  LeaveRequestDTO,
  RoomChangeRequestDTO,
  StudentDTO,
} from '../../../shared/types';
import {
  LeaveStatusBadge,
  RoomChangeStatusBadge,
} from '../../components/StatusBadges';
import { StudentTopbar } from '../../components/StudentTopbar';
import type { FlashMessage } from '../../components/WardenLayout';
import { apiFetch, formatFullDateTime, formatShortDate } from '../../lib/api';

interface ProfileResponse {
  student: StudentDTO;
  my_complaints: ComplaintDTO[];
  my_leaves: LeaveRequestDTO[];
  my_room_changes: RoomChangeRequestDTO[];
  complaints_count: number;
  leaves_count: number;
  room_changes_count: number;
}

interface StudentProfileProps {
  flash: FlashMessage | null;
  onDismissFlash: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function StudentProfile({
  flash,
  onDismissFlash,
  onNavigate,
  onLogout,
}: StudentProfileProps) {
  const [data, setData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    apiFetch<ProfileResponse>('/api/student/profile').then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] p-6">
        <div className="py-12 text-center text-sm text-[#64748b]">Loading profile...</div>
      </div>
    );
  }

  const { student } = data;
  const joinedMonthYear = new Date(student.createdat).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title="👤 My Profile"
        onNavigate={onNavigate}
        flash={flash}
        onDismissFlash={onDismissFlash}
        rightSlot={
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ef4444] px-4 py-2 text-sm font-semibold text-[#ef4444] hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        }
      />

      {/* Profile Header Card */}
      <div className="profile-header-card mb-5 rounded-xl border border-[#e2e8f0] p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-5">
          <div className="profile-avatar">
            {student.fullname.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-[200px] flex-1">
            <h2 className="mb-1 text-2xl font-bold text-[#1e293b]">{student.fullname}</h2>
            <p className="mb-2 text-sm text-[#64748b]">@{student.username}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                <DoorClosed className="h-3.5 w-3.5" />
                Room {student.room?.roomnumber || 'Not assigned'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                <GraduationCap className="h-3.5 w-3.5" />
                Batch {student.academic_year}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                <Calendar className="h-3.5 w-3.5" />
                Joined {joinedMonthYear}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/student/complaint')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-[#d97706]"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Complaint
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/student/leave-request')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0ea5e9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0284c7]"
            >
              <PlaneTakeoff className="h-3.5 w-3.5" />
              Leave
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/student/room-transfer')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transfer Room
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/student/notices')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-3 py-2 text-xs font-semibold text-white hover:bg-[#059669]"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Notices
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#f59e0b]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.complaints_count}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Complaints</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-[#0ea5e9]">
            <PlaneTakeoff className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.leaves_count}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Leave Requests</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.room_changes_count}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Room Changes</div>
          </div>
        </div>
      </div>

      {/* Two Column Details & Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <UserSquare2 className="h-4 w-4 text-[#1e293b]" />
              <h5 className="m-0 text-base font-bold text-[#1e293b]">Contact Details</h5>
            </div>
            <div className="p-5 text-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-28 py-2 font-semibold text-[#64748b]">📧 Email</td>
                    <td className="py-2">{student.email || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">📱 Phone</td>
                    <td className="py-2">{student.phone || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">🏠 Room</td>
                    <td className="py-2">
                      {student.room ? (
                        <>
                          Room {student.room.roomnumber}{' '}
                          <span className="text-xs text-[#64748b]">
                            ({student.room.occupied}/{student.room.capacity} occupied)
                          </span>
                        </>
                      ) : (
                        <span className="text-[#64748b]">Not assigned</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">📅 Joined</td>
                    <td className="py-2">{formatFullDateTime(student.createdat)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <ShieldCheck className="h-4 w-4 text-[#1e293b]" />
              <h5 className="m-0 text-base font-bold text-[#1e293b]">Guardian / Parent</h5>
            </div>
            <div className="p-5 text-sm">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-28 py-2 font-semibold text-[#64748b]">👤 Name</td>
                    <td className="py-2">{student.guardian_name || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-[#64748b]">📞 Phone</td>
                    <td className="py-2">{student.guardian_phone || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Recent Complaints */}
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <h5 className="m-0 flex items-center gap-2 text-base font-bold text-[#1e293b]">
                <MessageSquareText className="h-4 w-4" />
                Recent Complaints
              </h5>
              <span className="rounded bg-[#f59e0b] px-2 py-0.5 text-xs font-bold text-slate-900">
                {data.complaints_count}
              </span>
            </div>
            {data.my_complaints.length > 0 ? (
              <ul className="divide-y divide-[#e2e8f0]">
                {data.my_complaints.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <div className="font-semibold text-[#1e293b]">{c.title}</div>
                      <small className="text-xs text-[#64748b]">
                        {formatShortDate(c.createdat)}
                      </small>
                    </div>
                    {c.status === 'Pending' ? (
                      <span className="rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-semibold text-slate-900">
                        🟡 Pending
                      </span>
                    ) : c.status === 'In Progress' ? (
                      <span className="rounded-md bg-[#0ea5e9] px-2.5 py-1 text-xs font-semibold text-white">
                        🔵 In Progress
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
                        🟢 Resolved
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-[#64748b]">No complaints filed yet.</p>
            )}
          </div>

          {/* Recent Leave Requests */}
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <h5 className="m-0 flex items-center gap-2 text-base font-bold text-[#1e293b]">
                <PlaneTakeoff className="h-4 w-4" />
                Recent Leave Requests
              </h5>
              <span className="rounded bg-[#0ea5e9] px-2 py-0.5 text-xs font-bold text-white">
                {data.leaves_count}
              </span>
            </div>
            {data.my_leaves.length > 0 ? (
              <ul className="divide-y divide-[#e2e8f0]">
                {data.my_leaves.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <div className="font-semibold text-[#1e293b]">{l.destination}</div>
                      <small className="text-xs text-[#64748b]">
                        {l.from_date} → {l.to_date}
                      </small>
                    </div>
                    {l.status === 'Approved' ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(`/student/leave-request/${l.id}/gate-pass`)}
                        className="rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#059669]"
                      >
                        🟢 Gate Pass
                      </button>
                    ) : (
                      <LeaveStatusBadge status={l.status} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-[#64748b]">No leave requests yet.</p>
            )}
          </div>

          {/* Recent Room Change Requests */}
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <h5 className="m-0 flex items-center gap-2 text-base font-bold text-[#1e293b]">
                <ArrowLeftRight className="h-4 w-4" />
                Room Change Requests
              </h5>
              <span className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                {data.room_changes_count}
              </span>
            </div>
            {data.my_room_changes.length > 0 ? (
              <ul className="divide-y divide-[#e2e8f0]">
                {data.my_room_changes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <div className="font-semibold text-[#1e293b]">
                        → Room {r.requested_roomnumber}
                      </div>
                      <small className="text-xs text-[#64748b]">
                        {formatShortDate(r.createdat)}
                      </small>
                    </div>
                    <RoomChangeStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-[#64748b]">
                No room change requests yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
