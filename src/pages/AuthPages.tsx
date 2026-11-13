import React, { useState } from 'react';
import { ArrowRight, Car, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppRoute, getDefaultDashboardForRole } from '../data/navigation';
import { UserRole } from '../types/ridenexa';

interface AuthPageProps {
  onNavigate: (route: AppRoute, options?: { replace?: boolean; search?: string }) => void;
  adminIntent?: boolean;
}

export const SignInPage: React.FC<AuthPageProps> = ({ onNavigate, adminIntent = false }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminMode, setAdminMode] = useState(adminIntent);
  const [adminProvisioned, setAdminProvisioned] = useState<boolean | null>(null);
  const emailInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setAdminMode(adminIntent);
    if (adminIntent) {
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [adminIntent]);

  React.useEffect(() => {
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then((data: { adminProvisioned?: boolean }) => {
        setAdminProvisioned(Boolean(data.adminProvisioned));
      })
      .catch(() => {});
  }, []);

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const signedInUser = await login(targetEmail, targetPassword);
      onNavigate(getDefaultDashboardForRole(signedInUser.role));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    await performLogin(email.trim(), password);
  };

  const handleSelectAdministrator = () => {
    setError(null);
    setAdminMode(true);
    setEmail('');
    setPassword('');
    onNavigate('/login', { replace: true, search: '?intent=admin' });
    setTimeout(() => emailInputRef.current?.focus(), 50);
  };

  const demoAccounts: {
    label: string;
    roleDesc: string;
    email: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: 'Passenger Demo',
      roleDesc: 'Book rides, inspect driver allocation, track trips',
      email: 'passenger@ridenexa.io',
      icon: <User className="h-4 w-4 text-[#009F95]" />,
    },
    {
      label: 'Driver Demo',
      roleDesc: 'Toggle availability, accept requests, view repositioning',
      email: 'driver@ridenexa.io',
      icon: <Car className="h-4 w-4 text-[#009F95]" />,
    },
  ];

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <h1 className="font-display text-2xl font-extrabold text-[#0B1220] sm:text-3xl">
              {adminMode ? 'Administrator Sign In' : 'Sign in to RideNexa'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {adminMode
                ? 'Enter your provisioned Administrator credentials to access the Admin Command Centre.'
                : 'Access your Passenger, Driver, or Admin workspace using JWT-authenticated credentials.'}
            </p>

            {adminMode && adminProvisioned === false && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                No Administrator account is provisioned on this server yet. Provision one using{' '}
                <code className="font-mono font-semibold">ADMIN_EMAIL</code> /{' '}
                <code className="font-mono font-semibold">ADMIN_PASSWORD</code> environment variables or{' '}
                <code className="font-mono font-semibold">npm run provision:admin</code>.
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {adminMode ? 'Administrator Email' : 'Email Address'}
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={adminMode ? 'admin@yourdomain.com' : 'you@ridenexa.io'}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] disabled:opacity-60"
              >
                <span>
                  {submitting
                    ? 'Signing in...'
                    : adminMode
                    ? 'Sign In to Admin Dashboard'
                    : 'Sign In'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
              <div>
                New to RideNexa?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="font-semibold text-[#009F95] hover:text-[#00867d]"
                >
                  Create an account
                </button>
              </div>
              {adminMode && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminMode(false);
                    onNavigate('/login', { replace: true, search: '' });
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0B1220]"
                >
                  Standard sign in
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Role Access Options
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Launch Passenger or Driver demonstration workspaces directly, or open the Administrator sign-in flow.
            </p>

            <div className="mt-5 space-y-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => performLogin(acc.email, 'RideNexa123!')}
                  className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3.5 text-left transition-colors hover:border-[#009F95] hover:bg-slate-50 disabled:opacity-60"
                >
                  <div className="mt-0.5">{acc.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#0B1220]">{acc.label}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{acc.roleDesc}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">{acc.email}</div>
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={handleSelectAdministrator}
                className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                  adminMode
                    ? 'border-[#009F95] bg-[#009F95]/10'
                    : 'border-slate-200 bg-slate-50 hover:border-[#009F95] hover:bg-slate-100/70'
                }`}
              >
                <div className="mt-0.5">
                  <ShieldCheck className="h-4 w-4 text-[#009F95]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#0B1220]">Administrator</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Sign in with Admin credentials to open the Admin Dashboard
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PASSENGER');
  const [vehicleModel, setVehicleModel] = useState('Tata Nexon EV');
  const [plateNumber, setPlateNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim(),
        vehicleModel: role === 'DRIVER' ? vehicleModel : undefined,
        plateNumber: role === 'DRIVER' ? plateNumber : undefined,
      });
      onNavigate(getDefaultDashboardForRole(created.role));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="font-display text-2xl font-extrabold text-[#0B1220] sm:text-3xl">
            Create your RideNexa account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select your account type to begin booking trips or accepting ride dispatches.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Account Role</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['PASSENGER', 'DRIVER'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      role === r
                        ? 'border-[#009F95] bg-[#009F95]/10 text-[#0B1220]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rohan Kulkarni"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 00000"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password (min 6 characters)</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
              />
            </div>

            {role === 'DRIVER' && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Tata Nexon EV"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#009F95] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Plate Number</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="KA-01-RN-2048"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#009F95] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] disabled:opacity-60"
            >
              <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">
            Already registered?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/signin')}
              className="font-semibold text-[#009F95] hover:text-[#00867d]"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
