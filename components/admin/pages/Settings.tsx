import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database, Mail, HardDrive, Server } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { format } from 'date-fns';

const Settings: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-settings-stats'],
    queryFn: async () => {
      const [profilesRes, creationsRes, ordersRes, templatesRes, emailLogsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('creations').select('id', { count: 'exact', head: true }),
        supabase.from('book_orders').select('id', { count: 'exact', head: true }),
        supabase.from('email_templates').select('*').eq('is_active', true),
        supabase.from('email_logs').select('id, status, sent_at', { count: 'exact' }).order('sent_at', { ascending: false }).limit(5),
      ]);

      return {
        totalProfiles: profilesRes.count || 0,
        totalCreations: creationsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        emailTemplates: templatesRes.data || [],
        recentEmails: emailLogsRes.data || [],
        totalEmails: emailLogsRes.count || 0,
      };
    },
    staleTime: 60_000,
  });

  const s = stats || { totalProfiles: 0, totalCreations: 0, totalOrders: 0, emailTemplates: [], recentEmails: [], totalEmails: 0 };

  const sections = [
    {
      title: 'Database',
      icon: Database,
      items: [
        { label: 'Profiles', value: s.totalProfiles.toLocaleString() },
        { label: 'Creations', value: s.totalCreations.toLocaleString() },
        { label: 'Orders', value: s.totalOrders.toLocaleString() },
      ],
    },
    {
      title: 'Email',
      icon: Mail,
      items: [
        { label: 'Active Templates', value: s.emailTemplates.length.toString() },
        { label: 'Total Sent', value: s.totalEmails.toLocaleString() },
      ],
    },
    {
      title: 'Storage',
      icon: HardDrive,
      items: [
        { label: 'Buckets', value: 'drawings, book-pdfs' },
      ],
    },
    {
      title: 'API',
      icon: Server,
      items: [
        { label: 'Supabase', value: 'Connected' },
        { label: 'Stripe', value: 'Active' },
        { label: 'Lulu', value: 'Active' },
        { label: 'Gemini', value: 'Active' },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-200 rounded-lg p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className="text-slate-400" />
                <h3 className="text-sm font-medium text-slate-900">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-900 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Email Templates List */}
      {s.emailTemplates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-slate-900 mb-4">Email Templates</h3>
          <div className="divide-y divide-slate-100">
            {s.emailTemplates.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="text-slate-900 font-medium">{t.template_name}</div>
                  <div className="text-slate-500 text-xs">{t.template_key}</div>
                </div>
                <div className="text-slate-500 text-xs">
                  {t.updated_at ? format(new Date(t.updated_at), 'MMM d, yyyy') : '-'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Email Logs */}
      {s.recentEmails.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-slate-200 rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-slate-900 mb-4">Recent Emails</h3>
          <div className="divide-y divide-slate-100">
            {s.recentEmails.map((e: any) => (
              <div key={e.id} className="py-2 flex items-center justify-between text-sm">
                <span className={`text-xs font-medium ${e.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                  {e.status}
                </span>
                <span className="text-xs text-slate-400">
                  {e.sent_at ? format(new Date(e.sent_at), 'MMM d, h:mm a') : '-'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;
