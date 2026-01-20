
import React from 'react';
import Button from './ui/Button';

interface StepAuthSuccessProps {
  firstName: string;
  onContinue: () => void;
}

const StepAuthSuccess: React.FC<StepAuthSuccessProps> = ({ firstName, onContinue }) => {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-1000">
      <div className="mb-12">
        <div className="w-40 h-40 bg-soft-gold/10 text-soft-gold rounded-[3.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-soft-gold/20 animate-bounce duration-[4000ms]">
          <span className="text-7xl">🎨</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-gunmetal tracking-tighter mb-4 leading-none">
          Welcome to the <br/><span className="text-pacific-cyan">Studio, {firstName}!</span>
        </h2>
        <div className="h-2 w-32 bg-soft-gold mx-auto mb-8 rounded-full"></div>
        <p className="text-xl md:text-2xl text-blue-slate font-medium italic font-serif max-w-lg mx-auto leading-relaxed">
          "Your profile is now live in our studio. Thank you for joining our mission to make childhood memories immortal."
        </p>
      </div>

      <div className="p-8 bg-white border-4 border-silver rounded-[3rem] shadow-xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl font-black">ARTIST</div>
        <div className="flex flex-col items-center gap-4">
           <div className="flex gap-2">
              <span className="text-2xl">✨</span>
              <span className="text-2xl">✨</span>
              <span className="text-2xl">✨</span>
           </div>
           <p className="text-xs font-black text-blue-slate uppercase tracking-[0.3em]">Credentials Verified • Studio Access Granted</p>
        </div>
      </div>

      <Button size="xl" onClick={onContinue} className="w-full sm:w-auto shadow-2xl">
         CONTINUE TO MY CREATION 🚀
      </Button>

      <p className="mt-12 text-silver text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
        Sweetwater Technologies • Artist Onboarding Complete
      </p>
    </div>
  );
};

export default StepAuthSuccess;
