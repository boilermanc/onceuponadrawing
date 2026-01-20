
import React, { useState } from 'react';
import { User } from '../types';
import Button from './ui/Button';
import { updateProfile } from '../services/supabaseService';

interface ProfilePageProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onBack: () => void;
  onLogout: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdate, onBack, onLogout }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    subscribed: user.subscribed
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfile(user.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        subscribed: formData.subscribed
      });
      
      const updatedUser: User = {
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
        subscribed: formData.subscribed
      };
      
      onUpdate(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save changes. The ink is dry, please try again!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[3.5rem] border-4 border-silver p-10 md:p-14 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pacific-cyan via-soft-gold to-pacific-cyan"></div>
        
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-pacific-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-pacific-cyan/20">
            <span className="text-5xl">👤</span>
          </div>
          <h2 className="text-4xl font-black text-gunmetal tracking-tighter">Artist Profile</h2>
          <p className="text-blue-slate font-medium mt-2">Manage your studio identity and preferences.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">First Name</label>
              <input 
                required
                type="text" 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full p-4 bg-off-white border-2 border-silver rounded-2xl focus:border-pacific-cyan outline-none font-bold text-gunmetal transition-all"
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-slate uppercase tracking-widest ml-1">Studio Email</label>
            <input 
              readOnly
              type="email" 
              value={formData.email}
              className="w-full p-4 bg-off-white border-2 border-silver/30 rounded-2xl outline-none font-bold text-silver cursor-not-allowed"
            />
          </div>

          <label className="flex items-center gap-4 p-4 bg-off-white rounded-2xl border-2 border-dashed border-silver cursor-pointer group hover:bg-pacific-cyan/5 transition-colors">
            <input 
              type="checkbox" 
              checked={formData.subscribed}
              onChange={e => setFormData({...formData, subscribed: e.target.checked})}
              className="w-6 h-6 rounded-lg border-2 border-silver text-pacific-cyan focus:ring-pacific-cyan accent-pacific-cyan"
            />
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-gunmetal uppercase tracking-tight">Join the Studio</p>
              <p className="text-[10px] text-blue-slate font-medium">Get exclusive story tips from Once Upon a Drawing</p>
            </div>
          </label>

          <div className="pt-4 flex flex-col gap-3">
            <Button type="submit" isLoading={isSaving} size="lg" className="w-full">
              {saveSuccess ? 'CHANGES SAVED! ✨' : 'SAVE ARTIST PROFILE'}
            </Button>
            <button onClick={onBack} type="button" className="w-full py-4 text-xs font-black text-blue-slate uppercase tracking-widest hover:text-gunmetal transition-colors">
              ← Back to Studio
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t-2 border-dashed border-silver flex flex-col items-center gap-4">
           <button onClick={onLogout} className="px-6 py-3 border-2 border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
             🚪 Close Studio Session
           </button>
           <p className="text-[10px] text-silver font-medium">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <p className="mt-8 text-center text-[10px] text-silver font-black uppercase tracking-[0.4em]">
        Verified by Sweetwater Security Protocol
      </p>
    </div>
  );
};

export default ProfilePage;
