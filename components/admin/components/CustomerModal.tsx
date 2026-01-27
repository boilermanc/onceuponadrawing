import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../../../services/supabaseClient';
import StatusBadge from './StatusBadge';

interface CustomerModalProps {
  customer: any | null;
  onClose: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose }) => {
  if (!customer) return null;

  const { data: orders } = useQuery({
    queryKey: ['admin-customer-orders', customer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('book_orders')
        .select('*')
        .eq('user_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!customer.id,
  });

  const { data: creations } = useQuery({
    queryKey: ['admin-customer-creations', customer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creations')
        .select('id, title, artist_name, created_at')
        .eq('user_id', customer.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!customer.id,
  });

  const name = customer.first_name
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : customer.email || 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

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
            <h2 className="text-base font-semibold text-slate-900">Customer Details</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                {initials}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">{name}</div>
                <div className="text-sm text-slate-500">{customer.email || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Joined</span>
                <div className="font-medium text-slate-900">
                  {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : '-'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Credits</span>
                <div className="font-medium text-slate-900">{customer.credit_balance || 0}</div>
              </div>
            </div>

            {/* Orders */}
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Orders ({orders?.length || 0})</h3>
              {orders && orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                      <div>
                        <span className="text-slate-900 capitalize">{o.order_type}</span>
                        <span className="text-slate-400 ml-2">${((o.amount_paid || 0) / 100).toFixed(2)}</span>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No orders</p>
              )}
            </div>

            {/* Creations */}
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Stories ({creations?.length || 0})</h3>
              {creations && creations.length > 0 ? (
                <div className="space-y-2">
                  {creations.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                      <div>
                        <span className="text-slate-900">{c.title}</span>
                        <span className="text-slate-400 ml-2">by {c.artist_name}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {format(new Date(c.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No stories</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomerModal;
