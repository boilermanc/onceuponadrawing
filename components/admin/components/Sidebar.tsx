import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Video,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type AdminPage = 'dashboard' | 'customers' | 'stories' | 'videos' | 'orders' | 'settings';

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, collapsed, onToggleCollapse }) => {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold text-slate-900 whitespace-nowrap"
          >
            Once Upon a Drawing
          </motion.span>
        )}
        {collapsed && (
          <span className="text-sm font-bold text-slate-900 mx-auto">O</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
