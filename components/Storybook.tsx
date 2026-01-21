
import React, { useState, useEffect, useCallback } from 'react';
import { DrawingAnalysis } from '../types';

interface StorybookProps {
  analysis: DrawingAnalysis;
  videoUrl: string;
  onClose: () => void;
  onOrder: () => void;
  onSave: () => Promise<void>;
  savesUsed: number;
  limit: number;
  isSaving: boolean;
  isAlreadySaved?: boolean;
}

const SFX = {
  PAGE_FLIP: 'https://assets.mixkit.co/sfx/preview/mixkit-paper-slide-1530.mp3',
  BOOK_CLOSE: 'https://assets.mixkit.co/sfx/preview/mixkit-closing-a-book-1064.mp3',
  MAGIC_OPEN: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkle-whoosh-2350.mp3',
  CLICK: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3',
  CHEER: 'https://assets.mixkit.co/sfx/preview/mixkit-small-group-cheer-and-applause-518.mp3'
};

const Storybook: React.FC<StorybookProps> = ({
  analysis,
  videoUrl,
  onClose,
  onOrder,
  onSave,
  savesUsed,
  limit,
  isSaving,
  isAlreadySaved
}) => {
  const [currentPage, setCurrentPage] = useState(0); 
  const [isTurning, setIsTurning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const playSound = useCallback((url: string, volume: number = 0.5) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.debug('Audio playback blocked until interaction:', e));
  }, []);

  useEffect(() => {
    playSound(SFX.MAGIC_OPEN, 0.4);
  }, [playSound]);

  const totalSpreads = analysis.pages.length + 2;

  const handleNext = () => {
    if (currentPage < totalSpreads - 1 && !isTurning) {
      playSound(SFX.PAGE_FLIP, 0.6);
      setDirection('next');
      setIsTurning(true);
      if (currentPage === totalSpreads - 2) {
        setTimeout(() => playSound(SFX.CHEER, 0.4), 400);
      }
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsTurning(false);
      }, 600);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0 && !isTurning) {
      playSound(SFX.PAGE_FLIP, 0.6);
      setDirection('prev');
      setIsTurning(true);
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsTurning(false);
      }, 600);
    }
  };

  const handleClose = () => {
    playSound(SFX.BOOK_CLOSE, 0.7);
    setTimeout(onClose, 200);
  };

  const handleIndicatorClick = (idx: number) => {
    if (!isTurning && idx !== currentPage) {
      playSound(SFX.CLICK, 0.3);
      setCurrentPage(idx);
    }
  };

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${analysis.storyTitle.replace(/\s+/g, '-').toLowerCase()}-movie.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-700">
      {/* Immersive Background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gunmetal via-blue-slate to-gunmetal"></div>
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-pacific-cyan/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-soft-gold/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* Close Button - Fixed position */}
      <button
        onClick={handleClose}
        className="fixed top-4 right-4 md:top-6 md:right-6 w-12 h-12 md:w-14 md:h-14 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-xl border-2 border-silver/30 hover:scale-110 active:scale-90 z-[120] group"
      >
        <svg className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative w-full h-full max-w-[95vw] max-h-[80vh] md:max-w-[1200px] lg:max-w-[1400px] md:max-h-[800px] perspective-2000 flex items-center justify-center">
        {/* Book Container */}
        <div className={`relative w-full h-full bg-white rounded-[1.5rem] md:rounded-[2.5rem] book-shadow overflow-hidden flex flex-col md:flex-row preserve-3d transition-transform duration-700 ${isTurning ? 'scale-[0.98]' : 'scale-100'}`}>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200/50 z-50 hidden md:block"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-12 -ml-6 spine-shadow z-40 hidden md:block"></div>

          {/* LEFT PAGE: Illustration */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden bg-slate-100 page-gradient">
            <div key={`left-${currentPage}`} className="w-full h-full animate-in fade-in zoom-in-105 duration-1000">
              {currentPage === 0 || currentPage === totalSpreads - 1 ? (
                <video 
                  src={videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full">
                  {analysis.pages[currentPage - 1].imageUrl ? (
                    <img 
                      src={analysis.pages[currentPage - 1].imageUrl} 
                      className="w-full h-full object-cover shadow-inner"
                      alt="Story illustration"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-400 gap-4">
                      <div className="w-12 h-12 border-4 border-pacific-cyan border-t-transparent animate-spin rounded-full"></div>
                      <p className="font-black uppercase tracking-widest text-xs text-pacific-cyan">Generating Magic...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/5 to-transparent pointer-events-none"></div>
          </div>

          {/* RIGHT PAGE: Content */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden bg-[#fffdf9] p-8 sm:p-12 md:p-16 lg:p-24 flex flex-col justify-center items-center text-center">
             <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
             <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/5 to-transparent pointer-events-none"></div>

             <div key={`right-${currentPage}`} className="z-10 w-full animate-in fade-in slide-in-from-right-8 duration-700 px-4 md:px-0">
                {currentPage === 0 ? (
                  <div className="space-y-4 md:space-y-6">
                    <div className="inline-block px-4 py-1 bg-silver text-pacific-cyan rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-2">
                      A Special Edition
                    </div>
                    <h1 className="text-3xl md:text-6xl lg:text-7xl font-black text-gunmetal leading-tight tracking-tight">
                      {analysis.storyTitle}
                    </h1>
                    <div className="h-1.5 w-20 md:w-24 bg-pacific-cyan mx-auto rounded-full"></div>
                    <div className="space-y-2 pt-4">
                      <p className="text-lg md:text-2xl text-blue-slate font-bold italic">
                        Starring the amazing <span className="text-gunmetal not-italic font-black border-b-4 border-soft-gold">{analysis.subject}</span>
                      </p>
                      {analysis.artistName && (
                        <div className="mt-4 md:mt-8 p-4 md:p-6 border-2 border-silver rounded-3xl bg-silver/20 backdrop-blur-sm">
                          <p className="text-[10px] font-black text-blue-slate uppercase tracking-[0.3em] mb-1">Original Artwork By</p>
                          <p className="text-xl md:text-4xl font-black text-gunmetal">{analysis.artistName}</p>
                          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] md:text-sm font-black text-blue-slate uppercase tracking-widest">
                            {analysis.age && <span>Age {analysis.age}</span>}
                            {analysis.grade && (
                              <><span className="w-1 h-1 bg-silver rounded-full"></span><span>Grade {analysis.grade}</span></>
                            )}
                            {analysis.year && (
                              <><span className="w-1 h-1 bg-silver rounded-full"></span><span>{analysis.year}</span></>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : currentPage === totalSpreads - 1 ? (
                  <div className="space-y-4 md:space-y-6">
                    <div className="inline-block px-4 py-1.5 md:px-6 md:py-2 bg-pacific-cyan/20 text-pacific-cyan rounded-full text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-2">
                      The End 📜
                    </div>
                    <h2 className="text-2xl md:text-5xl lg:text-6xl font-black text-gunmetal leading-tight mb-4">A Legacy Created.</h2>

                    <div className="flex flex-col gap-4 pt-4 w-full max-w-sm mx-auto">
                       {/* Save to Gallery Section */}
                       <div className="flex flex-col items-center">
                         {isAlreadySaved ? (
                           <div className="flex items-center gap-2 px-4 py-2 bg-pacific-cyan/10 text-pacific-cyan rounded-full text-sm font-bold">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                             Saved to Gallery
                           </div>
                         ) : (
                           <button
                             onClick={onSave}
                             disabled={isSaving}
                             className={`flex flex-col items-center justify-center gap-1 w-full py-5 rounded-3xl font-black transition-all ${
                               savesUsed >= limit && limit !== Infinity
                                 ? 'bg-silver/30 text-blue-slate border-2 border-silver/50'
                                 : 'bg-gradient-to-r from-pacific-cyan to-soft-gold text-white shadow-xl shadow-pacific-cyan/20 hover:scale-105 active:scale-95'
                             }`}
                           >
                             {isSaving ? (
                               <>
                                 <div className="w-6 h-6 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
                                 <span className="text-lg">SAVING...</span>
                               </>
                             ) : (
                               <>
                                 <div className="flex items-center gap-2">
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                   </svg>
                                   <span className="text-lg">SAVE TO GALLERY</span>
                                   {limit === Infinity && (
                                     <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] uppercase tracking-wider">Premium</span>
                                   )}
                                 </div>
                                 <span className={`text-[10px] uppercase tracking-widest font-black ${
                                   savesUsed >= limit && limit !== Infinity ? 'text-blue-slate' : 'opacity-70'
                                 }`}>
                                   {limit === Infinity
                                     ? 'Unlimited saves'
                                     : savesUsed >= limit
                                       ? 'Upgrade for unlimited saves'
                                       : `${limit - savesUsed} free save${limit - savesUsed !== 1 ? 's' : ''} remaining`
                                   }
                                 </span>
                               </>
                             )}
                           </button>
                         )}
                       </div>

                       {/* Divider */}
                       <div className="flex items-center gap-3 py-2">
                         <div className="flex-1 h-px bg-silver/50"></div>
                         <span className="text-[10px] text-silver font-black uppercase tracking-widest">Or Order</span>
                         <div className="flex-1 h-px bg-silver/50"></div>
                       </div>

                       {/* Order Buttons */}
                       <button
                         onClick={onOrder}
                         className="flex flex-col items-center justify-center gap-1 w-full py-6 bg-pacific-cyan text-white rounded-3xl font-black shadow-xl shadow-pacific-cyan/30 hover:scale-105 active:scale-95 transition-all group"
                       >
                         <span className="text-2xl">📖</span>
                         <span className="text-lg">ORDER HARDCOVER</span>
                         <span className="text-[10px] opacity-70 uppercase tracking-widest font-black">Limited Studio Printing</span>
                       </button>

                       <button
                         onClick={onOrder}
                         className="flex flex-col items-center justify-center gap-1 w-full py-5 bg-white border-4 border-silver text-gunmetal rounded-3xl font-black hover:bg-off-white active:scale-95 transition-all"
                       >
                         <span className="text-2xl">📱</span>
                         <span className="text-lg uppercase">CREATE EBOOK</span>
                         <span className="text-[10px] text-blue-slate opacity-70 uppercase tracking-widest font-black">Instant Digital Download</span>
                       </button>

                       <button
                         onClick={handleSave}
                         className="py-2 text-silver hover:text-blue-slate transition-colors text-[10px] font-black uppercase tracking-[0.4em]"
                       >
                         💾 SAVE MOVIE FILE
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-8">
                    <div className="text-silver text-4xl md:text-6xl font-serif">“</div>
                    <p className="text-lg md:text-3xl lg:text-4xl font-bold text-gunmetal leading-[1.3] font-serif italic px-2">
                      {analysis.pages[currentPage - 1].text}
                    </p>
                    <div className="text-silver text-4xl md:text-6xl font-serif rotate-180">“</div>
                    <div className="pt-4 md:pt-8">
                       <span className="px-4 py-1.5 md:px-6 md:py-2 bg-silver/30 text-blue-slate rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                         Page {currentPage} of {analysis.pages.length}
                       </span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Animation Overlay for Page Turn */}
          {isTurning && (
            <div className={`absolute top-0 bottom-0 w-1/2 z-[60] preserve-3d ${direction === 'next' ? 'right-0 origin-left' : 'left-0 origin-right'}`}
                 style={{ animation: `${direction === 'next' ? 'pageTurnRight' : 'pageTurnLeft'} 0.6s ease-in-out forwards` }}>
              <div className="absolute inset-0 bg-white shadow-2xl backface-hidden page-gradient border-l border-slate-100"></div>
              <div className="absolute inset-0 bg-white shadow-2xl backface-hidden page-gradient border-r border-slate-100" style={{ transform: 'rotateY(180deg)' }}></div>
            </div>
          )}
        </div>

        {/* Navigation Buttons - Fixed position relative to viewport */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 0 || isTurning}
          className={`fixed left-4 md:left-8 top-1/2 -translate-y-1/2 w-14 h-14 md:w-16 md:h-16 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-xl border-2 border-silver/30 active:scale-90 z-[120] ${currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'}`}
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalSpreads - 1 || isTurning}
          className={`fixed right-4 md:right-8 top-1/2 -translate-y-1/2 w-14 h-14 md:w-16 md:h-16 bg-white/90 hover:bg-white text-gunmetal rounded-full flex items-center justify-center transition-all shadow-xl border-2 border-silver/30 active:scale-90 z-[120] ${currentPage === totalSpreads - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'}`}
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress Footer */}
      <div className="mt-8 flex flex-col items-center gap-4 z-20">
        <div className="flex items-center gap-2 md:gap-3">
          {Array.from({ length: totalSpreads }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleIndicatorClick(idx)}
              className={`h-1.5 transition-all rounded-full ${
                currentPage === idx 
                ? 'w-8 md:w-10 bg-pacific-cyan shadow-[0_0_15px_rgba(98,146,158,0.8)]' 
                : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
             <div 
               className="h-full bg-pacific-cyan transition-all duration-500" 
               style={{ width: `${((currentPage) / (totalSpreads - 1)) * 100}%` }}
             ></div>
          </div>
          <p className="text-white/40 font-black uppercase tracking-widest text-[8px] md:text-[10px]">
            {currentPage === 0 ? 'START' : currentPage === totalSpreads - 1 ? 'THE END' : `PAGE ${currentPage}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Storybook;
