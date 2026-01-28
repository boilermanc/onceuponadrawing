import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Lock, ArrowLeft, BookOpen } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import AdminLayout from './AdminLayout';
import type { AdminPage } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Stories from './pages/Stories';
import Videos from './pages/Videos';
import Orders from './pages/Orders';
import Gallery from './pages/Gallery';
import Preview from './pages/Preview';
import Emails from './pages/Emails';
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
      <div className="min-h-screen bg-off-white flex items-center justify-center relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-off-white via-off-white to-silver/20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pacific-cyan/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-sm mx-4"
        >
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-slate border border-blue-slate/20 mb-4"
            >
              <BookOpen size={22} className="text-off-white" />
            </motion.div>
            <h1 className="text-xl font-semibold text-gunmetal">Once Upon a Drawing</h1>
            <p className="text-sm text-gunmetal/60 mt-1">Admin Console</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-silver/50 rounded-xl p-6 shadow-lg shadow-gunmetal/5">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={14} className="text-blue-slate" />
              <span className="text-sm font-medium text-gunmetal/70">Sign in to continue</span>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gunmetal/70 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-off-white border border-silver rounded-lg text-gunmetal placeholder-gunmetal/40 focus:outline-none focus:ring-2 focus:ring-pacific-cyan/40 focus:border-pacific-cyan transition-colors"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal/70 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-off-white border border-silver rounded-lg text-gunmetal placeholder-gunmetal/40 focus:outline-none focus:ring-2 focus:ring-pacific-cyan/40 focus:border-pacific-cyan transition-colors"
                  placeholder="Enter password"
                  required
                />
              </div>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  <span>{loginError}</span>
                </motion.div>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 text-sm font-medium text-white bg-blue-slate rounded-lg hover:bg-blue-slate/90 disabled:opacity-50 disabled:hover:bg-blue-slate transition-colors mt-2"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Back link */}
          <button
            onClick={onBack}
            className="mt-6 w-full flex items-center justify-center gap-1.5 text-sm text-gunmetal/50 hover:text-gunmetal/70 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to site
          </button>
        </motion.div>
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
    gallery: <Gallery />,
    preview: <Preview />,
    emails: <Emails adminEmail={effectiveEmail || ''} />,
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
