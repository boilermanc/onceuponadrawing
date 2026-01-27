
import React, { useState, useCallback } from 'react';
import { DrawingAnalysis } from '../types';
import { useToast } from './ui/Toast';
import Button from './ui/Button';

interface CoverColor {
  id: string;
  name: string;
  hex: string;
}

const COVER_COLORS: CoverColor[] = [
  { id: 'soft-blue', name: 'Soft Blue', hex: '#E0F2FE' },
  { id: 'cream', name: 'Cream', hex: '#FEF9E7' },
  { id: 'sage', name: 'Sage', hex: '#D5E8D4' },
  { id: 'blush', name: 'Blush', hex: '#FCE4EC' },
  { id: 'lavender', name: 'Lavender', hex: '#E8DEF8' },
  { id: 'buttercup', name: 'Buttercup', hex: '#FFF9C4' },
  { id: 'black', name: 'Black', hex: '#1A1A1A' },
  { id: 'navy', name: 'Navy', hex: '#1B2A4A' },
];

interface TextColor {
  id: string;
  name: string;
  hex: string;
}

const TEXT_COLORS: TextColor[] = [
  { id: 'gunmetal', name: 'Dark', hex: '#2D3A3A' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'navy', name: 'Navy', hex: '#1B2A4A' },
  { id: 'burgundy', name: 'Burgundy', hex: '#6B2737' },
  { id: 'forest', name: 'Forest', hex: '#2D4A3E' },
  { id: 'gold', name: 'Gold', hex: '#C5A55A' },
];

interface BookProofProps {
  analysis: DrawingAnalysis;
  originalImage: string;
  heroImage: string;
  onUpdate: (updates: Partial<DrawingAnalysis>) => void;
  onApprove: (coverColorId: string, textColorId: string) => void;
  onBack: () => void;
}

const BookProof: React.FC<BookProofProps> = ({
  analysis,
  originalImage,
  heroImage,
  onUpdate,
  onApprove,
  onBack
}) => {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [visitedSpreads, setVisitedSpreads] = useState<Set<number>>(new Set([0]));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedCoverColor, setSelectedCoverColor] = useState<string>('soft-blue');
  const [selectedTextColor, setSelectedTextColor] = useState<string>('gunmetal');
  const { showToast } = useToast();

  // 1 spread for Cover Preview, 1 for Intro, 1 for Title/Dedication, 12 for Story, 1 for End/Hero, 1 for About/Colophon, 2 for Sketch/Endpapers
  const totalSpreads = 19;
  const allSpreadsViewed = visitedSpreads.size >= totalSpreads;

  const navigateTo = useCallback((index: number) => {
    setSpreadIndex(index);
    setVisitedSpreads(prev => new Set(prev).add(index));
  }, []);

  const handleNext = () => navigateTo(Math.min(spreadIndex + 1, totalSpreads - 1));
  const handlePrev = () => navigateTo(Math.max(spreadIndex - 1, 0));

  const handleApproveClick = () => {
    if (!allSpreadsViewed) {
      const remaining = totalSpreads - visitedSpreads.size;
      showToast('warning', 'Review All Pages First', `Please view all spreads before approving. ${remaining} spread${remaining === 1 ? '' : 's'} remaining.`);
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmApprove = () => {
    setShowConfirmation(false);
    onApprove(selectedCoverColor, selectedTextColor);
  };

  const PageNumber = ({ num, side }: { num: number, side: 'left' | 'right' }) => (
    <div className={`absolute bottom-6 ${side === 'left' ? 'left-8' : 'right-8'} text-[10px] font-black text-silver/60 uppercase tracking-[0.3em] z-20`}>
      PAGE {num}
    </div>
  );

  const renderSpread = (index: number) => {
    const pageL = index * 2 + 1;
    const pageR = index * 2 + 2;

    // Common Text Page Styling
    // Fix: Made children optional to avoid TypeScript error where nested JSX content is not correctly mapped to a required prop in local function components
    const TextPage = ({ children, side }: { children?: React.ReactNode, side: 'left' | 'right' }) => (
      <div className={`w-1/2 h-full bg-[#fffdf9] relative p-12 md:p-16 flex flex-col items-center justify-center text-center overflow-hidden ${side === 'left' ? 'border-r' : ''}`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]"></div>
        <div className={`absolute inset-y-0 ${side === 'left' ? 'right-0 w-24 bg-gradient-to-l' : 'left-0 w-24 bg-gradient-to-r'} from-black/5 to-transparent pointer-events-none`}></div>
        {children}
        <PageNumber num={side === 'left' ? pageL : pageR} side={side} />
      </div>
    );

    // Common Image Page Styling
    const ImagePage = ({ src, side, label }: { src: string, side: 'left' | 'right', label?: string }) => (
      <div className={`w-1/2 h-full bg-slate-100 relative overflow-hidden group ${side === 'left' ? 'border-r' : ''}`}>
        <img src={src} className="w-full h-full object-cover" alt="Page visual" />
        <div className={`absolute inset-y-0 ${side === 'left' ? 'right-0 w-24 bg-gradient-to-l' : 'left-0 w-24 bg-gradient-to-r'} from-black/10 to-transparent pointer-events-none z-10`}></div>
        {label && (
           <div className="absolute top-6 left-6 z-20 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest">
             {label}
           </div>
        )}
        <PageNumber num={side === 'left' ? pageL : pageR} side={side} />
      </div>
    );

    if (index === 0) {
      // Spread 0: Cover Preview (Back Cover | Front Cover)
      const coverBg = COVER_COLORS.find(c => c.id === selectedCoverColor)?.hex || '#E0F2FE';
      const textHex = TEXT_COLORS.find(c => c.id === selectedTextColor)?.hex || '#2D3A3A';
      return (
        <div className="flex flex-col w-full h-full">
          {/* Title and color pickers above the spread */}
          <div className="mb-6 text-center space-y-4">
            <h3 className="text-xl font-black text-gunmetal uppercase tracking-[0.3em]">Customize Your Cover</h3>
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <div className="text-center">
                <p className="text-[9px] font-black text-gunmetal/70 uppercase tracking-[0.3em] mb-2">Cover Color</p>
                <div className="flex gap-2">
                  {COVER_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedCoverColor(color.id)}
                      className={`w-8 h-8 rounded-full border-3 transition-all hover:scale-110 ${selectedCoverColor === color.id ? 'border-pacific-cyan scale-110 shadow-lg' : 'border-white shadow-md'} ${color.id === 'black' || color.id === 'navy' ? 'ring-1 ring-silver/20' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-silver/30"></div>
              <div className="text-center">
                <p className="text-[9px] font-black text-gunmetal/70 uppercase tracking-[0.3em] mb-2">Text Color</p>
                <div className="flex gap-2">
                  {TEXT_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedTextColor(color.id)}
                      className={`w-8 h-8 rounded-full border-3 transition-all hover:scale-110 ${selectedTextColor === color.id ? 'border-pacific-cyan scale-110 shadow-lg' : 'border-white shadow-md'} ${color.id === 'white' || color.id === 'gold' ? 'ring-1 ring-silver/30' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-1 w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
            {/* Back Cover */}
            <div className="w-1/2 h-full relative flex flex-col items-center justify-center text-center p-8 border-r" style={{ backgroundColor: coverBg }}>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40" style={{ color: textHex }}>Once Upon a Drawing</p>
                <div className="w-10 h-0.5 mx-auto rounded-full opacity-20" style={{ backgroundColor: textHex }}></div>
                <p className="text-[9px] font-bold italic opacity-30" style={{ color: textHex }}>Where every child is an author</p>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-20" style={{ color: textHex }}>Back Cover</p>
              </div>
            </div>
            {/* Front Cover */}
            <div className="w-1/2 h-full relative flex flex-col items-center justify-center text-center p-8" style={{ backgroundColor: coverBg }}>
              <div className="space-y-4">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-balance" style={{ color: textHex }}>{analysis.storyTitle}</h3>
                <div className="h-1 w-16 mx-auto rounded-full" style={{ backgroundColor: textHex, opacity: 0.3 }}></div>
                <p className="text-lg font-serif italic" style={{ color: textHex, opacity: 0.8 }}>by {analysis.artistName}</p>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-20" style={{ color: textHex }}>Front Cover</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (index === 1) {
      // Spread 1: Half-title | Original Art
      return (
        <div className="flex h-full w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white perspective-2000 preserve-3d">
          <TextPage side="left">
            <div className="space-y-4">
              <div className="w-12 h-1 bg-pacific-cyan/30 mx-auto rounded-full mb-8"></div>
              <h4 className="text-2xl md:text-3xl font-serif italic text-gunmetal/60">{analysis.storyTitle}</h4>
            </div>
          </TextPage>
          <ImagePage src={originalImage} side="right" label="Original Artwork" />
        </div>
      );
    }

    if (index === 2) {
      // Spread 2: Title Page | Dedication
      return (
        <div className="flex h-full w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
          <TextPage side="left">
            <div className="space-y-6">
              <h4 className="text-4xl md:text-5xl font-black text-gunmetal tracking-tighter leading-tight">{analysis.storyTitle}</h4>
              <div className="h-1.5 w-20 bg-pacific-cyan mx-auto rounded-full"></div>
              <p className="text-lg font-serif italic text-blue-slate">Featuring {analysis.subject}</p>
              <div className="pt-8 space-y-1">
                <p className="text-[10px] font-black text-silver uppercase tracking-widest">A Masterpiece By</p>
                <p className="text-2xl font-black text-gunmetal uppercase">{analysis.artistName}</p>
              </div>
            </div>
          </TextPage>
          <TextPage side="right">
            <div className="w-full max-w-sm space-y-6">
              <p className="text-[10px] font-black text-silver uppercase tracking-[0.3em]">Personal Dedication</p>
              <div className="w-full h-56 rounded-3xl border-2 border-dashed border-silver/30 bg-white/30 flex flex-col items-center justify-center p-6">
                <span className="text-4xl mb-4 opacity-40">✍️</span>
                <p className="text-sm font-bold text-silver/60 text-center">Your dedication will appear here</p>
                <p className="text-[10px] text-silver/40 mt-2 text-center">You'll add this during the order process</p>
              </div>
            </div>
          </TextPage>
        </div>
      );
    }

    if (index >= 3 && index <= 14) {
      // Spreads 3-14: Story Segments (Image Left | Text Right)
      const storyIdx = index - 3;
      const page = analysis.pages[storyIdx];
      return (
        <div className="flex h-full w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
          <ImagePage src={page?.imageUrl || originalImage} side="left" />
          <TextPage side="right">
            <div className="space-y-10 px-6">
              <div className="text-silver text-6xl font-serif opacity-30 select-none">“</div>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gunmetal leading-[1.4] font-serif italic">
                {page?.text || "Generating magic words..."}
              </p>
              <div className="text-silver text-6xl font-serif rotate-180 opacity-30 select-none">“</div>
            </div>
          </TextPage>
        </div>
      );
    }

    if (index === 15) {
      // Spread 15: "The End" | Hero Image
      return (
        <div className="flex h-full w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
          <TextPage side="left">
             <div className="relative">
                <div className="absolute -top-20 -left-10 text-9xl font-serif italic text-silver/10 select-none">Finis</div>
                <h4 className="text-6xl md:text-8xl font-serif italic text-silver/40">The End</h4>
             </div>
          </TextPage>
          <ImagePage src={heroImage} side="right" label="Studio Render" />
        </div>
      );
    }

    if (index === 16) {
      // Spread 16: About Artist | Colophon
      return (
        <div className="flex h-full w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
          <TextPage side="left">
            <div className="space-y-8 w-full max-w-xs">
              <h5 className="text-3xl font-black text-gunmetal tracking-tight mb-2 uppercase">About the Artist</h5>
              <div className="w-16 h-1.5 bg-soft-gold mx-auto rounded-full"></div>
              <div className="space-y-6 pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-silver uppercase tracking-widest text-left ml-1">Artist Name</p>
                  <input 
                    className="w-full text-left text-xl font-black border-b-2 border-silver/50 focus:border-pacific-cyan outline-none bg-transparent py-2 transition-colors"
                    value={analysis.artistName}
                    onChange={e => onUpdate({ artistName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-silver uppercase tracking-widest text-left ml-1">Age</p>
                    <input className="w-full text-left text-lg font-black border-b-2 border-silver/50 focus:border-pacific-cyan outline-none bg-transparent py-2" placeholder="e.g. 7" value={analysis.age} onChange={e => onUpdate({ age: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-silver uppercase tracking-widest text-left ml-1">Year</p>
                    <input className="w-full text-left text-lg font-black border-b-2 border-silver/50 focus:border-pacific-cyan outline-none bg-transparent py-2" placeholder="2024" value={analysis.year} onChange={e => onUpdate({ year: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          </TextPage>
          <TextPage side="right">
            <div className="flex flex-col items-center justify-center p-12 text-center text-[10px] text-silver font-bold space-y-4 uppercase tracking-[0.3em]">
              <div className="w-12 h-12 bg-silver/10 rounded-full flex items-center justify-center text-xl mb-4">✨</div>
              <p>Colophon</p>
              <div className="h-px w-8 bg-silver/20"></div>
              <p>This volume was brought to life at</p>
              <p className="font-black text-gunmetal tracking-[0.1em]">Once Upon a Drawing Studio</p>
              <p>Using Generative Alchemy & Pure Heart</p>
              <p className="pt-8 opacity-40">Sweetwater Technologies • Edition 1.0</p>
            </div>
          </TextPage>
        </div>
      );
    }

    // Default for Sketch Pages & Endpapers (16-17)
    return (
      <div className="flex h-full w-full bg-[#f9f9f9] shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
        <div className="w-1/2 border-r relative p-12 flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]"></div>
           <div className="w-full h-full border-4 border-dashed border-silver/30 rounded-[3rem] flex items-center justify-center">
              <p className="text-silver font-black uppercase tracking-[0.4em] text-[10px] -rotate-12 select-none">Sketch Next Adventure</p>
           </div>
           <PageNumber num={pageL} side="left" />
        </div>
        <div className="w-1/2 relative p-12 flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]"></div>
           <div className="w-full h-full border-4 border-dashed border-silver/30 rounded-[3rem] flex items-center justify-center">
              <p className="text-silver font-black uppercase tracking-[0.4em] text-[10px] rotate-12 select-none">Your Story Continues...</p>
           </div>
           <PageNumber num={pageR} side="right" />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 flex flex-col items-center min-h-[85vh] animate-in fade-in zoom-in-95 duration-700">
      <div className="mb-12 text-center">
        <div className="inline-block px-4 py-1.5 bg-soft-gold/10 text-soft-gold rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4 border border-soft-gold/20">
          Studio Preview • {totalSpreads * 2} Pages
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gunmetal tracking-tighter">The Archival Proof</h2>
        <p className="text-blue-slate font-medium text-lg mt-2 italic font-serif opacity-70">"Flick through the spreads to verify the alchemy."</p>
      </div>

      <div className="w-full max-w-[1100px] aspect-[16/10] relative mb-16 px-4 md:px-0">
        <div className="absolute -inset-10 bg-black/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        
        {renderSpread(spreadIndex)}
        
        {/* Spine Detail */}
        <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-black/5 via-transparent to-black/5 pointer-events-none z-30 hidden md:block"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-silver/20 z-30 hidden md:block"></div>

        <button 
          onClick={handlePrev} 
          disabled={spreadIndex === 0}
          className="absolute left-[-1.5rem] md:left-[-3rem] top-1/2 -translate-y-1/2 w-14 h-14 md:w-20 md:h-20 bg-white shadow-3xl rounded-full flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-0 transition-all z-40 text-gunmetal border-4 border-silver/20"
        >
          <span className="text-2xl">◀</span>
        </button>
        <button 
          onClick={handleNext} 
          disabled={spreadIndex === totalSpreads - 1}
          className="absolute right-[-1.5rem] md:right-[-3rem] top-1/2 -translate-y-1/2 w-14 h-14 md:w-20 md:h-20 bg-white shadow-3xl rounded-full flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-0 transition-all z-40 text-gunmetal border-4 border-silver/20"
        >
          <span className="text-2xl">▶</span>
        </button>

        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
            {Array.from({ length: totalSpreads }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => navigateTo(i)}
                  className={`h-2 transition-all rounded-full ${i === spreadIndex ? 'bg-pacific-cyan w-10 shadow-[0_0_10px_rgba(98,146,158,0.5)]' : 'bg-silver/40 w-2 hover:bg-silver'}`} 
                />
            ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-8 mb-4 text-center">
        <p className="text-xs font-bold text-silver uppercase tracking-widest">
          {allSpreadsViewed
            ? 'All spreads reviewed'
            : `${visitedSpreads.size} of ${totalSpreads} spreads reviewed`}
        </p>
        <div className="w-full max-w-md mx-auto mt-2 h-1.5 bg-silver/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-pacific-cyan rounded-full transition-all duration-500"
            style={{ width: `${(visitedSpreads.size / totalSpreads) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 mt-4 w-full max-w-md">
        <Button variant="outline" onClick={onBack} className="flex-1">← Re-Select Edition</Button>
        <Button
          onClick={handleApproveClick}
          size="lg"
          className={`flex-[2] py-6 shadow-2xl transition-opacity ${!allSpreadsViewed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {allSpreadsViewed ? 'Approve for Printing' : `Review All Spreads (${visitedSpreads.size}/${totalSpreads})`}
        </Button>
      </div>

      <p className="mt-12 text-[10px] text-silver font-black uppercase tracking-[0.5em] animate-pulse">
        Secure Printing Protocol Active
      </p>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-soft-gold/10 rounded-full flex items-center justify-center text-3xl mx-auto">
                📖
              </div>
              <h3 className="text-2xl font-black text-gunmetal tracking-tight">Approve This Book?</h3>
              <p className="text-blue-slate text-sm leading-relaxed">
                By approving, you confirm that you have reviewed all {totalSpreads * 2} pages and are satisfied with the content, images, and text. This is what will be sent to the printer.
              </p>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  Go Back
                </Button>
                <Button onClick={handleConfirmApprove} size="lg" className="flex-[2]">
                  Yes, Approve for Printing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookProof;
