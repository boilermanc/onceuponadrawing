import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

export const UpdatePrompt: React.FC = () => {
  const { showUpdatePrompt, acceptUpdate, dismissUpdate } = usePWAUpdate();

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-gunmetal text-white rounded-2xl shadow-xl p-4 relative">
        <button
          onClick={dismissUpdate}
          className="absolute top-3 right-3 p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-pacific-cyan/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={20} className="text-pacific-cyan" />
          </div>

          <div className="flex-1 pr-6">
            <h3 className="font-bold text-sm">Update Available</h3>
            <p className="text-xs text-white/70 mt-1">
              A new version of Once Upon a Drawing is ready.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={dismissUpdate}
            className="flex-1 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Later
          </button>
          <button
            onClick={acceptUpdate}
            className="flex-1 py-2 bg-pacific-cyan text-white text-sm font-semibold rounded-xl hover:bg-pacific-cyan/90 transition-colors"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
};
