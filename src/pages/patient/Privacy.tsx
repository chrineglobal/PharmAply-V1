import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function PatientPrivacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-6 pt-12 pb-4 shadow-sm z-10 flex items-center gap-4 border-b border-[#CFE4E3] dark:border-[#145250]">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#0E7673] dark:text-[#38B794] border border-[#CFE4E3] dark:border-[#145250] rounded-full bg-[#F5FAFA] dark:bg-[#062625] shadow-sm hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
            <ArrowLeft size={20} />
         </button>
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-xl">{t('privacy_security', 'Privacy & Security')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="font-bold text-[#0A3D3B] dark:text-white mb-4 flex items-center gap-2">
               <Shield className="text-[#0E7673] dark:text-[#38B794]" size={20} /> {t('security_settings', 'Security Settings')}
            </h2>
            <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] pb-4">
                  <div>
                     <h3 className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('change_password', 'Change Password')}</h3>
                     <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">{t('change_password_desc', 'Update your account password')}</p>
                  </div>
                  <button className="text-sm font-bold text-[#0E7673] dark:text-[#38B794] hover:underline">{t('update', 'Update')}</button>
               </div>
               
               <div className="flex items-center justify-between pb-1">
                  <div>
                     <h3 className="font-bold text-sm text-[#0A3D3B] dark:text-white">{t('two_factor', 'Two-Factor Authentication')}</h3>
                     <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">{t('two_factor_desc', 'Add an extra layer of security')}</p>
                  </div>
                  <div className="w-10 h-6 bg-[#CFE4E3] dark:bg-[#145250] rounded-full relative cursor-pointer">
                     <div className="w-4 h-4 bg-white dark:bg-[#D7F1EA] rounded-full absolute left-1 top-1 shadow-sm"></div>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="font-bold text-[#0A3D3B] dark:text-white mb-4">{t('privacy_policy', 'Privacy Policy')}</h2>
            <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] leading-relaxed">
               {t('privacy_policy_1', 'Welcome to our healthcare platform. We prioritize your privacy and comply with strict health data regulations to protect your information. Your medical data, including prescriptions and consultation notes, are encrypted and accessible only by you and the medical professionals you choose.')}
               <br/><br/>
               {t('privacy_policy_2', 'We do not share your personal health information with unauthorized third parties without your explicit consent, except when required by law.')}
            </p>
         </div>
      </div>
    </div>
  );
}
