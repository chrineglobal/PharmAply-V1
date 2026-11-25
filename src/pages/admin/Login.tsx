import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '../../lib/firebase';
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from '../../lib/firebase';
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";
import { useTranslation } from "react-i18next";
import toast from 'react-hot-toast';
import { PharmAplyLogo } from "../../components/common/PharmAplyLogo";

export function AdminLogin() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, role, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">("admin");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // If already logged in with appropriate role, redirect
  useEffect(() => {
    if (!authLoading && user && (role === "admin" || role === "cashier")) {
      if (role === "admin") navigate("/admin");
      else navigate("/pharmacist"); // Route cashier to pharmacist for now
    }
  }, [authLoading, user, role, navigate]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("adminRememberEmail");
    const savedPassword = localStorage.getItem("adminRememberPassword");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      if (savedPassword) setPassword(savedPassword);
    }
  }, []);

  if (!authLoading && user && (role === "admin" || role === "cashier")) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInError: any) {
        // If sign in fails and it's the admin email, attempt to create it.
        // It's possible the user does not exist yet.
        const isAuthError = signInError.code === 'auth/invalid-credential' 
                         || signInError.code === 'auth/user-not-found'
                         || signInError.message?.includes('Invalid login credentials');
                         
        if (email === 'admin@pharmaply.com' && isAuthError) {
           try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
           } catch (createError: any) {
              if (createError.code === 'auth/email-already-in-use' || createError.message?.includes('already registered')) {
                 // The account exists, so the password was actually wrong
                 throw new Error("Invalid password.");
              }
              throw createError;
           }
        } else {
           throw signInError;
        }
      }
      
      const isAppAdmin = userCredential.user.email === 'admin@pharmaply.com';
      
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
         if (isAppAdmin) {
            await setDoc(userDocRef, {
              email: userCredential.user.email,
              name: 'Master Admin',
              role: 'admin', 
              createdAt: serverTimestamp(),
            });
            toast.success("Successfully logged in as Master Admin");
            // Let auth provider handle redirect
         } else {
            await signOut(auth);
            toast.error("Cannot find user record. Please register first.");
            setError("Cannot find user record. Please register first.");
         }
      } else {
         const uRole = isAppAdmin ? 'admin' : userDoc.data().role;
         if (selectedRole === 'admin' && uRole !== 'admin') {
            await signOut(auth);
            toast.error("You do not have Admin privileges.");
            setError("You do not have Admin privileges.");
         } else if (selectedRole === 'cashier' && uRole !== 'cashier' && uRole !== 'admin' && uRole !== 'pharmacy') {
            await signOut(auth);
            toast.error("You do not have Cashier privileges.");
            setError("You do not have Cashier privileges.");
         } else {
           if (rememberMe) {
             localStorage.setItem("adminRememberEmail", email);
             localStorage.setItem("adminRememberPassword", password);
           } else {
             localStorage.removeItem("adminRememberEmail");
             localStorage.removeItem("adminRememberPassword");
           }
           toast.success("Successfully logged in!");
         }
         // Otherwise, allow authentication to succeed and AuthProvider to navigate
      }
    } catch (err: any) {
      const isAuthErr = err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.message?.includes('Invalid login credentials');
      if (err.code === "auth/unverified-email") {
         toast.error("Email not confirmed. Please check the create-admin.sql file.");
         setError("Email not confirmed. Please run the create-admin.sql script in your Supabase SQL Editor to verify the admin account.");
      } else if (isAuthErr) {
        toast.error("Invalid credentials.");
        setError("Invalid credentials.");
      } else {
        toast.error(err.message || "Failed to sign in");
        setError(err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLangMenu(false);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-[#062625] rounded-[2rem] shadow-xl flex overflow-hidden relative border border-[#CFE4E3] dark:border-[#145250]">
      {/* Left Panel */}
      <div className="hidden md:flex w-1/2 bg-[#0E7673] relative flex-col justify-between p-12 overflow-hidden">
        {/* Charte Abstract Arcs */}
        <div className="absolute top-[-12%] right-[-14%] w-[115%] h-[115%] rounded-full border-[96px] border-[#38B794]/15 pointer-events-none"></div>
        <div className="absolute bottom-[-32%] left-[-22%] w-[140%] h-[140%] rounded-full border-[80px] border-white/10 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-14">
            <PharmAplyLogo variant="horizontal" tone="white" size="lg" />
          </div>

          <h1 className="text-4xl text-white font-bold leading-snug max-w-sm">
            {t("slogan", "Trouvez Commandez Recevez")}
          </h1>
          <p className="text-[#D7F1EA] text-sm mt-4 max-w-sm leading-relaxed">
            {t("admin_portal_subtitle", "Plateforme de gestion et de coordination pharmaceutique PharmAply.")}
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-[#CFE4E3] text-sm font-medium">{t("terms")}  {t('nbsp_nbsp', '|')} {t("privacy")}</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-10 bg-white dark:bg-[#062625]">
        {/* Language selector */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
           <div className="relative">
             <button 
               type="button"
               onClick={() => setShowLangMenu(!showLangMenu)}
               className="flex items-center gap-2 bg-[#E7F1F1] dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2 rounded-full text-sm font-bold text-[#0E7673] dark:text-[#E7F1F1] shadow-sm hover:bg-[#CFE4E3]/60 transition"
             >
                <span className="opacity-70">文A</span> 
                {i18n.language === 'fr' ? 'Français' : 'English'} 
                <span className="opacity-70 text-[10px]">▼</span>
             </button>
             {showLangMenu && (
               <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#0A3D3B] rounded-2xl shadow-lg border border-[#CFE4E3] dark:border-[#145250] py-1.5 overflow-hidden">
                 <button type="button" onClick={() => toggleLang('en')} className="w-full text-left px-4 py-2 text-sm font-medium text-[#0A3D3B] dark:text-[#E7F1F1] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30"> {t('english', 'English')} </button>
                 <button type="button" onClick={() => toggleLang('fr')} className="w-full text-left px-4 py-2 text-sm font-medium text-[#0A3D3B] dark:text-[#E7F1F1] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/30"> {t('fran_ais', 'Français')} </button>
               </div>
             )}
           </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6 flex md:hidden justify-center">
            <PharmAplyLogo variant="horizontal" tone="color" size="md" />
          </div>

          <div className="mb-8 block">
            <h2 className="text-2xl font-bold text-[#0A3D3B] dark:text-white mb-2">{t("admin_welcome")}</h2>
            <p className="text-[#0E7673] dark:text-[#9FC8C7] text-sm mb-6">{t("admin_role_select")}</p>
            
            {/* Role Switcher */}
            <div className="flex bg-[#E7F1F1] dark:bg-[#0A3D3B] p-1.5 rounded-full border border-[#CFE4E3] dark:border-[#145250] mb-8">
               <button 
                 type="button"
                 onClick={() => setSelectedRole("admin")}
                 className={`flex-1 font-bold py-2.5 rounded-full text-sm transition ${selectedRole === "admin" ? "bg-[#0E7673] text-white shadow-sm" : "text-[#0A3D3B] dark:text-[#CFE4E3] hover:bg-white/60 dark:hover:bg-[#062625]/40"}`}
               >
                 {t("admin_role_admin")}
               </button>
               <button 
                 type="button"
                 onClick={() => setSelectedRole("cashier")}
                 className={`flex-1 font-bold py-2.5 rounded-full text-sm transition ${selectedRole === "cashier" ? "bg-[#0E7673] text-white shadow-sm" : "text-[#0A3D3B] dark:text-[#CFE4E3] hover:bg-white/60 dark:hover:bg-[#062625]/40"}`}
               >
                 {t("admin_role_cashier")}
               </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3.5 rounded-2xl flex items-start gap-2 text-sm border border-red-200 dark:border-red-900/50">
                 <AlertCircle size={16} className="mt-0.5 shrink-0" />
                 <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-2">{t("email")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F5FAFA] dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white py-3.5 px-4 rounded-2xl text-sm focus:ring-2 focus:ring-[#0E7673] focus:border-transparent outline-none transition placeholder:text-[#6EADAB]"
                placeholder={t('admin_example_com', 'admin@pharmaply.com')}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-2">{t("password")}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5FAFA] dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white py-3.5 px-4 rounded-2xl text-sm focus:ring-2 focus:ring-[#0E7673] focus:border-transparent outline-none transition placeholder:text-[#6EADAB]"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#0E7673] rounded border-[#CFE4E3] focus:ring-[#0E7673]"
              />
              <label htmlFor="rememberMe" className="text-sm font-medium text-[#0A3D3B] dark:text-[#CFE4E3]"> {t('remember_me', 'Remember me')} </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold py-4 rounded-full transition shadow-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              {loading ? t("verifying") : t("login_btn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
