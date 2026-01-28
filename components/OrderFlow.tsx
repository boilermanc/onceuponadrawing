
import React, { useState, useEffect } from 'react';
import { DrawingAnalysis, ProductType, ShippingInfo } from '../types';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';

interface BookPrice {
  priceId: string;
  amount: number;
  currency: string;
  displayPrice: string;
  productName: string;
}

interface BookPricesResponse {
  ebook: BookPrice | null;
  softcover: BookPrice | null;
  hardcover: BookPrice | null;
}

interface OrderFlowProps {
  analysis: DrawingAnalysis;
  userId: string;
  creationId: string;
  userEmail: string;
  isGift?: boolean;
  coverColorId?: string;
  textColorId?: string;
  selectedEdition: ProductType;
  onClose: () => void;
  onComplete: (product: ProductType, dedication: string, shipping?: ShippingInfo) => void;
}

const OrderFlow: React.FC<OrderFlowProps> = ({ analysis, userId, creationId, userEmail, isGift, coverColorId, textColorId, selectedEdition, onClose, onComplete }) => {
  const isEbook = selectedEdition === ProductType.EBOOK;
  const [step, setStep] = useState<'DEDICATION' | 'SHIPPING' | 'REVIEW'>('DEDICATION');
  const [product] = useState<ProductType>(selectedEdition);
  const [dedication, setDedication] = useState(analysis.dedication || '');

  // Price fetching for review display
  const [price, setPrice] = useState<BookPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  // Checkout state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [shipping, setShipping] = useState<ShippingInfo>({
    fullName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  });

  // Fetch the price for the selected edition
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setPriceLoading(true);
        const response = await fetch('https://cdhymstkzhlxcucbzipr.supabase.co/functions/v1/get-book-prices');
        if (!response.ok) throw new Error('Failed to fetch prices');
        const data: BookPricesResponse = await response.json();
        const key = product === ProductType.EBOOK ? 'ebook' : product === ProductType.HARDCOVER ? 'hardcover' : 'softcover';
        setPrice(data[key]);
      } catch (error) {
        console.error('Error fetching price:', error);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrice();
  }, [product]);

  const handleNext = () => {
    if (step === 'DEDICATION') {
      setStep(isEbook ? 'REVIEW' : 'SHIPPING');
    } else if (step === 'SHIPPING') {
      setStep('REVIEW');
    }
  };

  const handleBack = () => {
    if (step === 'DEDICATION') {
      onClose();
    } else if (step === 'SHIPPING') {
      setStep('DEDICATION');
    } else if (step === 'REVIEW') {
      setStep(isEbook ? 'DEDICATION' : 'SHIPPING');
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const productType = product === ProductType.EBOOK ? 'ebook' : product === ProductType.SOFTCOVER ? 'softcover' : 'hardcover';

      const body: Record<string, unknown> = {
        userId,
        creationId,
        productType,
        dedicationText: dedication || undefined,
        userEmail,
        isGift: isGift || false,
        coverColorId: coverColorId || 'soft-blue',
        textColorId: textColorId || 'gunmetal',
      };

      // Only include shipping for physical books
      if (!isEbook) {
        body.shipping = {
          name: shipping.fullName,
          address1: shipping.address1,
          city: shipping.city,
          state: shipping.state,
          zip: shipping.zip,
          phone: shipping.phone,
          email: shipping.email,
        };
      }

      const response = await fetch('https://cdhymstkzhlxcucbzipr.supabase.co/functions/v1/create-book-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Failed to start checkout');
      setIsCheckingOut(false);
    }
  };

  const isShippingValid =
    shipping.fullName.length >= 2 &&
    shipping.address1.length >= 5 &&
    shipping.city.length >= 2 &&
    shipping.state.length >= 2 &&
    shipping.zip.length >= 3 &&
    shipping.phone.length >= 10 &&
    shipping.email?.includes('@');

  const getProgressPercent = () => {
    if (isEbook) {
      return step === 'DEDICATION' ? 50 : 100;
    }
    return step === 'DEDICATION' ? 33 : step === 'SHIPPING' ? 66 : 100;
  };

  return (
    <div className="fixed inset-0 z-[150] bg-gunmetal/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="bg-off-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] border-4 border-white/20">

        {/* Header */}
        <div className="p-8 border-b border-silver flex justify-between items-center bg-white relative">
          <div className="absolute top-0 left-0 h-1 bg-pacific-cyan transition-all duration-700" style={{ width: `${getProgressPercent()}%` }}></div>
          <div>
            <h2 className="text-2xl font-black text-gunmetal">Studio Checkout</h2>
            <p className="text-[10px] text-blue-slate font-black uppercase tracking-[0.3em] mt-1">
              {isGift ? 'Sending a Gift' : 'Securing your Masterpiece'}
            </p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-gunmetal text-xl transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {step === 'DEDICATION' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <span className="text-5xl mb-4 inline-block">✍️</span>
                <h3 className="text-2xl font-black text-gunmetal">The Dedication</h3>
                <p className="text-blue-slate font-medium">This will appear on the first page of the book.</p>
              </div>
              <div className="relative">
                <textarea
                  value={dedication}
                  onChange={(e) => setDedication(e.target.value)}
                  placeholder="To my dearest artist..."
                  className="w-full h-48 p-8 bg-white border-4 border-silver rounded-[2.5rem] focus:border-pacific-cyan outline-none transition-all font-serif italic text-lg text-gunmetal resize-none shadow-inner"
                />
                <div className="absolute bottom-6 right-8 text-[10px] font-black text-silver uppercase tracking-widest">Ink on Paper</div>
              </div>
            </div>
          )}

          {step === 'SHIPPING' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-pacific-cyan/10 rounded-2xl flex items-center justify-center text-2xl">🚚</div>
                 <h3 className="text-2xl font-black text-gunmetal">{isGift ? 'Gift Recipient Details' : 'Delivery Details'}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Full Legal Name</label>
                  <input type="text" placeholder="Jane Doe" value={shipping.fullName} onChange={e => setShipping({...shipping, fullName: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Shipping Address</label>
                  <input type="text" placeholder="123 Studio Way" value={shipping.address1} onChange={e => setShipping({...shipping, address1: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Email for Tracking</label>
                  <input type="email" placeholder="artist@example.com" value={shipping.email} onChange={e => setShipping({...shipping, email: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">City</label>
                  <input type="text" placeholder="Los Angeles" value={shipping.city} onChange={e => setShipping({...shipping, city: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">State / Province</label>
                  <select value={shipping.state} onChange={e => setShipping({...shipping, state: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm bg-white appearance-none cursor-pointer">
                    <option value="">Select...</option>
                    {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP'].map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Zip / Postcode</label>
                  <input type="text" placeholder="90210" value={shipping.zip} onChange={e => setShipping({...shipping, zip: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Phone (For Delivery)</label>
                  <input type="tel" placeholder="+1 555-0199" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
                </div>
              </div>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <span className="text-5xl mb-4 inline-block">{isGift ? '🎁' : '🛒'}</span>
                <h3 className="text-2xl font-black text-gunmetal">{isGift ? 'Review Your Gift Order' : 'Review Your Order'}</h3>
                <p className="text-blue-slate font-medium">Confirm details before checkout</p>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-[2rem] border-4 border-silver p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-silver">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">
                      {product === ProductType.EBOOK ? '💻' : product === ProductType.SOFTCOVER ? '📕' : '📖'}
                    </span>
                    <div>
                      <h4 className="font-black text-gunmetal">
                        {price?.productName || (product === ProductType.EBOOK ? 'Digital Storybook' : product === ProductType.SOFTCOVER ? 'Softcover Book' : 'Hardcover Book')}
                      </h4>
                      <p className="text-xs text-blue-slate">"{analysis.storyTitle}"</p>
                    </div>
                  </div>
                  <span className="font-black text-pacific-cyan text-xl">
                    {priceLoading ? '...' : price?.displayPrice || '—'}
                  </span>
                </div>

                {dedication && (
                  <div className="py-4 border-b border-silver">
                    <p className="text-[10px] font-black text-blue-slate uppercase tracking-widest mb-2">Dedication</p>
                    <p className="text-gunmetal font-serif italic">"{dedication}"</p>
                  </div>
                )}

                {/* Shipping for physical books */}
                {!isEbook && shipping.fullName && (
                  <div className="py-4 border-b border-silver">
                    <p className="text-[10px] font-black text-blue-slate uppercase tracking-widest mb-2">Ship To</p>
                    <p className="text-gunmetal font-bold text-sm">{shipping.fullName}</p>
                    <p className="text-blue-slate text-xs">{shipping.address1}</p>
                    <p className="text-blue-slate text-xs">{shipping.city}, {shipping.state} {shipping.zip}</p>
                  </div>
                )}

                {/* Delivery info for ebook */}
                {isEbook && (
                  <div className="py-4 border-b border-silver">
                    <p className="text-[10px] font-black text-blue-slate uppercase tracking-widest mb-2">Delivery</p>
                    <p className="text-gunmetal font-bold text-sm">Instant Digital Download</p>
                    <p className="text-blue-slate text-xs">PDF will be sent to {userEmail}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="font-black text-gunmetal text-lg">Total</span>
                  <span className="font-black text-pacific-cyan text-2xl">
                    {priceLoading ? '...' : price?.displayPrice || '—'}
                  </span>
                </div>
              </div>

              {/* Checkout Error */}
              {checkoutError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
                  <p className="text-red-600 font-bold text-sm">{checkoutError}</p>
                </div>
              )}

              {/* Stripe Redirect Notice */}
              <div className="flex items-center gap-3 p-4 bg-off-white rounded-2xl border-2 border-silver border-dashed">
                <div className="text-2xl">🔒</div>
                <p className="text-[10px] text-blue-slate font-bold uppercase tracking-widest leading-relaxed">
                  You'll be redirected to Stripe's secure checkout to complete your payment.
                </p>
              </div>

              {/* Stripe Badge */}
              <div className="flex justify-center items-center gap-2 text-silver">
                <span className="text-xs font-medium">Powered by</span>
                <span className="font-black text-[#635BFF]">stripe</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-silver bg-white flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isCheckingOut}
            className="px-6 py-3 font-black text-blue-slate uppercase tracking-widest text-xs hover:text-gunmetal transition-colors disabled:opacity-50"
          >
            {step === 'DEDICATION' ? 'Back to Proof' : 'Previous Step'}
          </button>

          {step === 'REVIEW' ? (
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || priceLoading || !price}
            >
              <span className="flex items-center gap-2">
                {isCheckingOut ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Redirecting...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <span className="text-lg">🔒</span>
                  </>
                )}
              </span>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              disabled={step === 'SHIPPING' && !isShippingValid}
            >
              <span className="flex items-center gap-2">
                Continue
                <span className="text-lg">→</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c6c5b9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default OrderFlow;
