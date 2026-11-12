import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { LeaveRequestDTO, StudentDTO } from '../../../shared/types';
import { StudentTopbar } from '../../components/StudentTopbar';
import { ApiError, apiFetch, formatFullDateTime } from '../../lib/api';

interface GatePassResponse {
  student: StudentDTO;
  leave: LeaveRequestDTO;
  warden_name: string;
}

interface StudentGatePassProps {
  leaveId: number;
  onNavigate: (path: string) => void;
}

export function StudentGatePass({ leaveId, onNavigate }: StudentGatePassProps) {
  const [data, setData] = useState<GatePassResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<GatePassResponse>(`/api/student/leave-requests/${leaveId}/gate-pass`)
      .then(setData)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Unable to load gate pass.');
      });
  }, [leaveId]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <StudentTopbar
        title={`🎫 Gate Pass #${leaveId}`}
        backPath="/student/leave-request"
        onNavigate={onNavigate}
        rightSlot={
          data && (
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-1.5 rounded-lg border border-[#0ea5e9] px-4 py-2 text-sm font-semibold text-[#0ea5e9] hover:bg-sky-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          )
        }
      />

      {error && (
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="mx-auto max-w-2xl">
          <div className="gate-pass bg-white p-8">
            <div className="mb-6 border-b border-[#e2e8f0] pb-4 text-center">
              <h2 className="m-0 text-2xl font-bold text-[#1e293b]">🏠 Smart Hostel</h2>
              <p className="m-0 text-sm text-[#64748b]">Gate Pass</p>
            </div>

            <div className="mb-6 text-center">
              <div className="inline-block rounded-lg bg-[#f0f9ff] px-4 py-2 text-lg">
                <span className="text-[#64748b]">Pass No. </span>
                <strong>#{String(data.leave.id).padStart(4, '0')}</strong>
              </div>
            </div>

            <table className="w-full text-[15px]">
              <tbody>
                <tr>
                  <td className="w-40 py-1.5 font-semibold text-[#64748b]">Student Name</td>
                  <td className="py-1.5">: {data.student.fullname}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Username</td>
                  <td className="py-1.5">: {data.student.username}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Room</td>
                  <td className="py-1.5">: {data.student.room?.roomnumber || 'Not assigned'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Leaving From</td>
                  <td className="py-1.5">: {data.leave.from_date}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Returning By</td>
                  <td className="py-1.5">: {data.leave.to_date}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Destination</td>
                  <td className="py-1.5">: {data.leave.destination}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Reason</td>
                  <td className="py-1.5">: {data.leave.reason}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold text-[#64748b]">Approved On</td>
                  <td className="py-1.5">: {formatFullDateTime(data.leave.approved_at)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-[#e2e8f0] pt-6 text-center">
              <div>
                <div className="mb-2 h-10 border-b-2 border-[#333]" />
                <small className="text-xs text-[#64748b]">Student Signature</small>
              </div>
              <div>
                <div className="mb-2 h-10 border-b-2 border-[#333]" />
                <small className="text-xs text-[#64748b]">Warden Signature</small>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="gate-pass-stamp">APPROVED</span>
            </div>

            <p className="mt-6 text-center text-xs text-[#64748b]">
              This gate pass was generated electronically. Please carry it with you when
              leaving and returning to the hostel.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
