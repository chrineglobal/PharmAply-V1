import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, updatePassword, auth, supabase } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { PharmAplyLogo } from '../../components/common/PharmAplyLogo';

export function ForgetPassword() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
      setIsSent(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    
    setLoading(true);
    try {
      await updatePassword(auth, newPassword);
      toast.success('Password updated successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#E7F1F1] dark:bg-[#062625] flex flex-col h-full scrollbar-hide">
      <div className="bg-[#0E7673] px-6 pt-12 pb-5 shadow-sm z-10 flex items-center justify-between text-white">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/15 rounded-full transition">
            <ArrowLeft size={24} />
         </button>
         <PharmAplyLogo variant="horizontal" tone="white" size="sm" />
         <div className="w-8"></div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col items-center justify-center">
         <div className="w-full max-w-sm bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0A3D3B] dark:text-white text-center mb-2">
               {isRecovery ? 'Set New Password' : t('forget_your_password', 'Forget Your Password')}
            </h1>
            <p className="text-[#0E7673] dark:text-[#CFE4E3] text-center text-sm mb-8 leading-relaxed">
              {isRecovery 
                ? "Enter your new password below."
                : isSent 
                  ? "Check your email inbox for instructions to reset your password." 
                  : "Please write your email to receive a confirmation link to set a new password."}
            </p>

            {isRecovery ? (
               <form onSubmit={handleUpdatePassword} className="w-full">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    required
                    minLength={6}
                    className="w-full p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl mb-6 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white placeholder:text-[#6EADAB] focus:outline-none focus:ring-2 focus:ring-[#0E7673]"
                  />
                  
                  <button 
                    type="submit" 
                    disabled={loading || !newPassword}
                    className="w-full bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full py-4 font-bold text-base transition disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
               </form>
            ) : !isSent ? (
               <form onSubmit={handleReset} className="w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('enter_your_email', 'Enter your email')}
                    required
                    className="w-full p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl mb-6 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white placeholder:text-[#6EADAB] focus:outline-none focus:ring-2 focus:ring-[#0E7673]"
                  />
                  
                  <button 
                    type="submit" 
                    disabled={loading || !email}
                    className="w-full bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full py-4 font-bold text-base transition disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Sending...' : 'Send Link'}
                  </button>
               </form>
            ) : (
               <div className="flex flex-col items-center gap-4">
                  <button onClick={() => navigate('/')} className="w-full bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full py-4 font-bold text-base transition shadow-sm">
                     {t('return_to_login', 'Return to Login')} </button>
                  <p className="text-sm text-[#0A3D3B] dark:text-[#CFE4E3]">
                      {t('didn_t_get_the_email', 'Didn\'t get the email?')} <button onClick={handleReset} className="text-[#0E7673] dark:text-[#38B794] font-bold hover:underline"> {t('resend_it', 'Resend it.')} </button>
                  </p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
