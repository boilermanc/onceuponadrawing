import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, Edit3, Eye, X, Save } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { format } from 'date-fns';
import StatusBadge from '../components/StatusBadge';

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  subject: string;
  html_body: string;
  plain_text_body: string | null;
  available_variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_key: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

const SAMPLE_VARIABLES: Record<string, string> = {
  customer_name: 'John Doe',
  order_id: 'ABC12345',
  book_title: 'My Amazing Adventure',
  artist_name: 'Little Picasso',
  tracking_number: 'TRACK123456789',
  tracking_url: 'https://tracking.example.com/TRACK123456789',
  credits_added: '5',
  new_balance: '10',
  pack_name: 'Popular Pack',
  amount_paid: '$19.99',
  product_type: 'Hardcover Book',
};

interface EmailsProps {
  adminEmail: string;
}

const Emails: React.FC<EmailsProps> = ({ adminEmail }) => {
  const [activeView, setActiveView] = useState<'templates' | 'logs'>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load email templates' });
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(data || []);
    } catch {
      // Non-critical
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditSubject(template.subject);
    setEditHtmlBody(template.html_body);
    setPreviewHtml(null);
    setIsEditing(false);
  };

  const handlePreview = () => {
    let preview = editHtmlBody;
    for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    setPreviewHtml(preview);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ subject: editSubject, html_body: editHtmlBody })
        .eq('id', selectedTemplate.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Template saved' });
      setIsEditing(false);
      setSelectedTemplate({ ...selectedTemplate, subject: editSubject, html_body: editHtmlBody });
      setTemplates(templates.map((t) => t.id === selectedTemplate.id ? { ...t, subject: editSubject, html_body: editHtmlBody } : t));
    } catch {
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSaveLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    setTestEmailLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: selectedTemplate.template_key,
          recipient_email: adminEmail,
          variables: SAMPLE_VARIABLES,
        },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `Test email sent to ${adminEmail}` });
      if (activeView === 'logs') fetchLogs();
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setTestEmailLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleCancelEdit = () => {
    if (selectedTemplate) {
      setEditSubject(selectedTemplate.subject);
      setEditHtmlBody(selectedTemplate.html_body);
    }
    setIsEditing(false);
  };

  const handleViewChange = (view: 'templates' | 'logs') => {
    setActiveView(view);
    if (view === 'logs' && logs.length === 0) fetchLogs();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Tabs + message */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          {(['templates', 'logs'] as const).map((view) => (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeView === view ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {view === 'templates' ? 'Templates' : 'Send History'}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Templates View */}
      {activeView === 'templates' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3" style={{ minHeight: 500 }}>
            {/* Template list */}
            <div className="border-r border-slate-200 overflow-y-auto max-h-[600px]">
              {loadingTemplates ? (
                <div className="p-8 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No templates found</div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedTemplate?.id === template.id ? 'bg-slate-50 border-l-2 border-l-slate-900' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">{template.template_name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{template.description}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full mt-2 inline-block font-medium ${
                      template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Editor */}
            <div className="col-span-2 p-5 overflow-y-auto max-h-[600px]">
              {selectedTemplate ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">{selectedTemplate.template_name}</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={handlePreview} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
                        <Eye size={12} /> Preview
                      </button>
                      <button onClick={handleSendTest} disabled={testEmailLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                        {testEmailLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Send Test
                      </button>
                      {isEditing ? (
                        <>
                          <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
                            Cancel
                          </button>
                          <button onClick={handleSave} disabled={saveLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            {saveLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Save
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors">
                          <Edit3 size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variables */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Available Variables</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.available_variables.map((v) => (
                        <code key={v} className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-600">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Subject Line</label>
                    {isEditing ? (
                      <input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    ) : (
                      <p className="px-3 py-2 text-sm bg-slate-50 rounded-md text-slate-900">{selectedTemplate.subject}</p>
                    )}
                  </div>

                  {/* HTML Body */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">HTML Body</label>
                    {isEditing ? (
                      <textarea
                        value={editHtmlBody}
                        onChange={(e) => setEditHtmlBody(e.target.value)}
                        rows={15}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono"
                      />
                    ) : (
                      <pre className="px-3 py-2 text-xs bg-slate-50 rounded-md text-slate-700 overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                        {selectedTemplate.html_body.slice(0, 1500)}
                        {selectedTemplate.html_body.length > 1500 && '...'}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Select a template to edit
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loadingLogs ? (
            <div className="p-12 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-500">Loading email history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">No emails sent yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Template</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {log.template_key.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.recipient_email}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{log.subject}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                        {log.error_message && (
                          <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewHtml && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewHtml(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Email Preview</h4>
                  <p className="text-xs text-slate-500">Using sample data for variables</p>
                </div>
                <button onClick={() => setPreviewHtml(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{ height: '70vh' }}
                title="Email Preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Emails;
