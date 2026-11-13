import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Car,
  Compass,
  Cpu,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppRoute, getDefaultDashboardForRole } from '../data/navigation';

interface PublicLayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: { label: string; route: AppRoute }[] = [
    { label: 'About Us', route: '/about' },
    { label: 'How It Works', route: '/how-it-works' },
    { label: 'Features', route: '/features' },
    { label: 'Technology', route: '/technology' },
    { label: 'Intelligence Hub', route: '/intelligence' },
  ];

  const handleNav = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#0B1220]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="text-xl font-extrabold tracking-tight text-[#0B1220] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#009F95]"
          >
            RideNexa
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navLinks.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'border-[#009F95] text-[#0B1220] font-semibold'
                      : 'border-transparent hover:text-[#0B1220] hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="hidden lg:flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => handleNav(getDefaultDashboardForRole(user.role))}
                className="rounded-lg bg-[#0B1220] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Open Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className="rounded-lg bg-[#009F95] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden rounded-lg p-2 text-[#0B1220] hover:bg-slate-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleNav('/')}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#0B1220] hover:bg-slate-50"
              >
                Home
              </button>
              {navLinks.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#0B1220] hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNav('/contact')}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#0B1220] hover:bg-slate-50"
              >
                Contact
              </button>
              <div className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNav(getDefaultDashboardForRole(user.role))}
                      className="w-full rounded-lg bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Open {user.role.charAt(0) + user.role.slice(1).toLowerCase()} Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        handleNav('/');
                      }}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNav('/login')}
                      className="w-full rounded-lg bg-[#009F95] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('/register')}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-[#0B1220]"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-[#0B1220] text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="font-display text-xl font-extrabold tracking-tight text-white">
                RideNexa
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Move Smarter. Ride Fairer. Intelligent urban mobility powered by fair driver dispatch, predictive demand analytics, and cooperative route pooling.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-white">Platform</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => onNavigate('/')} className="hover:text-white transition-colors">
                    Home
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/how-it-works')} className="hover:text-white transition-colors">
                    How It Works
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/features')} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/technology')} className="hover:text-white transition-colors">
                    Technology Stack
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-white">Workspaces</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => onNavigate('/intelligence')} className="hover:text-white transition-colors">
                    Intelligence Hub
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/passenger/dashboard')} className="hover:text-white transition-colors">
                    Passenger Dashboard
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/driver/dashboard')} className="hover:text-white transition-colors">
                    Driver Dashboard
                  </button>
                </li>
                {(!user || user.role === 'ADMIN') && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/admin/dashboard')}
                      className="hover:text-white transition-colors"
                    >
                      Administrator
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-white">Company & Access</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => onNavigate('/about')} className="hover:text-white transition-colors">
                    About Us
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/contact')} className="hover:text-white transition-colors">
                    Contact
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/login')} className="hover:text-white transition-colors">
                    Sign In
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/register')} className="hover:text-white transition-colors">
                    Register
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} RideNexa Mobility Systems. OpenStreetMap contributors for map tiles.</p>
            <p>Simulated demo fleet and prototype forecasting models are clearly labelled across workspaces.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface DashboardLayoutProps {
  title: string;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  currentRoute,
  onNavigate,
  children,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const workspaceItems: {
    label: string;
    route: AppRoute;
    icon: React.ReactNode;
    visible: boolean;
  }[] = [
    {
      label: 'Passenger Workspace',
      route: '/passenger/dashboard',
      icon: <User className="h-4 w-4" />,
      visible: user?.role === 'PASSENGER' || user?.role === 'ADMIN',
    },
    {
      label: 'Driver Workspace',
      route: '/driver/dashboard',
      icon: <Car className="h-4 w-4" />,
      visible: user?.role === 'DRIVER' || user?.role === 'ADMIN',
    },
    {
      label: 'Admin Command',
      route: '/admin/dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      visible: user?.role === 'ADMIN',
    },
    {
      label: 'Intelligence Hub',
      route: '/intelligence',
      icon: <Cpu className="h-4 w-4" />,
      visible: true,
    },
  ];

  const publicItems: { label: string; route: AppRoute; icon: React.ReactNode }[] = [
    { label: 'Home Overview', route: '/', icon: <Compass className="h-4 w-4" /> },
    { label: 'Features', route: '/features', icon: <Activity className="h-4 w-4" /> },
    { label: 'Technology', route: '/technology', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#0B1220] text-slate-200 p-4">
      <div>
        <div className="flex items-center justify-between px-2 py-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="font-display text-xl font-extrabold tracking-tight text-white"
          >
            RideNexa
          </button>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          <div className="px-3 text-xs font-medium text-slate-400">Workspaces</div>
          <nav className="mt-2 space-y-1">
            {workspaceItems
              .filter((item) => item.visible)
              .map((item) => {
                const active = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onNavigate(item.route);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#009F95] text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="mt-8">
          <div className="px-3 text-xs font-medium text-slate-400">Platform</div>
          <nav className="mt-2 space-y-1">
            {publicItems.map((item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  onNavigate(item.route);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white whitespace-nowrap"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        {user ? (
          <div className="space-y-3">
            <div className="px-2">
              <div className="truncate text-sm font-semibold text-white">{user.name}</div>
              <div className="truncate text-xs text-slate-400">
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()} · {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('/login');
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="w-full rounded-lg bg-[#009F95] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00867d]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/register')}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] text-[#0B1220]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0B1220]/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw]">{renderSidebarContent()}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open workspace navigation"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="text-slate-500 hover:text-[#0B1220] whitespace-nowrap"
              >
                RideNexa
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-[#0B1220] truncate">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/intelligence')}
              className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap"
            >
              Intelligence Hub
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => onNavigate(getDefaultDashboardForRole(user.role))}
                className="rounded-lg bg-[#0B1220] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                My Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="rounded-lg bg-[#009F95] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00867d] whitespace-nowrap"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
