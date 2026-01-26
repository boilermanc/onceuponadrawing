import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

interface BookOrderDetails {
  id: string;
  order_type: 'ebook' | 'hardcover';
  status: string;
  amount_paid: number;
  shipping_email: string | null;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  is_gift: boolean;
  creation_title?: string;
  artist_name?: string;
}

interface BookOrderSuccessProps {
  sessionId: string;
  onContinue: () => void;
}

const BookOrderSuccess: React.FC<BookOrderSuccessProps> = ({
  sessionId,
  onContinue,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<BookOrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confettiRef = useRef(false);

  useEffect(() => {
    // Fire confetti celebration
    if (!confettiRef.current) {
      confettiRef.current = true;

      // Book-themed confetti colors (paper, gold, cyan)
      const colors = ['#FAFAFA', '#FFD700', '#00B4D8', '#F5E6D3', '#A78BFA'];

      // Cannon from left and right
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });

      // Delayed star burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.5 },
          shapes: ['star'],
          colors: ['#FFD700'],
        });
      }, 300);
    }
  }, []);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('book_orders')
          .select(`
            id, order_type, status, amount_paid, shipping_email, shipping_name, is_gift,
            shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country,
            creations!inner(title, artist_name)
          `)
          .eq('stripe_session_id', sessionId)
          .single();

        if (fetchError) throw fetchError;

        setOrderDetails({
          id: data.id,
          order_type: data.order_type,
          status: data.status,
          amount_paid: data.amount_paid,
          shipping_email: data.shipping_email,
          shipping_name: data.shipping_name,
          shipping_address: data.shipping_address,
          shipping_address2: data.shipping_address2,
          shipping_city: data.shipping_city,
          shipping_state: data.shipping_state,
          shipping_zip: data.shipping_zip,
          shipping_country: data.shipping_country,
          is_gift: data.is_gift || false,
          creation_title: (data.creations as { title: string; artist_name: string })?.title,
          artist_name: (data.creations as { title: string; artist_name: string })?.artist_name,
        });
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Could not load order details');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchOrderDetails();
    }
  }, [sessionId]);

  const isHardcover = orderDetails?.order_type === 'hardcover';

  const handleViewCreations = () => {
    window.location.href = '/my-creations';
  };

  // Format shipping address
  const formatShippingAddress = () => {
    if (!orderDetails) return null;
    const parts = [
      orderDetails.shipping_address,
      orderDetails.shipping_address2,
    ].filter(Boolean);
    const cityStateZip = [
      orderDetails.shipping_city,
      orderDetails.shipping_state,
      orderDetails.shipping_zip,
    ].filter(Boolean).join(', ');
    if (cityStateZip) parts.push(cityStateZip);
    return parts;
  };

  // Timeline steps
  const getTimelineSteps = () => {
    const status = orderDetails?.status || 'pending';
    const steps = [
      { id: 'confirmed', label: 'Order Confirmed', completed: true },
      { id: 'printing', label: 'Printing', completed: ['processing', 'printed', 'shipped', 'delivered'].includes(status) },
      { id: 'shipped', label: 'Shipped', completed: ['shipped', 'delivered'].includes(status) },
      { id: 'delivered', label: 'Delivered', completed: status === 'delivered' },
    ];
    return steps;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-off-white to-pacific-cyan/5">
      <div className="max-w-2xl w-full animate-in fade-in zoom-in-95 duration-700">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-soft-gold/30 to-pacific-cyan/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                <span className="text-4xl md:text-5xl">{isHardcover ? '📖' : '📱'}</span>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-gunmetal text-center mb-4 tracking-tight">
          {orderDetails?.is_gift && isHardcover
            ? `Your gift is on its way to ${orderDetails.shipping_name || 'the recipient'}!`
            : isHardcover
              ? 'Your book is on its way!'
              : 'Order Confirmed!'}
        </h1>

        <p className="text-lg md:text-xl text-blue-slate text-center mb-8 font-medium max-w-lg mx-auto">
          {orderDetails?.is_gift && isHardcover
            ? "We're printing this special gift now. We'll email you tracking info when it ships!"
            : isHardcover
              ? "Magic is happening at the printer. We'll email you tracking info when it ships!"
              : "Thank you for your order! We're preparing everything now."}
        </p>

        {/* Order Details Card */}
        {!isLoading && orderDetails && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-xl mb-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-blue-slate uppercase tracking-wider">Order</p>
                <p className="font-mono text-sm text-gunmetal">#{orderDetails.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                Payment Confirmed
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-blue-slate">Book Title</span>
                <span className="font-bold text-gunmetal">{orderDetails.creation_title || 'Your Story'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-slate">Artist</span>
                <span className="font-bold text-gunmetal">{orderDetails.artist_name || 'Young Artist'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-slate">Format</span>
                <span className="font-bold text-gunmetal">{isHardcover ? 'Hardcover Book' : 'Digital eBook'}</span>
              </div>

              {/* Shipping Address for Hardcover */}
              {isHardcover && orderDetails.shipping_address && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-start">
                    <span className="text-blue-slate">
                      {orderDetails.is_gift ? 'Shipping To' : 'Shipping Address'}
                    </span>
                    <div className="text-right">
                      {orderDetails.is_gift && orderDetails.shipping_name && (
                        <p className="font-bold text-gunmetal">{orderDetails.shipping_name}</p>
                      )}
                      {formatShippingAddress()?.map((line, i) => (
                        <p key={i} className="text-sm text-gunmetal">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Estimated Delivery for Hardcover */}
              {isHardcover && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-blue-slate">Estimated Delivery</span>
                    <span className="font-bold text-gunmetal">7-10 business days</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <span className="text-lg font-bold text-gunmetal">Total Paid</span>
                <span className="text-lg font-black text-pacific-cyan">
                  ${(orderDetails.amount_paid / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-xl mb-8 text-center">
            <div className="w-8 h-8 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blue-slate">Loading order details...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 rounded-3xl border-2 border-red-200 p-8 mb-8 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Order Timeline for Hardcover */}
        {!isLoading && orderDetails && isHardcover && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-xl mb-8">
            <h3 className="font-bold text-gunmetal mb-6 text-lg">Order Status</h3>
            <div className="flex justify-between items-center">
              {getTimelineSteps().map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {step.completed ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-semibold text-center ${
                      step.completed ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < getTimelineSteps().length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      getTimelineSteps()[index + 1].completed
                        ? 'bg-green-500'
                        : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* What's Next Section */}
        <div className="bg-gunmetal rounded-3xl p-6 md:p-8 text-white mb-8">
          <h3 className="font-bold text-pacific-cyan mb-4 flex items-center gap-2 text-lg">
            <span>✨</span> What Happens Next?
          </h3>
          <div className="space-y-4">
            {isHardcover ? (
              <>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <p className="text-white/80">
                    {orderDetails?.is_gift
                      ? 'Your gift book is being professionally printed (2-3 business days)'
                      : 'Your book is being professionally printed (2-3 business days)'}
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <p className="text-white/80">We'll email you a tracking number once it ships</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <p className="text-white/80">
                    {orderDetails?.is_gift
                      ? `The magical book arrives at ${orderDetails.shipping_name || 'the recipient'}'s door!`
                      : 'Your magical book arrives at your door!'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <p className="text-white/80">Check your email for the download link</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <p className="text-white/80">Download your high-quality PDF</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <p className="text-white/80">Read and share your magical story!</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleViewCreations}
            className="px-8 py-4 bg-white border-2 border-pacific-cyan text-pacific-cyan rounded-2xl font-black text-lg hover:bg-pacific-cyan/5 active:scale-95 transition-all"
          >
            View My Creations
          </button>
          <button
            onClick={onContinue}
            className="px-8 py-4 bg-gradient-to-r from-pacific-cyan to-blue-500 text-white rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Create Another Story ✨
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookOrderSuccess;
