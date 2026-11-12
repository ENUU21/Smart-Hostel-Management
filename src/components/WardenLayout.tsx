import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  DoorClosed,
  Gauge,
  LogOut,
  Megaphone,
  MessageSquareText,
  PlaneTakeoff,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import type { SidebarCounts } from '../../shared/types';

export type WardenNavKey =
  | 'dashboard'
  | 'students'
  | 'rooms'
  | 'complaints'
  | 'leaves'
  | 'room_changes'
  | 'notices';

export interface FlashMessage {
  type: 'success' | 'danger' | 'info';
  text: string;
}

interface WardenLayoutProps {
  activeNav: WardenNavKey;
  pageTitle: string;
  wardenName: string;
  sidebarCounts?: SidebarCounts;
  flash: FlashMessage | null;
  onDismissFlash: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function WardenLayout({
  activeNav,
  pageTitle,
  wardenName,
  sidebarCounts,
  flash,
  onDismissFlash,
  onNavigate,
  onLogout,
  children,
}: WardenLayoutProps) {
  const navItems: {
    key: WardenNavKey;
    label: string;
    path: string;
    icon: ReactNode;
    badge?: number;
  }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/warden/dashboard',
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      key: 'students',
      label: 'Students',
      path: '/warden/students',
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'rooms',
      label: 'Rooms',
      path: '/warden/rooms',
      icon: <DoorClosed className="h-4 w-4" />,
    },
    {
      key: 'complaints',
      label: 'Complaints',
      path: '/warden/complaints',
      icon: <MessageSquareText className="h-4 w-4" />,
      badge: sidebarCounts?.pending_complaints,
    },
    {
      key: 'leaves',
      label: 'Leave Requests',
      path: '/warden/leave-requests',
      icon: <PlaneTakeoff className="h-4 w-4" />,
      badge: sidebarCounts?.pending_leaves,
    },
    {
      key: 'room_changes',
      label: 'Room Transfers',
      path: '/warden/room-change-requests',
      icon: <ArrowLeftRight className="h-4 w-4" />,
      badge: sidebarCounts?.pending_room_changes,
    },
    {
      key: 'notices',
      label: 'Notices',
      path: '/warden/notices',
      icon: <Megaphone className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav className="flex w-full shrink-0 flex-col bg-[#1e293b] text-white md:fixed md:inset-y-0 md:left-0 md:w-[240px]">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-6">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 shrink-0" />
          <span className="text-lg font-bold tracking-tight">Smart Hostel</span>
        </div>

        <ul className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const isActive = item.key === activeNav;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? 'bg-[#0ea5e9] font-semibold text-white'
                      : 'text-white/70 hover:bg-[#334155] hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-md bg-[#f59e0b] px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-left text-sm text-white/70 transition hover:bg-[#ef4444] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 bg-[#f5f7fa] md:ml-[240px]">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-6 py-5">
          <h1 className="m-0 text-xl font-bold text-[#1e293b]">{pageTitle}</h1>
          <div className="flex items-center gap-1.5 text-sm text-[#64748b]">
            <UserCircle className="h-4 w-4" />
            <span>{wardenName || 'Warden'}</span>
          </div>
        </div>

        {flash && (
          <div className="px-6 pt-5">
            <div
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                flash.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : flash.type === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-sky-200 bg-sky-50 text-sky-800'
              }`}
            >
              <span>{flash.text}</span>
              <button
                type="button"
                onClick={onDismissFlash}
                className="ml-3 rounded p-1 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
