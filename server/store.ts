import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ComplaintDTO,
  ComplaintStatus,
  LeaveRequestDTO,
  LeaveStatus,
  NoticeDTO,
  RoomChangeRequestDTO,
  RoomChangeStatus,
  RoomDTO,
  RoomSwapRequestDTO,
  RoomSwapStatus,
  SidebarCounts,
  StudentDTO,
} from '../shared/types.js';

export interface WardenRecord {
  id: number;
  username: string;
  password: string;
}

export interface RoomRecord {
  id: number;
  roomnumber: string;
  capacity: number;
}

export interface StudentRecord {
  id: number;
  fullname: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  academic_year: number;
  room_id: number;
  createdat: string;
}

export interface ComplaintRecord {
  id: number;
  student_id: number;
  title: string;
  description: string;
  status: ComplaintStatus;
  createdat: string;
}

export interface NoticeRecord {
  id: number;
  title: string;
  description: string;
  createdat: string;
}

export interface LeaveRequestRecord {
  id: number;
  student_id: number;
  from_date: string;
  to_date: string;
  destination: string;
  reason: string;
  status: LeaveStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface RoomChangeRequestRecord {
  id: number;
  student_id: number;
  requested_room_id: number;
  reason: string;
  status: RoomChangeStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface RoomSwapRequestRecord {
  id: number;
  requester_id: number;
  target_id: number;
  reason: string;
  status: RoomSwapStatus;
  warden_remark: string;
  createdat: string;
  approved_at: string | null;
}

export interface DatabaseState {
  nextId: {
    warden: number;
    room: number;
    student: number;
    complaint: number;
    notice: number;
    leave: number;
    roomChange: number;
    roomSwap: number;
  };
  wardens: WardenRecord[];
  rooms: RoomRecord[];
  students: StudentRecord[];
  complaints: ComplaintRecord[];
  notices: NoticeRecord[];
  leaveRequests: LeaveRequestRecord[];
  roomChangeRequests: RoomChangeRequestRecord[];
  roomSwapRequests: RoomSwapRequestRecord[];
}

const DB_FILE = path.join('/tmp', 'hostel_web_db.json');

export const EMAIL_RE = /^[A-Za-z0-9._%+\-]{2,64}@[A-Za-z0-9.\-]{2,253}\.[A-Za-z]{2,}$/;
export const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,29}$/;
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
export const OVERDUE_DAYS = 3;

export function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw, 'utf8').digest('hex');
}

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createSeedState(): DatabaseState {
  const rand = createRng(42);
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const now = new Date();
  const daysAgoIso = (days: number, hours = 0) =>
    new Date(now.getTime() - days * 86400000 - hours * 3600000).toISOString();
  const daysOffsetYmd = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return formatDateYMD(d);
  };

  const state: DatabaseState = {
    nextId: {
      warden: 1,
      room: 1,
      student: 1,
      complaint: 1,
      notice: 1,
      leave: 1,
      roomChange: 1,
      roomSwap: 1,
    },
    wardens: [],
    rooms: [],
    students: [],
    complaints: [],
    notices: [],
    leaveRequests: [],
    roomChangeRequests: [],
    roomSwapRequests: [],
  };

  // Warden
  state.wardens.push({
    id: state.nextId.warden++,
    username: 'manash',
    password: hashPassword('manash123'),
  });

  // 15 rooms (A01–A15, capacity 4)
  for (let n = 1; n <= 15; n++) {
    state.rooms.push({
      id: state.nextId.room++,
      roomnumber: `A${String(n).padStart(2, '0')}`,
      capacity: 4,
    });
  }

  // Named demo accounts (2026)
  const namedStudents = [
    ['Arjun Sharma', 'arjun123', 'arjun123', 'arjun.sharma@hostel.edu', '6371646323', 'Ramesh Sharma', '9437012345'],
    ['Rahul Verma', 'rahul123', 'rahul123', 'rahul.verma@hostel.edu', '6382383729', 'Suresh Verma', '9437023456'],
    ['Vikram Patel', 'vikram123', 'vikram123', 'vikram.patel@hostel.edu', '9876543210', 'Mahesh Patel', '9437034567'],
    ['Rohit Singh', 'rohit123', 'rohit123', 'rohit.singh@hostel.edu', '8765432109', 'Dinesh Singh', '9437045678'],
    ['Aditya Kumar', 'aditya123', 'aditya123', 'aditya.kumar@hostel.edu', '7654321098', 'Ganesh Kumar', '9437056789'],
  ];

  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh',
    'Ayaan', 'Krishna', 'Ishaan', 'Rohan', 'Aryan', 'Kabir', 'Dhruv',
    'Karan', 'Rahul', 'Aakash', 'Nikhil', 'Varun', 'Pranav', 'Harsh',
    'Siddharth', 'Yash', 'Manav', 'Abhishek', 'Saurabh', 'Naman',
    'Prateek', 'Shubham', 'Dev', 'Tushar', 'Gaurav', 'Sandeep',
    'Akash', 'Vinay', 'Rajat', 'Piyush', 'Ankit', 'Sumeet', 'Rishi',
    'Tanish', 'Vedant', 'Laksh', 'Aadi', 'Naksh', 'Kiaan',
    'Rivaan', 'Shaurya', 'Atharva', 'Veer', 'Yug',
  ];
  const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Nair',
    'Iyer', 'Menon', 'Gupta', 'Mehta', 'Joshi', 'Rao', 'Das', 'Bose',
    'Banerjee', 'Mishra', 'Agarwal', 'Kapoor', 'Khanna', 'Malhotra',
    'Chopra', 'Ghosh', 'Bhatt', 'Trivedi', 'Pandey', 'Yadav', 'Thakur',
    'Chaudhary', 'Pradhan', 'Mohanty', 'Nayak', 'Behera', 'Dash',
    'Mahapatra', 'Sahoo', 'Patnaik', 'Samal', 'Pillai', 'Shetty',
  ];
  const guardianFirstNames = [
    'Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Ganesh', 'Prakash',
    'Vinod', 'Naresh', 'Rajesh', 'Mohan', 'Lal', 'Ram',
  ];

  interface SeedStudent {
    fullname: string;
    username: string;
    pw?: string;
    email: string;
    phone: string;
    g_name: string;
    g_phone: string;
  }

  const randomStudents: SeedStudent[] = [];
  const usedUsernames = new Set<string>(namedStudents.map((s) => s[1]));
  for (let i = 0; i < 45; i++) {
    while (true) {
      const first = pick(firstNames);
      const last = pick(lastNames);
      const username = `${first.toLowerCase()}${randInt(100, 9999)}`;
      if (!usedUsernames.has(username)) {
        usedUsernames.add(username);
        const email = `${first.toLowerCase()}.${last.toLowerCase()}@hostel.edu`;
        const phone = `${pick(['6', '7', '8', '9'])}${randInt(100000000, 999999999)}`;
        const gFirst = pick(guardianFirstNames);
        const gName = `${gFirst} ${last}`;
        const gPhone = `${pick(['6', '7', '8', '9'])}${randInt(100000000, 999999999)}`;
        randomStudents.push({
          fullname: `${first} ${last}`,
          username,
          email,
          phone,
          g_name: gName,
          g_phone: gPhone,
        });
        break;
      }
    }
  }

  const yearBatches: Record<number, SeedStudent[]> = {
    2023: randomStudents.slice(0, 10),
    2024: randomStudents.slice(10, 20),
    2025: randomStudents.slice(20, 30),
    2026: [],
    2027: randomStudents.slice(35, 45),
  };

  for (const ns of namedStudents) {
    yearBatches[2026].push({
      fullname: ns[0],
      username: ns[1],
      pw: ns[2],
      email: ns[3],
      phone: ns[4],
      g_name: ns[5],
      g_phone: ns[6],
    });
  }
  for (const rs of randomStudents.slice(30, 35)) {
    yearBatches[2026].push({ ...rs, pw: rs.username });
  }

  let roomIdx = 0;
  const roomAvailable = (roomId: number) => {
    const room = state.rooms.find((r) => r.id === roomId)!;
    const occ = state.students.filter((s) => s.room_id === roomId).length;
    return room.capacity - occ;
  };

  for (const year of [2023, 2024, 2025, 2026, 2027]) {
    const batch = yearBatches[year];
    let batchIdx = 0;
    while (batchIdx < batch.length) {
      while (roomIdx < state.rooms.length && roomAvailable(state.rooms[roomIdx].id) <= 0) {
        roomIdx++;
      }
      if (roomIdx >= state.rooms.length) break;
      const room = state.rooms[roomIdx];
      const slots = roomAvailable(room.id);
      for (let slot = 0; slot < slots && batchIdx < batch.length; slot++) {
        const s = batch[batchIdx];
        const pw = s.pw || s.username;
        state.students.push({
          id: state.nextId.student++,
          fullname: s.fullname,
          username: s.username,
          password: hashPassword(pw),
          email: s.email,
          phone: s.phone,
          guardian_name: s.g_name,
          guardian_phone: s.g_phone,
          academic_year: year,
          room_id: room.id,
          createdat: daysAgoIso(randInt(10, 90), randInt(0, 23)),
        });
        batchIdx++;
      }
      roomIdx++;
    }
  }

  // 20 complaints
  const complaintTemplates: [string, string][] = [
    ['Fan not working', 'The ceiling fan in my room has stopped working.'],
    ['Light bulb broken', 'The tube light in my room is flickering and sometimes goes off.'],
    ['Water supply issue', 'There is no water supply in our bathroom since morning.'],
    ['Wi-Fi not working', 'The hostel Wi-Fi is very slow and keeps disconnecting.'],
    ['Room door lock jammed', 'The door lock of my room is jammed and I cannot lock it properly.'],
    ['Dirty bathroom', 'The common bathroom on our floor has not been cleaned for days.'],
    ['Mosquito problem', 'There are a lot of mosquitoes in my room.'],
    ['Broken study table', 'The study table in my room has a broken leg and wobbles.'],
    ['Geyser not heating', 'The water geyser is not heating the water at all.'],
    ['Noisy neighbours', 'The students in the adjacent room play loud music late at night.'],
    ['Window pane cracked', 'The glass pane of my window is cracked.'],
    ['Electric socket broken', 'One of the electric sockets in my room is not working.'],
    ['Drainage blockage', 'The drain in our washroom is blocked and water is overflowing.'],
    ['Cockroach infestation', 'There are cockroaches in my room and the kitchen area.'],
    ['Broken chair', 'The chair in my room is broken and I almost fell.'],
    ['No hot water in morning', 'There is no hot water available in the morning for bathing.'],
    ['Wall paint peeling', 'The paint on the wall near my bed is peeling off.'],
    ['Intercom not working', 'The intercom in my room is dead.'],
    ['Curtain rod loose', 'The curtain rod in my room is loose and about to fall.'],
    ['Water cooler not cooling', 'The water cooler on our floor is not cooling the water.'],
  ];

  const statuses: ComplaintStatus[] = shuffle([
    ...Array<ComplaintStatus>(8).fill('Pending'),
    ...Array<ComplaintStatus>(7).fill('In Progress'),
    ...Array<ComplaintStatus>(5).fill('Resolved'),
  ]);

  complaintTemplates.forEach(([title, description], i) => {
    const student = pick(state.students);
    const status = statuses[i % statuses.length];
    const daysAgo = randInt(0, 30);
    state.complaints.push({
      id: state.nextId.complaint++,
      student_id: student.id,
      title,
      description,
      status,
      createdat: daysAgoIso(daysAgo, randInt(0, 23)),
    });
  });

  // 12 notices
  const noticeTemplates: [string, string][] = [
    [
      'Hostel Mess Timing Change',
      'All students are informed that the hostel mess will remain closed on Sundays for cleaning. Please plan your meals accordingly.',
    ],
    [
      'Wi-Fi Maintenance',
      'Internet will be unavailable on Saturday 2 AM - 4 AM due to scheduled maintenance.',
    ],
    [
      'Hostel Fee Payment Reminder',
      'This is a reminder that the hostel fee for the current semester is due by the end of this month.',
    ],
    [
      'Annual Sports Day Registration',
      'Registration for the Annual Sports Day is now open. Interested students can sign up at the sports office.',
    ],
    [
      'Water Supply Disruption',
      'There will be a temporary water supply disruption tomorrow from 10 AM to 2 PM due to tank cleaning.',
    ],
    [
      'Curfew Timing Update',
      'The hostel curfew timing has been revised. Students must return to the hostel by 9:30 PM on weekdays.',
    ],
    [
      'Room Inspection Notice',
      'A surprise room inspection will be conducted this week. Students are advised to keep their rooms clean.',
    ],
    [
      'Medical Camp on Campus',
      'A free medical checkup camp will be organized in the hostel common room this Saturday from 9 AM to 1 PM.',
    ],
    [
      'Library Book Return Reminder',
      'Students who have borrowed books from the hostel library are requested to return them before the semester ends.',
    ],
    [
      'Festival Celebration',
      'The hostel committee is organizing a cultural night to celebrate the upcoming festival.',
    ],
    [
      'Fire Safety Drill',
      'A fire safety drill will be conducted next Monday at 5 PM. All students must participate.',
    ],
    [
      'Hostel Renovation Update',
      'Renovation work on the second floor will begin next month.',
    ],
  ];

  noticeTemplates.forEach(([title, description]) => {
    state.notices.push({
      id: state.nextId.notice++,
      title,
      description,
      createdat: daysAgoIso(randInt(0, 45), randInt(0, 23)),
    });
  });

  // 8 leave requests
  const leaveData: [number, number, number, string, string, LeaveStatus][] = [
    [0, 5, 8, 'Home — Bhubaneswar', 'Going home for a family function this weekend.', 'Pending'],
    [1, 3, 6, 'Home — Cuttack', 'Need to visit home for a medical checkup.', 'Pending'],
    [2, 1, 4, "Relative's place — Kolkata", 'Attending a wedding in the family.', 'Pending'],
    [3, 7, 12, 'Home — Rourkela', 'Going home for the weekend break.', 'Pending'],
    [4, -2, 2, 'Home — Puri', 'Family emergency — need to visit home urgently.', 'Approved'],
    [5, -5, -1, 'Home — Sambalpur', 'Festival at home — want to spend time with family.', 'Approved'],
    [6, -3, -1, "Friend's place — Berhampur", "Attending a friend's birthday celebration.", 'Rejected'],
    [7, -1, 3, 'Home — Balasore', 'Not feeling well — going home to rest.', 'Pending'],
  ];

  for (const [idx, fromOff, toOff, dest, reason, status] of leaveData) {
    const student = state.students[idx];
    if (!student) continue;
    state.leaveRequests.push({
      id: state.nextId.leave++,
      student_id: student.id,
      from_date: daysOffsetYmd(fromOff),
      to_date: daysOffsetYmd(toOff),
      destination: dest,
      reason,
      status,
      warden_remark:
        status === 'Approved'
          ? 'Approved. Please collect your gate pass.'
          : status === 'Rejected'
          ? 'Not enough notice. Please apply at least 3 days in advance.'
          : '',
      createdat: daysAgoIso(randInt(1, 7), randInt(0, 12)),
      approved_at: status === 'Approved' ? daysAgoIso(1) : null,
    });
  }

  // 5 room change requests (use rooms with space like A03, A06, A09, A12, A15 where appropriate)
  const roomChangeData: [number, number, string, RoomChangeStatus][] = [
    [0, 3, 'Want to move closer to my friend for group study.', 'Pending'],
    [1, 6, 'My current room is too noisy. Need a quieter room.', 'Pending'],
    [2, 9, 'Want to share a room with my classmate.', 'Pending'],
    [3, 12, 'Medical reason — need a ground floor room.', 'Approved'],
    [4, 15, 'Want a room with better ventilation.', 'Rejected'],
  ];

  for (const [idx, targetRoomId, reason, status] of roomChangeData) {
    const student = state.students[idx];
    const targetRoom = state.rooms.find((r) => r.id === targetRoomId);
    if (!student || !targetRoom) continue;
    state.roomChangeRequests.push({
      id: state.nextId.roomChange++,
      student_id: student.id,
      requested_room_id: targetRoom.id,
      reason,
      status,
      warden_remark:
        status === 'Approved'
          ? 'Approved and moved.'
          : status === 'Rejected'
          ? 'No rooms available in that block.'
          : '',
      createdat: daysAgoIso(randInt(1, 5), randInt(0, 12)),
      approved_at: status === 'Approved' ? daysAgoIso(2) : null,
    });
  }

  return state;
}

class HostelStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw) as DatabaseState;
        if (parsed && Array.isArray(parsed.wardens) && parsed.wardens.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed
    }
    const seeded = createSeedState();
    this.save(seeded);
    return seeded;
  }

  private save(state = this.state) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state), 'utf8');
    } catch {
      // Ignore write failures in read-only edge cases
    }
  }

  commit() {
    this.save();
  }

  get raw(): DatabaseState {
    return this.state;
  }

  toRoomDTO(room: RoomRecord): RoomDTO {
    const occupied = this.state.students.filter((s) => s.room_id === room.id).length;
    const available = room.capacity - occupied;
    return {
      id: room.id,
      roomnumber: room.roomnumber,
      capacity: room.capacity,
      occupied,
      available,
      status: available <= 0 ? 'Full' : 'Available',
    };
  }

  toStudentDTO(student: StudentRecord): StudentDTO {
    const roomRec = this.state.rooms.find((r) => r.id === student.room_id) ?? null;
    return {
      id: student.id,
      fullname: student.fullname,
      username: student.username,
      email: student.email,
      phone: student.phone,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      academic_year: student.academic_year,
      room_id: student.room_id,
      room: roomRec ? this.toRoomDTO(roomRec) : null,
      createdat: student.createdat,
    };
  }

  toComplaintDTO(c: ComplaintRecord): ComplaintDTO {
    const student = this.state.students.find((s) => s.id === c.student_id);
    const room = student ? this.state.rooms.find((r) => r.id === student.room_id) : null;
    const ageMs = Date.now() - new Date(c.createdat).getTime();
    const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
    const isOverdue = c.status === 'Pending' && ageMs > OVERDUE_DAYS * 86400000;
    return {
      id: c.id,
      student_id: c.student_id,
      student_name: student?.fullname ?? 'Unknown',
      student_username: student?.username ?? 'unknown',
      roomnumber: room?.roomnumber ?? null,
      title: c.title,
      description: c.description,
      status: c.status,
      createdat: c.createdat,
      is_overdue: isOverdue,
      age_days: ageDays,
    };
  }

  toNoticeDTO(n: NoticeRecord): NoticeDTO {
    return { ...n };
  }

  toLeaveDTO(l: LeaveRequestRecord): LeaveRequestDTO {
    const student = this.state.students.find((s) => s.id === l.student_id);
    const room = student ? this.state.rooms.find((r) => r.id === student.room_id) : null;
    return {
      id: l.id,
      student_id: l.student_id,
      student_name: student?.fullname ?? 'Unknown',
      student_username: student?.username ?? 'unknown',
      roomnumber: room?.roomnumber ?? null,
      from_date: l.from_date,
      to_date: l.to_date,
      destination: l.destination,
      reason: l.reason,
      status: l.status,
      warden_remark: l.warden_remark,
      createdat: l.createdat,
      approved_at: l.approved_at,
    };
  }

  toRoomChangeDTO(r: RoomChangeRequestRecord): RoomChangeRequestDTO {
    const student = this.state.students.find((s) => s.id === r.student_id);
    const currentRoom = student ? this.state.rooms.find((rm) => rm.id === student.room_id) : null;
    const reqRoom = this.state.rooms.find((rm) => rm.id === r.requested_room_id);
    return {
      id: r.id,
      student_id: r.student_id,
      student_name: student?.fullname ?? 'Unknown',
      current_roomnumber: currentRoom?.roomnumber ?? null,
      requested_room_id: r.requested_room_id,
      requested_roomnumber: reqRoom?.roomnumber ?? '—',
      reason: r.reason,
      status: r.status,
      warden_remark: r.warden_remark,
      createdat: r.createdat,
      approved_at: r.approved_at,
    };
  }

  toRoomSwapDTO(s: RoomSwapRequestRecord): RoomSwapRequestDTO {
    const requester = this.state.students.find((st) => st.id === s.requester_id);
    const target = this.state.students.find((st) => st.id === s.target_id);
    const reqRoom = requester ? this.state.rooms.find((rm) => rm.id === requester.room_id) : null;
    const tgtRoom = target ? this.state.rooms.find((rm) => rm.id === target.room_id) : null;
    return {
      id: s.id,
      requester_id: s.requester_id,
      requester_name: requester?.fullname ?? 'Unknown',
      requester_roomnumber: reqRoom?.roomnumber ?? null,
      target_id: s.target_id,
      target_name: target?.fullname ?? 'Unknown',
      target_roomnumber: tgtRoom?.roomnumber ?? null,
      reason: s.reason,
      status: s.status,
      warden_remark: s.warden_remark,
      createdat: s.createdat,
      approved_at: s.approved_at,
    };
  }

  getSidebarCounts(): SidebarCounts {
    const pendingLeaves = this.state.leaveRequests.filter((l) => l.status === 'Pending').length;
    const movePending = this.state.roomChangeRequests.filter((r) => r.status === 'Pending').length;
    const swapPending = this.state.roomSwapRequests.filter(
      (s) => s.status === 'Accepted by Peer',
    ).length;
    const pendingComplaints = this.state.complaints.filter((c) => c.status === 'Pending').length;
    return {
      pending_leaves: pendingLeaves,
      pending_room_changes: movePending + swapPending,
      pending_complaints: pendingComplaints,
    };
  }

  hasActiveTransfer(studentId: number): boolean {
    if (
      this.state.roomChangeRequests.some(
        (r) => r.student_id === studentId && r.status === 'Pending',
      )
    ) {
      return true;
    }
    if (
      this.state.roomSwapRequests.some(
        (s) =>
          (s.requester_id === studentId || s.target_id === studentId) &&
          (s.status === 'Pending' || s.status === 'Accepted by Peer'),
      )
    ) {
      return true;
    }
    return false;
  }
}

export const store = new HostelStore();

// Validation helpers matching hostel/views.py
export function validateMobile(value: string, fieldName: string, label: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const v = (value || '').trim();
  if (!v) {
    errors[fieldName] = `${label} is required.`;
  } else if (!/^\d+$/.test(v)) {
    errors[fieldName] = `${label} must contain only digits (no spaces, +, -, or letters).`;
  } else if (v.length !== 10) {
    errors[fieldName] = `${label} must be exactly 10 digits.`;
  } else if (!'6789'.includes(v[0])) {
    errors[fieldName] = `${label} must start with 6, 7, 8, or 9 (Indian mobile).`;
  }
  return errors;
}

export function validateStudentFields(
  input: {
    fullname?: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    guardian_name?: string;
    guardian_phone?: string;
  },
  passwordRequired: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = (input.fullname || '').trim();
  if (name.length < 2) {
    errors.fullname = 'Name must be at least 2 characters.';
  } else if (name.length > 100) {
    errors.fullname = 'Name is too long (max 100 characters).';
  }

  const username = (input.username || '').trim();
  if (!USERNAME_RE.test(username)) {
    errors.username =
      'Username must be 3-30 chars, start with a letter, only letters/digits/underscore.';
  }

  const password = (input.password || '').trim();
  if (password) {
    if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters.';
    } else if (password.length > 64) {
      errors.password = 'Password is too long (max 64 characters).';
    }
  } else if (passwordRequired) {
    errors.password = 'Password is required.';
  }

  const email = (input.email || '').trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Email format is invalid (expected name@domain.tld).';
  }

  Object.assign(errors, validateMobile(input.phone || '', 'phone', 'Phone number'));

  const guardianName = (input.guardian_name || '').trim();
  if (guardianName.length < 2) {
    errors.guardian_name = 'Guardian name must be at least 2 characters.';
  } else if (guardianName.length > 100) {
    errors.guardian_name = 'Guardian name is too long (max 100 characters).';
  }

  Object.assign(
    errors,
    validateMobile(input.guardian_phone || '', 'guardian_phone', 'Guardian phone'),
  );

  return errors;
}

export function validateRoomFields(roomnumber: string, capacityRaw: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  const rn = (roomnumber || '').trim();
  if (!rn) {
    errors.roomnumber = 'Room number is required.';
  } else if (rn.length > 10) {
    errors.roomnumber = 'Room number is too long (max 10 characters).';
  } else if (!/^[A-Za-z0-9\-]{1,10}$/.test(rn)) {
    errors.roomnumber = 'Room number may only contain letters, digits, and hyphens.';
  }

  const n = Number(capacityRaw);
  if (!Number.isInteger(n) || String(capacityRaw).trim() === '') {
    errors.capacity = 'Capacity must be a whole number.';
  } else if (n < 1) {
    errors.capacity = 'Capacity must be at least 1.';
  } else if (n > 50) {
    errors.capacity = 'Capacity is too large (max 50).';
  }

  return errors;
}
