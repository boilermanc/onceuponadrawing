
import React, { useState, useEffect } from 'react';
import { DrawingAnalysis, ProductType, ShippingInfo } from '../types';
import Button from './ui/Button';

interface OrderFlowProps {
  analysis: DrawingAnalysis;
  onClose: () => void;
  onComplete: (product: ProductType, dedication: string, shipping?: ShippingInfo) => void;
}

const OrderFlow: React.FC<OrderFlowProps> = ({ analysis, onClose, onComplete }) => {
  const [step, setStep] = useState<'PRODUCT' | 'DEDICATION' | 'SHIPPING' | 'PAYMENT' | 'PROCESSING'>('PRODUCT');
  const [product, setProduct] = useState<ProductType>(ProductType.HARDCOVER);
  const [dedication, setDedication] = useState(analysis.dedication || '');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });
  const [isPayEnabled, setIsPayEnabled] = useState(false);
  
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

  useEffect(() => {
    const isCardValid = cardData.number.replace(/\s/g, '').length === 16 && 
                        cardData.expiry.length === 5 && 
                        cardData.cvc.length === 3;
    setIsPayEnabled(isCardValid);
  }, [cardData]);

  const handleNext = () => {
    if (step === 'PRODUCT') setStep('DEDICATION');
    else if (step === 'DEDICATION') {
      if (product === ProductType.HARDCOVER) setStep('SHIPPING');
      else setStep('PAYMENT');
    }
    else if (step === 'SHIPPING') setStep('PAYMENT');
    else if (step === 'PAYMENT') {
      setStep('PROCESSING');
      // Simulate bank delay
      setTimeout(() => {
        onComplete(product, dedication, shipping);
      }, 3000);
    }
  };

  const handleBack = () => {
    if (step === 'DEDICATION') setStep('PRODUCT');
    else if (step === 'SHIPPING') setStep('DEDICATION');
    else if (step === 'PAYMENT') {
      if (product === ProductType.HARDCOVER) setStep('SHIPPING');
      else setStep('DEDICATION');
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) return parts.join(' ');
    else return value;
  };

  const formatExpiry = (value: string) => {
    return value.replace(
      /[^0-9]/g, ''
    ).replace(
      /^([2-9])$/g, '0$1'
    ).replace(
      /^(1{1}[3-9]{1})$/g, '0$1'
    ).replace(
      /^0{1,2}$/g, '0'
    ).replace(
      /^([0-1]{1}[0-2]{1})([0-9]{1,2}).*/g, '$1/$2'
    ).substring(0, 5);
  };

  const totalPrice = product === ProductType.HARDCOVER ? 47.98 : 12.99;

  return (
    <div className="fixed inset-0 z-[150] bg-gunmetal/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="bg-off-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] border-4 border-white/20">
        
        {/* Header */}
        <div className="p-8 border-b border-silver flex justify-between items-center bg-white relative">
          <div className="absolute top-0 left-0 h-1 bg-pacific-cyan transition-all duration-700" style={{ width: `${(step === 'PRODUCT' ? 20 : step === 'DEDICATION' ? 40 : step === 'SHIPPING' ? 60 : step === 'PAYMENT' ? 80 : 100)}%` }}></div>
          <div>
            <h2 className="text-2xl font-black text-gunmetal">Studio Checkout</h2>
            <p className="text-[10px] text-blue-slate font-black uppercase tracking-[0.3em] mt-1">
              Securing your Masterpiece
            </p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-gunmetal text-xl transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {step === 'PRODUCT' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <span className="text-5xl mb-4 inline-block">🎁</span>
                <h3 className="text-2xl font-black text-gunmetal">Pick Your Edition</h3>
                <p className="text-blue-slate font-medium">How should we deliver the magic?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setProduct(ProductType.HARDCOVER)}
                  className={`group relative p-8 rounded-[2.5rem] border-4 text-left transition-all ${product === ProductType.HARDCOVER ? 'border-pacific-cyan bg-pacific-cyan/5' : 'border-silver hover:border-blue-slate'}`}
                >
                  {product === ProductType.HARDCOVER && <div className="absolute -top-3 -right-3 bg-pacific-cyan text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Selected</div>}
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-5xl group-hover:scale-110 transition-transform">📖</span>
                    <span className="font-black text-pacific-cyan text-xl">$39.99</span>
                  </div>
                  <h3 className="font-black text-gunmetal text-xl">Hardcover</h3>
                  <p className="text-xs text-blue-slate mt-2 leading-relaxed">Premium 24-page archival physical book shipped to your door.</p>
                </button>

                <button 
                  onClick={() => setProduct(ProductType.EBOOK)}
                  className={`group relative p-8 rounded-[2.5rem] border-4 text-left transition-all ${product === ProductType.EBOOK ? 'border-pacific-cyan bg-pacific-cyan/5' : 'border-silver hover:border-blue-slate'}`}
                >
                   {product === ProductType.EBOOK && <div className="absolute -top-3 -right-3 bg-pacific-cyan text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Selected</div>}
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-5xl group-hover:scale-110 transition-transform">📱</span>
                    <span className="font-black text-pacific-cyan text-xl">$12.99</span>
                  </div>
                  <h3 className="font-black text-gunmetal text-xl">Digital Ebook</h3>
                  <p className="text-xs text-blue-slate mt-2 leading-relaxed">Instant high-resolution PDF for tablets and unlimited sharing.</p>
                </button>
              </div>
            </div>
          )}

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
                 <h3 className="text-2xl font-black text-gunmetal">Delivery Details</h3>
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
                  <input type="text" placeholder="CA" value={shipping.state} onChange={e => setShipping({...shipping, state: e.target.value})} className="w-full p-4 border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal shadow-sm" />
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

          {step === 'PAYMENT' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center bg-gunmetal text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💳</div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Secure Payment Gateway</p>
                  <h3 className="text-4xl font-black text-pacific-cyan">${totalPrice.toFixed(2)}</h3>
                  <p className="text-[10px] font-bold mt-2 opacity-50 uppercase tracking-[0.2em]">Billed as: ONCE UPON A DRAWING</p>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Card Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        maxLength={19}
                        placeholder="0000 0000 0000 0000"
                        value={cardData.number}
                        onChange={e => setCardData({...cardData, number: formatCardNumber(e.target.value)})}
                        className="w-full p-5 bg-white border-4 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-mono text-lg font-bold text-gunmetal shadow-sm" 
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                        <div className={`w-8 h-5 rounded bg-blue-600 transition-opacity ${cardData.number.startsWith('4') ? 'opacity-100' : 'opacity-20'}`}></div>
                        <div className={`w-8 h-5 rounded bg-orange-500 transition-opacity ${cardData.number.startsWith('5') ? 'opacity-100' : 'opacity-20'}`}></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">Expiry Date</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        value={cardData.expiry}
                        onChange={e => setCardData({...cardData, expiry: formatExpiry(e.target.value)})}
                        className="w-full p-5 bg-white border-4 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-mono text-lg font-bold text-gunmetal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-blue-slate uppercase mb-2 block tracking-widest">CVC</label>
                      <input 
                        type="text" 
                        placeholder="123"
                        maxLength={3}
                        value={cardData.cvc}
                        onChange={e => setCardData({...cardData, cvc: e.target.value.replace(/\D/g, '')})}
                        className="w-full p-5 bg-white border-4 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-mono text-lg font-bold text-gunmetal shadow-sm" 
                      />
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-3 p-4 bg-off-white rounded-2xl border-2 border-silver border-dashed">
                  <div className="text-2xl">🔒</div>
                  <p className="text-[10px] text-blue-slate font-bold uppercase tracking-widest leading-relaxed">
                    End-to-end encrypted with Stripe-Grade security. Your card data is never stored on our servers.
                  </p>
               </div>
            </div>
          )}

          {step === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center h-80 space-y-8 text-center animate-in zoom-in-95 duration-1000">
               <div className="relative">
                 <div className="w-32 h-32 border-8 border-pacific-cyan/10 border-t-pacific-cyan rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-4xl">🏛️</div>
               </div>
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-gunmetal">Verifying Funds</h3>
                 <p className="text-blue-slate font-bold uppercase tracking-[0.3em] text-[10px]">Contacting Financial Wizards...</p>
               </div>
               <div className="max-w-xs text-xs text-silver font-medium italic">
                 "One moment while we secure the magic ink for your edition."
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'PROCESSING' && (
          <div className="p-8 border-t border-silver bg-white flex items-center justify-between">
            <button 
              onClick={step === 'PRODUCT' ? onClose : handleBack} 
              className="px-6 py-3 font-black text-blue-slate uppercase tracking-widest text-xs hover:text-gunmetal transition-colors"
            >
              {step === 'PRODUCT' ? 'Back to Gallery' : 'Previous Step'}
            </button>
            
            <Button 
              size="lg"
              onClick={handleNext}
              disabled={
                (step === 'SHIPPING' && !isShippingValid) || 
                (step === 'PAYMENT' && !isPayEnabled)
              }
            >
              <span className="flex items-center gap-2">
                {step === 'PAYMENT' ? 'Complete Purchase 🚀' : 'Continue Step'}
                <span className="text-lg">→</span>
              </span>
            </Button>
          </div>
        )}
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
