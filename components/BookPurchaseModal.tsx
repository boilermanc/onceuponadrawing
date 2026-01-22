import React, { useEffect, useCallback, useState } from 'react';

interface BookPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  creation: {
    id: string;
    title: string;
    artistName: string;
    thumbnailUrl?: string;
  } | null;
  onPurchase?: (creationId: string) => void;
}

const BookPurchaseModal: React.FC<BookPurchaseModalProps> = ({
  isOpen,
  onClose,
  creation,
  onPurchase,
}) => {
  const [showToast, setShowToast] = useState(false);

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

  const handleOrderClick = () => {
    // TODO: Integrate with checkout flow
    // onPurchase?.(creation?.id || '');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  if (!isOpen || !creation) return null;

  const features = [
    "Your child's original artwork on the cover",
    'All 10 story pages beautifully illustrated',
    'Personalized dedication page',
    '"About the Artist" page with name & year',
    'Archival-quality printing that lasts generations',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gunmetal/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-white to-amber-50/30 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white/90 backdrop-blur-sm border-b border-silver/20 rounded-t-3xl">
          <h2 className="text-xl md:text-2xl font-black text-gunmetal">Turn This Story Into a Real Book</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-silver/10 hover:bg-silver/20 flex items-center justify-center text-blue-slate hover:text-gunmetal transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-8">
          {/* Two-column layout on larger screens */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Preview */}
            <div className="flex-shrink-0 flex justify-center">
              <div className="relative" style={{ perspective: '1000px' }}>
                {/* 3D Book Effect */}
                <div
                  className="relative w-48 h-56 md:w-56 md:h-64"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(-15deg)',
                  }}
                >
                  {/* Book spine */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-l-sm"
                    style={{
                      transform: 'rotateY(90deg) translateX(-8px)',
                      transformOrigin: 'left',
                    }}
                  />

                  {/* Book cover */}
                  <div className="absolute inset-0 rounded-r-md rounded-l-sm overflow-hidden shadow-2xl border-2 border-amber-200/50">
                    {/* Cover background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cream via-white to-amber-50" />

                    {/* Thumbnail as cover art */}
                    <div className="absolute inset-4 rounded-lg overflow-hidden shadow-inner border border-silver/30">
                      {creation.thumbnailUrl ? (
                        <img
                          src={creation.thumbnailUrl}
                          alt={creation.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pacific-cyan/20 to-soft-gold/20 flex items-center justify-center">
                          <svg className="w-12 h-12 text-pacific-cyan/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Title on cover */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[10px] md:text-xs font-black text-gunmetal/80 truncate text-center px-2 py-1 bg-white/80 rounded-md backdrop-blur-sm">
                        {creation.title}
                      </p>
                    </div>
                  </div>

                  {/* Book pages edge */}
                  <div
                    className="absolute right-0 top-1 bottom-1 w-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-r-sm"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(to bottom, #f5f5f5 0px, #e5e5e5 1px, #f5f5f5 2px)',
                    }}
                  />
                </div>

                {/* Shadow */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-4 bg-black/20 blur-xl rounded-full" />
              </div>
            </div>

            {/* Product Details */}
            <div className="flex-1 space-y-5">
              {/* Story info */}
              <div>
                <h3 className="font-black text-lg text-gunmetal mb-1">{creation.title}</h3>
                <p className="text-sm text-blue-slate">A story by {creation.artistName}</p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-white rounded-xl border border-silver/20">
                  <p className="text-blue-slate text-xs uppercase tracking-wide mb-1">Format</p>
                  <p className="font-bold text-gunmetal">8.5" × 8.5" Hardcover</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-silver/20">
                  <p className="text-blue-slate text-xs uppercase tracking-wide mb-1">Pages</p>
                  <p className="font-bold text-gunmetal">24 Pages</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-silver/20 col-span-2">
                  <p className="text-blue-slate text-xs uppercase tracking-wide mb-1">Quality</p>
                  <p className="font-bold text-gunmetal">Premium matte finish, lay-flat binding</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gunmetal">$34.99</span>
                <span className="text-green-600 text-sm font-semibold">Free shipping</span>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="mt-8 p-5 bg-white rounded-2xl border border-silver/20">
            <h4 className="font-black text-gunmetal mb-4">What's Included</h4>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm text-gunmetal">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleOrderClick}
            className="w-full mt-6 py-5 bg-gradient-to-r from-soft-gold via-amber-400 to-soft-gold text-gunmetal rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-soft-gold/30 border-b-4 border-amber-600 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Order Your Book — $34.99
          </button>

          {/* Secondary Info */}
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-blue-slate">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              Ships in 5-7 business days
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span className="text-green-600 font-medium">Free shipping included</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              100% satisfaction guaranteed
            </span>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-4 bg-gunmetal text-white rounded-2xl font-bold text-sm shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm text-center">
          <p className="mb-1">Coming soon!</p>
          <p className="text-white/70 font-medium text-xs">We're finalizing our printing partnership. Sign up to be notified!</p>
        </div>
      )}
    </div>
  );
};

export default BookPurchaseModal;
