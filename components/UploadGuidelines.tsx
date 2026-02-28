import React, { useState } from 'react';

const STORAGE_KEY = 'onceupon-hide-upload-guidelines';

interface UploadGuidelinesProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (dontShowAgain: boolean) => void;
}

export const shouldShowGuidelines = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
};

export const hideGuidelinesForever = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Ignore localStorage errors
  }
};

const UploadGuidelines: React.FC<UploadGuidelinesProps> = ({
  isOpen,
  onClose,
  onContinue,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (dontShowAgain) {
      hideGuidelinesForever();
    }
    onContinue(dontShowAgain);
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
        className="relative w-full max-w-lg md:max-w-2xl lg:max-w-3xl bg-off-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-pacific-cyan to-purple-500 p-6 text-white text-center">
          <div className="text-4xl mb-2">🎨</div>
          <h2 className="text-2xl font-black">Before You Upload!</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Two-column layout for green/red sections on desktop */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* What Works Best - Green Section */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-black text-emerald-700 text-lg">What Works Best</h3>
              </div>
              <ul className="space-y-2 text-emerald-800">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Hand-drawn artwork on paper (crayons, markers, pencils)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Cartoon-style doodles and characters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Original characters from imagination</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Abstract art and fun shapes</span>
                </li>
              </ul>
            </div>

            {/* What Won't Work - Red Section */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="font-black text-red-700 text-lg">What Won't Work</h3>
              </div>
              <ul className="space-y-2 text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Real photos of children — only drawings please!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Photos of celebrities or famous people</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Copyrighted characters (Disney, Pokemon, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Violent, scary, or inappropriate content</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pro Tip - Yellow Section */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">💡</span>
              </div>
              <h3 className="font-black text-amber-700 text-lg">Pro Tip</h3>
            </div>
            <p className="text-amber-800">
              Take a clear photo of your drawing on white paper with good lighting for the best results!
            </p>
          </div>

          {/* Don't show again checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all ${
                dontShowAgain
                  ? 'bg-pacific-cyan border-pacific-cyan'
                  : 'border-silver group-hover:border-pacific-cyan/50'
              }`}>
                {dontShowAgain && (
                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-blue-slate group-hover:text-gunmetal transition-colors">
              Don't show me this again
            </span>
          </label>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-pacific-cyan text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pacific-cyan/30 border-b-4 border-blue-slate"
            >
              Got It! Let's Create! 🚀
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-blue-slate hover:text-gunmetal font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UploadGuidelines;
