import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar, { AdminPage } from './components/Sidebar';
import Header from './components/Header';

interface AdminLayoutProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  userEmail: string | null;
  onLogout: () => void;
  onBack: () => void;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPage,
  onNavigate,
  userEmail,
  onLogout,
  onBack,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentPage={currentPage}
          userEmail={userEmail}
          onLogout={onLogout}
          onBack={onBack}
        />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
