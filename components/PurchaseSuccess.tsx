import React, { useEffect, useState } from 'react';

interface PurchaseSuccessProps {
  onContinue: () => void;
  onRefreshBalance: () => Promise<void>;
}

const PurchaseSuccess: React.FC<PurchaseSuccessProps> = ({ onContinue, onRefreshBalance }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Refresh balance after successful purchase
    const refresh = async () => {
      await onRefreshBalance();
      setIsLoading(false);
    };
    refresh();
  }, [onRefreshBalance]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700">
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-6xl">🎉</span>
        </div>
      </div>

      <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
        You're All Set!
      </h2>

      <p className="text-lg text-slate-600 mb-8 max-w-md font-medium">
        Your credits have been added. Time to turn more treasured drawings into magical stories.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-pacific-cyan rounded-full animate-spin"></div>
          <span>Updating your balance...</span>
        </div>
      ) : (
        <button
          onClick={onContinue}
          className="px-10 py-4 bg-gradient-to-r from-pacific-cyan to-blue-500 text-white rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          Start Creating ✨
        </button>
      )}
    </div>
  );
};

export default PurchaseSuccess;
