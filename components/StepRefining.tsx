
import React, { useState } from 'react';
import { DrawingAnalysis } from '../types';

interface StepRefiningProps {
  analysis: DrawingAnalysis;
  originalImage: string | null;
  onConfirm: (refined: DrawingAnalysis) => void;
}

const StepRefining: React.FC<StepRefiningProps> = ({ analysis, originalImage, onConfirm }) => {
  const [refined, setRefined] = useState<DrawingAnalysis>({ ...analysis });

  const handleChange = (field: keyof DrawingAnalysis, value: string) => {
    setRefined(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="py-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        {/* Left Column: Artist Details & Subject */}
        <div className="space-y-8 order-2 md:order-1">
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 bg-silver text-pacific-cyan rounded-full text-xs font-black uppercase tracking-widest">
              Almost there 📖
            </div>
            <h2 className="text-4xl font-black text-gunmetal tracking-tighter">What's the Story?</h2>
            <p className="text-blue-slate font-medium text-lg leading-relaxed">
              We've identified the key elements of the artwork. Refine these details to make the memory perfect.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Artist Metadata Section */}
            <div className="p-8 bg-silver/30 rounded-[2.5rem] border-4 border-silver space-y-6 shadow-sm">
              <p className="text-[10px] font-black text-blue-slate uppercase tracking-[0.3em] mb-2">About the Artist</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-xs font-black text-blue-slate mb-2 block uppercase tracking-widest">Art By:</label>
                  <input 
                    type="text" 
                    value={refined.artistName}
                    onChange={(e) => handleChange('artistName', e.target.value)}
                    className="w-full p-4 bg-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal shadow-inner"
                    placeholder="Artist's Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-blue-slate mb-2 block uppercase tracking-widest">Age:</label>
                  <input 
                    type="text" 
                    value={refined.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    className="w-full p-4 bg-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal shadow-inner"
                    placeholder="e.g. 7"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-blue-slate mb-2 block uppercase tracking-widest">Grade:</label>
                  <input 
                    type="text" 
                    value={refined.grade}
                    onChange={(e) => handleChange('grade', e.target.value)}
                    className="w-full p-4 bg-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal shadow-inner"
                    placeholder="e.g. 2nd"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black text-blue-slate mb-2 block uppercase tracking-widest">Year Produced:</label>
                  <input 
                    type="text" 
                    value={refined.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    className="w-full p-4 bg-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal shadow-inner"
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>
              </div>
            </div>

            <div className="group p-8 bg-white border-4 border-silver rounded-[2.5rem] shadow-sm">
              <label className="flex items-center gap-3 text-sm font-black text-blue-slate mb-4 uppercase tracking-widest">
                <span className="text-2xl">👤</span> Who is the main character?
              </label>
              <input 
                type="text" 
                value={refined.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className="w-full p-5 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal text-lg"
                placeholder="e.g. A happy dinosaur"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Original Art & Action/Environment */}
        <div className="flex flex-col space-y-8 order-1 md:order-2">
          <div className="text-center md:text-left">
            <h3 className="text-sm font-black text-blue-slate uppercase tracking-[0.4em] mb-4">The Masterpiece</h3>
            <div className="relative group w-full mb-8">
              <div className="absolute -inset-4 bg-pacific-cyan/10 rounded-[3.5rem] blur-2xl group-hover:blur-3xl transition-all"></div>
              <img 
                src={originalImage || ''} 
                alt="Original" 
                className="relative w-full aspect-square object-contain bg-white rounded-[3rem] border-8 border-white p-6 shadow-2xl"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="group p-8 bg-white border-4 border-silver rounded-[2.5rem] shadow-sm">
              <label className="flex items-center gap-3 text-sm font-black text-blue-slate mb-4 uppercase tracking-widest">
                <span className="text-2xl">🕺</span> What are they doing?
              </label>
              <textarea 
                rows={3}
                value={refined.suggestedAction}
                onChange={(e) => handleChange('suggestedAction', e.target.value)}
                className="w-full p-5 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal text-lg resize-none shadow-inner"
                placeholder="e.g. Dancing in the rain"
              />
            </div>

            <div className="group p-8 bg-white border-4 border-silver rounded-[2.5rem] shadow-sm">
              <label className="flex items-center gap-3 text-sm font-black text-blue-slate mb-4 uppercase tracking-widest">
                <span className="text-2xl">🌍</span> Where are they?
              </label>
              <textarea 
                rows={4}
                value={refined.environment}
                onChange={(e) => handleChange('environment', e.target.value)}
                className="w-full p-5 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none transition-all font-bold text-gunmetal text-lg resize-none shadow-inner"
                placeholder="e.g. A candy land with chocolate rivers and marshmallow clouds"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-8">
        <button 
          onClick={() => onConfirm(refined)}
          className="w-full py-8 bg-pacific-cyan text-white rounded-[3rem] font-black text-3xl hover:scale-105 transition-all shadow-2xl shadow-pacific-cyan/40 border-b-[12px] border-blue-slate flex items-center justify-center gap-4 group"
        >
          START THE MOVIE! 🎬
          <span className="text-4xl group-hover:rotate-12 transition-transform">✨</span>
        </button>
        <p className="text-center text-[10px] text-silver font-black uppercase tracking-[0.5em] mt-8">
          The Studio is ready for your direction
        </p>
      </div>
    </div>
  );
};

export default StepRefining;
