import React from 'react';
import { CreditBalance } from '../services/creditsService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: CreditBalance | null;
  onSelectPack: (packName: 'starter' | 'popular' | 'best_value') => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}

const packs = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 12.99,
    credits: 3,
    perStory: '$4.33 per story',
    badge: null,
    featured: false,
  },
  {
    id: 'popular' as const,
    name: 'Popular',
    price: 19.99,
    credits: 5,
    perStory: '$4.00 per story — Save 8%',
    badge: 'Most Popular',
    featured: true,
  },
  {
    id: 'best_value' as const,
    name: 'Best Value',
    price: 34.99,
    credits: 10,
    perStory: '$3.50 per story — Save 19%',
    badge: 'Best Value',
    featured: false,
  },
];

const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSelectPack,
  isLoading = false,
  isAuthenticated = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-off-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gunmetal/10 hover:bg-gunmetal/20 transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gunmetal mb-2">Get More Credits</h2>
            <p className="text-gunmetal/70 text-lg">Turn more treasured drawings into magical stories</p>
            {currentBalance && currentBalance.freeRemaining > 0 && (
              <p className="mt-3 text-pacific-cyan font-semibold">
                You have {currentBalance.freeRemaining} free creation{currentBalance.freeRemaining !== 1 ? 's' : ''} left
              </p>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl p-6 transition-all duration-200 ${
                  pack.featured
                    ? 'bg-pacific-cyan/10 border-2 border-pacific-cyan shadow-lg scale-[1.02]'
                    : 'bg-white border-2 border-gunmetal/10 hover:border-gunmetal/30'
                } ${pack.id === 'best_value' ? 'ring-2 ring-soft-gold/50' : ''}`}
              >
                {/* Badge */}
                {pack.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white ${
                      pack.featured ? 'bg-pacific-cyan' : 'bg-soft-gold'
                    }`}
                  >
                    {pack.badge}
                  </div>
                )}

                <div className="text-center pt-2">
                  <h3 className="text-xl font-bold text-gunmetal mb-1">{pack.name}</h3>
                  <div className="text-4xl font-bold text-gunmetal mb-1">
                    ${pack.price.toFixed(2)}
                  </div>
                  <div className="text-gunmetal/60 mb-4">
                    {pack.credits} creation{pack.credits !== 1 ? 's' : ''}
                  </div>
                  <div className={`text-sm mb-6 ${pack.featured ? 'text-pacific-cyan font-semibold' : 'text-gunmetal/70'}`}>
                    {pack.perStory}
                  </div>

                  <button
                    onClick={() => onSelectPack(pack.id)}
                    disabled={isLoading}
                    className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      pack.featured
                        ? 'bg-pacific-cyan text-white hover:bg-pacific-cyan/90 shadow-md'
                        : pack.id === 'best_value'
                        ? 'bg-soft-gold text-gunmetal hover:bg-soft-gold/90'
                        : 'bg-gunmetal text-white hover:bg-gunmetal/90'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : isAuthenticated ? (
                      'Buy'
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-center text-sm text-gunmetal/50">
            Credits are valid for one year from purchase
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
