import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Mail, HardDrive, Server, Loader2, Trash2, Zap, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { format } from 'date-fns';

interface LuluTestResult {
  success: boolean;
  message?: string;
  environment?: 'sandbox' | 'production';
  apiUrl?: string;
  totalPrintJobs?: number;
  preview?: unknown[];
  error?: string;
  details?: string;
}

interface LuluWebhook {
  id: number;
  url: string;
  topics: string[];
  is_active: boolean;
}

interface WebhookSubmission {
  id: number;
  webhook_id: number;
  topic: string;
  response_status_code?: number;
  created_at: string;
}

interface WebhookManagementResult {
  success: boolean;
  environment?: string;
  apiUrl?: string;
  webhooks?: LuluWebhook[];
  recentSubmissions?: WebhookSubmission[];
  webhook?: LuluWebhook;
  message?: string;
  error?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;

const Settings: React.FC = () => {
  // Lulu API test
  const [luluTestLoading, setLuluTestLoading] = useState(false);
  const [luluTestResult, setLuluTestResult] = useState<LuluTestResult | null>(null);

  // Webhook management
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<WebhookManagementResult | null>(null);
  const [webhookActionLoading, setWebhookActionLoading] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Lulu API
  const testLuluConnection = async () => {
    setLuluTestLoading(true);
    setLuluTestResult(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/test-lulu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setLuluTestResult(data as LuluTestResult);
    } catch (err: unknown) {
      setLuluTestResult({
        success: false,
        error: 'Unexpected error',
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLuluTestLoading(false);
    }
  };

  // Webhooks
  const fetchWebhooks = async () => {
    setWebhookLoading(true);
    setWebhookMessage(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-lulu-webhooks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setWebhookData(data as WebhookManagementResult);
    } catch (err: unknown) {
      setWebhookData({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookLoading(false);
    }
  };

  const registerWebhook = async () => {
    setWebhookActionLoading('register');
    setWebhookMessage(null);
    try {
      const callbackUrl = `${SUPABASE_URL}/functions/v1/lulu-webhook`;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-lulu-webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', callback_url: callbackUrl }),
      });
      const data = await response.json();
      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Webhook registered successfully' });
        fetchWebhooks();
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to register webhook' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const testWebhook = async (webhookId: number) => {
    setWebhookActionLoading(`test-${webhookId}`);
    setWebhookMessage(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-lulu-webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', webhook_id: webhookId }),
      });
      const data = await response.json();
      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Test webhook sent' });
        setTimeout(() => fetchWebhooks(), 2000);
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to send test' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const deleteWebhook = async (webhookId: number) => {
    if (!confirm('Delete this webhook?')) return;
    setWebhookActionLoading(`delete-${webhookId}`);
    setWebhookMessage(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-lulu-webhooks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: webhookId }),
      });
      const data = await response.json();
      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Webhook deleted' });
        fetchWebhooks();
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const s = stats || { totalProfiles: 0, totalCreations: 0, totalOrders: 0, emailTemplates: [], recentEmails: [], totalEmails: 0 };

  const overviewSections = [
    { title: 'Database', icon: Database, items: [
      { label: 'Profiles', value: s.totalProfiles.toLocaleString() },
      { label: 'Creations', value: s.totalCreations.toLocaleString() },
      { label: 'Orders', value: s.totalOrders.toLocaleString() },
    ]},
    { title: 'Email', icon: Mail, items: [
      { label: 'Active Templates', value: s.emailTemplates.length.toString() },
      { label: 'Total Sent', value: s.totalEmails.toLocaleString() },
    ]},
    { title: 'Storage', icon: HardDrive, items: [
      { label: 'Buckets', value: 'drawings, book-pdfs' },
    ]},
    { title: 'API', icon: Server, items: [
      { label: 'Supabase', value: 'Connected' },
      { label: 'Stripe', value: 'Active' },
      { label: 'Lulu', value: 'Active' },
      { label: 'Gemini', value: 'Active' },
    ]},
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overviewSections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div key={section.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white border border-slate-200 rounded-lg p-5">
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

      {/* Lulu API Connection Test */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-medium text-slate-900">Lulu Print API</h3>
          <p className="text-xs text-slate-500 mt-0.5">Test connection to the Lulu print-on-demand API</p>
        </div>
        <div className="p-5">
          <button
            onClick={testLuluConnection}
            disabled={luluTestLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors mb-4"
          >
            {luluTestLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {luluTestLoading ? 'Testing...' : 'Test Connection'}
          </button>

          {luluTestResult && (
            <div className="space-y-4">
              {/* Environment */}
              {luluTestResult.environment && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500 uppercase">Environment:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    luluTestResult.environment === 'production'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      luluTestResult.environment === 'production' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`} />
                    {luluTestResult.environment.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Status */}
              <div className={`px-4 py-3 rounded-md text-sm ${
                luluTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <p className="font-medium">{luluTestResult.success ? 'Connection Successful' : 'Connection Failed'}</p>
                {luluTestResult.message && <p className="text-xs mt-1 opacity-80">{luluTestResult.message}</p>}
                {luluTestResult.error && <p className="text-xs mt-1">{luluTestResult.error}</p>}
                {luluTestResult.details && !luluTestResult.success && <p className="text-xs mt-1 font-mono opacity-70">{luluTestResult.details}</p>}
              </div>

              {/* API details */}
              {luluTestResult.apiUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">API URL</span>
                    <p className="font-mono text-slate-900 text-xs mt-0.5">{luluTestResult.apiUrl}</p>
                  </div>
                  {luluTestResult.totalPrintJobs !== undefined && (
                    <div>
                      <span className="text-slate-500 text-xs">Print Jobs</span>
                      <p className="text-slate-900 font-medium mt-0.5">{luluTestResult.totalPrintJobs}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview data */}
              {luluTestResult.preview && luluTestResult.preview.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Sample Data (first 5)</h4>
                  <div className="bg-slate-900 text-green-400 rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs font-mono">{JSON.stringify(luluTestResult.preview, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {!luluTestResult && !luluTestLoading && (
            <p className="text-sm text-slate-400">Click the button above to test the Lulu API connection</p>
          )}
        </div>
      </motion.div>

      {/* Lulu Webhooks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-medium text-slate-900">Lulu Webhooks</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage webhooks for order status updates from Lulu</p>
        </div>
        <div className="p-5">
          {/* Message */}
          <AnimatePresence>
            {webhookMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 px-4 py-3 rounded-md text-sm font-medium ${
                  webhookMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {webhookMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={fetchWebhooks}
              disabled={webhookLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={webhookLoading ? 'animate-spin' : ''} />
              {webhookLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={registerWebhook}
              disabled={webhookActionLoading === 'register'}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {webhookActionLoading === 'register' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Register Webhook
            </button>
          </div>

          {/* Webhook data */}
          {webhookData && (
            <div className="space-y-4">
              {/* Environment */}
              {webhookData.environment && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500 uppercase">Environment:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    webhookData.environment === 'production'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      webhookData.environment === 'production' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`} />
                    {webhookData.environment.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Registered webhooks */}
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Registered Webhooks</h4>
                {webhookData.webhooks && webhookData.webhooks.length > 0 ? (
                  <div className="space-y-2">
                    {webhookData.webhooks.map((wh) => (
                      <div key={wh.id} className={`p-4 rounded-md border ${wh.is_active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${wh.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span className="text-sm font-medium text-slate-900">Webhook #{wh.id}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${wh.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                {wh.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-500 break-all">{wh.url}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {wh.topics.map((topic) => (
                                <span key={topic} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => testWebhook(wh.id)}
                              disabled={webhookActionLoading === `test-${wh.id}`}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                              {webhookActionLoading === `test-${wh.id}` ? '...' : 'Test'}
                            </button>
                            <button
                              onClick={() => deleteWebhook(wh.id)}
                              disabled={webhookActionLoading === `delete-${wh.id}`}
                              className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-md border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">No webhooks registered</p>
                  </div>
                )}
              </div>

              {/* Recent submissions */}
              {webhookData.recentSubmissions && webhookData.recentSubmissions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Recent Submissions</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Time</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Topic</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {webhookData.recentSubmissions.map((sub) => (
                          <tr key={sub.id}>
                            <td className="px-4 py-2 text-xs text-slate-600">
                              {format(new Date(sub.created_at), 'MMM d, h:mm a')}
                            </td>
                            <td className="px-4 py-2 text-xs font-mono text-blue-600">{sub.topic}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                sub.response_status_code === 200
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {sub.response_status_code || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error */}
              {webhookData.error && (
                <div className="px-4 py-3 rounded-md text-sm text-red-700 bg-red-50 border border-red-200">
                  {webhookData.error}
                </div>
              )}
            </div>
          )}

          {!webhookData && !webhookLoading && (
            <p className="text-sm text-slate-400">Click "Refresh" to view registered webhooks</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
