
import React from 'react';
import { ProductType } from '../types';
import Button from './ui/Button';

interface ProductSelectionProps {
  onSelect: (product: ProductType) => void;
  onBack: () => void;
}

const ProductSelection: React.FC<ProductSelectionProps> = ({ onSelect, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gunmetal mb-4">Choose Your Keepake</h2>
        <p className="text-xl text-blue-slate font-medium">How would you like to preserve this magical story?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Ebook Option */}
        <div className="bg-white rounded-[2.5rem] border-4 border-silver p-8 flex flex-col shadow-xl hover:border-pacific-cyan transition-all group">
          <div className="text-6xl mb-6 group-hover:scale-110 transition-transform origin-left">📱</div>
          <h3 className="text-3xl font-black text-gunmetal mb-2">Digital Ebook</h3>
          <p className="text-pacific-cyan font-black text-2xl mb-6">$12.99</p>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> 24-page screen-optimized PDF
            </li>
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Instant download after payment
            </li>
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Perfect for tablets & sharing
            </li>
          </ul>

          <Button onClick={() => onSelect(ProductType.EBOOK)} size="lg" className="w-full">
            Choose Ebook
          </Button>
        </div>

        {/* Hardcover Option */}
        <div className="bg-white rounded-[2.5rem] border-4 border-pacific-cyan p-8 flex flex-col shadow-2xl relative overflow-hidden group">
          <div className="absolute top-6 right-6 bg-soft-gold text-gunmetal font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
            Best Seller
          </div>
          <div className="text-6xl mb-6 group-hover:scale-110 transition-transform origin-left">📖</div>
          <h3 className="text-3xl font-black text-gunmetal mb-2">Premium Hardcover</h3>
          <p className="text-pacific-cyan font-black text-2xl mb-6">$39.99 <span className="text-sm font-bold text-blue-slate">+ shipping</span></p>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Professional 8.5x8.5" Casewrap
            </li>
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Archival quality matte paper
            </li>
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Includes digital version FREE
            </li>
            <li className="flex items-start gap-3 text-blue-slate font-bold">
              <span className="text-pacific-cyan">✓</span> Ships in 5-7 business days
            </li>
          </ul>

          <Button onClick={() => onSelect(ProductType.HARDCOVER)} size="lg" variant="secondary" className="w-full">
            Order Printed Book
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          ← Back to Animation
        </Button>
      </div>
    </div>
  );
};

export default ProductSelection;
