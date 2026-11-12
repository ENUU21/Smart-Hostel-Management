import { useEffect, useState } from 'react';
import type { AuthSessionResponse, SidebarCounts, StudentDTO } from '../shared/types';
import { WardenLayout, type FlashMessage, type WardenNavKey } from './components/WardenLayout';
import { apiFetch, setSessionToken } from './lib/api';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { StudentComplaint } from './pages/student/StudentComplaint';
import { StudentGatePass } from './pages/student/StudentGatePass';
import { StudentLeaveRequests } from './pages/student/StudentLeaveRequests';
import { StudentNotices } from './pages/student/StudentNotices';
import { StudentProfile } from './pages/student/StudentProfile';
import { StudentRoomTransfer } from './pages/student/StudentRoomTransfer';
import { WardenComplaints } from './pages/warden/WardenComplaints';
import { WardenDashboard } from './pages/warden/WardenDashboard';
import { WardenLeaveRequests } from './pages/warden/WardenLeaveRequests';
import { WardenNotices } from './pages/warden/WardenNotices';
import { WardenRooms } from './pages/warden/WardenRooms';
import { WardenRoomTransfers } from './pages/warden/WardenRoomTransfers';
import { WardenStudents } from './pages/warden/WardenStudents';

function normalizePath(p: string): string {
  const clean = p.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export default function App() {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [role, setRole] = useState<'warden' | 'student' | null>(null);
  const [wardenName, setWardenName] = useState('Warden');
  const [student, setStudent] = useState<StudentDTO | null>(null);
  const [sidebarCounts, setSidebarCounts] = useState<SidebarCounts | undefined>(undefined);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const navigate = (nextPath: string) => {
    const norm = normalizePath(nextPath);
    if (norm !== path) {
      window.history.pushState({}, '', norm);
      setPath(norm);
    }
  };

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    apiFetch<AuthSessionResponse>('/api/auth/me')
      .then((res) => {
        setRole(res.role);
        if (res.warden_name) setWardenName(res.warden_name);
        if (res.student) setStudent(res.student);
        if (res.sidebar_counts) setSidebarCounts(res.sidebar_counts);
      })
      .catch(() => {
        setRole(null);
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setSessionToken(null);
    setRole(null);
    setStudent(null);
    setFlash(null);
    navigate('/');
  };

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-sm text-[#64748b]">
        Loading Smart Hostel Management System...
      </div>
    );
  }

  // Public routes
  if (path === '/' || path === '') {
    return <HomePage onNavigate={navigate} />;
  }

  if (path === '/warden/login') {
    return (
      <LoginPage
        mode="warden"
        onNavigate={navigate}
        onWardenSuccess={(name, counts) => {
          setRole('warden');
          setWardenName(name);
          setSidebarCounts(counts);
          setFlash(null);
          navigate('/warden/dashboard');
        }}
        onStudentSuccess={() => {}}
      />
    );
  }

  if (path === '/student/login') {
    return (
      <LoginPage
        mode="student"
        onNavigate={navigate}
        onWardenSuccess={() => {}}
        onStudentSuccess={(s) => {
          setRole('student');
          setStudent(s);
          setFlash(null);
          navigate('/student/profile');
        }}
      />
    );
  }

  // Warden routes
  if (path.startsWith('/warden')) {
    if (role !== 'warden') {
      return (
        <LoginPage
          mode="warden"
          onNavigate={navigate}
          onWardenSuccess={(name, counts) => {
            setRole('warden');
            setWardenName(name);
            setSidebarCounts(counts);
            setFlash(null);
            navigate(path === '/warden' ? '/warden/dashboard' : path);
          }}
          onStudentSuccess={() => {}}
        />
      );
    }

    let activeNav: WardenNavKey = 'dashboard';
    let pageTitle = 'Dashboard';
    if (path === '/warden/students') {
      activeNav = 'students';
      pageTitle = 'Students';
    } else if (path === '/warden/rooms') {
      activeNav = 'rooms';
      pageTitle = 'Rooms';
    } else if (path === '/warden/complaints') {
      activeNav = 'complaints';
      pageTitle = 'Complaints';
    } else if (path === '/warden/leave-requests') {
      activeNav = 'leaves';
      pageTitle = 'Leave Requests';
    } else if (
      path === '/warden/room-change-requests' ||
      path === '/warden/room-swaps'
    ) {
      activeNav = 'room_changes';
      pageTitle = 'Room Transfers';
    } else if (path === '/warden/notices') {
      activeNav = 'notices';
      pageTitle = 'Notices';
    }

    return (
      <WardenLayout
        activeNav={activeNav}
        pageTitle={pageTitle}
        wardenName={wardenName}
        sidebarCounts={sidebarCounts}
        flash={flash}
        onDismissFlash={() => setFlash(null)}
        onNavigate={(next) => {
          setFlash(null);
          navigate(next);
        }}
        onLogout={handleLogout}
      >
        {activeNav === 'dashboard' && (
          <WardenDashboard
            onNavigate={(next) => {
              setFlash(null);
              navigate(next);
            }}
            onCountsUpdate={setSidebarCounts}
          />
        )}
        {activeNav === 'students' && (
          <WardenStudents
            onNavigate={navigate}
            onFlash={setFlash}
            onCountsUpdate={setSidebarCounts}
          />
        )}
        {activeNav === 'rooms' && (
          <WardenRooms onFlash={setFlash} onCountsUpdate={setSidebarCounts} />
        )}
        {activeNav === 'complaints' && (
          <WardenComplaints onFlash={setFlash} onCountsUpdate={setSidebarCounts} />
        )}
        {activeNav === 'leaves' && (
          <WardenLeaveRequests onFlash={setFlash} onCountsUpdate={setSidebarCounts} />
        )}
        {activeNav === 'room_changes' && (
          <WardenRoomTransfers onFlash={setFlash} onCountsUpdate={setSidebarCounts} />
        )}
        {activeNav === 'notices' && (
          <WardenNotices onFlash={setFlash} onCountsUpdate={setSidebarCounts} />
        )}
      </WardenLayout>
    );
  }

  // Student routes
  if (path.startsWith('/student')) {
    if (role !== 'student' || !student) {
      return (
        <LoginPage
          mode="student"
          onNavigate={navigate}
          onWardenSuccess={() => {}}
          onStudentSuccess={(s) => {
            setRole('student');
            setStudent(s);
            setFlash(null);
            navigate(path === '/student' ? '/student/profile' : path);
          }}
        />
      );
    }

    const gatePassMatch = path.match(/^\/student\/leave-request\/(\d+)\/gate-pass$/);
    if (gatePassMatch) {
      return (
        <StudentGatePass
          leaveId={Number(gatePassMatch[1])}
          onNavigate={navigate}
        />
      );
    }

    if (path === '/student/leave-request') {
      return (
        <StudentLeaveRequests
          flash={flash}
          onFlash={setFlash}
          onDismissFlash={() => setFlash(null)}
          onNavigate={navigate}
        />
      );
    }

    if (path === '/student/room-transfer') {
      return (
        <StudentRoomTransfer
          flash={flash}
          onFlash={setFlash}
          onDismissFlash={() => setFlash(null)}
          onNavigate={navigate}
        />
      );
    }

    if (path === '/student/complaint') {
      return <StudentComplaint onFlash={setFlash} onNavigate={navigate} />;
    }

    if (path === '/student/notices') {
      return <StudentNotices onNavigate={navigate} />;
    }

    return (
      <StudentProfile
        flash={flash}
        onDismissFlash={() => setFlash(null)}
        onNavigate={(next) => {
          setFlash(null);
          navigate(next);
        }}
        onLogout={handleLogout}
      />
    );
  }

  return <HomePage onNavigate={navigate} />;
}
