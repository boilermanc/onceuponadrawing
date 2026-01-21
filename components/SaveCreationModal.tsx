import React from 'react';

interface SaveCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  savesUsed: number;
  limit: number;
  isLoading: boolean;
}

const SaveCreationModal: React.FC<SaveCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  savesUsed,
  limit,
  isLoading,
}) => {
  if (!isOpen) return null;

  const isPremium = limit === Infinity;
  const isAtLimit = savesUsed >= limit;

  const handleSave = async () => {
    await onSave();
  };

  const handleDiscard = () => {
    onDiscard();
    onClose();
  };

  const handleUpgrade = () => {
    // TODO: Navigate to upgrade/pricing page
    window.location.href = '/pricing';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gunmetal/80 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-off-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pacific-cyan via-soft-gold to-pacific-cyan" />

        <div className="p-8 pt-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              isAtLimit
                ? 'bg-gradient-to-br from-soft-gold/20 to-soft-gold/40 border-2 border-soft-gold/30'
                : 'bg-gradient-to-br from-pacific-cyan/20 to-pacific-cyan/40 border-2 border-pacific-cyan/30'
            }`}>
              {isAtLimit ? (
                <svg className="w-10 h-10 text-soft-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-pacific-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-gunmetal text-center mb-2">
            {isAtLimit ? 'Storage Full' : 'Save This Creation?'}
          </h2>

          {/* Subtitle */}
          <p className="text-blue-slate text-center text-sm mb-6">
            {isPremium ? (
              'Add this masterpiece to your gallery for safekeeping.'
            ) : isAtLimit ? (
              'Upgrade to Premium for unlimited saves and unlock all your creations.'
            ) : (
              'Keep this story in your gallery to revisit anytime.'
            )}
          </p>

          {/* Progress Indicator (for free users) */}
          {!isPremium && (
            <div className="mb-8">
              <div className="flex justify-center gap-2 mb-2">
                {Array.from({ length: limit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < savesUsed
                        ? 'bg-pacific-cyan shadow-sm shadow-pacific-cyan/50'
                        : 'bg-silver/40 border border-silver/60'
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-xs text-blue-slate/70 font-medium">
                {isAtLimit ? (
                  <span className="text-soft-gold font-bold">All {limit} free saves used</span>
                ) : (
                  <>You've used <span className="font-bold text-gunmetal">{savesUsed}</span> of <span className="font-bold text-gunmetal">{limit}</span> free saves</>
                )}
              </p>
            </div>
          )}

          {/* Premium badge for premium users */}
          {isPremium && (
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-soft-gold/20 to-soft-gold/10 text-soft-gold rounded-full text-xs font-black uppercase tracking-wider border border-soft-gold/30">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Premium Member
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            {isAtLimit ? (
              <>
                <button
                  onClick={handleUpgrade}
                  className="w-full py-4 bg-gradient-to-r from-soft-gold to-amber-500 text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-soft-gold/30 border-b-4 border-amber-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Upgrade to Premium
                </button>
                <button
                  onClick={handleDiscard}
                  className="w-full py-3 text-blue-slate hover:text-gunmetal font-bold text-sm transition-colors"
                >
                  Discard This Creation
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full py-4 bg-pacific-cyan text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pacific-cyan/30 border-b-4 border-blue-slate disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save to Gallery
                    </>
                  )}
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={isLoading}
                  className="w-full py-3 text-blue-slate hover:text-gunmetal font-bold text-sm transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-silver/20 hover:bg-silver/40 flex items-center justify-center text-blue-slate hover:text-gunmetal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SaveCreationModal;
