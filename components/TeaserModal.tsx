import React, { useState, useEffect, useCallback } from 'react';

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
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-pacific-cyan/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-soft-gold/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
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
        className="relative w-full max-w-xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title and Attribution */}
        <div className="text-center mb-3 flex-shrink-0">
          <h2 className="text-lg md:text-2xl font-black text-white tracking-tight mb-1">
            {creation.title}
          </h2>
          {artistAge && (
            <p className="text-xs md:text-sm text-white/60 italic">
              Created by a young artist, age {artistAge}
            </p>
          )}
        </div>

        {/* Book Page */}
        <div className="relative bg-[#fffdf9] rounded-xl md:rounded-2xl shadow-2xl overflow-hidden book-shadow flex-1 min-h-0">
          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

          {/* Page Content */}
          <div
            className={`transition-opacity duration-300 h-full flex flex-col ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            {!isLastPage ? (
              <>
                {/* Image Section - Story pages only */}
                <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
                  {currentPageData && (
                    <img
                      src={currentPageData.url}
                      alt={`${creation.title} - Page ${currentPage + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Subtle vignette effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
                </div>

                {/* Text Section - Story pages only */}
                <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                  {/* Story Text */}
                  <div className="max-w-lg mx-auto text-center">
                    <div className="text-soft-gold/60 text-xl md:text-2xl font-serif mb-1">"</div>
                    <p className="text-sm md:text-base lg:text-lg font-serif italic text-gunmetal leading-relaxed">
                      {currentPageData?.text}
                    </p>
                    <div className="text-soft-gold/60 text-xl md:text-2xl font-serif mt-1 rotate-180">"</div>
                  </div>

                  {/* Page Counter */}
                  <div className="mt-4 text-center">
                    <span className="inline-block px-3 py-1.5 bg-silver/20 text-blue-slate rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              </>
            ) : (
                /* CTA Page - Last Page - Side by side layout */
                <div className="flex flex-col md:flex-row h-full">
                  {/* Left side - Image */}
                  <div className="md:w-1/2 flex-shrink-0">
                    <div className="relative h-48 md:h-full overflow-hidden">
                      {currentPageData && (
                        <img
                          src={currentPageData.url}
                          alt={`${creation.title} - Page ${currentPage + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none hidden md:block"></div>
                    </div>
                  </div>

                  {/* Right side - CTA Content */}
                  <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-center items-center text-center bg-[#fffdf9]">
                    <h3 className="text-base md:text-lg font-black text-gunmetal mb-2">
                      Every drawing has a story waiting to be told
                    </h3>

                    <p className="text-xs md:text-sm text-blue-slate mb-4 max-w-xs">
                      Turn any artwork into a 12-page illustrated storybook. It's free to start!
                    </p>

                    <button
                      onClick={handleStartCreating}
                      className="px-5 py-2.5 bg-gradient-to-r from-pacific-cyan to-soft-gold text-white rounded-full font-black text-xs md:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pacific-cyan/30 group"
                    >
                      <span className="flex items-center gap-1.5">
                        Start With Your Drawing
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>

                    {/* Page Counter */}
                    <div className="mt-4">
                      <span className="inline-block px-2.5 py-1 bg-silver/20 text-blue-slate rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {/* Previous Button */}
        <button
          onClick={goToPrevPage}
          disabled={isFirstPage || isTransitioning}
          className={`absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 -translate-x-full md:-translate-x-1/2 w-10 h-10 md:w-11 md:h-11 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-silver/30 z-[110] ${
            isFirstPage
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 hover:scale-110 active:scale-90'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          onClick={goToNextPage}
          disabled={isLastPage || isTransitioning}
          className={`absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 translate-x-full md:translate-x-1/2 w-10 h-10 md:w-11 md:h-11 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-lg border-2 border-silver/30 z-[110] ${
            isLastPage
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 hover:scale-110 active:scale-90'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  ? 'w-6 bg-pacific-cyan shadow-[0_0_10px_rgba(98,146,158,0.7)]'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Custom styles for book shadow */}
      <style>{`
        .book-shadow {
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default TeaserModal;
