
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import Button from './ui/Button';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ui/Toast';
import InfoPages, { InfoPageType } from './InfoPages';

interface AuthScreenProps {
  onAuthenticated: (user: User, isNewUser: boolean) => void;
  hasResult?: boolean;
  initialIsLogin?: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, hasResult, initialIsLogin = false }) => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInfoPage, setShowInfoPage] = useState<InfoPageType | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    subscribe: true,
    acceptedTerms: false
  });

  useEffect(() => {
    setIsLogin(initialIsLogin);
  }, [initialIsLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      showToast('error', 'Passwords Don\'t Match', 'Please make sure both password fields are identical.');
      return;
    }

    if (!isLogin && !formData.acceptedTerms) {
      showToast('error', 'Terms Required', 'Please accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);
    console.log('[Auth] Starting', isLogin ? 'login' : 'signup');

    try {
      if (isLogin) {
        console.log('[Auth] Signing in with Supabase client...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('Login failed: no user returned');

        console.log('[Auth] Login successful, userId:', data.user.id);
        // Don't fetch profile or set user here - let onAuthStateChange in App.tsx handle it
        // Just signal navigation (isNewUser=false means go to next step)
        onAuthenticated({
          id: data.user.id,
          firstName: (data.user as any)?.user_metadata?.first_name || '',
          lastName: (data.user as any)?.user_metadata?.last_name || '',
          email: data.user.email || formData.email,
          subscribed: false,
          createdAt: (data.user as any)?.created_at || new Date().toISOString()
        }, false);
      } else {
        // Supabase SignUp
        const termsAcceptedAt = new Date().toISOString();
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              terms_accepted_at: termsAcceptedAt,
              terms_version: '2.1'
            }
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed.");

        onAuthenticated({
          id: data.user.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          subscribed: formData.subscribe,
          createdAt: new Date().toISOString()
        }, true);
      }
    } catch (err: any) {
      const errorMessage = err.message || '';

      // Provide user-friendly error messages
      if (errorMessage.includes('Invalid login credentials')) {
        showToast('error', 'Login Failed', 'The email or password you entered is incorrect. Please try again.');
      } else if (errorMessage.includes('Email not confirmed')) {
        showToast('warning', 'Email Not Verified', 'Please check your inbox and click the verification link we sent you.');
      } else if (errorMessage.includes('User already registered')) {
        showToast('info', 'Account Exists', 'This email is already registered. Try logging in instead.');
      } else if (errorMessage.includes('Password should be')) {
        showToast('error', 'Weak Password', 'Password must be at least 6 characters long.');
      } else if (errorMessage.includes('rate limit')) {
        showToast('warning', 'Too Many Attempts', 'Please wait a moment before trying again.');
      } else {
        showToast('error', 'Authentication Error', errorMessage || 'Something went wrong. Please try again.');
      }
      console.error('[Auth] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="max-w-xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[3.5rem] border-4 border-silver p-10 md:p-14 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pacific-cyan via-soft-gold to-pacific-cyan"></div>
        
        <div className="mb-10">
          <div className="text-6xl mb-4 animate-bounce duration-[3000ms]">✨</div>
          <h2 className="text-4xl font-black text-gunmetal tracking-tighter">
            {hasResult && !isLogin ? 'Magic is Ready!' : (isLogin ? 'Welcome Back' : 'Studio Access')}
          </h2>
          <p className="text-blue-slate font-medium mt-2">
            {hasResult && !isLogin
              ? 'Create a free profile to unlock your story and save it to your library.' 
              : (isLogin ? 'Enter your credentials to access the studio.' : 'Create your artist profile to start the magic.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">First Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="w-full p-4 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all"
                  placeholder="Walt"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">Last Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="w-full p-4 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all"
                  placeholder="Disney"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">Studio Email</label>
            <input 
              required
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-4 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all"
              placeholder="artist@sweetwater.tech"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? 'text' : 'password'} 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full p-4 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-silver hover:text-pacific-cyan transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">Confirm Password</label>
              <input 
                required
                type={showPassword ? 'text' : 'password'} 
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className={`w-full p-4 bg-off-white border-2 rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300' : 'border-silver'}`}
                placeholder="••••••••"
              />
            </div>
          )}

          {!isLogin && (
            <label className="flex items-center gap-4 p-4 bg-off-white rounded-2xl border-2 border-dashed border-silver cursor-pointer group hover:bg-pacific-cyan/5 transition-colors">
              <input
                type="checkbox"
                checked={formData.subscribe}
                onChange={e => setFormData({...formData, subscribe: e.target.checked})}
                className="w-6 h-6 rounded-lg border-2 border-silver text-pacific-cyan focus:ring-pacific-cyan accent-pacific-cyan"
              />
              <div className="flex-1 text-left">
                <p className="text-xs font-black text-gunmetal uppercase tracking-tight">Join the Studio</p>
                <p className="text-[10px] text-blue-slate font-medium">Get exclusive story tips from Once Upon a Drawing</p>
              </div>
            </label>
          )}

          {!isLogin && (
            <label className={`flex items-start gap-4 p-4 bg-off-white rounded-2xl border-2 cursor-pointer group hover:bg-pacific-cyan/5 transition-colors ${!formData.acceptedTerms ? 'border-soft-gold' : 'border-silver'}`}>
              <input
                type="checkbox"
                checked={formData.acceptedTerms}
                onChange={e => setFormData({...formData, acceptedTerms: e.target.checked})}
                className="w-6 h-6 rounded-lg border-2 border-silver text-pacific-cyan focus:ring-pacific-cyan accent-pacific-cyan mt-0.5"
              />
              <div className="flex-1 text-left">
                <p className="text-xs font-black text-gunmetal uppercase tracking-tight">I Accept the Terms <span className="text-soft-gold">*</span></p>
                <p className="text-[10px] text-blue-slate font-medium">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowInfoPage('terms'); }}
                    className="text-pacific-cyan font-black hover:underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowInfoPage('privacy'); }}
                    className="text-pacific-cyan font-black hover:underline"
                  >
                    Privacy Policy
                  </button>
                  , including the content guidelines prohibiting inappropriate uploads.
                </p>
              </div>
            </label>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full py-6" size="xl">
            {isLogin ? 'ENTER STUDIO' : (hasResult ? 'REVEAL MY STORY' : 'CREATE PROFILE')}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t-2 border-dashed border-silver text-center">
          <p className="text-xs text-blue-slate font-bold">
            {isLogin ? "New to the Studio?" : "Already an Artist?"}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setShowPassword(false);
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
              }}
              className="ml-2 text-pacific-cyan font-black hover:underline uppercase tracking-widest text-[10px]"
            >
              {isLogin ? "Apply for access" : "Login here"}
            </button>
          </p>
        </div>
      </div>
      <p className="mt-8 text-center text-[10px] text-silver font-black uppercase tracking-[0.4em]">
        Verified by Sweetwater Security Protocol
      </p>

      {showInfoPage && (
        <InfoPages type={showInfoPage} onClose={() => setShowInfoPage(null)} />
      )}
    </div>
  );
};

export default AuthScreen;
