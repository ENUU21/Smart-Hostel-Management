export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type RoomChangeStatus = 'Pending' | 'Approved' | 'Rejected';
export type RoomSwapStatus =
  | 'Pending'
  | 'Accepted by Peer'
  | 'Approved'
  | 'Rejected by Peer'
  | 'Rejected by Warden';

export interface RoomDTO {
  id: number;
  roomnumber: string;
  capacity: number;
  occupied: number;
  available: number;
  status: 'Full' | 'Available';
}

export interface StudentDTO {
  id: number;
  fullname: string;
  username: string;
  email: string;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  academic_year: number;
  room_id: number | null;
  room: RoomDTO | null;
  createdat: string;
}

export interface ComplaintDTO {
  id: number;
  student_id: number;
  student_name: string;
  student_username: string;
  roomnumber: string | null;
  title: string;
  description: string;
  status: ComplaintStatus;
  createdat: string;
  is_overdue: boolean;
  age_days: number;
}

export interface NoticeDTO {
  id: number;
  title: string;
  description: string;
  createdat: string;
}

export interface LeaveRequestDTO {
  id: number;
  student_id: number;
  student_name: string;
  student_username: string;
  roomnumber: string | null;
  from_date: string;
  to_date: string;
  destination: string;
  reason: string;
  status: LeaveStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface RoomChangeRequestDTO {
  id: number;
  student_id: number;
  student_name: string;
  current_roomnumber: string | null;
  requested_room_id: number;
  requested_roomnumber: string;
  reason: string;
  status: RoomChangeStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface RoomSwapRequestDTO {
  id: number;
  requester_id: number;
  requester_name: string;
  requester_roomnumber: string | null;
  target_id: number;
  target_name: string;
  target_roomnumber: string | null;
  reason: string;
  status: RoomSwapStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface SidebarCounts {
  pending_leaves: number;
  pending_room_changes: number;
  pending_complaints: number;
}

export interface AuthSessionResponse {
  role: 'warden' | 'student' | null;
  warden_name?: string;
  student?: StudentDTO;
  sidebar_counts?: SidebarCounts;
}
