import type {
  ComplaintStatus,
  LeaveStatus,
  RoomChangeStatus,
  RoomSwapStatus,
} from '../../shared/types';

export function ComplaintStatusBadge({
  status,
  isOverdue,
  ageDays,
}: {
  status: ComplaintStatus;
  isOverdue?: boolean;
  ageDays?: number;
}) {
  if (status === 'Pending' && isOverdue) {
    return (
      <span
        title={`Pending for ${ageDays ?? 0} days — needs attention!`}
        className="badge-overdue inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
      >
        <span className="pulse-dot" />
        Pending · {ageDays}d
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#fde68a] bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#92400e]">
        Pending
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#93c5fd] bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#1e40af]">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#6ee7b7] bg-[#d1fae5] px-3 py-1 text-xs font-semibold text-[#065f46]">
      Resolved
    </span>
  );
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
        🟢 Approved
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-semibold text-slate-900">
        🟡 Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white">
      🔴 Rejected
    </span>
  );
}

export function RoomChangeStatusBadge({ status }: { status: RoomChangeStatus }) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
        🟢 Approved
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-semibold text-slate-900">
        🟡 Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white">
      🔴 Rejected
    </span>
  );
}

export function RoomSwapStatusBadge({
  status,
  perspective = 'sender',
}: {
  status: RoomSwapStatus;
  perspective?: 'sender' | 'receiver';
}) {
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-semibold text-slate-900">
        {perspective === 'sender' ? '🟡 Pending (awaiting peer)' : '🟡 Pending'}
      </span>
    );
  }
  if (status === 'Accepted by Peer') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#0ea5e9] px-2.5 py-1 text-xs font-semibold text-white">
        {perspective === 'sender' ? '🔵 Accepted (awaiting warden)' : '🔵 Accepted'}
      </span>
    );
  }
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#10b981] px-2.5 py-1 text-xs font-semibold text-white">
        🟢 Approved
      </span>
    );
  }
  if (status === 'Rejected by Peer') {
    return (
      <span className="inline-flex items-center rounded-md bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white">
        {perspective === 'sender' ? '🔴 Rejected by peer' : '🔴 Rejected by you'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-[#ef4444] px-2.5 py-1 text-xs font-semibold text-white">
      🔴 Rejected by warden
    </span>
  );
}
