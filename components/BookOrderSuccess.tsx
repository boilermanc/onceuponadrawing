import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

interface BookOrderDetails {
  id: string;
  order_type: 'ebook' | 'hardcover' | 'softcover';
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
  download_url?: string | null;
  download_path?: string | null;
}

interface BookOrderSuccessProps {
  sessionId: string;
  onContinue: () => void;
  onViewCreations: () => void;
}

const BookOrderSuccess: React.FC<BookOrderSuccessProps> = ({
  sessionId,
  onContinue,
  onViewCreations,
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
            download_url, download_path, creation_id
          `)
          .eq('stripe_session_id', sessionId)
          .single();

        if (fetchError) throw fetchError;

        // Fetch creation details separately to avoid PostgREST join issues
        let creationTitle: string | undefined;
        let creationArtist: string | undefined;
        if (data.creation_id) {
          const { data: creation } = await supabase
            .from('creations')
            .select('title, artist_name')
            .eq('id', data.creation_id)
            .single();
          if (creation) {
            creationTitle = creation.title;
            creationArtist = creation.artist_name;
          }
        }

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
          creation_title: creationTitle,
          artist_name: creationArtist,
          download_url: data.download_url,
          download_path: data.download_path,
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

  const isHardcover = orderDetails?.order_type === 'hardcover' || orderDetails?.order_type === 'softcover';
  const isEbook = orderDetails?.order_type === 'ebook';

  // Ebook polling state
  const [ebookPollCount, setEbookPollCount] = useState(0);
  const [ebookTimedOut, setEbookTimedOut] = useState(false);
  const MAX_POLL_COUNT = 40; // 40 polls * 3 seconds = 2 minutes max

  // Poll for ebook download URL if order is ebook and not yet completed
  useEffect(() => {
    if (!orderDetails || !isEbook || orderDetails.download_url || ebookTimedOut) return;

    const pollInterval = setInterval(async () => {
      setEbookPollCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_POLL_COUNT) {
          clearInterval(pollInterval);
          setEbookTimedOut(true);
          return newCount;
        }
        return newCount;
      });

      try {
        const { data } = await supabase
          .from('book_orders')
          .select('status, download_url, download_path')
          .eq('id', orderDetails.id)
          .single();

        if (data?.download_url) {
          setOrderDetails(prev => prev ? {
            ...prev,
            status: data.status,
            download_url: data.download_url,
            download_path: data.download_path,
          } : prev);
          clearInterval(pollInterval);
        }
      } catch {
        // Silently retry
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [orderDetails?.id, isEbook, orderDetails?.download_url, ebookTimedOut]);

  // Retry handler for timed-out ebook generation
  const handleRetryEbook = () => {
    setEbookPollCount(0);
    setEbookTimedOut(false);
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
            <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-soft-gold/30 to-pacific-cyan/30 rounded-full flex items-center justify-center mx-auto">
              <img
                src="/faveicon.png"
                alt="Once Upon a Drawing"
                className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-full"
              />
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
          {isEbook && orderDetails?.download_url
            ? 'Your Storybook is Ready!'
            : orderDetails?.is_gift && isHardcover
              ? `Your gift is on its way to ${orderDetails.shipping_name || 'the recipient'}!`
              : isHardcover
                ? 'Your book is on its way!'
                : 'Order Confirmed!'}
        </h1>

        <p className="text-lg md:text-xl text-blue-slate text-center mb-8 font-medium max-w-lg mx-auto">
          {isEbook && orderDetails?.download_url
            ? "Your digital storybook is ready to download. We've also sent a link to your email."
            : isEbook
              ? "We're preparing your digital storybook now. This usually takes less than a minute..."
              : orderDetails?.is_gift && isHardcover
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
                <span className="font-bold text-gunmetal">
                  {orderDetails?.order_type === 'hardcover' ? 'Hardcover Book'
                    : orderDetails?.order_type === 'softcover' ? 'Softcover Book'
                    : 'Digital eBook'}
                </span>
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

        {/* Ebook Download Section */}
        {!isLoading && orderDetails && isEbook && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-xl mb-8 text-center">
            {orderDetails.download_url ? (
              <>
                <div className="text-5xl mb-4">📖</div>
                <h3 className="font-bold text-gunmetal text-lg mb-2">Your Storybook is Ready!</h3>
                <p className="text-blue-slate text-sm mb-6">
                  Download your high-quality PDF storybook. This link expires in 7 days.
                </p>
                <a
                  href={orderDetails.download_url}
                  download
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pacific-cyan to-blue-500 text-white rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Your Storybook
                </a>
                <p className="text-blue-slate/60 text-xs mt-4">
                  We also sent a download link to your email.
                </p>
              </>
            ) : ebookTimedOut ? (
              <>
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="font-bold text-gunmetal text-lg mb-2">Taking Longer Than Expected</h3>
                <p className="text-blue-slate text-sm mb-4">
                  Your storybook is still being generated. This can happen during busy periods.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleRetryEbook}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-pacific-cyan text-white rounded-xl font-bold hover:bg-pacific-cyan/90 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Check Again
                  </button>
                  <p className="text-blue-slate/60 text-xs">
                    You'll receive an email with your download link once it's ready.
                    <br />
                    Questions? Contact <a href="mailto:team@sproutify.app" className="text-pacific-cyan hover:underline">team@sproutify.app</a>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
                <h3 className="font-bold text-gunmetal text-lg mb-2">Preparing Your Storybook...</h3>
                <p className="text-blue-slate text-sm">
                  We're generating your high-quality PDF. This usually takes less than a minute.
                </p>
                {ebookPollCount > 10 && (
                  <p className="text-blue-slate/60 text-xs mt-3">
                    Still working... ({Math.round((ebookPollCount / MAX_POLL_COUNT) * 100)}%)
                  </p>
                )}
              </>
            )}
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
                  <p className="text-white/80">
                    {orderDetails?.download_url
                      ? 'Your storybook PDF is ready — download it above!'
                      : 'Your high-quality PDF is being generated now...'}
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <p className="text-white/80">We also sent a download link to your email</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <p className="text-white/80">Read, print, and share your magical story!</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onViewCreations}
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
