import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, CreditCard, Heart, Settings, Shield, LogOut, FileText, Bell, Globe, Camera, Loader2, Clock, ChevronRight, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage, db } from "../../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from '../../lib/firebase';
import { updateProfile } from '../../lib/firebase';
import { doc, updateDoc, signOut } from '../../lib/firebase';
import { useDarkMode } from "../../components/DarkModeProvider";
import { updateUserProfileAndCascade } from '../../lib/userSync';
import toast from 'react-hot-toast';

export function PatientProfile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');

  const handleUpdateName = async () => {
     if(auth.currentUser && displayName.trim() !== '') {
        try {
           setUploading(true);
           await updateUserProfileAndCascade(auth.currentUser.uid, {
             displayName: displayName.trim(),
             name: displayName.trim(),
             fullName: displayName.trim()
           });
           setIsEditing(false);
           toast.success(t('profile_updated', 'Profil mis à jour avec succès'));
        } catch(e) {
           console.error(e);
           toast.error(t('profile_update_error', 'Erreur lors de la mise à jour'));
        } finally {
           setUploading(false);
        }
     }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.currentUser) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        const fileRef = ref(storage, `profiles/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = await uploadBytesResumable(fileRef, file);
        const url = await getDownloadURL(uploadTask.ref);
        
        await updateUserProfileAndCascade(auth.currentUser.uid, {
          photoURL: url,
          photoUrl: url
        });
        toast.success(t('photo_updated', 'Photo de profil mise à jour'));
      } catch (err: any) {
        console.error("Profile upload error", err);
        alert(err.message || t('profile_upload_failed', 'Failed to upload profile picture.'));
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden transition-colors duration-200">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#0E7673] text-white shadow-sm z-10 transition-colors duration-200">
         <h1 className="font-bold text-white text-xl">{t('profile', 'Profile')}</h1>
         <button onClick={() => navigate('/patient/settings')} className="text-white/80 hover:text-white transition p-2 rounded-full hover:bg-white/15">
            <Settings size={20} />
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         {/* Profile Card */}
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex gap-4 items-center transition-colors">
             <div className="relative">
                 <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#062625] rounded-full overflow-hidden border border-[#CFE4E3] dark:border-[#145250]">
                    {auth.currentUser?.photoURL ? (
                       <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794]">
                          <User size={32} />
                       </div>
                    )}
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={uploading}
                   className="absolute bottom-0 right-0 w-6 h-6 bg-[#0E7673] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm disabled:opacity-50 hover:bg-[#0A5A58] transition"
                 >
                   {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
             </div>
             <div className="flex-1 flex justify-between items-start">
               <div>
                  {isEditing ? (
                     <div className="flex items-center gap-2 mb-1">
                        <input 
                           type="text" 
                           value={displayName} 
                           onChange={e => setDisplayName(e.target.value)}
                           className="bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white rounded-lg px-2 py-1 text-sm font-bold w-full max-w-[150px] outline-none border border-[#CFE4E3] dark:border-[#145250] focus:border-[#0E7673]"
                           autoFocus
                        />
                        <button onClick={handleUpdateName} disabled={uploading} className="bg-[#0E7673] text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-[#0A5A58]">Save</button>
                        <button onClick={() => { setIsEditing(false); setDisplayName(auth.currentUser?.displayName || ''); }} className="bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-[#D7F1EA]">Cancel</button>
                     </div>
                  ) : (
                     <div className="flex items-center gap-2">
                        <h2 className="font-bold text-[#0A3D3B] dark:text-white text-lg">{auth.currentUser?.displayName || t('user', 'User')}</h2>
                        <button onClick={() => setIsEditing(true)} className="text-[#5C807F] hover:text-[#0E7673] transition p-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                     </div>
                  )}
                  <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7]">{auth.currentUser?.email}</p>
               </div>
             </div>
         </div>

         {/* Menu List */}
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm relative overflow-hidden transition-colors">
             
             <button onClick={() => navigate('/patient/profile/details')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center">
                       <User size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">Profile & Credentials</span>
                 </div>
                 <span className="text-[#5C807F] dark:text-[#9FC8C7] font-bold text-xs"><ChevronRight size={16} /></span>
             </button>

             <div className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#9FC8C7] flex items-center justify-center">
                       <Globe size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('language', 'Language')}</span>
                 </div>
                 <select 
                    value={i18n.language} 
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white text-sm font-bold rounded-lg px-3 py-1 outline-none border border-[#CFE4E3] dark:border-[#145250]"
                 >
                    <option value="en"> {t('english', 'English')} </option>
                    <option value="fr"> {t('fran_ais', 'Français')} </option>
                    <option value="ar">العربية</option>
                 </select>
             </div>

             <button onClick={() => navigate('/patient/payment-methods')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center">
                       <CreditCard size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('payment_methods', 'Payment Methods')}</span>
                 </div>
                 <span className="text-[#5C807F] dark:text-[#9FC8C7] font-bold text-xs"><ChevronRight size={16} /></span>
             </button>
             
             <button onClick={() => navigate('/patient/prescriptions')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center">
                       <FileText size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('my_prescriptions', 'My Prescriptions')}</span>
                 </div>
                 <span className="text-[#5C807F] dark:text-[#9FC8C7] font-bold text-xs"><ChevronRight size={16} /></span>
             </button>

             <button onClick={() => navigate('/patient/calendar')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                       <Clock size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('medication_reminders', 'Medication Reminders')}</span>
                 </div>
                 <span className="text-[#5C807F] dark:text-[#9FC8C7] font-bold text-xs"><ChevronRight size={16} /></span>
             </button>
             
             <button onClick={() => navigate('/patient/wishlist')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                       <Heart size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('wishlist', 'Wishlist & Saved')}</span>
                 </div>
                 <span className="text-[#5C807F] dark:text-[#9FC8C7] font-bold text-xs"><ChevronRight size={16} /></span>
             </button>

             <button onClick={() => navigate('/patient/notifications')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center">
                       <Bell size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('notifications', 'Notifications')}</span>
                 </div>
                 <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
             </button>

             <button onClick={() => navigate('/patient/privacy')} className="w-full p-4 flex items-center justify-between border-b border-[#E7F1F1] dark:border-[#145250] active:bg-[#F5FAFA] dark:active:bg-[#0E4A47]">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#38B794] flex items-center justify-center">
                       <Shield size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('privacy_security', 'Privacy & Security')}</span>
                 </div>
             </button>

             <div className="w-full p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] flex items-center justify-center">
                       <Moon size={16} />
                    </div>
                    <span className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('dark_mode', 'Dark Mode')}</span>
                 </div>
                 <div className="flex items-center">
                   <button 
                     onClick={toggleDarkMode}
                     className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-[#38B794]' : 'bg-[#CFE4E3]'}`}
                   >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                   </button>
                 </div>
             </div>
         </div>

         {/* Logout */}
         <div className="pt-4">
            <button 
              onClick={handleLogout}
              className="w-full bg-white dark:bg-[#0A3D3B] border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition"
            >
               <LogOut size={20} /> {t('logout', 'Log Out')}
            </button>
         </div>
         
         <div className="h-24"></div>
      </div>
    </div>
  );
}
