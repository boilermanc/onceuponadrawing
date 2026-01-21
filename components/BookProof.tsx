
import React, { useState } from 'react';
import { DrawingAnalysis } from '../types';
import Button from './ui/Button';

interface BookProofProps {
  analysis: DrawingAnalysis;
  originalImage: string;
  heroImage: string;
  onUpdate: (updates: Partial<DrawingAnalysis>) => void;
  onApprove: () => void;
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
  
  // 1 spread for Intro, 1 for Title/Dedication, 12 for Story, 1 for End/Hero, 1 for About/Colophon, 2 for Sketch/Endpapers
  const totalSpreads = 18; 

  const handleNext = () => setSpreadIndex(prev => Math.min(prev + 1, totalSpreads - 1));
  const handlePrev = () => setSpreadIndex(prev => Math.max(prev - 1, 0));

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
      // Spread 0: Half-title | Original Art
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

    if (index === 1) {
      // Spread 1: Title Page | Dedication
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
            <div className="w-full max-w-sm">
              <p className="text-[10px] font-black text-silver uppercase tracking-[0.3em] mb-8">Personal Dedication</p>
              <textarea 
                className="w-full text-center italic font-serif text-xl text-gunmetal focus:ring-4 focus:ring-pacific-cyan/10 rounded-3xl p-6 resize-none h-56 bg-white/50 border-2 border-silver/20 shadow-inner outline-none transition-all"
                value={analysis.dedication || ''}
                placeholder="Write your dedication here..."
                onChange={e => onUpdate({ dedication: e.target.value })}
              />
              <p className="mt-4 text-[9px] text-silver font-bold italic">Character limit: Heartfelt</p>
            </div>
          </TextPage>
        </div>
      );
    }

    if (index >= 2 && index <= 13) {
      // Spreads 2-13: Story Segments (Image Left | Text Right)
      const storyIdx = index - 2;
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

    if (index === 14) {
      // Spread 14: "The End" | Hero Image
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

    if (index === 15) {
      // Spread 15: About Artist | Colophon
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
                  onClick={() => setSpreadIndex(i)}
                  className={`h-2 transition-all rounded-full ${i === spreadIndex ? 'bg-pacific-cyan w-10 shadow-[0_0_10px_rgba(98,146,158,0.5)]' : 'bg-silver/40 w-2 hover:bg-silver'}`} 
                />
            ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 mt-8 w-full max-w-md">
        <Button variant="outline" onClick={onBack} className="flex-1">← Re-Select Edition</Button>
        <Button onClick={onApprove} size="lg" className="flex-[2] py-6 shadow-2xl">
          Everything Looks Perfect! ✨
        </Button>
      </div>

      <p className="mt-12 text-[10px] text-silver font-black uppercase tracking-[0.5em] animate-pulse">
        Secure Printing Protocol Active
      </p>
    </div>
  );
};

export default BookProof;
