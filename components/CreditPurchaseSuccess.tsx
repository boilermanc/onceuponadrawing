import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CreditBalance } from '../services/creditsService';

interface CreditPurchaseSuccessProps {
  onContinue: () => void;
  onRefreshBalance: () => Promise<void>;
  creditBalance: CreditBalance | null;
}

const CreditPurchaseSuccess: React.FC<CreditPurchaseSuccessProps> = ({
  onContinue,
  onRefreshBalance,
  creditBalance,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const confettiRef = useRef(false);

  useEffect(() => {
    // Fire confetti on mount (once)
    if (!confettiRef.current) {
      confettiRef.current = true;

      // App color palette
      const colors = ['#00B4D8', '#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA'];

      // Side cannons for continuous effect
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Big center burst
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
          colors: ['#FFD700', '#FFA500'],
        });
      }, 500);
    }
  }, []);

  useEffect(() => {
    const refresh = async () => {
      await onRefreshBalance();
      setIsLoading(false);
    };
    refresh();
  }, [onRefreshBalance]);

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center animate-in fade-in duration-700 px-4">
      {/* Animated celebration icon */}
      <div className="relative mb-8">
        <div className="w-36 h-36 md:w-40 md:h-40 bg-gradient-to-br from-pacific-cyan/20 to-soft-gold/20 rounded-full flex items-center justify-center animate-pulse">
          <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-pacific-cyan to-soft-gold rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-5xl md:text-6xl animate-bounce">✨</span>
          </div>
        </div>
        {/* Sparkle effects */}
        <div className="absolute -top-2 -right-2 text-2xl md:text-3xl animate-ping">⭐</div>
        <div className="absolute -bottom-1 -left-3 text-xl md:text-2xl animate-ping" style={{ animationDelay: '0.5s' }}>✦</div>
        <div className="absolute top-1/2 -right-6 text-lg animate-ping" style={{ animationDelay: '0.3s' }}>✦</div>
      </div>

      <h2 className="text-3xl md:text-5xl font-black text-gunmetal mb-4 tracking-tight">
        You're All Set!
      </h2>

      <p className="text-lg md:text-xl text-blue-slate mb-8 max-w-md font-medium">
        Your credits have been added. Time to turn more treasured drawings into magical stories.
      </p>

      {/* Balance display */}
      {!isLoading && creditBalance && (
        <div className="bg-gradient-to-r from-pacific-cyan/10 to-soft-gold/10 rounded-2xl px-8 py-6 mb-8 border-2 border-pacific-cyan/20 animate-in slide-in-from-bottom duration-500">
          <p className="text-xs md:text-sm font-bold text-blue-slate uppercase tracking-wider mb-1">Your Balance</p>
          <p className="text-5xl md:text-6xl font-black text-pacific-cyan">{creditBalance.totalAvailable}</p>
          <p className="text-sm text-blue-slate">credits ready to use</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-pacific-cyan rounded-full animate-spin"></div>
          <span>Updating your balance...</span>
        </div>
      ) : (
        <button
          onClick={onContinue}
          className="px-10 md:px-12 py-4 md:py-5 bg-gradient-to-r from-pacific-cyan to-blue-500 text-white rounded-2xl font-black text-lg md:text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
        >
          Start Creating ✨
        </button>
      )}
    </div>
  );
};

export default CreditPurchaseSuccess;
