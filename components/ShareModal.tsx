import React, { useState, useEffect, useCallback } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  artistName: string;
  videoUrl: string | null;
  videoBlob?: Blob | null;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  storyTitle,
  artistName,
  videoUrl,
  videoBlob,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const shareMessage = `Check out this magical story I made called "${storyTitle}"!`;
  const shareSubject = `${storyTitle} - A Story by ${artistName}`;

  // Check if native sharing is supported
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator;

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setShareError(null);
    }
  }, [isOpen]);

  const handleNativeShare = async () => {
    if (!canNativeShare) return;

    setIsSharing(true);
    setShareError(null);

    try {
      // Try to share with video file first
      if (videoBlob && canShareFiles) {
        const file = new File([videoBlob], `${storyTitle.replace(/[^a-z0-9]/gi, '-')}.mp4`, {
          type: 'video/mp4',
        });

        const shareData = {
          title: storyTitle,
          text: shareMessage,
          files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setIsSharing(false);
          return;
        }
      }

      // Fallback to text-only share
      await navigator.share({
        title: storyTitle,
        text: shareMessage,
        url: videoUrl || undefined,
      });
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== 'AbortError') {
        setShareError('Unable to share. Try another option.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setShareError('Failed to copy to clipboard');
      setTimeout(() => setShareError(null), 2000);
    }
  };

  const handleSocialShare = (platform: 'facebook' | 'twitter' | 'email') => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedSubject = encodeURIComponent(shareSubject);
    const encodedUrl = encodeURIComponent(videoUrl || '');

    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodedSubject}&body=${encodedMessage}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;

    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${storyTitle.replace(/[^a-z0-9]/gi, '-')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const shareOptions = [
    {
      id: 'native',
      label: 'Share',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      ),
      onClick: handleNativeShare,
      disabled: !canNativeShare,
      loading: isSharing,
    },
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy',
      icon: copied ? (
        <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      ),
      onClick: handleCopyLink,
      disabled: false,
      success: copied,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: (
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      onClick: () => handleSocialShare('facebook'),
      disabled: false,
      color: 'hover:text-[#1877F2]',
    },
    {
      id: 'twitter',
      label: 'X',
      icon: (
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: () => handleSocialShare('twitter'),
      disabled: false,
      color: 'hover:text-black',
    },
    {
      id: 'email',
      label: 'Email',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      onClick: () => handleSocialShare('email'),
      disabled: false,
      color: 'hover:text-pacific-cyan',
    },
    {
      id: 'download',
      label: 'Download',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
      onClick: handleDownload,
      disabled: !videoUrl,
      color: 'hover:text-soft-gold',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gunmetal/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-silver/20">
          <h2 className="text-xl font-black text-gunmetal">Share Your Story</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-silver/10 hover:bg-silver/20 flex items-center justify-center text-blue-slate hover:text-gunmetal transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Story info */}
          <div className="mb-5 p-4 bg-gradient-to-br from-pacific-cyan/5 to-soft-gold/5 rounded-xl border border-silver/20">
            <p className="font-bold text-gunmetal truncate">{storyTitle}</p>
            <p className="text-sm text-blue-slate">by {artistName}</p>
          </div>

          {/* Share options grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={option.onClick}
                disabled={option.disabled || option.loading}
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                  option.disabled
                    ? 'opacity-40 cursor-not-allowed bg-silver/5'
                    : option.success
                    ? 'bg-green-50 text-green-600'
                    : `bg-silver/10 hover:bg-silver/20 text-blue-slate ${option.color || 'hover:text-pacific-cyan'} active:scale-95`
                }`}
              >
                {option.loading ? (
                  <div className="w-7 h-7 border-2 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin" />
                ) : (
                  option.icon
                )}
                <span className="mt-2 text-xs font-bold">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Error message */}
          {shareError && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
              {shareError}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 pb-5">
          <p className="text-xs text-blue-slate/60 text-center">
            Share your magical creation with friends and family
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
