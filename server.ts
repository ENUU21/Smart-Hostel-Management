import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  hashPassword,
  store,
  validateRoomFields,
  validateStudentFields,
} from './server/store.js';
import type { ComplaintStatus } from './shared/types.js';

interface SessionData {
  warden_id?: number;
  warden_name?: string;
  student_id?: number;
}

const sessions = new Map<string, SessionData>();

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

function getSession(req: Request): { token: string | null; data: SessionData } {
  const headerToken = req.header('x-session-token')?.trim();
  const cookieToken = parseCookies(req.headers.cookie).hostel_session;
  const token = headerToken || cookieToken || null;
  if (token && sessions.has(token)) {
    return { token, data: sessions.get(token)! };
  }
  return { token: null, data: {} };
}

function createOrUpdateSession(
  req: Request,
  res: Response,
  updater: (data: SessionData) => void,
): string {
  const existing = getSession(req);
  const token = existing.token || crypto.randomBytes(24).toString('hex');
  const data = existing.token ? existing.data : {};
  updater(data);
  sessions.set(token, data);

  const isHttps = req.secure || req.header('x-forwarded-proto') === 'https';
  const cookieParts = [
    `hostel_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return token;
}

function requireWarden(req: Request, res: Response, next: NextFunction) {
  const { data } = getSession(req);
  if (!data.warden_id) {
    res.status(401).json({ error: 'Warden authentication required.' });
    return;
  }
  next();
}

function requireStudent(req: Request, res: Response, next: NextFunction) {
  const { data } = getSession(req);
  if (!data.student_id) {
    res.status(401).json({ error: 'Student authentication required.' });
    return;
  }
  const student = store.raw.students.find((s) => s.id === data.student_id);
  if (!student) {
    res.status(401).json({ error: 'Student account not found.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // =========================================================================
  // Auth Routes
  // =========================================================================
  app.get('/api/auth/me', (req, res) => {
    const { data } = getSession(req);
    if (data.warden_id) {
      res.json({
        role: 'warden',
        warden_name: data.warden_name || 'Warden',
        sidebar_counts: store.getSidebarCounts(),
      });
      return;
    }
    if (data.student_id) {
      const student = store.raw.students.find((s) => s.id === data.student_id);
      if (student) {
        res.json({
          role: 'student',
          student: store.toStudentDTO(student),
        });
        return;
      }
    }
    res.json({ role: null });
  });

  app.post('/api/auth/warden/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    const warden = store.raw.wardens.find((w) => w.username === username);
    if (!warden || warden.password !== hashPassword(password)) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = createOrUpdateSession(req, res, (s) => {
      delete s.student_id;
      s.warden_id = warden.id;
      s.warden_name = warden.username;
    });
    res.json({
      token,
      role: 'warden',
      warden_name: warden.username,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/auth/student/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    const student = store.raw.students.find((s) => s.username === username);
    if (!student || student.password !== hashPassword(password)) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = createOrUpdateSession(req, res, (s) => {
      delete s.warden_id;
      delete s.warden_name;
      s.student_id = student.id;
    });
    res.json({
      token,
      role: 'student',
      student: store.toStudentDTO(student),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const { token } = getSession(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'hostel_session=; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  // =========================================================================
  // Warden Routes
  // =========================================================================
  app.get('/api/warden/dashboard', requireWarden, (req, res) => {
    const { data } = getSession(req);
    const rooms = store.raw.rooms.map((r) => store.toRoomDTO(r));
    const fullRooms = rooms.filter((r) => r.available <= 0).length;
    const totalRooms = rooms.length;
    const availableRooms = totalRooms - fullRooms;
    const recentComplaints = [...store.raw.complaints]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .slice(0, 8)
      .map((c) => store.toComplaintDTO(c));
    const counts = store.getSidebarCounts();

    res.json({
      warden_name: data.warden_name || 'Warden',
      total_students: store.raw.students.length,
      total_rooms: totalRooms,
      available_rooms: availableRooms,
      full_rooms: fullRooms,
      recent_complaints: recentComplaints,
      pending_leaves: counts.pending_leaves,
      pending_room_changes: counts.pending_room_changes,
      pending_complaints: counts.pending_complaints,
      all_rooms_full: totalRooms > 0 && rooms.every((r) => r.available <= 0),
      sidebar_counts: counts,
    });
  });

  app.get('/api/warden/students', requireWarden, (req, res) => {
    const q = String(req.query.q || '').trim();
    let list = [...store.raw.students].map((s) => store.toStudentDTO(s));
    list.sort((a, b) => {
      const ra = a.room?.roomnumber || '';
      const rb = b.room?.roomnumber || '';
      if (ra !== rb) return ra.localeCompare(rb);
      return a.fullname.localeCompare(b.fullname);
    });

    let searchKind: string | null = null;
    if (q) {
      const hasDigit = /\d/.test(q);
      if (hasDigit) {
        const qNorm = q.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        list = list.filter((s) =>
          (s.room?.roomnumber || '').toLowerCase().includes(qNorm),
        );
        searchKind = `room contains '${q}'`;
      } else {
        const ql = q.toLowerCase();
        const matched = list.filter((s) => s.fullname.toLowerCase().includes(ql));
        const priority = (name: string) => {
          const nl = name.toLowerCase();
          if (nl.startsWith(ql)) return 0;
          if (nl.split(/\s+/).some((w) => w.startsWith(ql))) return 1;
          return 2;
        };
        list = matched.sort((a, b) => {
          const pa = priority(a.fullname);
          const pb = priority(b.fullname);
          if (pa !== pb) return pa - pb;
          return a.fullname.localeCompare(b.fullname);
        });
        searchKind = `name contains '${q}'`;
      }
    }

    const allRooms = [...store.raw.rooms]
      .sort((a, b) => a.roomnumber.localeCompare(b.roomnumber))
      .map((r) => store.toRoomDTO(r));
    const roomsWithSpace = allRooms.filter((r) => r.available > 0);

    res.json({
      students: list,
      query: q,
      shown: list.length,
      total: store.raw.students.length,
      search_kind: searchKind,
      all_rooms: allRooms,
      rooms_with_space: roomsWithSpace,
      all_rooms_full: allRooms.length > 0 && roomsWithSpace.length === 0,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/students', requireWarden, (req, res) => {
    const body = req.body || {};
    const fullname = String(body.fullname || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const guardian_name = String(body.guardian_name || '').trim();
    const guardian_phone = String(body.guardian_phone || '').trim();
    const roomId = Number(body.room_id);
    const academicYear = Number(body.academic_year) || new Date().getFullYear();

    const errors = validateStudentFields(
      { fullname, username, password, email, phone, guardian_name, guardian_phone },
      true,
    );

    if (store.raw.students.some((s) => s.username === username)) {
      errors.username = 'Username already exists.';
    }

    const roomRec = store.raw.rooms.find((r) => r.id === roomId);
    if (!body.room_id) {
      errors.room = 'Please assign a room to the student.';
    } else if (!roomRec) {
      errors.room = 'Invalid room selected.';
    } else if (store.toRoomDTO(roomRec).available <= 0) {
      errors.room = 'That room is already full.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const created = {
      id: store.raw.nextId.student++,
      fullname,
      username,
      password: hashPassword(password),
      email,
      phone,
      guardian_name,
      guardian_phone,
      academic_year: academicYear,
      room_id: roomRec!.id,
      createdat: new Date().toISOString(),
    };
    store.raw.students.push(created);
    store.commit();
    res.status(201).json({
      student: store.toStudentDTO(created),
      message: 'Student added successfully.',
    });
  });

  app.put('/api/warden/students/:id', requireWarden, (req, res) => {
    const sid = Number(req.params.id);
    const student = store.raw.students.find((s) => s.id === sid);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const body = req.body || {};
    const fullname = String(body.fullname || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const guardian_name = String(body.guardian_name || '').trim();
    const guardian_phone = String(body.guardian_phone || '').trim();
    const roomId = Number(body.room_id);
    const academicYear = Number(body.academic_year) || student.academic_year;

    const errors = validateStudentFields(
      { fullname, username, password, email, phone, guardian_name, guardian_phone },
      false,
    );

    if (store.raw.students.some((s) => s.username === username && s.id !== sid)) {
      errors.username = 'Username already exists.';
    }

    const roomRec = store.raw.rooms.find((r) => r.id === roomId);
    if (!body.room_id) {
      errors.room = 'Please assign a room to the student.';
    } else if (!roomRec) {
      errors.room = 'Invalid room selected.';
    } else if (store.toRoomDTO(roomRec).available <= 0 && roomRec.id !== student.room_id) {
      errors.room = 'That room is already full.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    student.fullname = fullname;
    student.username = username;
    student.email = email;
    student.phone = phone;
    student.guardian_name = guardian_name;
    student.guardian_phone = guardian_phone;
    student.room_id = roomRec!.id;
    student.academic_year = academicYear;
    if (password) {
      student.password = hashPassword(password);
    }
    store.commit();

    res.json({
      student: store.toStudentDTO(student),
      message: 'Student updated successfully.',
    });
  });

  app.delete('/api/warden/students/:id', requireWarden, (req, res) => {
    const sid = Number(req.params.id);
    const idx = store.raw.students.findIndex((s) => s.id === sid);
    if (idx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    store.raw.students.splice(idx, 1);
    store.raw.complaints = store.raw.complaints.filter((c) => c.student_id !== sid);
    store.raw.leaveRequests = store.raw.leaveRequests.filter((l) => l.student_id !== sid);
    store.raw.roomChangeRequests = store.raw.roomChangeRequests.filter(
      (r) => r.student_id !== sid,
    );
    store.raw.roomSwapRequests = store.raw.roomSwapRequests.filter(
      (s) => s.requester_id !== sid && s.target_id !== sid,
    );
    store.commit();
    res.json({ message: 'Student deleted.' });
  });

  // Rooms
  app.get('/api/warden/rooms', requireWarden, (_req, res) => {
    const rooms = [...store.raw.rooms]
      .sort((a, b) => a.roomnumber.localeCompare(b.roomnumber))
      .map((r) => store.toRoomDTO(r));
    const years = Array.from(new Set(store.raw.students.map((s) => s.academic_year))).sort(
      (a, b) => b - a,
    );
    res.json({
      rooms,
      student_count: store.raw.students.length,
      academic_years: years,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/rooms', requireWarden, (req, res) => {
    const roomnumber = String(req.body?.roomnumber || '').trim();
    const capacity = req.body?.capacity ?? 4;
    const errors = validateRoomFields(roomnumber, capacity);
    if (store.raw.rooms.some((r) => r.roomnumber.toLowerCase() === roomnumber.toLowerCase())) {
      errors.roomnumber = 'Room number already exists.';
    }
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }
    const created = {
      id: store.raw.nextId.room++,
      roomnumber,
      capacity: Number(capacity),
    };
    store.raw.rooms.push(created);
    store.commit();
    res.status(201).json({
      room: store.toRoomDTO(created),
      message: 'Room added successfully.',
    });
  });

  app.delete('/api/warden/rooms/:id', requireWarden, (req, res) => {
    const rid = Number(req.params.id);
    const idx = store.raw.rooms.findIndex((r) => r.id === rid);
    if (idx === -1) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    const room = store.raw.rooms[idx];
    const dto = store.toRoomDTO(room);
    if (dto.occupied > 0) {
      res.status(400).json({
        error: `Cannot delete Room ${room.roomnumber} — it still has ${dto.occupied} student(s) assigned. Move them to other rooms first.`,
      });
      return;
    }
    store.raw.rooms.splice(idx, 1);
    store.raw.roomChangeRequests = store.raw.roomChangeRequests.filter(
      (r) => r.requested_room_id !== rid,
    );
    store.commit();
    res.json({ message: `Room ${room.roomnumber} deleted.` });
  });

  app.post('/api/warden/new-academic-year', requireWarden, (req, res) => {
    const confirm = String(req.body?.confirm || '').trim();
    const year = String(req.body?.year || '').trim();
    if (confirm !== 'CLEAR') {
      res.status(400).json({
        error: "Confirmation text did not match. Type 'CLEAR' to confirm.",
      });
      return;
    }
    let deletedIds: Set<number>;
    let message: string;
    if (year === 'all') {
      deletedIds = new Set(store.raw.students.map((s) => s.id));
      store.raw.students = [];
      message = `All ${deletedIds.size} student(s) cleared (all years). Rooms and notices preserved.`;
    } else {
      const yr = Number(year);
      if (!Number.isInteger(yr)) {
        res.status(400).json({ error: 'Invalid year selected.' });
        return;
      }
      deletedIds = new Set(
        store.raw.students.filter((s) => s.academic_year === yr).map((s) => s.id),
      );
      store.raw.students = store.raw.students.filter((s) => s.academic_year !== yr);
      message = `${deletedIds.size} student(s) from ${yr} cleared. Rooms and notices preserved.`;
    }

    store.raw.complaints = store.raw.complaints.filter((c) => !deletedIds.has(c.student_id));
    store.raw.leaveRequests = store.raw.leaveRequests.filter(
      (l) => !deletedIds.has(l.student_id),
    );
    store.raw.roomChangeRequests = store.raw.roomChangeRequests.filter(
      (r) => !deletedIds.has(r.student_id),
    );
    store.raw.roomSwapRequests = store.raw.roomSwapRequests.filter(
      (s) => !deletedIds.has(s.requester_id) && !deletedIds.has(s.target_id),
    );
    store.commit();
    res.json({ message });
  });

  // Complaints
  app.get('/api/warden/complaints', requireWarden, (_req, res) => {
    const list = [...store.raw.complaints]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((c) => store.toComplaintDTO(c));
    const overdueCount = list.filter((c) => c.is_overdue).length;
    res.json({
      complaints: list,
      overdue_count: overdueCount,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/complaints/:id/status', requireWarden, (req, res) => {
    const cid = Number(req.params.id);
    const status = String(req.body?.status || '') as ComplaintStatus;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }
    const complaint = store.raw.complaints.find((c) => c.id === cid);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }
    complaint.status = status;
    store.commit();
    res.json({
      complaint: store.toComplaintDTO(complaint),
      message: `Complaint marked as ${status}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  // Notices
  app.get('/api/warden/notices', requireWarden, (_req, res) => {
    const notices = [...store.raw.notices]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((n) => store.toNoticeDTO(n));
    res.json({ notices, sidebar_counts: store.getSidebarCounts() });
  });

  app.post('/api/warden/notices', requireWarden, (req, res) => {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    if (title.length < 3) {
      res.status(400).json({ error: 'Title must be at least 3 characters.' });
      return;
    }
    if (description.length < 5) {
      res.status(400).json({ error: 'Description must be at least 5 characters.' });
      return;
    }
    const created = {
      id: store.raw.nextId.notice++,
      title,
      description,
      createdat: new Date().toISOString(),
    };
    store.raw.notices.push(created);
    store.commit();
    res.status(201).json({
      notice: store.toNoticeDTO(created),
      message: 'Notice posted successfully.',
    });
  });

  // Leave Requests
  app.get('/api/warden/leave-requests', requireWarden, (_req, res) => {
    const all = [...store.raw.leaveRequests]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((l) => store.toLeaveDTO(l));
    res.json({
      pending: all.filter((l) => l.status === 'Pending'),
      approved: all.filter((l) => l.status === 'Approved'),
      rejected: all.filter((l) => l.status === 'Rejected'),
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/leave-requests/:id/approve', requireWarden, (req, res) => {
    const lid = Number(req.params.id);
    const leave = store.raw.leaveRequests.find((l) => l.id === lid);
    if (!leave) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }
    leave.status = 'Approved';
    leave.warden_remark = String(req.body?.remark || '').trim();
    leave.approved_at = new Date().toISOString();
    store.commit();
    const dto = store.toLeaveDTO(leave);
    res.json({
      leave: dto,
      message: `Leave request approved for ${dto.student_name}. Gate pass generated.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/leave-requests/:id/reject', requireWarden, (req, res) => {
    const lid = Number(req.params.id);
    const leave = store.raw.leaveRequests.find((l) => l.id === lid);
    if (!leave) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }
    leave.status = 'Rejected';
    leave.warden_remark = String(req.body?.remark || '').trim();
    store.commit();
    const dto = store.toLeaveDTO(leave);
    res.json({
      leave: dto,
      message: `Leave request rejected for ${dto.student_name}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  // Room Transfers (Move + Swap)
  app.get('/api/warden/room-transfers', requireWarden, (_req, res) => {
    const allMoves = [...store.raw.roomChangeRequests]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((r) => store.toRoomChangeDTO(r));
    const allSwaps = [...store.raw.roomSwapRequests]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((s) => store.toRoomSwapDTO(s));

    res.json({
      move_pending: allMoves.filter((r) => r.status === 'Pending'),
      move_approved: allMoves.filter((r) => r.status === 'Approved'),
      move_rejected: allMoves.filter((r) => r.status === 'Rejected'),
      swap_pending: allSwaps.filter((s) => s.status === 'Accepted by Peer'),
      swap_approved: allSwaps.filter((s) => s.status === 'Approved'),
      swap_rejected: allSwaps.filter((s) => s.status.includes('Rejected')),
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/room-change-requests/:id/approve', requireWarden, (req, res) => {
    const rid = Number(req.params.id);
    const rc = store.raw.roomChangeRequests.find((r) => r.id === rid);
    if (!rc) {
      res.status(404).json({ error: 'Room change request not found.' });
      return;
    }
    const targetRoom = store.raw.rooms.find((rm) => rm.id === rc.requested_room_id);
    if (!targetRoom) {
      res.status(404).json({ error: 'Requested room no longer exists.' });
      return;
    }
    if (store.toRoomDTO(targetRoom).available <= 0) {
      res.status(400).json({
        error: `Cannot approve — room ${targetRoom.roomnumber} is now full.`,
      });
      return;
    }
    const student = store.raw.students.find((s) => s.id === rc.student_id);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    student.room_id = targetRoom.id;
    rc.status = 'Approved';
    rc.warden_remark = String(req.body?.remark || '').trim();
    rc.approved_at = new Date().toISOString();
    store.commit();
    res.json({
      message: `Room change approved for ${student.fullname}. Moved to room ${targetRoom.roomnumber}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/room-change-requests/:id/reject', requireWarden, (req, res) => {
    const rid = Number(req.params.id);
    const rc = store.raw.roomChangeRequests.find((r) => r.id === rid);
    if (!rc) {
      res.status(404).json({ error: 'Room change request not found.' });
      return;
    }
    const student = store.raw.students.find((s) => s.id === rc.student_id);
    rc.status = 'Rejected';
    rc.warden_remark = String(req.body?.remark || '').trim();
    store.commit();
    res.json({
      message: `Room change request rejected for ${student?.fullname || 'student'}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/room-swaps/:id/approve', requireWarden, (req, res) => {
    const sid = Number(req.params.id);
    const swap = store.raw.roomSwapRequests.find((s) => s.id === sid);
    if (!swap) {
      res.status(404).json({ error: 'Room swap request not found.' });
      return;
    }
    if (swap.status !== 'Accepted by Peer') {
      res.status(400).json({
        error: "This swap request is not ready for approval (peer hasn't accepted yet).",
      });
      return;
    }
    const requester = store.raw.students.find((s) => s.id === swap.requester_id);
    const target = store.raw.students.find((s) => s.id === swap.target_id);
    if (!requester || !target) {
      res.status(404).json({ error: 'One of the students no longer exists.' });
      return;
    }
    const reqRoomId = requester.room_id;
    const tgtRoomId = target.room_id;
    requester.room_id = tgtRoomId;
    target.room_id = reqRoomId;
    swap.status = 'Approved';
    swap.warden_remark = String(req.body?.remark || '').trim();
    swap.approved_at = new Date().toISOString();
    store.commit();

    const newReqRoom = store.raw.rooms.find((r) => r.id === requester.room_id)?.roomnumber || '—';
    const newTgtRoom = store.raw.rooms.find((r) => r.id === target.room_id)?.roomnumber || '—';
    res.json({
      message: `Room swap approved! ${requester.fullname} moved to Room ${newReqRoom}, ${target.fullname} moved to Room ${newTgtRoom}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  app.post('/api/warden/room-swaps/:id/reject', requireWarden, (req, res) => {
    const sid = Number(req.params.id);
    const swap = store.raw.roomSwapRequests.find((s) => s.id === sid);
    if (!swap) {
      res.status(404).json({ error: 'Room swap request not found.' });
      return;
    }
    const requester = store.raw.students.find((s) => s.id === swap.requester_id);
    const target = store.raw.students.find((s) => s.id === swap.target_id);
    swap.status = 'Rejected by Warden';
    swap.warden_remark = String(req.body?.remark || '').trim();
    store.commit();
    res.json({
      message: `Room swap rejected for ${requester?.fullname || 'student'} and ${target?.fullname || 'student'}.`,
      sidebar_counts: store.getSidebarCounts(),
    });
  });

  // =========================================================================
  // Student Routes
  // =========================================================================
  app.get('/api/student/profile', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const student = store.raw.students.find((s) => s.id === studentId)!;
    const allComplaints = store.raw.complaints
      .filter((c) => c.student_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime());
    const allLeaves = store.raw.leaveRequests
      .filter((l) => l.student_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime());
    const allRoomChanges = store.raw.roomChangeRequests
      .filter((r) => r.student_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime());

    res.json({
      student: store.toStudentDTO(student),
      my_complaints: allComplaints.slice(0, 5).map((c) => store.toComplaintDTO(c)),
      my_leaves: allLeaves.slice(0, 5).map((l) => store.toLeaveDTO(l)),
      my_room_changes: allRoomChanges.slice(0, 5).map((r) => store.toRoomChangeDTO(r)),
      complaints_count: allComplaints.length,
      leaves_count: allLeaves.length,
      room_changes_count: allRoomChanges.length,
    });
  });

  app.post('/api/student/complaints', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    if (title.length < 3) {
      res.status(400).json({ error: 'Title must be at least 3 characters.' });
      return;
    }
    if (description.length < 5) {
      res.status(400).json({ error: 'Description must be at least 5 characters.' });
      return;
    }
    const created = {
      id: store.raw.nextId.complaint++,
      student_id: studentId,
      title,
      description,
      status: 'Pending' as const,
      createdat: new Date().toISOString(),
    };
    store.raw.complaints.push(created);
    store.commit();
    res.status(201).json({
      complaint: store.toComplaintDTO(created),
      message: 'Complaint submitted successfully.',
    });
  });

  app.get('/api/student/notices', requireStudent, (_req, res) => {
    const notices = [...store.raw.notices]
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((n) => store.toNoticeDTO(n));
    res.json({ notices });
  });

  app.get('/api/student/leave-requests', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const student = store.raw.students.find((s) => s.id === studentId)!;
    const myLeaves = store.raw.leaveRequests
      .filter((l) => l.student_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((l) => store.toLeaveDTO(l));
    res.json({
      student: store.toStudentDTO(student),
      my_leaves: myLeaves,
    });
  });

  app.post('/api/student/leave-requests', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const from_date = String(req.body?.from_date || '').trim();
    const to_date = String(req.body?.to_date || '').trim();
    const destination = String(req.body?.destination || '').trim();
    const reason = String(req.body?.reason || '').trim();

    const errors: Record<string, string> = {};
    if (!from_date) errors.from_date = 'From date is required.';
    if (!to_date) errors.to_date = 'To date is required.';
    if (from_date && to_date && to_date < from_date) {
      errors.to_date = 'To date must be after the from date.';
    }
    if (destination.length < 3) {
      errors.destination = 'Destination must be at least 3 characters.';
    }
    if (reason.length < 5) {
      errors.reason = 'Reason must be at least 5 characters.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const created = {
      id: store.raw.nextId.leave++,
      student_id: studentId,
      from_date,
      to_date,
      destination,
      reason,
      status: 'Pending' as const,
      warden_remark: '',
      createdat: new Date().toISOString(),
      approved_at: null,
    };
    store.raw.leaveRequests.push(created);
    store.commit();
    res.status(201).json({
      leave: store.toLeaveDTO(created),
      message: 'Leave request submitted. Waiting for warden approval.',
    });
  });

  app.get('/api/student/leave-requests/:id/gate-pass', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const lid = Number(req.params.id);
    const leave = store.raw.leaveRequests.find(
      (l) => l.id === lid && l.student_id === studentId,
    );
    if (!leave) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }
    if (leave.status !== 'Approved') {
      res.status(400).json({
        error: 'Gate pass is only available for approved leave requests.',
      });
      return;
    }
    const student = store.raw.students.find((s) => s.id === studentId)!;
    res.json({
      student: store.toStudentDTO(student),
      leave: store.toLeaveDTO(leave),
      warden_name: store.raw.wardens[0]?.username || 'Warden',
    });
  });

  app.get('/api/student/room-transfer', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const student = store.raw.students.find((s) => s.id === studentId)!;

    const myMoves = store.raw.roomChangeRequests
      .filter((r) => r.student_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((r) => store.toRoomChangeDTO(r));
    const mySwapsSent = store.raw.roomSwapRequests
      .filter((s) => s.requester_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((s) => store.toRoomSwapDTO(s));
    const mySwapsReceived = store.raw.roomSwapRequests
      .filter((s) => s.target_id === studentId)
      .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
      .map((s) => store.toRoomSwapDTO(s));

    const roomsWithSpace = [...store.raw.rooms]
      .filter((r) => r.id !== student.room_id)
      .sort((a, b) => a.roomnumber.localeCompare(b.roomnumber))
      .map((r) => store.toRoomDTO(r))
      .filter((r) => r.available > 0);

    const otherStudents = [...store.raw.students]
      .filter((s) => s.id !== studentId)
      .map((s) => store.toStudentDTO(s))
      .sort((a, b) => {
        const ra = a.room?.roomnumber || '';
        const rb = b.room?.roomnumber || '';
        if (ra !== rb) return ra.localeCompare(rb);
        return a.fullname.localeCompare(b.fullname);
      });

    res.json({
      student: store.toStudentDTO(student),
      my_moves: myMoves,
      my_swaps_sent: mySwapsSent,
      my_swaps_received: mySwapsReceived,
      rooms_with_space: roomsWithSpace,
      other_students: otherStudents,
      can_request: !store.hasActiveTransfer(studentId),
    });
  });

  app.post('/api/student/room-transfer/move', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const student = store.raw.students.find((s) => s.id === studentId)!;
    if (store.hasActiveTransfer(studentId)) {
      res.status(400).json({
        error:
          'You already have an active room transfer request. Wait for it to be resolved before creating a new one.',
      });
      return;
    }
    const requestedRoomId = Number(req.body?.requested_room);
    const reason = String(req.body?.reason || '').trim();
    const errors: Record<string, string> = {};

    if (!req.body?.requested_room) {
      errors.requested_room = 'Please select a room.';
    } else {
      const room = store.raw.rooms.find((r) => r.id === requestedRoomId);
      if (!room) {
        errors.requested_room = 'Invalid room selected.';
      } else if (room.id === student.room_id) {
        errors.requested_room = 'You are already in this room.';
      } else if (store.toRoomDTO(room).available <= 0) {
        errors.requested_room = 'That room is already full.';
      }
    }
    if (reason.length < 5) {
      errors.reason = 'Reason must be at least 5 characters.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const created = {
      id: store.raw.nextId.roomChange++,
      student_id: studentId,
      requested_room_id: requestedRoomId,
      reason,
      status: 'Pending' as const,
      warden_remark: '',
      createdat: new Date().toISOString(),
      approved_at: null,
    };
    store.raw.roomChangeRequests.push(created);
    store.commit();
    res.status(201).json({
      move: store.toRoomChangeDTO(created),
      message: 'Room change request submitted. Waiting for warden approval.',
    });
  });

  app.post('/api/student/room-transfer/move/:id/cancel', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const rid = Number(req.params.id);
    const rc = store.raw.roomChangeRequests.find(
      (r) => r.id === rid && r.student_id === studentId,
    );
    if (!rc) {
      res.status(404).json({ error: 'Room change request not found.' });
      return;
    }
    if (rc.status !== 'Pending') {
      res.status(400).json({ error: 'Only pending requests can be cancelled.' });
      return;
    }
    rc.status = 'Rejected';
    rc.warden_remark = 'Cancelled by student';
    store.commit();
    res.json({ message: 'Room change request cancelled.' });
  });

  app.post('/api/student/room-transfer/swap', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    if (store.hasActiveTransfer(studentId)) {
      res.status(400).json({
        error:
          'You already have an active room transfer request. Wait for it to be resolved before creating a new one.',
      });
      return;
    }
    const targetId = Number(req.body?.target);
    const reason = String(req.body?.reason || '').trim();
    const errors: Record<string, string> = {};

    let target = store.raw.students.find((s) => s.id === targetId);
    if (!req.body?.target) {
      errors.target = 'Please select a student to swap with.';
    } else if (!target) {
      errors.target = 'Invalid student selected.';
    } else if (target.id === studentId) {
      errors.target = 'You cannot swap with yourself.';
    } else if (!target.room_id) {
      errors.target = "That student doesn't have a room assigned.";
    } else if (store.hasActiveTransfer(target.id)) {
      errors.target = `${target.fullname} already has an active room transfer request.`;
    }
    if (reason.length < 5) {
      errors.reason = 'Reason must be at least 5 characters.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const created = {
      id: store.raw.nextId.roomSwap++,
      requester_id: studentId,
      target_id: target!.id,
      reason,
      status: 'Pending' as const,
      warden_remark: '',
      createdat: new Date().toISOString(),
      approved_at: null,
    };
    store.raw.roomSwapRequests.push(created);
    store.commit();
    res.status(201).json({
      swap: store.toRoomSwapDTO(created),
      message: `Room swap request sent to ${target!.fullname}. They need to accept it before the warden can approve.`,
    });
  });

  app.post('/api/student/room-transfer/swap/:id/accept', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const sid = Number(req.params.id);
    const swap = store.raw.roomSwapRequests.find(
      (s) => s.id === sid && s.target_id === studentId,
    );
    if (!swap) {
      res.status(404).json({ error: 'Swap request not found.' });
      return;
    }
    if (swap.status !== 'Pending') {
      res.status(400).json({ error: 'This swap request is no longer pending.' });
      return;
    }
    swap.status = 'Accepted by Peer';
    store.commit();
    const requester = store.raw.students.find((s) => s.id === swap.requester_id);
    res.json({
      message: `You accepted the swap request from ${requester?.fullname || 'student'}. Waiting for warden approval.`,
    });
  });

  app.post('/api/student/room-transfer/swap/:id/reject', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const sid = Number(req.params.id);
    const swap = store.raw.roomSwapRequests.find(
      (s) => s.id === sid && s.target_id === studentId,
    );
    if (!swap) {
      res.status(404).json({ error: 'Swap request not found.' });
      return;
    }
    if (swap.status !== 'Pending') {
      res.status(400).json({ error: 'This swap request is no longer pending.' });
      return;
    }
    swap.status = 'Rejected by Peer';
    store.commit();
    const requester = store.raw.students.find((s) => s.id === swap.requester_id);
    res.json({
      message: `You rejected the swap request from ${requester?.fullname || 'student'}.`,
    });
  });

  app.post('/api/student/room-transfer/swap/:id/cancel', requireStudent, (req, res) => {
    const studentId = getSession(req).data.student_id!;
    const sid = Number(req.params.id);
    const swap = store.raw.roomSwapRequests.find(
      (s) => s.id === sid && s.requester_id === studentId,
    );
    if (!swap) {
      res.status(404).json({ error: 'Swap request not found.' });
      return;
    }
    if (swap.status !== 'Pending' && swap.status !== 'Accepted by Peer') {
      res.status(400).json({ error: 'Only pending or accepted swaps can be cancelled.' });
      return;
    }
    swap.status = 'Rejected by Peer';
    store.commit();
    res.json({ message: 'Room swap request cancelled.' });
  });

  // =========================================================================
  // Vite / Static Frontend
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Smart Hostel Management System running on http://0.0.0.0:3000');
  });
}

startServer();
