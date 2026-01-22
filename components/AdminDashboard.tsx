import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';

const ADMIN_EMAIL = 'team@sproutify.app';

interface BookOrder {
  id: string;
  user_id: string;
  creation_id: string;
  order_type: 'ebook' | 'hardcover';
  status: string;
  dedication_text: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  shipping_email: string | null;
  lulu_order_id: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminDashboardProps {
  userEmail: string | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  payment_received: { bg: 'bg-blue-100', text: 'text-blue-800' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  printed: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  shipped: { bg: 'bg-green-100', text: 'text-green-800' },
  delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  isAuthenticated,
  onLogin,
  onBack,
  onLogout,
}) => {
  const [orders, setOrders] = useState<BookOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BookOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'settings'>('orders');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
      }
      // On success, the auth state listener in App.tsx will update and re-render
    } catch (err: any) {
      setLoginError(err.message || 'An unexpected error occurred');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('book_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const truncateId = (id: string) => {
    return `${id.slice(0, 8)}...`;
  };

  // Not logged in - show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-black text-gunmetal mb-2">Admin Login</h1>
            <p className="text-blue-slate text-sm">Sign in to access the admin dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors font-medium text-gunmetal"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors font-medium text-gunmetal pr-24"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-pacific-cyan hover:text-pacific-cyan/80 transition-colors px-2 py-1"
                >
                  {showPassword ? 'Hide' : 'Show me'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {loginError}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loginLoading || !loginEmail || !loginPassword}
              isLoading={loginLoading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-sm text-blue-slate hover:text-gunmetal transition-colors font-medium"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-4 border-red-200">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-black text-gunmetal mb-2">Access Denied</h1>
          <p className="text-blue-slate mb-2">You don't have permission to access this page.</p>
          <p className="text-xs text-silver mb-6">Logged in as: {userEmail}</p>
          <Button variant="ghost" onClick={onBack}>
            ← Back to App
          </Button>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gunmetal text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
              ← App
            </button>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-xl font-black">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{userEmail}</span>
            <button
              onClick={onLogout}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100 opacity-50 cursor-not-allowed'
            }`}
            disabled
          >
            Users (Coming Soon)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100 opacity-50 cursor-not-allowed'
            }`}
            disabled
          >
            Settings (Coming Soon)
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-gunmetal">Book Orders</h2>
              <button
                onClick={fetchOrders}
                className="text-sm text-pacific-cyan hover:text-pacific-cyan/80 font-bold"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
                <p className="text-blue-slate">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-600 font-bold mb-2">Error loading orders</p>
                <p className="text-sm text-blue-slate">{error}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-blue-slate">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                            {truncateId(order.id)}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gunmetal">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gunmetal">
                          {order.shipping_email || order.shipping_name || truncateId(order.user_id)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                              order.order_type === 'hardcover' ? 'text-purple-600' : 'text-blue-600'
                            }`}
                          >
                            {order.order_type === 'hardcover' ? '📖' : '📱'} {order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              STATUS_COLORS[order.status]?.bg || 'bg-gray-100'
                            } ${STATUS_COLORS[order.status]?.text || 'text-gray-800'}`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gunmetal">
                          {formatAmount(order.amount_paid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Details Slide-over */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="h-full flex flex-col">
              {/* Detail Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-gunmetal">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                    Status
                  </label>
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                      STATUS_COLORS[selectedOrder.status]?.bg || 'bg-gray-100'
                    } ${STATUS_COLORS[selectedOrder.status]?.text || 'text-gray-800'}`}
                  >
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Order ID
                    </label>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono block break-all">
                      {selectedOrder.id}
                    </code>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Type
                    </label>
                    <p className="font-bold text-gunmetal capitalize">
                      {selectedOrder.order_type === 'hardcover' ? '📖 ' : '📱 '}
                      {selectedOrder.order_type}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Amount
                    </label>
                    <p className="font-bold text-gunmetal text-lg">
                      {formatAmount(selectedOrder.amount_paid)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Created
                    </label>
                    <p className="text-sm text-gunmetal">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

                {/* Stripe Info */}
                {(selectedOrder.stripe_session_id || selectedOrder.stripe_payment_intent_id) && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Stripe
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {selectedOrder.stripe_session_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Session: </span>
                          <code className="text-xs font-mono">{truncateId(selectedOrder.stripe_session_id)}</code>
                        </div>
                      )}
                      {selectedOrder.stripe_payment_intent_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Payment Intent: </span>
                          <code className="text-xs font-mono">{truncateId(selectedOrder.stripe_payment_intent_id)}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dedication */}
                {selectedOrder.dedication_text && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Dedication
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 italic text-gunmetal">
                      "{selectedOrder.dedication_text}"
                    </div>
                  </div>
                )}

                {/* Shipping (Hardcover only) */}
                {selectedOrder.order_type === 'hardcover' && selectedOrder.shipping_name && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Shipping Address
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-gunmetal space-y-1">
                      <p className="font-bold">{selectedOrder.shipping_name}</p>
                      <p>{selectedOrder.shipping_address}</p>
                      <p>
                        {selectedOrder.shipping_city}, {selectedOrder.shipping_state}{' '}
                        {selectedOrder.shipping_zip}
                      </p>
                      <p>{selectedOrder.shipping_country}</p>
                      {selectedOrder.shipping_email && (
                        <p className="text-pacific-cyan">{selectedOrder.shipping_email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fulfillment */}
                {(selectedOrder.lulu_order_id || selectedOrder.tracking_number) && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Fulfillment
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {selectedOrder.lulu_order_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Lulu Order: </span>
                          <code className="text-xs font-mono">{selectedOrder.lulu_order_id}</code>
                        </div>
                      )}
                      {selectedOrder.tracking_number && (
                        <div>
                          <span className="text-xs text-blue-slate">Tracking: </span>
                          <code className="text-xs font-mono">{selectedOrder.tracking_number}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IDs */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                    References
                  </label>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
                    <div>
                      <span className="text-blue-slate">User ID: </span>
                      <code className="font-mono">{selectedOrder.user_id}</code>
                    </div>
                    <div>
                      <span className="text-blue-slate">Creation ID: </span>
                      <code className="font-mono">{selectedOrder.creation_id}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
