
import React from 'react';
import { Order, ProductType, OrderStatus } from '../types';
import Button from './ui/Button';

interface ConfirmationProps {
  order: Order;
  onNew: () => void;
}

const Confirmation: React.FC<ConfirmationProps> = ({ order, onNew }) => {
  const isEbook = false; // Ebook option removed; all orders are physical books

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-1000 relative">
      {/* Confetti simulation overlay would go here */}
      
      <div className="mb-12">
        <div className="w-40 h-40 bg-pacific-cyan/10 text-pacific-cyan rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-pacific-cyan/20 animate-bounce duration-[3000ms]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-gunmetal tracking-tighter mb-4">Magic Confirmed!</h2>
        <p className="text-xl text-blue-slate font-medium italic font-serif max-w-xl mx-auto">
          "The ink is drying and the pixels are glowing. Your masterpiece is officially in our studio's queue."
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Receipt Card */}
        <div className="md:col-span-2 bg-white rounded-[3.5rem] border-4 border-silver p-10 text-left shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black -rotate-12 group-hover:rotate-0 transition-transform">RECEIPT</div>
          <div className="flex justify-between items-start mb-10 pb-6 border-b-4 border-dashed border-silver/30">
             <div>
                <p className="text-[10px] font-black text-silver uppercase tracking-[0.4em] mb-1">Order Identifier</p>
                <h3 className="text-2xl font-black text-gunmetal">#{order.id.slice(0, 8).toUpperCase()}</h3>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-silver uppercase tracking-[0.4em] mb-1">Status</p>
                <span className="px-3 py-1 bg-pacific-cyan text-white text-[10px] font-black rounded-full uppercase tracking-widest">{order.status}</span>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center group/item">
              <div className="flex items-center gap-4">
                 <div className="text-3xl">{isEbook ? '📱' : '📖'}</div>
                 <div>
                    <p className="font-black text-gunmetal">{isEbook ? 'Digital Masterpiece Edition' : 'Hardcover Collector Edition'}</p>
                    <p className="text-xs text-blue-slate font-medium">Qty: 1 Unit</p>
                 </div>
              </div>
              <span className="font-black text-gunmetal">${(order.totalAmount / 100).toFixed(2)}</span>
            </div>
            
            {!isEbook && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-blue-slate italic">Studio Shipping & Protection</span>
                <span className="font-black text-gunmetal">INCLUDED</span>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t-4 border-gunmetal flex justify-between items-center">
             <span className="text-2xl font-black text-gunmetal uppercase tracking-tighter">Total Charged</span>
             <span className="text-3xl font-black text-pacific-cyan">${(order.totalAmount / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gunmetal rounded-[3.5rem] p-10 text-white text-left shadow-2xl flex flex-col justify-between">
           <div>
              <p className="text-xs font-black text-pacific-cyan uppercase tracking-widest mb-6">What's Next?</p>
              <div className="space-y-8">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">1</div>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">
                       {isEbook 
                         ? "Our servers are finalizing your high-res PDF spreads." 
                         : "Your art is sent to our premium printer."}
                    </p>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">2</div>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">
                       {isEbook 
                         ? `A magic link will arrive at ${order.customerEmail} within 5 minutes.` 
                         : "A tracking number will be issued once the ink is dry (approx 48hrs)."}
                    </p>
                 </div>
              </div>
           </div>
           <div className="pt-8 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Managed by Once Upon a Drawing Logistics</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <Button size="xl" onClick={onNew} className="shadow-2xl">
           Create Another Universe 🎨
        </Button>
        <Button variant="outline" size="xl" onClick={() => window.print()}>
           Print This Receipt 📜
        </Button>
      </div>
      
      <p className="mt-20 text-silver text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
        Every scribble has a story • Thank you for choosing Once Upon a Drawing
      </p>
    </div>
  );
};

export default Confirmation;
