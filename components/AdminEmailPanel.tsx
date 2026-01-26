import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';

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

interface AdminEmailPanelProps {
  adminEmail: string;
}

// Sample data for template preview
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

const AdminEmailPanel: React.FC<AdminEmailPanelProps> = ({ adminEmail }) => {
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
  const [activeView, setActiveView] = useState<'templates' | 'logs'>('templates');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setMessage({ type: 'error', text: 'Failed to load email templates' });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

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
        .update({
          subject: editSubject,
          html_body: editHtmlBody,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Template saved successfully!' });
      setIsEditing(false);

      // Update local state
      setSelectedTemplate({ ...selectedTemplate, subject: editSubject, html_body: editHtmlBody });
      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id
          ? { ...t, subject: editSubject, html_body: editHtmlBody }
          : t
      ));
    } catch (err) {
      console.error('Failed to save template:', err);
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSaveLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate) return;
    setTestEmailLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: selectedTemplate.template_key,
          recipient_email: adminEmail,
          variables: SAMPLE_VARIABLES,
        },
      });

      if (error) throw error;

      setMessage({ type: 'success', text: `Test email sent to ${adminEmail}` });
      // Refresh logs if on logs view
      if (activeView === 'logs') {
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to send test email:', err);
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
    if (view === 'logs' && logs.length === 0) {
      fetchLogs();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header with sub-tabs */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => handleViewChange('templates')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeView === 'templates'
                ? 'bg-pacific-cyan text-white'
                : 'text-blue-slate hover:bg-slate-100'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => handleViewChange('logs')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeView === 'logs'
                ? 'bg-pacific-cyan text-white'
                : 'text-blue-slate hover:bg-slate-100'
            }`}
          >
            Send History
          </button>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {activeView === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ minHeight: '600px' }}>
          {/* Template List */}
          <div className="border-r border-slate-200 overflow-y-auto max-h-[600px]">
            {isLoadingTemplates ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-blue-slate">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center text-blue-slate">
                <div className="text-3xl mb-2">📧</div>
                <p>No templates found</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-pacific-cyan/10 border-l-4 border-l-pacific-cyan' : ''
                  }`}
                >
                  <p className="font-bold text-gunmetal">{template.template_name}</p>
                  <p className="text-xs text-blue-slate truncate mt-1">{template.description}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block font-medium ${
                    template.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Editor / Preview */}
          <div className="col-span-2 p-6 overflow-y-auto max-h-[600px]">
            {selectedTemplate ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gunmetal">{selectedTemplate.template_name}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendTestEmail}
                      isLoading={testEmailLoading}
                    >
                      Send Test
                    </Button>
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} isLoading={saveLoading}>
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Available Variables */}
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-blue-slate uppercase mb-2">Available Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.available_variables.map((v) => (
                      <code key={v} className="text-xs bg-white px-2 py-1 rounded border border-slate-200 font-mono">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase block mb-2">Subject Line</label>
                  {isEditing ? (
                    <input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-gunmetal">{selectedTemplate.subject}</p>
                  )}
                </div>

                {/* HTML Body */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase block mb-2">HTML Body</label>
                  {isEditing ? (
                    <textarea
                      value={editHtmlBody}
                      onChange={(e) => setEditHtmlBody(e.target.value)}
                      rows={15}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none font-mono text-sm transition-colors"
                    />
                  ) : (
                    <pre className="px-4 py-3 bg-slate-50 rounded-xl text-gunmetal overflow-auto max-h-64 text-xs font-mono whitespace-pre-wrap">
                      {selectedTemplate.html_body.slice(0, 1500)}
                      {selectedTemplate.html_body.length > 1500 && '...'}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-blue-slate">
                <div className="text-center">
                  <span className="text-5xl mb-4 block">📧</span>
                  <p className="font-medium">Select a template to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'logs' && (
        <div className="overflow-x-auto">
          {isLoadingLogs ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
              <p className="text-blue-slate">Loading email history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-blue-slate">No emails sent yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold text-blue-slate uppercase">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-blue-slate whitespace-nowrap">
                      {formatDate(log.sent_at)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gunmetal">
                      {log.template_key.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-gunmetal">{log.recipient_email}</td>
                    <td className="px-6 py-4 text-gunmetal truncate max-w-xs">{log.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700' :
                        log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewHtml(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gunmetal">Email Preview</h4>
                <p className="text-xs text-blue-slate">Using sample data for variables</p>
              </div>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-blue-slate hover:text-gunmetal text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: '70vh' }}
              title="Email Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmailPanel;
