import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TeaserModalProps {
  creation: {
    id: string;
    title: string;
    featured_thumbnail_url: string;
    featured_pages: { url: string; text: string; }[];
    analysis_json?: { artistAge?: string };
  };
  onClose: () => void;
  onStartCreating?: () => void;
}

const TeaserModal: React.FC<TeaserModalProps> = ({ creation, onClose, onStartCreating }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const pages = creation.featured_pages || [];
  const totalPages = pages.length;
  const isLastPage = currentPage === totalPages - 1;
  const isFirstPage = currentPage === 0;

  // Get artist age from analysis_json
  const artistAge = creation.analysis_json?.artistAge;

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentPage, totalPages, isTransitioning]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentPage, isTransitioning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNextPage, goToPrevPage]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Touch/swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger swipe if horizontal movement is greater than vertical (to avoid conflicts with scrolling)
    // and the swipe distance is significant enough (50px minimum)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // Swiped left - go to next page
        goToNextPage();
      } else {
        // Swiped right - go to previous page
        goToPrevPage();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [goToNextPage, goToPrevPage]);

  const handleStartCreating = () => {
    onClose();
    onStartCreating?.();
  };

  const currentPageData = pages[currentPage];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500"
      onClick={onClose}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-pacific-cyan/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-64 h-64 bg-soft-gold/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-3 right-3 md:top-4 md:right-4 w-10 h-10 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-silver/30 hover:scale-110 active:scale-90 z-[120] group"
      >
        <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main Book Container */}
      <div
        className="relative w-full max-w-3xl mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title and Attribution */}
        <div className="text-center mb-4 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
            {creation.title}
          </h2>
          {artistAge && (
            <p className="text-xs md:text-sm text-white/60 italic">
              Created by a young artist, age {artistAge}
            </p>
          )}
        </div>

        {/* Book Spread */}
        <div
          className={`relative bg-white rounded-xl md:rounded-2xl shadow-2xl overflow-hidden book-shadow transition-transform duration-300 ${isTransitioning ? 'scale-[0.98]' : 'scale-100'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Spine divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200/60 z-30 hidden md:block"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-6 -ml-3 spine-shadow z-20 hidden md:block"></div>

          {/* Book Pages - Side by Side */}
          <div className={`flex flex-col md:flex-row transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {/* LEFT PAGE: Illustration */}
            <div className="w-full md:w-1/2 h-64 md:h-[420px] relative overflow-hidden bg-slate-100">
              {currentPageData && (
                <img
                  src={currentPageData.url}
                  alt={`${creation.title} - Page ${currentPage + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Edge shadow */}
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none hidden md:block"></div>
            </div>

            {/* RIGHT PAGE: Story Text or CTA */}
            <div className="w-full md:w-1/2 h-auto md:h-[420px] relative overflow-hidden bg-[#fffdf9] p-6 md:p-10 flex flex-col justify-center items-center text-center">
              {/* Paper texture */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
              {/* Edge shadow */}
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none hidden md:block"></div>

              <div className="z-10 w-full">
                {!isLastPage ? (
                  /* Story Pages */
                  <div className="space-y-5">
                    <div className="text-soft-gold/50 text-4xl font-serif">"</div>
                    <p className="text-base md:text-xl font-serif italic text-gunmetal leading-relaxed px-2">
                      {currentPageData?.text}
                    </p>
                    <div className="text-soft-gold/50 text-4xl font-serif rotate-180">"</div>

                    {/* Page number */}
                    <div className="pt-4">
                      <span className="text-xs text-blue-slate/60 font-bold uppercase tracking-widest">
                        Page {currentPage + 1}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* CTA Page */
                  <div className="space-y-5">
                    <h3 className="text-xl md:text-2xl font-black text-gunmetal leading-tight">
                      Every drawing has a story waiting to be told
                    </h3>

                    <p className="text-sm md:text-base text-blue-slate">
                      Turn any artwork into a 12-page illustrated storybook. It's free to start!
                    </p>

                    <button
                      onClick={handleStartCreating}
                      className="mt-3 px-8 py-4 bg-gradient-to-r from-pacific-cyan to-soft-gold text-white rounded-full font-black text-base hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pacific-cyan/30 group"
                    >
                      <span className="flex items-center gap-2">
                        Start With Your Drawing
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>

                    <div className="pt-3">
                      <span className="text-xs text-blue-slate/60 font-bold uppercase tracking-widest">
                        Page {currentPage + 1}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevPage}
          disabled={isFirstPage || isTransitioning}
          className={`absolute left-0 md:-left-3 top-1/2 -translate-y-1/2 -translate-x-full md:-translate-x-1/2 w-9 h-9 md:w-10 md:h-10 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-silver/30 z-[110] ${
            isFirstPage
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 hover:scale-110 active:scale-90'
          }`}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNextPage}
          disabled={isLastPage || isTransitioning}
          className={`absolute right-0 md:-right-3 top-1/2 -translate-y-1/2 translate-x-full md:translate-x-1/2 w-9 h-9 md:w-10 md:h-10 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-silver/30 z-[110] ${
            isLastPage
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 hover:scale-110 active:scale-90'
          }`}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center gap-1.5 mt-4 flex-shrink-0">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isTransitioning && idx !== currentPage) {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentPage(idx);
                    setIsTransitioning(false);
                  }, 300);
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentPage === idx
                  ? 'w-5 bg-pacific-cyan shadow-[0_0_8px_rgba(98,146,158,0.6)]'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .book-shadow {
          box-shadow:
            0 20px 40px -10px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .spine-shadow {
          background: linear-gradient(90deg,
            rgba(0,0,0,0.03) 0%,
            rgba(0,0,0,0.08) 50%,
            rgba(0,0,0,0.03) 100%
          );
        }
      `}</style>
    </div>
  );
};

export default TeaserModal;
