import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, FileText, Check, Loader2, Hospital } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from '../../lib/firebase';
import { GooglePlacesAddressInput } from '../../components/GooglePlacesAddressInput';
import { updateUserProfileAndCascade } from '../../lib/userSync';
import toast from 'react-hot-toast';

export function PatientProfileDetails() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    deliveryAddress: '',
    deliveryLat: undefined as number | undefined,
    deliveryLng: undefined as number | undefined,
    isHealthcareProvider: false,
    professionalLicense: '',
    npiNumber: '',
    clinicName: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        setFormData(prev => ({ ...prev, fullName: auth.currentUser?.displayName || '' }));
        try {
          const d = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (d.exists()) {
            const uData = d.data();
            const resolvedName = uData.name || uData.fullName || uData.displayName || auth.currentUser?.displayName || '';
            const resolvedPhone = uData.phone || uData.profileDetails?.phoneNumber || '';
            if (uData.profileDetails) {
              setFormData(prev => ({ ...prev, ...uData.profileDetails, fullName: resolvedName || prev.fullName, phoneNumber: resolvedPhone || prev.phoneNumber }));
            } else {
              setFormData(prev => ({ ...prev, fullName: resolvedName || prev.fullName, phoneNumber: resolvedPhone || prev.phoneNumber }));
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setInitialLoading(false);
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      if (auth.currentUser) {
        // Save profile details and cascade
        await updateUserProfileAndCascade(auth.currentUser.uid, {
          name: formData.fullName,
          displayName: formData.fullName,
          fullName: formData.fullName,
          phone: formData.phoneNumber,
          profileDetails: formData
        });

        setSuccess(true);
        toast.success(t('profile_saved', 'Informations enregistrées avec succès'));
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch(err) {
      console.error(err);
      toast.error(t('error_saving', 'Erreur lors de la sauvegarde'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
     return <div className="flex-1 flex items-center justify-center bg-[#F5FAFA] dark:bg-[#062625]"><Loader2 className="animate-spin text-[#0E7673] dark:text-[#38B794]" /></div>;
  }

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden transition-colors duration-200">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between bg-white dark:bg-[#0A3D3B] shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] transition-colors duration-200">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
            <ArrowLeft size={20} />
         </button>
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-xl">Profile & Credentials</h1>
         <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm overflow-visible p-6 space-y-4">
             <h2 className="font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2">
                <User size={18} className="text-[#0E7673] dark:text-[#38B794]" /> Personal Information
             </h2>
             <div>
                <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">Full Name</label>
                <input 
                   type="text"
                   name="fullName"
                   value={formData.fullName}
                   onChange={handleChange}
                   className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-3 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                   placeholder="Your full name"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">Contact Number</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                   </div>
                   <input 
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                      placeholder="+1 (555) 000-0000"
                   />
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm overflow-visible p-6 space-y-4">
             <h2 className="font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2">
                <MapPin size={18} className="text-[#0E7673] dark:text-[#38B794]" /> Adresse de Livraison
             </h2>
             <div>
                <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">
                  Adresse Principale (Google Maps / Géolocalisée)
                </label>
                <GooglePlacesAddressInput
                  value={formData.deliveryAddress}
                  onChange={(address, lat, lng) => {
                    setFormData(prev => ({
                      ...prev,
                      deliveryAddress: address,
                      deliveryLat: lat,
                      deliveryLng: lng
                    }));
                  }}
                  placeholder="Ex: Bastos, Rue 1788, Yaoundé ou Akwa, Douala"
                />
             </div>
          </div>

          <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm overflow-visible p-6 space-y-4">
             <div className="flex items-center justify-between">
                 <h2 className="font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2">
                    <Hospital size={18} className="text-[#0E7673] dark:text-[#38B794]" /> Professional Credentials
                 </h2>
                 <button 
                   onClick={() => setFormData(s => ({ ...s, isHealthcareProvider: !s.isHealthcareProvider }))}
                   className={`w-12 h-6 rounded-full transition-colors relative ${formData.isHealthcareProvider ? 'bg-[#0E7673]' : 'bg-[#CFE4E3] dark:bg-[#145250]'}`}
                 >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${formData.isHealthcareProvider ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                 </button>
             </div>
             
             {formData.isHealthcareProvider && (
                 <div className="space-y-4 pt-2 border-t border-[#CFE4E3] dark:border-[#145250]">
                     <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">Please provide your credentials for verification. This allows healthcare providers to order supplies directly.</p>
                     <div>
                        <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">Clinic / Hospital Name</label>
                        <input 
                           type="text"
                           name="clinicName"
                           value={formData.clinicName}
                           onChange={handleChange}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-3 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                           placeholder="Name of your practice"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">Professional License #</label>
                        <input 
                           type="text"
                           name="professionalLicense"
                           value={formData.professionalLicense}
                           onChange={handleChange}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-3 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                           placeholder="License number"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1 uppercase tracking-wider">NPI Number (if applicable)</label>
                        <input 
                           type="text"
                           name="npiNumber"
                           value={formData.npiNumber}
                           onChange={handleChange}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-3 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                           placeholder="National Provider Identifier"
                        />
                     </div>
                 </div>
             )}
          </div>
          
          <div className="h-6"></div>
      </div>
      
      <div className="p-6 bg-white dark:bg-[#0A3D3B] border-t border-[#CFE4E3] dark:border-[#145250] z-10 shrink-0">
         <button onClick={handleSave} disabled={loading} className="w-full bg-[#0E7673] hover:bg-[#0A5A58] text-white py-4 rounded-full font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 
             success ? <><Check size={20} /> Saved Successfully</> : "Save Details"}
         </button>
      </div>
    </div>
  );
}
