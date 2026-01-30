
import React, { useState } from 'react';
import { ProductType } from '../types';
import Button from './ui/Button';
import { usePrices, BookPrice } from '../contexts/PricesContext';

const ANCHOR_PRICES: Record<string, number> = {
  hardcover: 59.99,
};

interface EditionPickerProps {
  onSelect: (edition: ProductType) => void;
  onBack: () => void;
}

// Temporary flag while waiting for Lulu PDF approval
const PHYSICAL_BOOKS_ENABLED = false;

const EditionPicker: React.FC<EditionPickerProps> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<ProductType>(ProductType.EBOOK);
  const { prices, loading, error } = usePrices();

  const getSelectedPrice = (): BookPrice | null => {
    if (!prices) return null;
    if (selected === ProductType.EBOOK) return prices.ebook;
    if (selected === ProductType.HARDCOVER) return prices.hardcover;
    return prices.softcover;
  };

  const selectedPrice = getSelectedPrice();

  return (
    <div className="fixed inset-0 z-[150] bg-gunmetal/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="bg-off-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] border-4 border-white/20">

        {/* Header */}
        <div className="p-8 border-b border-silver flex justify-between items-center bg-white relative">
          <div>
            <h2 className="text-2xl font-black text-gunmetal">Studio Checkout</h2>
            <p className="text-[10px] text-blue-slate font-black uppercase tracking-[0.3em] mt-1">
              Choose Your Edition
            </p>
          </div>
          <button onClick={onBack} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-gunmetal text-xl transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <span className="text-5xl mb-4 inline-block">🎁</span>
              <h3 className="text-2xl font-black text-gunmetal">Pick Your Edition</h3>
              <p className="text-blue-slate font-medium">How should we deliver the magic?</p>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-pacific-cyan/20 border-t-pacific-cyan rounded-full animate-spin"></div>
                <p className="text-blue-slate font-medium">Loading prices...</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-12 space-y-4">
                <span className="text-5xl">⚠️</span>
                <p className="text-red-500 font-bold">Failed to load prices</p>
                <p className="text-blue-slate text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-pacific-cyan text-white font-bold rounded-full hover:bg-pacific-cyan/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Edition selection */}
            {!loading && !error && prices && (
              <div className="space-y-4">
                {/* Ebook */}
                <button
                  onClick={() => setSelected(ProductType.EBOOK)}
                  disabled={!prices.ebook}
                  className={`group relative w-full p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-4 text-left transition-all ${selected === ProductType.EBOOK ? 'border-pacific-cyan bg-pacific-cyan/5' : 'border-silver hover:border-blue-slate'} ${!prices.ebook ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {selected === ProductType.EBOOK && prices.ebook && <div className="absolute -top-3 right-6 bg-pacific-cyan text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Selected</div>}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform flex-shrink-0">💻</span>
                      <div className="flex-1 min-w-0 sm:hidden">
                        <h3 className="font-black text-gunmetal text-lg">{prices.ebook?.productName || 'Digital Storybook'}</h3>
                        <span className="font-black text-pacific-cyan text-lg">{prices.ebook?.displayPrice || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <h3 className="font-black text-gunmetal text-xl">{prices.ebook?.productName || 'Digital Storybook'}</h3>
                      <p className="text-xs text-blue-slate mt-1 leading-relaxed">High-quality PDF — instant download, print at home, share digitally.</p>
                    </div>
                    <p className="text-xs text-blue-slate leading-relaxed sm:hidden">High-quality PDF — instant download, print at home, share digitally.</p>
                    <span className="font-black text-pacific-cyan text-xl flex-shrink-0 hidden sm:block">{prices.ebook?.displayPrice || 'N/A'}</span>
                  </div>
                </button>

                {/* Softcover */}
                <button
                  onClick={() => PHYSICAL_BOOKS_ENABLED && setSelected(ProductType.SOFTCOVER)}
                  disabled={!PHYSICAL_BOOKS_ENABLED || !prices.softcover}
                  className={`group relative w-full p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-4 text-left transition-all ${selected === ProductType.SOFTCOVER && PHYSICAL_BOOKS_ENABLED ? 'border-pacific-cyan bg-pacific-cyan/5' : 'border-silver'} ${!PHYSICAL_BOOKS_ENABLED ? 'opacity-50 cursor-not-allowed grayscale' : !prices.softcover ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-slate'}`}
                >
                  {!PHYSICAL_BOOKS_ENABLED && <div className="absolute -top-3 right-6 bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Coming Soon</div>}
                  {selected === ProductType.SOFTCOVER && PHYSICAL_BOOKS_ENABLED && prices.softcover && <div className="absolute -top-3 right-6 bg-pacific-cyan text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Selected</div>}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform flex-shrink-0">📕</span>
                      <div className="flex-1 min-w-0 sm:hidden">
                        <h3 className="font-black text-gunmetal text-lg">{prices.softcover?.productName || 'Softcover Storybook'}</h3>
                        <span className="font-black text-pacific-cyan text-lg">{prices.softcover?.displayPrice || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <h3 className="font-black text-gunmetal text-xl">{prices.softcover?.productName || 'Softcover Storybook'}</h3>
                      <p className="text-xs text-blue-slate mt-1 leading-relaxed">8.5" x 8.5" perfect bound softcover with matte finish, shipped to your door.</p>
                    </div>
                    <p className="text-xs text-blue-slate leading-relaxed sm:hidden">8.5" x 8.5" perfect bound softcover with matte finish, shipped to your door.</p>
                    <span className="font-black text-pacific-cyan text-xl flex-shrink-0 hidden sm:block">{prices.softcover?.displayPrice || 'N/A'}</span>
                  </div>
                </button>

                {/* Hardcover */}
                <button
                  onClick={() => PHYSICAL_BOOKS_ENABLED && setSelected(ProductType.HARDCOVER)}
                  disabled={!PHYSICAL_BOOKS_ENABLED || !prices.hardcover}
                  className={`group relative w-full p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-4 text-left transition-all ${selected === ProductType.HARDCOVER && PHYSICAL_BOOKS_ENABLED ? 'border-pacific-cyan bg-pacific-cyan/5' : 'border-silver'} ${!PHYSICAL_BOOKS_ENABLED ? 'opacity-50 cursor-not-allowed grayscale' : !prices.hardcover ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-slate'}`}
                >
                  {!PHYSICAL_BOOKS_ENABLED && <div className="absolute -top-3 right-6 bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Coming Soon</div>}
                  {selected === ProductType.HARDCOVER && PHYSICAL_BOOKS_ENABLED && prices.hardcover && <div className="absolute -top-3 right-6 bg-pacific-cyan text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Selected</div>}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform flex-shrink-0">📖</span>
                      <div className="flex-1 min-w-0 sm:hidden">
                        <h3 className="font-black text-gunmetal text-lg">{prices.hardcover?.productName || 'Hardcover Storybook'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400 line-through text-sm">${ANCHOR_PRICES.hardcover.toFixed(2)}</span>
                          <span className="font-black text-pacific-cyan text-lg">{prices.hardcover?.displayPrice || 'N/A'}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Save 25%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <h3 className="font-black text-gunmetal text-xl">{prices.hardcover?.productName || 'Hardcover Storybook'}</h3>
                      <p className="text-xs text-blue-slate mt-1 leading-relaxed">8.5" x 8.5" casewrap hardcover with premium color, shipped to your door.</p>
                    </div>
                    <p className="text-xs text-blue-slate leading-relaxed sm:hidden">8.5" x 8.5" casewrap hardcover with premium color, shipped to your door.</p>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-sm">${ANCHOR_PRICES.hardcover.toFixed(2)}</span>
                        <span className="font-black text-pacific-cyan text-xl">{prices.hardcover?.displayPrice || 'N/A'}</span>
                      </div>
                      <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mt-1">
                        Save 25%
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-silver bg-white flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-6 py-3 font-black text-blue-slate uppercase tracking-widest text-xs hover:text-gunmetal transition-colors"
          >
            Back to Gallery
          </button>
          <Button
            size="lg"
            onClick={() => onSelect(selected)}
            disabled={loading || !!error || !selectedPrice}
          >
            <span className="flex items-center gap-2">
              Continue
              <span className="text-lg">→</span>
            </span>
          </Button>
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

export default EditionPicker;
