import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, FileText, CheckCircle, Upload } from 'lucide-react';
import { auth, db, storage } from '../../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp, addDoc, collection } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { PharmAplyLogo } from '../../components/common/PharmAplyLogo';

export function PharmacistRegistration() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pharmacyName: '',
    ownerName: '',
    registrationNumber: '',
    address: '',
    phoneNumber: ''
  });

  const [files, setFiles] = useState<{ operatingLicense: File | null; taxpayerCard: File | null }>({
    operatingLicense: null,
    taxpayerCard: null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'operatingLicense' | 'taxpayerCard') => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] });
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.operatingLicense || !files.taxpayerCard) {
      setError('Please upload all required KYC documents.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = userCredential.user;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use' || authErr.message?.includes('email-already-in-use')) {
          // Try to sign in instead to resume registration
          try {
            const signInCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            user = signInCredential.user;
          } catch (signInErr: any) {
            throw new Error("This email is already registered, but password was incorrect. Please log in first.");
          }
        } else {
          throw authErr;
        }
      }

      // Upload files sequentially (or Promise.all)
      let operatingLicenseUrl = '';
      let taxpayerCardUrl = '';

      if (files.operatingLicense) {
        try {
          const fileRef = ref(storage, `kyc/${user.uid}/operatingLicense_${files.operatingLicense.name}`);
          const uploadTask = await uploadBytesResumable(fileRef, files.operatingLicense);
          operatingLicenseUrl = await getDownloadURL(uploadTask.ref);
        } catch (storageErr) {
          console.error("Storage upload failed", storageErr);
          throw storageErr;
        }
      }

      if (files.taxpayerCard) {
        try {
          const fileRef = ref(storage, `kyc/${user.uid}/taxpayerCard_${files.taxpayerCard.name}`);
          const uploadTask = await uploadBytesResumable(fileRef, files.taxpayerCard);
          taxpayerCardUrl = await getDownloadURL(uploadTask.ref);
        } catch (storageErr) {
          console.error("Storage upload failed", storageErr);
          throw storageErr;
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        email: formData.email,
        name: formData.ownerName,
        role: 'pharmacy',
        status: 'pending_verification',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'pharmacies', user.uid), {
        ownerId: user.uid,
        name: formData.pharmacyName,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        registrationNumber: formData.registrationNumber,
        operatingLicenseUrl: operatingLicenseUrl,
        taxpayerCardUrl: taxpayerCardUrl,
        status: 'pending_verification',
        createdAt: serverTimestamp()
      });

      try {
          await addDoc(collection(db, 'notifications'), {
            userId: 'ADMIN',
            type: 'admin_alert',
            title: 'New Pharmacy Registration',
            message: `${formData.pharmacyName} is awaiting approval.`,
            isRead: false,
            relatedId: user.uid,
            createdAt: serverTimestamp()
          });
      } catch (e) {
          console.warn("Notification error (non-fatal)", e);
      }

      toast.success("Pharmacy registered successfully!");
      setStep(4); // Success step
    } catch (err: any) {
       console.error(err);
       let errMsg = err.message || 'Failed to register. Please ensure you have set up Firebase storage.';
       if (err.code === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
         errMsg = "This email is already registered. Please log in instead.";
       }
       setError(errMsg);
       toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#E7F1F1] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-[#0E7673] px-6 pt-12 pb-5 shadow-sm z-10 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => step > 1 && step < 4 ? prevStep() : navigate(-1)} className="p-2 -ml-2 hover:bg-white/15 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="font-bold text-white text-lg"> {t('pharmacy_registration', 'Pharmacy Registration')} </h1>
        </div>
        <PharmAplyLogo variant="symbol" tone="white" size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col pt-6 pb-20">
         {/* Step Indicator */}
         {step < 4 && (
            <div className="flex items-center justify-center gap-2 mb-6 px-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= s ? 'bg-[#0E7673] text-white shadow-sm' : 'bg-white dark:bg-[#0A3D3B] text-[#6EADAB] border border-[#CFE4E3] dark:border-[#145250]'}`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`w-10 h-1 rounded-full mx-1 ${step > s ? 'bg-[#0E7673]' : 'bg-[#CFE4E3] dark:bg-[#145250]'}`}></div>}
                </div>
              ))}
            </div>
         )}
         
         <div className="bg-white dark:bg-[#0A3D3B] mx-4 sm:mx-auto sm:w-full sm:max-w-lg p-6 rounded-3xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] mb-6">
            {error && (
              <div className="p-3.5 mb-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-sm rounded-2xl">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794] rounded-2xl flex items-center justify-center"><Store size={24} /></div>
                  <div>
                    <h2 className="font-bold text-[#0A3D3B] dark:text-white text-lg"> {t('account_pharmacy_details', 'Account & Pharmacy Details')} </h2>
                    <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]"> {t('basic_information', 'Basic information')} </p>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('email_address', 'Email Address')} </label>
                   <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('pharmacy_example_com', 'pharmacy@pharmaply.com')} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('password', 'Password')} </label>
                   <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder="••••••••" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('pharmacy_name', 'Pharmacy Name')} </label>
                   <input type="text" name="pharmacyName" value={formData.pharmacyName} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('e_g_healthfirst_pharmacy', 'e.g. HealthFirst Pharmacy')} />
                </div>
                
                <button onClick={nextStep} disabled={!formData.email || !formData.password || !formData.pharmacyName} className="w-full py-4 mt-4 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold disabled:opacity-50 transition shadow-sm"> {t('continue', 'Continue')} </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794] rounded-2xl flex items-center justify-center"><Store size={24} /></div>
                  <div>
                    <h2 className="font-bold text-[#0A3D3B] dark:text-white text-lg"> {t('owner_location_info', 'Owner & Location Info')} </h2>
                    <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]"> {t('contact_details', 'Contact details')} </p>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('owner_full_name', 'Owner Full Name')} </label>
                   <input type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('john_doe', 'John Doe')} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('pharmacy_address', 'Pharmacy Address')} </label>
                   <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('e_g_makepe_douala', 'e.g. Makepe, Douala')} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5"> {t('phone_number', 'Phone Number')} </label>
                   <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('237_6xx_xxx_xxx', '+237 6XX XXX XXX')} />
                </div>
                
                <button onClick={nextStep} disabled={!formData.ownerName || !formData.address || !formData.phoneNumber} className="w-full py-4 mt-4 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold disabled:opacity-50 transition shadow-sm"> {t('continue_to_kyc', 'Continue to KYC')} </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794] rounded-2xl flex items-center justify-center"><FileText size={24} /></div>
                  <div>
                    <h2 className="font-bold text-[#0A3D3B] dark:text-white text-lg"> {t('kyc_verification', 'KYC & Verification')} </h2>
                    <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]"> {t('cameroon_official_documents', 'Cameroon Official Documents')} </p>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-1.5">Business Registration Number (RCCM)</label>
                   <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} className="w-full border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3.5 bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-white focus:bg-white dark:focus:bg-[#062625] focus:ring-2 focus:ring-[#0E7673] outline-none placeholder:text-[#6EADAB]" placeholder={t('rc_dla_xxxx_b_xxxx', 'RC/DLA/xxxx/B/xxxx')} />
                </div>
                
                <div className="pt-2">
                   <p className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-2">Upload Operating License (Ordre National des Pharmaciens)</p>
                   <label className="border-2 border-dashed border-[#9FC8C7] dark:border-[#145250] rounded-2xl p-6 flex flex-col items-center justify-center text-[#0A3D3B] dark:text-[#CFE4E3] bg-[#F5FAFA] dark:bg-[#062625] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/20 hover:border-[#0E7673] cursor-pointer transition">
                      <Upload size={24} className="mb-2 text-[#0E7673] dark:text-[#38B794]" />
                      <span className="text-xs font-medium text-center">
                        {files.operatingLicense ? files.operatingLicense.name : 'Tap to upload Document (PDF/JPG)'}
                      </span>
                      <input type="file" className="hidden" accept=".pdf,image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'operatingLicense')} />
                   </label>
                   <p className="text-[11px] text-[#0E7673] dark:text-[#9FC8C7] mt-2 text-center"> {t('required_for_approval', 'Required for approval')} </p>
                </div>

                <div className="pt-2">
                   <p className="block text-sm font-bold text-[#0A3D3B] dark:text-[#E7F1F1] mb-2">Upload Taxpayer Card (Carte de Contribuable)</p>
                   <label className="border-2 border-dashed border-[#9FC8C7] dark:border-[#145250] rounded-2xl p-6 flex flex-col items-center justify-center text-[#0A3D3B] dark:text-[#CFE4E3] bg-[#F5FAFA] dark:bg-[#062625] hover:bg-[#E7F1F1] dark:hover:bg-[#0E7673]/20 hover:border-[#0E7673] cursor-pointer transition">
                      <Upload size={24} className="mb-2 text-[#0E7673] dark:text-[#38B794]" />
                      <span className="text-xs font-medium text-center">
                        {files.taxpayerCard ? files.taxpayerCard.name : 'Tap to upload Document (PDF/JPG)'}
                      </span>
                      <input type="file" className="hidden" accept=".pdf,image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'taxpayerCard')} />
                   </label>
                </div>
                
                <button onClick={handleSubmit} disabled={loading || !formData.registrationNumber || !files.operatingLicense || !files.taxpayerCard} className="w-full py-4 mt-6 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold disabled:opacity-50 transition flex justify-center items-center gap-2 shadow-sm">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-8 space-y-4 animate-in zoom-in-95">
                 <div className="w-20 h-20 bg-[#D7F1EA] text-[#0E7673] rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-[#0A3D3B] dark:text-white"> {t('application_submitted', 'Application Submitted!')} </h2>
                 <p className="text-[#0E7673] dark:text-[#CFE4E3] max-w-xs text-sm leading-relaxed"> {t('your_pharmacy_registration_is_', 'Your pharmacy registration is under review. Our team will verify your KYC documents within 24-48 hours according to Cameroon regulations.')} </p>
                 <button onClick={() => navigate('/pharmacist')} className="w-full py-4 mt-8 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold transition shadow-sm">
                     {t('go_to_dashboard', 'Go to Dashboard')} </button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
