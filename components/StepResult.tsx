import React from 'react';
import { DrawingAnalysis } from '../types';

interface StepResultProps {
  videoUrl: string;
  onReset: () => void;
  analysis: DrawingAnalysis | null;
  onOpenStory: () => void;
  onOrder: () => void;
  isStoryLoading: boolean;
}

const StepResult: React.FC<StepResultProps> = ({ videoUrl, onReset, analysis, onOpenStory, onOrder, isStoryLoading }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-1000 overflow-hidden">
      {/* Immersive Background Blur */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <video 
          src={videoUrl} 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover blur-3xl scale-110"
        />
      </div>

      {/* Floating Success Badge */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center w-full px-6">
        <div className="inline-block px-6 py-2 bg-pacific-cyan/20 backdrop-blur-xl text-pacific-cyan rounded-full text-xs font-black uppercase tracking-[0.3em] mb-4 border border-pacific-cyan/30 shadow-[0_0_30px_rgba(98,146,158,0.3)] animate-pulse">
          Your story is ready ✨
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-2xl">
          {analysis?.storyTitle || "Your Art in Motion"}
        </h2>
      </div>

      {/* Cinematic Video Container */}
      <div className="relative z-10 w-full max-w-[95vw] md:max-w-[1200px] h-auto aspect-video rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[6px] md:border-[12px] border-white/10 group transition-transform duration-700 hover:scale-[1.01]">
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          loop 
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Action Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-6 flex flex-col items-center gap-4">
        <button 
          onClick={onOpenStory}
          disabled={isStoryLoading}
          className={`w-full py-6 bg-pacific-cyan text-white rounded-[2.5rem] font-black text-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-pacific-cyan/30 border-b-8 border-blue-slate flex items-center justify-center gap-4 group ${isStoryLoading ? 'opacity-70 grayscale cursor-wait' : ''}`}
        >
          {isStoryLoading ? (
            <>
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>PREPARING BOOK...</span>
            </>
          ) : (
            <>
              <span className="text-3xl group-hover:rotate-12 transition-transform">📖</span>
              <span>OPEN STORYBOOK</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="px-8 py-3 bg-silver/10 hover:bg-silver/20 text-white/60 rounded-xl font-black text-sm uppercase tracking-wide transition-all active:scale-95"
        >
          🔄 NEW DRAWING
        </button>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
        Once Upon a Drawing Studio
      </p>
    </div>
  );
};

export default StepResult;
