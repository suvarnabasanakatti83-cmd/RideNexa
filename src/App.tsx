import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { DashboardLayout, PublicLayout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import {
  AppRoute,
  canonicalizeRoute,
  getDefaultDashboardForRole,
} from './data/navigation';
import { AdminDashboard } from './pages/AdminDashboard';
import { RegisterPage, SignInPage } from './pages/AuthPages';
import { DriverDashboard } from './pages/DriverDashboard';
import { HomePage } from './pages/HomePage';
import { IntelligenceHub } from './pages/IntelligenceHub';
import {
  AboutPage,
  ContactPage,
  FeaturesPage,
  HowItWorksPage,
  TechnologyPage,
} from './pages/MarketingPages';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { UserRole } from './types/ridenexa';

function RedirectTo({
  to,
  onNavigate,
}: {
  to: AppRoute;
  onNavigate: (route: AppRoute, options?: { replace?: boolean; search?: string }) => void;
}) {
  useEffect(() => {
    onNavigate(to, { replace: true });
  }, [to, onNavigate]);

  return null;
}

function UnauthorizedAccessPage({
  userRole,
  attemptedRoute,
  onNavigate,
}: {
  userRole: UserRole;
  attemptedRoute: string;
  onNavigate: (route: AppRoute, options?: { replace?: boolean; search?: string }) => void;
}) {
  const targetDashboard = getDefaultDashboardForRole(userRole);

  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate(targetDashboard, { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [targetDashboard, onNavigate]);

  return (
    <div className="py-16 px-4">
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0B1220]">
          Unauthorized Access
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Access to <span className="font-mono font-semibold text-[#0B1220]">{attemptedRoute}</span> is restricted. Your account role (<strong>{userRole}</strong>) does not have permission to view this page.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Redirecting you to your authorized workspace ({targetDashboard})...
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(targetDashboard, { replace: true })}
            className="rounded-lg bg-[#0B1220] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ProtectedWorkspace({
  title,
  currentRoute,
  allowedRoles,
  onNavigate,
  children,
}: {
  title: string;
  currentRoute: AppRoute;
  allowedRoles: UserRole[];
  onNavigate: (route: AppRoute, options?: { replace?: boolean; search?: string }) => void;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const search = currentRoute === '/admin/dashboard' ? '?intent=admin' : '';
      onNavigate('/login', { replace: true, search });
    }
  }, [loading, user, currentRoute, onNavigate]);

  if (loading) {
    return (
      <PublicLayout currentRoute={currentRoute} onNavigate={onNavigate}>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Verifying session and role permissions...
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <PublicLayout currentRoute={currentRoute} onNavigate={onNavigate}>
        <UnauthorizedAccessPage
          userRole={user.role}
          attemptedRoute={currentRoute}
          onNavigate={onNavigate}
        />
      </PublicLayout>
    );
  }

  return (
    <DashboardLayout title={title} currentRoute={currentRoute} onNavigate={onNavigate}>
      {children}
    </DashboardLayout>
  );
}

function RideNexaRouter() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<AppRoute>(() => canonicalizeRoute(window.location.pathname));
  const [search, setSearch] = useState<string>(() => window.location.search);

  useEffect(() => {
    const normalized = canonicalizeRoute(window.location.pathname);
    if (window.location.pathname !== normalized) {
      window.history.replaceState({}, '', normalized + window.location.search);
    }
    const onPopState = () => {
      setRoute(canonicalizeRoute(window.location.pathname));
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextRaw: AppRoute, options?: { replace?: boolean; search?: string }) => {
    const next = canonicalizeRoute(nextRaw);
    const nextSearch = options?.search ?? '';
    const fullUrl = next + nextSearch;
    if (next !== route || nextSearch !== search || window.location.pathname !== next) {
      if (options?.replace) {
        window.history.replaceState({}, '', fullUrl);
      } else {
        window.history.pushState({}, '', fullUrl);
      }
      setRoute(next);
      setSearch(nextSearch);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route === '/passenger/dashboard') {
    return (
      <ProtectedWorkspace
        title="Passenger Workspace"
        currentRoute={route}
        allowedRoles={['PASSENGER', 'ADMIN']}
        onNavigate={navigate}
      >
        <PassengerDashboard onNavigate={navigate} />
      </ProtectedWorkspace>
    );
  }

  if (route === '/driver/dashboard') {
    return (
      <ProtectedWorkspace
        title="Driver Workspace"
        currentRoute={route}
        allowedRoles={['DRIVER', 'ADMIN']}
        onNavigate={navigate}
      >
        <DriverDashboard />
      </ProtectedWorkspace>
    );
  }

  if (route === '/admin/dashboard') {
    return (
      <ProtectedWorkspace
        title="Admin Command Centre"
        currentRoute={route}
        allowedRoles={['ADMIN']}
        onNavigate={navigate}
      >
        <AdminDashboard />
      </ProtectedWorkspace>
    );
  }

  if (route === '/intelligence') {
    return (
      <DashboardLayout title="Intelligence Hub" currentRoute={route} onNavigate={navigate}>
        <IntelligenceHub />
      </DashboardLayout>
    );
  }

  // If already logged in and visiting /login or /register, redirect to role dashboard
  if ((route === '/login' || route === '/register') && !loading && user) {
    return <RedirectTo to={getDefaultDashboardForRole(user.role)} onNavigate={navigate} />;
  }

  const adminIntent = search.includes('intent=admin');

  return (
    <PublicLayout currentRoute={route} onNavigate={navigate}>
      {route === '/' && <HomePage onNavigate={navigate} />}
      {route === '/about' && <AboutPage onNavigate={navigate} />}
      {route === '/how-it-works' && <HowItWorksPage onNavigate={navigate} />}
      {route === '/features' && <FeaturesPage onNavigate={navigate} />}
      {route === '/technology' && <TechnologyPage onNavigate={navigate} />}
      {route === '/contact' && <ContactPage onNavigate={navigate} />}
      {route === '/login' && <SignInPage onNavigate={navigate} adminIntent={adminIntent} />}
      {route === '/register' && <RegisterPage onNavigate={navigate} />}
    </PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RideNexaRouter />
      </SocketProvider>
    </AuthProvider>
  );
}
