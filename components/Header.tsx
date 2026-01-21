
import React from 'react';
import { User } from '../types';
import { CreditBalance } from '../services/creditsService';

interface HeaderProps {
  onLogoClick: () => void;
  user: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onMyCreations?: () => void;
  creditBalance?: CreditBalance | null;
  onGetCredits?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onLogoClick,
  user,
  onLogout,
  onLoginClick,
  onProfileClick,
  onMyCreations,
  creditBalance,
  onGetCredits,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-off-white/80 backdrop-blur-md border-b border-silver px-6 py-4 flex items-center justify-between">
      <div 
        onClick={onLogoClick}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="w-10 h-10 bg-pacific-cyan rounded-full flex items-center justify-center text-white shadow-lg shadow-pacific-cyan/30 group-hover:rotate-12 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gunmetal">
          Once Upon<span className="text-pacific-cyan"> a Drawing</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Pricing Link - Always visible */}
        {onGetCredits && (
          <button
            onClick={onGetCredits}
            className="text-sm font-semibold text-gunmetal/70 hover:text-pacific-cyan transition-colors hidden sm:block"
          >
            Pricing
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2 md:gap-4">
            {/* Credit Balance Display */}
            {onGetCredits && creditBalance !== undefined && (
              creditBalance && creditBalance.totalAvailable > 0 ? (
                <button
                  onClick={onGetCredits}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-gunmetal text-sm transition-all active:scale-95"
                  title="View credits"
                >
                  <span>🎨</span>
                  <span className="font-semibold">{creditBalance.totalAvailable} credit{creditBalance.totalAvailable !== 1 ? 's' : ''}</span>
                </button>
              ) : (
                <button
                  onClick={onGetCredits}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-soft-gold hover:bg-soft-gold/80 text-gunmetal text-sm font-bold transition-all active:scale-95 shadow-sm"
                  title="Get credits"
                >
                  <span>⭐</span>
                  <span>Get Credits</span>
                </button>
              )
            )}

            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-silver uppercase tracking-widest">Master Artist</p>
              <p className="text-sm font-black text-gunmetal">{user.firstName}</p>
            </div>

            <div className="flex items-center gap-2">
              {onMyCreations && (
                <button
                  onClick={onMyCreations}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pacific-cyan/10 hover:bg-pacific-cyan/20 text-pacific-cyan border border-pacific-cyan/30 transition-all active:scale-95"
                  title="My Creations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden md:inline text-sm font-bold">My Creations</span>
                </button>
              )}

              <button
                onClick={onProfileClick}
                className="w-10 h-10 rounded-full bg-white border-2 border-silver flex items-center justify-center text-gunmetal hover:border-pacific-cyan hover:text-pacific-cyan transition-all shadow-sm active:scale-95"
                title="Artist Profile"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-full border-2 border-silver flex items-center justify-center text-gunmetal hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={onLoginClick}
            className="px-4 py-1.5 border-2 border-silver hover:border-pacific-cyan hover:text-pacific-cyan text-blue-slate rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hidden sm:block"
          >
            Returning Artist? <span className="underline ml-1">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
