import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';

interface OrderDetailModalProps {
  order: any | null;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const sections = [
    {
      title: 'Order Info',
      rows: [
        ['Order ID', order.id?.slice(0, 8)],
        ['Type', order.order_type],
        ['Status', null, <StatusBadge key="s" status={order.status} />],
        ['Amount', `$${((order.amount_paid || 0) / 100).toFixed(2)}`],
        ['Created', order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy h:mm a') : '-'],
        ['Updated', order.updated_at ? format(new Date(order.updated_at), 'MMM d, yyyy h:mm a') : '-'],
      ],
    },
    {
      title: 'Customer',
      rows: [
        ['Name', order.profiles?.first_name ? `${order.profiles.first_name} ${order.profiles.last_name || ''}`.trim() : order.shipping_name || '-'],
        ['Email', order.shipping_email || '-'],
      ],
    },
    {
      title: 'Shipping',
      rows: [
        ['Name', order.shipping_name || '-'],
        ['Address', order.shipping_address || '-'],
        ['City', order.shipping_city || '-'],
        ['State', order.shipping_state || '-'],
        ['ZIP', order.shipping_zip || '-'],
        ['Country', order.shipping_country || '-'],
        ['Tracking', order.tracking_number || '-'],
      ],
    },
    {
      title: 'Payment',
      rows: [
        ['Stripe Session', order.stripe_session_id?.slice(0, 20) || '-'],
        ['Payment Intent', order.stripe_payment_intent_id?.slice(0, 20) || '-'],
        ['Lulu Order', order.lulu_order_id || '-'],
      ],
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-lg h-full bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Order Details</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{section.title}</h3>
                <div className="space-y-2">
                  {section.rows.map(([label, value, node]) => (
                    <div key={label as string} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      {node || <span className="text-slate-900 font-medium">{value || '-'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {order.dedication_text && (
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Dedication</h3>
                <p className="text-sm text-slate-700 italic">"{order.dedication_text}"</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderDetailModal;
