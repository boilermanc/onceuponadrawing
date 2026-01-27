import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import AdminLayout from './AdminLayout';
import type { AdminPage } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Stories from './pages/Stories';
import Videos from './pages/Videos';
import Orders from './pages/Orders';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ADMIN_EMAIL = 'team@sproutify.app';

interface AdminAppProps {
  userEmail: string | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const AdminAppInner: React.FC<AdminAppProps> = ({ userEmail, isAuthenticated, onLogin, onBack, onLogout }) => {
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
  const [adminSession, setAdminSession] = useState<{ email: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check if already authenticated as admin
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setAdminSession({ email: session.user.email });
      }
    };
    checkSession();
  }, [userEmail]);

  const effectiveEmail = adminSession?.email || userEmail;
  const isAdmin = effectiveEmail === ADMIN_EMAIL;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      if (data.user?.email !== ADMIN_EMAIL) {
        setLoginError('Not authorized');
        await supabase.auth.signOut();
        return;
      }
      setAdminSession({ email: data.user.email! });
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAdminSession(null);
    onLogout();
  };

  // Not authenticated - show login
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-200 rounded-lg p-8">
            <h1 className="text-lg font-semibold text-slate-900 mb-1">Admin Login</h1>
            <p className="text-sm text-slate-500 mb-6">Sign in to access the admin dashboard.</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <button
              onClick={onBack}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Back to site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated admin
  const pages: Record<AdminPage, React.ReactNode> = {
    dashboard: <Dashboard />,
    customers: <Customers />,
    stories: <Stories />,
    videos: <Videos />,
    orders: <Orders />,
    settings: <Settings />,
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      userEmail={effectiveEmail}
      onLogout={handleLogout}
      onBack={onBack}
    >
      {pages[currentPage]}
    </AdminLayout>
  );
};

const AdminApp: React.FC<AdminAppProps> = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAppInner {...props} />
    </QueryClientProvider>
  );
};

export default AdminApp;
