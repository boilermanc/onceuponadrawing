import React from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import type { AdminPage } from './Sidebar';

const pageTitles: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  stories: 'Stories',
  videos: 'Videos',
  orders: 'Orders',
  gallery: 'Gallery',
  preview: 'Print Preview',
  emails: 'Emails',
  integrations: 'Integrations',
  settings: 'Settings',
};

interface HeaderProps {
  currentPage: AdminPage;
  userEmail: string | null;
  onLogout: () => void;
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, userEmail, onLogout, onBack }) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Back to site"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">
          {pageTitles[currentPage]}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-slate-500">{userEmail}</span>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
