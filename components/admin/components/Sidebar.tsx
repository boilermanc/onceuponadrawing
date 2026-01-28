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
  Image,
  Printer,
  Mail,
} from 'lucide-react';

export type AdminPage = 'dashboard' | 'customers' | 'stories' | 'videos' | 'orders' | 'gallery' | 'preview' | 'emails' | 'settings';

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ElementType;
  separator?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'gallery', label: 'Gallery', icon: Image, separator: true },
  { id: 'preview', label: 'Print Preview', icon: Printer },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings, separator: true },
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
      className="h-screen bg-[#546a7b] flex flex-col flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold text-white whitespace-nowrap"
          >
            Once Upon a Drawing
          </motion.span>
        )}
        {collapsed && (
          <span className="text-sm font-bold text-white mx-auto">O</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.separator && (
                <div className="my-2 mx-3 border-t border-white/10" />
              )}
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
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
            </React.Fragment>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
