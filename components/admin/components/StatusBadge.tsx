import React from 'react';

const statusConfig: Record<string, { bg: string; text: string; label?: string }> = {
  // Order statuses
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  pending_payment: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending Payment' },
  payment_received: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Payment Received' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  generating_pdf: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Generating PDF' },
  pdf_ready: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'PDF Ready' },
  submitted_to_printer: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Sent to Printer' },
  in_production: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'In Production' },
  printed: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  shipped: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700' },
  completed: { bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
  refunded: { bg: 'bg-red-50', text: 'text-red-700' },
  failed: { bg: 'bg-red-50', text: 'text-red-700' },
  error: { bg: 'bg-red-50', text: 'text-red-700' },
  active: { bg: 'bg-green-50', text: 'text-green-700' },
  inactive: { bg: 'bg-slate-50', text: 'text-slate-500' },
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status.toLowerCase()] || { bg: 'bg-slate-50', text: 'text-slate-600' };
  const label = config.label || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
