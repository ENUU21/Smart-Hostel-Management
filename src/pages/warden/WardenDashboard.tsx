import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  DoorClosed,
  GraduationCap,
  MessageSquareText,
  PlaneTakeoff,
  XCircle,
} from 'lucide-react';
import type { ComplaintDTO, SidebarCounts } from '../../../shared/types';
import { apiFetch, formatDateTime } from '../../lib/api';

interface DashboardResponse {
  warden_name: string;
  total_students: number;
  total_rooms: number;
  available_rooms: number;
  full_rooms: number;
  recent_complaints: ComplaintDTO[];
  pending_leaves: number;
  pending_room_changes: number;
  pending_complaints: number;
  all_rooms_full: boolean;
  sidebar_counts: SidebarCounts;
}

interface WardenDashboardProps {
  onNavigate: (path: string) => void;
  onCountsUpdate: (counts: SidebarCounts) => void;
}

export function WardenDashboard({ onNavigate, onCountsUpdate }: WardenDashboardProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    apiFetch<DashboardResponse>('/api/warden/dashboard').then((res) => {
      setData(res);
      onCountsUpdate(res.sidebar_counts);
    });
  }, []);

  if (!data) {
    return <div className="py-12 text-center text-sm text-[#64748b]">Loading dashboard...</div>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[#64748b]">Overview of your hostel today</p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card stat-primary">
          <div className="mb-2 text-[#0ea5e9]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="text-sm text-[#64748b]">Total Students</div>
          <div className="text-[30px] font-bold text-[#1e293b]">{data.total_students}</div>
        </div>
        <div className="stat-card stat-success">
          <div className="mb-2 text-[#10b981]">
            <DoorClosed className="h-6 w-6" />
          </div>
          <div className="text-sm text-[#64748b]">Total Rooms</div>
          <div className="text-[30px] font-bold text-[#1e293b]">{data.total_rooms}</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="mb-2 text-[#f59e0b]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="text-sm text-[#64748b]">Available</div>
          <div className="text-[30px] font-bold text-[#1e293b]">{data.available_rooms}</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="mb-2 text-[#ef4444]">
            <XCircle className="h-6 w-6" />
          </div>
          <div className="text-sm text-[#64748b]">Full</div>
          <div className="text-[30px] font-bold text-[#1e293b]">{data.full_rooms}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate('/warden/complaints')}
          className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 text-left shadow-xs transition hover:border-[#0ea5e9]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#f59e0b]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.pending_complaints}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Pending Complaints</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/warden/leave-requests')}
          className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 text-left shadow-xs transition hover:border-[#0ea5e9]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-[#0ea5e9]">
            <PlaneTakeoff className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.pending_leaves}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Pending Leave Requests</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/warden/room-change-requests')}
          className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 text-left shadow-xs transition hover:border-[#0ea5e9]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none text-[#1e293b]">
              {data.pending_room_changes}
            </div>
            <div className="mt-1 text-[13px] text-[#64748b]">Pending Room Changes</div>
          </div>
        </button>
      </div>

      <h3 className="mb-3 text-lg font-bold text-[#1e293b]">Recent Complaints</h3>
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] font-semibold text-[#1e293b]">
                <th className="p-3">Student</th>
                <th className="p-3">Room</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_complaints.map((c) => (
                <tr key={c.id} className="border-b border-[#e2e8f0] last:border-0 hover:bg-[#f8fafc]">
                  <td className="p-3 font-medium">{c.student_name}</td>
                  <td className="p-3">{c.roomnumber || '—'}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">
                    {c.status === 'Pending' && (
                      <span className="inline-flex rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-semibold text-slate-900">
                        🟡 {c.status}
                      </span>
                    )}
                    {c.status === 'In Progress' && (
                      <span className="inline-flex rounded-md bg-[#0ea5e9] px-2.5 py-1 text-xs font-semibold text-white">
                        🔵 {c.status}
                      </span>
                    )}
                    {c.status === 'Resolved' && (
                      <span className="inline-flex rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
                        🟢 {c.status}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-[#64748b]">{formatDateTime(c.createdat)}</td>
                </tr>
              ))}
              {data.recent_complaints.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#64748b]">
                    No complaints yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
