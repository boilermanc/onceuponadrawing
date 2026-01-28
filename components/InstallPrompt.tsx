import React, { useState, useEffect } from 'react';
import { Download, X, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallPromptProps {
  delayMs?: number;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ delayMs = 30000 }) => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show after delay if can install
    if ((canInstall || isIOS) && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isIOS, isInstalled, delayMs]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt || dismissed || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-silver/30 p-4 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-blue-slate/60 hover:text-gunmetal transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pacific-cyan to-blue-slate flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎨</span>
          </div>

          <div className="flex-1 pr-6">
            <h3 className="font-bold text-gunmetal text-sm">Add to Home Screen</h3>
            <p className="text-xs text-blue-slate mt-1">
              Install Once Upon a Drawing for quick access and a better experience.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-3 p-3 bg-off-white rounded-xl">
            <p className="text-xs text-gunmetal/80 flex items-center gap-2">
              <Share2 size={14} />
              Tap <span className="font-semibold">Share</span> then <span className="font-semibold">"Add to Home Screen"</span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2.5 bg-pacific-cyan text-white text-sm font-semibold rounded-xl hover:bg-pacific-cyan/90 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Install App
          </button>
        )}
      </div>
    </div>
  );
};
