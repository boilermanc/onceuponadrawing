
import React from 'react';
import { InfoPageType } from './InfoPages';

interface FooterProps {
  onNavigate: (type: InfoPageType) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-off-white border-t border-silver mt-auto py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h3 className="text-lg font-black text-gunmetal mb-1">
            Once Upon<span className="text-pacific-cyan"> a Drawing</span>
          </h3>
          <p className="text-xs text-blue-slate font-bold uppercase tracking-[0.2em]">
            Every scribble has a story
          </p>
          <p className="mt-6 text-[10px] text-silver font-black uppercase tracking-widest">
            Built by Sweetwater Technologies
          </p>
        </div>

        {/* Links Section */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
          <button onClick={() => onNavigate('about')} className="text-xs font-black text-blue-slate hover:text-pacific-cyan transition-colors uppercase tracking-widest">About Us</button>
          <button onClick={() => onNavigate('contact')} className="text-xs font-black text-blue-slate hover:text-pacific-cyan transition-colors uppercase tracking-widest">Contact Us</button>
          <button onClick={() => onNavigate('terms')} className="text-xs font-black text-blue-slate hover:text-pacific-cyan transition-colors uppercase tracking-widest">Terms of Service</button>
          <button onClick={() => onNavigate('privacy')} className="text-xs font-black text-blue-slate hover:text-pacific-cyan transition-colors uppercase tracking-widest">Privacy Policy</button>
        </div>

        {/* Copyright Section */}
        <div className="text-center md:text-right">
          <p className="text-[10px] text-silver font-bold uppercase tracking-widest">
            &copy; {currentYear} Once Upon a Drawing. <br className="hidden md:block"/>
            All Rights Reserved.
          </p>
          <div className="flex gap-4 mt-4 justify-center md:justify-end opacity-40">
            <span className="text-xl">🎨</span>
            <span className="text-xl">📖</span>
            <span className="text-xl">✨</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
