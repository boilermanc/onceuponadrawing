import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, BookOpen, Video, DollarSign, ShoppingCart, TrendingUp,
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import MetricCard from '../components/MetricCard';
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#6366f1'];

type TimeRange = '7d' | '30d' | '90d' | '12m';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getRangeStart(range: TimeRange): Date {
  switch (range) {
    case '7d': return subDays(new Date(), 7);
    case '30d': return subDays(new Date(), 30);
    case '90d': return subDays(new Date(), 90);
    case '12m': return subMonths(new Date(), 12);
  }
}

function RangeToggle({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const options: TimeRange[] = ['7d', '30d', '90d', '12m'];
  return (
    <div className="flex rounded-md border border-slate-200 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === opt ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [revenueRange, setRevenueRange] = useState<TimeRange>('30d');
  const [storiesRange, setStoriesRange] = useState<TimeRange>('30d');

  // Fetch metrics
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30).toISOString();
      const sixtyDaysAgo = subDays(now, 60).toISOString();

      const [usersRes, storiesRes, videosRes, ordersRes, prevOrdersRes, profilesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('creations').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('creations').select('id', { count: 'exact', head: true }).not('video_path', 'is', null),
        supabase.from('book_orders').select('amount_paid').gte('created_at', thirtyDaysAgo),
        supabase.from('book_orders').select('amount_paid').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      ]);

      const revenue = (ordersRes.data || []).reduce((sum, o) => sum + (o.amount_paid || 0), 0);
      const prevRevenue = (prevOrdersRes.data || []).reduce((sum, o) => sum + (o.amount_paid || 0), 0);
      const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        totalUsers: usersRes.count || 0,
        newUsers: profilesRes.count || 0,
        totalStories: storiesRes.count || 0,
        totalVideos: videosRes.count || 0,
        revenue,
        revenueChange,
        totalOrders: (ordersRes.data || []).length,
      };
    },
    staleTime: 60_000,
  });

  // Revenue over time
  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue-chart', revenueRange],
    queryFn: async () => {
      const start = getRangeStart(revenueRange);
      const { data } = await supabase
        .from('book_orders')
        .select('amount_paid, created_at')
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: true });

      const intervals = revenueRange === '12m'
        ? eachMonthOfInterval({ start, end: new Date() })
        : revenueRange === '90d'
        ? eachWeekOfInterval({ start, end: new Date() })
        : eachDayOfInterval({ start, end: new Date() });

      return intervals.map((date) => {
        const label = revenueRange === '12m'
          ? format(date, 'MMM')
          : revenueRange === '90d'
          ? format(date, 'MMM d')
          : format(date, 'MMM d');
        const dayStart = startOfDay(date);
        const nextInterval = revenueRange === '12m'
          ? new Date(date.getFullYear(), date.getMonth() + 1, 1)
          : revenueRange === '90d'
          ? subDays(dayStart, -7)
          : subDays(dayStart, -1);
        const total = (data || [])
          .filter((o) => {
            const d = new Date(o.created_at);
            return d >= dayStart && d < nextInterval;
          })
          .reduce((sum, o) => sum + (o.amount_paid || 0), 0);
        return { date: label, revenue: total / 100 };
      });
    },
    staleTime: 60_000,
  });

  // Stories created over time
  const { data: storiesData } = useQuery({
    queryKey: ['admin-stories-chart', storiesRange],
    queryFn: async () => {
      const start = getRangeStart(storiesRange);
      const { data } = await supabase
        .from('creations')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: true });

      const intervals = storiesRange === '12m'
        ? eachMonthOfInterval({ start, end: new Date() })
        : eachDayOfInterval({ start, end: new Date() });

      return intervals.map((date) => {
        const label = storiesRange === '12m' ? format(date, 'MMM') : format(date, 'MMM d');
        const dayStart = startOfDay(date);
        const nextInterval = storiesRange === '12m'
          ? new Date(date.getFullYear(), date.getMonth() + 1, 1)
          : subDays(dayStart, -1);
        const count = (data || []).filter((s) => {
          const d = new Date(s.created_at);
          return d >= dayStart && d < nextInterval;
        }).length;
        return { date: label, stories: count };
      });
    },
    staleTime: 60_000,
  });

  // Order status breakdown
  const { data: orderStatusData } = useQuery({
    queryKey: ['admin-order-status'],
    queryFn: async () => {
      const { data } = await supabase.from('book_orders').select('status');
      const counts: Record<string, number> = {};
      (data || []).forEach((o) => {
        const s = o.status || 'unknown';
        counts[s] = (counts[s] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      }));
    },
    staleTime: 60_000,
  });

  // User growth (cumulative)
  const { data: userGrowthData } = useQuery({
    queryKey: ['admin-user-growth'],
    queryFn: async () => {
      const start = subMonths(new Date(), 12);
      const { data } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: true });

      const months = eachMonthOfInterval({ start, end: new Date() });
      let cumulative = 0;
      // Get count before start period
      const { count: priorCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', start.toISOString());
      cumulative = priorCount || 0;

      return months.map((date) => {
        const label = format(date, 'MMM');
        const monthStart = startOfDay(date);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const added = (data || []).filter((u) => {
          const d = new Date(u.created_at);
          return d >= monthStart && d < monthEnd;
        }).length;
        cumulative += added;
        return { date: label, users: cumulative };
      });
    },
    staleTime: 60_000,
  });

  // Revenue by product
  const { data: revenueByProductData } = useQuery({
    queryKey: ['admin-revenue-product'],
    queryFn: async () => {
      const { data } = await supabase.from('book_orders').select('order_type, amount_paid');
      const byType: Record<string, number> = {};
      (data || []).forEach((o) => {
        const type = o.order_type || 'other';
        byType[type] = (byType[type] || 0) + (o.amount_paid || 0);
      });
      return Object.entries(byType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        revenue: value / 100,
      }));
    },
    staleTime: 60_000,
  });

  // Conversion funnel
  const { data: funnelData } = useQuery({
    queryKey: ['admin-funnel'],
    queryFn: async () => {
      const [usersRes, storiesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('creations').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('book_orders').select('id', { count: 'exact', head: true }),
      ]);
      const users = usersRes.count || 0;
      const stories = storiesRes.count || 0;
      const orders = ordersRes.count || 0;
      return [
        { stage: 'Signups', count: users, pct: 100 },
        { stage: 'Stories Created', count: stories, pct: users > 0 ? Math.round((stories / users) * 100) : 0 },
        { stage: 'Orders Placed', count: orders, pct: users > 0 ? Math.round((orders / users) * 100) : 0 },
      ];
    },
    staleTime: 60_000,
  });

  const m = metrics || { totalUsers: 0, newUsers: 0, totalStories: 0, totalVideos: 0, revenue: 0, revenueChange: 0, totalOrders: 0 };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Metric Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {[
          { title: 'Total Users', value: m.totalUsers.toLocaleString(), icon: Users, change: `+${m.newUsers} this month`, changeType: 'positive' as const },
          { title: 'Stories', value: m.totalStories.toLocaleString(), icon: BookOpen },
          { title: 'Videos', value: m.totalVideos.toLocaleString(), icon: Video },
          { title: 'Revenue', value: `$${(m.revenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, change: `${m.revenueChange >= 0 ? '+' : ''}${m.revenueChange.toFixed(1)}%`, changeType: (m.revenueChange >= 0 ? 'positive' : 'negative') as 'positive' | 'negative', subtitle: 'vs last 30d' },
          { title: 'Orders', value: m.totalOrders.toLocaleString(), icon: ShoppingCart },
          { title: 'Conversion', value: m.totalUsers > 0 ? `${((m.totalOrders / m.totalUsers) * 100).toFixed(1)}%` : '0%', icon: TrendingUp, subtitle: 'users → orders' },
        ].map((card, i) => (
          <motion.div key={card.title} variants={cardVariants}>
            <MetricCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-900">Revenue Over Time</h3>
            <RangeToggle value={revenueRange} onChange={setRevenueRange} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData || []}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="revenue" fill="url(#revenueGradient)" stroke="none" animationDuration={1500} />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Stories Created */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-900">Stories Created</h3>
            <RangeToggle value={storiesRange} onChange={setStoriesRange} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={storiesData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="stories" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-900 mb-4">Order Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={orderStatusData || []}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {(orderStatusData || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Growth */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={userGrowthData || []}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="users" stroke="#10b981" fill="url(#userGradient)" strokeWidth={2} animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue by Product */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-900 mb-4">Revenue by Product</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByProductData || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Conversion Funnel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {(funnelData || []).map((item, i) => (
            <motion.div
              key={item.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.15 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700">{item.stage}</span>
                <span className="text-sm font-medium text-slate-900">{item.count.toLocaleString()} <span className="text-slate-400 font-normal">({item.pct}%)</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ duration: 0.8, delay: 1 + i * 0.15 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
