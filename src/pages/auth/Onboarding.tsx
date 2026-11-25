import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../../lib/firebase';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from '../../lib/firebase';
import { useTranslation } from "react-i18next";
import { useAuth } from "../../components/AuthProvider";
import toast from 'react-hot-toast';

const ONBOARDING_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1000",
    titleKey: "title_1",
    subtitleKey: "subtitle_1",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1000",
    titleKey: "title_2",
    subtitleKey: "subtitle_2",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1000",
    titleKey: "title_3",
    subtitleKey: "subtitle_3",
  }
];

import { sendEmail } from '../../lib/email';
import { DarkModeToggle } from "../../components/DarkModeToggle";
import { PharmAplyLogo } from "../../components/common/PharmAplyLogo";

export function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, role, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'admin') navigate("/admin");
      else if (role === 'pharmacy') navigate("/pharmacist");
      else if (role === 'driver') navigate("/delivery");
      else if (role === 'patient') navigate("/patient");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (step === 0 && !authLoading && (!user || !role)) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, authLoading, user, role]);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleSkip = () => {
    setStep(5);
  };

  const handleRoleSelection = (role: string) => {
    setSelectedRole(role);
    setStep(6);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup' && selectedRole === 'pharmacy') {
       navigate("/pharmacist-registration");
       return;
    }
    if (authMode === 'signup' && selectedRole === 'driver') {
       navigate("/driver-registration");
       return;
    }
    
    setLoading(true);
    setErrorText("");

    try {
      let result;
      let finalRole = selectedRole;

      if (authMode === 'signup') {
        result = await createUserWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, 'users', result.user.uid);
        
        const userData: any = {
          email: result.user.email,
          name: name || result.user.email?.split('@')[0],
          role: selectedRole,
          createdAt: serverTimestamp(),
        };

        if (selectedRole === 'driver') {
          userData.status = 'pending_verification';
        }

        await setDoc(userDocRef, userData);
        
        // Send Welcome email
        await sendEmail({
          to: result.user.email,
          subject: "Bienvenue sur PharmAply !",
          html: `<h1>Bienvenue ${name || 'Client'} sur PharmAply !</h1><p>Trouvez, commandez et recevez vos médicaments en toute simplicité auprès des pharmacies partenaires.</p>`
        });
        
        // Create in-app Welcome notification
        try {
          // Import conditionally or require collection, addDoc
          await addDoc(collection(db, 'notifications'), {
             userId: result.user.uid,
             type: 'welcome',
             title: 'Bienvenue sur PharmAply !',
             message: 'Trouvez Commandez Recevez vos médicaments en quelques clics.',
             isRead: false,
             createdAt: serverTimestamp()
          });
        } catch(e) {
          console.warn("Could not send welcome notification", e);
        }
        
        toast.success("Successfully signed up!");
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
           toast.error("Account data not found.");
           setErrorText("Account data not found.");
           setLoading(false);
           return;
         }
         const dbRole = userDoc.data()?.role;
         finalRole = result.user.email === 'admin@pharmaply.com' ? 'admin' : dbRole;
         if (selectedRole && finalRole !== selectedRole && finalRole !== 'admin') {
            toast.error("Invalid role for this account.");
            setErrorText("Invalid role for this account.");
            setLoading(false);
            return;
         }
         toast.success("Successfully logged in!");
      }

      if (finalRole === 'admin') navigate("/admin");
      else if (finalRole === 'pharmacy') navigate("/pharmacist");
      else if (finalRole === 'driver') navigate("/delivery");
      else navigate("/patient");

    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || "Authentication failed";
      if (error.code === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
         errMsg = "This email is already registered. Please log in instead.";
      } else if (error.code === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) {
         errMsg = "Network error. This can happen if third-party cookies are blocked by your browser (e.g. Incognito or Safari). Please open the app in a new tab using the top-right button.";
      }
      toast.error(errMsg);
      setErrorText(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const activeSlide = step > 1 && step < 5 ? step - 2 : 0;

  return (
    <div className="flex-1 relative bg-[#0E7673] dark:bg-[#062625] overflow-hidden flex flex-col h-full"> 
       {/* Dark Mode Toggle in Onboarding */}
       <div className="absolute top-4 right-4 z-50">
          <DarkModeToggle className="shadow-sm border border-[#CFE4E3]/40 dark:border-[#0E7673]/50" />
       </div>

       <AnimatePresence>
         {/* Splash Screen (Blanc sur teal officiel #0E7673 - Charte p.1 & p.4) */}
         {step === 0 && (
            <motion.div 
               key="splash"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E7673] z-50 text-white px-6"
            >
               <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45 }}
               >
                  <PharmAplyLogo variant="vertical" tone="white" showTagline size={175} />
               </motion.div>
            </motion.div>
         )}

         {/* Language Selection Screen */}
         {step === 1 && (
            <motion.div 
               key="lang-select"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#062625] z-40 p-6"
            >
               <div className="mb-8">
                  <PharmAplyLogo variant="vertical" tone="color" showTagline size={150} />
               </div>
               
               <h2 className="text-2xl font-bold text-[#0E7673] dark:text-[#E7F1F1] mb-2 text-center">{t('choose_language')}</h2>
               <p className="text-[#0A3D3B]/75 dark:text-[#CFE4E3] text-sm mb-8 text-center max-w-xs leading-relaxed"> {t('select_your_preferred_language', 'Choisissez votre langue pour commencer.')} </p>
               
               <div className="w-full max-w-sm space-y-3.5">
                  <button
                     onClick={() => { i18n.changeLanguage('en'); setStep(2); }}
                     className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[#CFE4E3] dark:border-[#0E7673]/60 transition-all duration-200 bg-white dark:bg-[#0A3D3B] hover:border-[#0E7673] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30"
                  >
                     <div className="flex items-center gap-4">
                        <span className="text-2xl">🇺🇸</span>
                        <span className="font-bold text-[#0A3D3B] dark:text-white text-base"> {t('english', 'English')} </span>
                     </div>
                     <div className="w-5 h-5 rounded-full border-2 border-[#9FC8C7]"></div>
                  </button>
                  
                  <button
                     onClick={() => { i18n.changeLanguage('fr'); setStep(2); }}
                     className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[#CFE4E3] dark:border-[#0E7673]/60 transition-all duration-200 bg-white dark:bg-[#0A3D3B] hover:border-[#0E7673] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30"
                  >
                     <div className="flex items-center gap-4">
                        <span className="text-2xl">🇫🇷</span>
                        <span className="font-bold text-[#0A3D3B] dark:text-white text-base"> {t('fran_ais', 'Français')} </span>
                     </div>
                     <div className="w-5 h-5 rounded-full border-2 border-[#9FC8C7]"></div>
                  </button>

                  <button
                     onClick={() => { i18n.changeLanguage('ar'); setStep(2); }}
                     className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[#CFE4E3] dark:border-[#0E7673]/60 transition-all duration-200 bg-white dark:bg-[#0A3D3B] hover:border-[#0E7673] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30"
                  >
                     <div className="flex items-center gap-4">
                        <span className="text-2xl">🇦🇪</span>
                        <span className="font-bold text-[#0A3D3B] dark:text-white text-base">العربية</span>
                     </div>
                     <div className="w-5 h-5 rounded-full border-2 border-[#9FC8C7]"></div>
                  </button>
               </div>
            </motion.div>
         )}

         {/* Carousel / Role Selection Background Image */}
         {(step >= 2) && (
            <motion.div 
               key={`slide-bg-${activeSlide}`}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.5 }}
               className="absolute inset-0 bg-[#0E7673] z-0"
            >
               {step < 5 && (
                 <>
                   <img 
                     src={ONBOARDING_SLIDES[activeSlide].image} 
                     alt="Onboarding Background" 
                     className="w-full h-full object-cover opacity-50"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#062625] via-[#0A3D3B]/60 to-[#0E7673]/30"></div>
                 </>
               )}
            </motion.div>
         )}
         
         {/* Carousel Content */}
         {(step >= 2 && step < 5) && (
            <motion.div 
               key={`slide-content-${activeSlide}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="absolute inset-0 z-10 flex flex-col justify-end p-8 pb-12"
            >
               <h2 className="text-4xl font-bold text-white mb-4 whitespace-pre-line leading-tight">
                  {t(ONBOARDING_SLIDES[activeSlide].titleKey)}
               </h2>
               <p className="text-white/80 text-lg mb-12 max-w-[280px]">
                  {t(ONBOARDING_SLIDES[activeSlide].subtitleKey)}
               </p>

               <div className="flex items-center justify-between w-full">
                  <button onClick={handleSkip} className="text-white/80 font-medium px-2 py-2">
                     {t('skip')}
                  </button>
                  
                  <div className="flex bg-white/20 rounded-full p-1 backdrop-blur-md">
                     <button onClick={handleNext} className="w-14 h-14 bg-white text-[#0A3D3B] rounded-full flex items-center justify-center hover:bg-[#D7F1EA] transition shadow-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="m9 18 6-6-6-6"/>
                        </svg>
                     </button>
                  </div>
                  
                  <div className="flex gap-2 items-center px-4">
                     {ONBOARDING_SLIDES.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'w-6 bg-[#38B794]' : 'w-2 bg-white/40'}`}></div>
                     ))}
                  </div>
               </div>
            </motion.div>
         )}

         {/* Role Selection Screen */}
         {step === 5 && (
            <>
               <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="absolute top-[10%] left-0 right-0 flex flex-col items-center justify-center z-10 text-white px-6"
               >
                  <PharmAplyLogo variant="vertical" tone="white" showTagline size={150} />
               </motion.div>

               <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0A3D3B] rounded-t-[2.5rem] p-8 pt-9 pb-14 z-20 shadow-[0_-20px_50px_rgba(10,61,59,0.22)]"
               >
                  {errorText && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl text-center">
                      {errorText}
                    </div>
                  )}

                  <h3 className="text-center font-bold text-[#0E7673] dark:text-[#88D4BF] mb-6 tracking-wide text-sm">
                    Choisissez votre profil :
                  </h3>
                  
                  <div className="space-y-3.5 px-1">
                     <button
                        onClick={() => handleRoleSelection('patient')}
                        disabled={loading}
                        className="w-full flex items-center justify-center py-4 bg-[#0E7673] text-white rounded-full font-bold hover:bg-[#0A3D3B] transition-all disabled:opacity-70 text-base shadow-sm active:scale-[0.98]"
                     >
                        Patient / Client
                     </button>
                     
                     <button
                        onClick={() => handleRoleSelection('pharmacy')}
                        disabled={loading}
                        className="w-full flex items-center justify-center py-4 bg-[#38B794] text-[#0A3D3B] rounded-full font-bold hover:bg-[#60C5A9] transition-all disabled:opacity-70 text-base shadow-sm active:scale-[0.98]"
                     >
                        Pharmacien
                     </button>

                     <button
                        onClick={() => handleRoleSelection('driver')}
                        disabled={loading}
                        className="w-full flex items-center justify-center py-4 bg-white dark:bg-transparent text-[#0E7673] dark:text-[#E7F1F1] border-2 border-[#0E7673] dark:border-[#38B794] rounded-full font-bold hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30 transition-all disabled:opacity-70 text-base active:scale-[0.98]"
                     >
                        Livreur
                     </button>
                  </div>
               </motion.div>
            </>
         )}

         {/* Email Auth Screen */}
         {step === 6 && (
            <div className="fixed inset-0 bg-white dark:bg-[#062625] z-30 flex flex-col pt-12 overflow-y-auto">
               <div className="flex flex-col items-center justify-center pt-6 pb-6 px-6">
                  <div className="mb-3">
                     <PharmAplyLogo variant="horizontal" tone="color" showTagline size={46} />
                  </div>
                  <h1 className="text-xl font-bold text-[#0E7673] dark:text-[#E7F1F1] mt-2 text-center">
                    {authMode === 'login' ? 'Connexion à votre espace' : 'Créer un compte PharmAply'}
                  </h1>
                  <p className="text-[#0A3D3B]/75 dark:text-[#9FC8C7] text-sm font-medium text-center mt-1">
                    Votre pharmacie, en quelques clics
                  </p>
               </div>

               <div className="px-6 pb-8 flex-1 flex flex-col max-w-md w-full mx-auto">
                  {errorText && (
                    <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl text-center">
                      {errorText}
                    </div>
                  )}

                  <form onSubmit={handleEmailAuth} className="space-y-4 flex-1">
                     {authMode === 'signup' && (
                        <div>
                           <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#CFE4E3] dark:border-[#0E7673] rounded-2xl px-4 py-3.5 bg-[#E7F1F1]/40 dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white text-sm outline-none focus:border-[#0E7673] focus:ring-2 focus:ring-[#0E7673]/20 transition placeholder-[#6EADAB]" placeholder="Nom complet" required />
                        </div>
                     )}
                     <div>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#CFE4E3] dark:border-[#0E7673] rounded-2xl px-4 py-3.5 bg-[#E7F1F1]/40 dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white text-sm outline-none focus:border-[#0E7673] focus:ring-2 focus:ring-[#0E7673]/20 transition placeholder-[#6EADAB]" placeholder="Adresse e-mail" required />
                     </div>
                     <div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-[#CFE4E3] dark:border-[#0E7673] rounded-2xl px-4 py-3.5 bg-[#E7F1F1]/40 dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white text-sm outline-none focus:border-[#0E7673] focus:ring-2 focus:ring-[#0E7673]/20 transition placeholder-[#6EADAB]" placeholder="Mot de passe" required minLength={6} />
                     </div>
                     {authMode === 'signup' && (
                        <div>
                           <input type="password" className="w-full border border-[#CFE4E3] dark:border-[#0E7673] rounded-2xl px-4 py-3.5 bg-[#E7F1F1]/40 dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white text-sm outline-none focus:border-[#0E7673] focus:ring-2 focus:ring-[#0E7673]/20 transition placeholder-[#6EADAB]" placeholder="Confirmer le mot de passe" required minLength={6} />
                        </div>
                     )}
                     
                     {authMode === 'signup' && (
                        <div className="flex items-center gap-2.5 mt-4 text-sm text-[#0A3D3B]/80 dark:text-[#CFE4E3]">
                           <input type="checkbox" required className="rounded border-[#9FC8C7] text-[#0E7673] focus:ring-[#0E7673] w-4 h-4" />
                           <label>J'accepte le traitement de mes <strong>données personnelles</strong></label>
                        </div>
                     )}

                     {authMode === 'login' && (
                       <div className="flex justify-end pt-1">
                         <button 
                           type="button" 
                           onClick={() => navigate('/forget-password')} 
                           className="text-sm font-bold text-[#0E7673] dark:text-[#38B794] hover:underline transition"
                         >
                            {t('forget_password', 'Mot de passe oublié ?')}
                         </button>
                       </div>
                     )}

                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-4 mt-6 bg-[#0E7673] text-white rounded-full font-bold hover:bg-[#0A3D3B] transition shadow-sm disabled:opacity-60 text-base active:scale-[0.98]"
                     >
                        {loading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : "S'inscrire")}
                     </button>
                  </form>

                  <div className="mt-8 text-center pb-6">
                     <p className="text-sm font-medium text-[#0A3D3B]/80 dark:text-[#CFE4E3]">
                        {authMode === 'login' ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                        <button 
                           type="button" 
                           onClick={() => {
                             if (authMode === 'login') {
                               if (selectedRole === 'driver') navigate('/driver-registration');
                               else if (selectedRole === 'pharmacy') navigate('/pharmacist-registration');
                               else setAuthMode('signup');
                             } else {
                               setAuthMode('login');
                             }
                           }}
                           className="ml-2 font-bold text-[#0E7673] dark:text-[#38B794] hover:underline focus:outline-none"
                        >
                           {authMode === 'login' ? "S'inscrire" : 'Se connecter'}
                        </button>
                     </p>
                  </div>
               </div>
               
               <button onClick={() => { setStep(5); setAuthMode('login'); }} className="absolute top-10 left-4 p-2.5 text-[#0E7673] dark:text-[#E7F1F1] hover:bg-[#E7F1F1] dark:hover:bg-[#0A3D3B] rounded-full transition">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
               </button>
            </div>
         )}
       </AnimatePresence>
    </div>
  );
}
