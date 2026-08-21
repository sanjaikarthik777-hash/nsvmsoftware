import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessSettingsSchema } from '../schemas/quotationSchema';
import { BusinessSettings } from '../types/quotation';
import { useQuotationStore } from '../store/quotationStore';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from '../components/ui/Button';
import { PwaInstallModal } from '../components/ui/PwaInstallModal';
import { toast } from '../components/ui/Toast';
import { DEFAULT_SETTINGS } from '../db/dexie';
import { 
  Building2, 
  FileText, 
  Upload, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Download, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useQuotationStore();
  const { isInstallable, isInstalled, installApp } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await installApp();
      if (accepted) {
        toast.success('App installed successfully');
        return;
      }
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm<BusinessSettings>({
    resolver: zodResolver(businessSettingsSchema) as any,
    defaultValues: DEFAULT_SETTINGS
  });

  const watchedData = watch();

  // Load active settings on mount
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // Handle Logo Upload and convert to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // Limit size to 1MB
      toast.error('Logo image must be smaller than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setValue('logo', reader.result as string);
      toast.success('Logo loaded. Save settings to apply.');
    };
    reader.readAsDataURL(file);
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setValue('logo', '');
    toast.info('Logo removed. Save settings to apply.');
  };

  // Terms and Conditions managers inside Settings
  const [newTerm, setNewTerm] = useState('');

  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    const currentTerms = watchedData.defaultTerms || [];
    setValue('defaultTerms', [...currentTerms, newTerm.trim()]);
    setNewTerm('');
  };

  const handleRemoveTerm = (index: number) => {
    const currentTerms = watchedData.defaultTerms || [];
    setValue('defaultTerms', currentTerms.filter((_: any, i: number) => i !== index));
  };

  const handleMoveTerm = (index: number, direction: 'up' | 'down') => {
    const currentTerms = watchedData.defaultTerms || [];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentTerms.length - 1) return;
    
    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...currentTerms];
    const temp = reordered[index];
    reordered[index] = reordered[nextIdx];
    reordered[nextIdx] = temp;
    
    setValue('defaultTerms', reordered);
  };

  // Save settings in store / DB
  const onSubmit = async (data: BusinessSettings) => {
    try {
      await updateSettings(data);
      toast.success('Business settings updated successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update settings');
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as BusinessSettings))} className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Business details & Bank details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Business Info Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <Building2 className="h-4.5 w-4.5 text-slate-500" />
              Business Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name *</label>
                <input
                  type="text"
                  {...register('companyName')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.companyName && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.companyName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Quality Engineering Works"
                  {...register('tagline')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number *</label>
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.phone && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                <input
                  type="text"
                  {...register('email')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">GST Number</label>
                <input
                  type="text"
                  placeholder="e.g. 24AAACN1234F1Z5"
                  {...register('gstNumber')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Address *</label>
              <textarea
                rows={3}
                {...register('address')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
              {errors.address && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.address.message}</p>
              )}
            </div>
            
            {/* Logo Upload Panel */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Company Logo (PNG/JPEG)</label>
                <p className="text-[10px] text-slate-400">Upload a square/rectangular logo. Maximum file size 1MB.</p>
              </div>
              
              <div className="flex items-center gap-3">
                {watchedData.logo ? (
                  <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-lg shadow-2xs">
                    <img 
                      src={watchedData.logo} 
                      alt="Logo Preview" 
                      className="h-12 w-24 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer">
                    <Upload className="h-4 w-4 text-slate-400" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quotation Defaults & PWA details */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 3. Quotation Sequence Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              Quotation Settings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Prefix *</label>
                <input
                  type="text"
                  {...register('prefix')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.prefix && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.prefix.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Start Index *</label>
                <input
                  type="number"
                  {...register('startingNumber', { valueAsNumber: true })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.startingNumber && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.startingNumber.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Validity (Days) *</label>
                <input
                  type="number"
                  {...register('defaultValidityDays', { valueAsNumber: true })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.defaultValidityDays && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.defaultValidityDays.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Default GST (%) *</label>
                <input
                  type="number"
                  {...register('defaultGstPercentage', { valueAsNumber: true })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.defaultGstPercentage && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.defaultGstPercentage.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* 4. PWA Installation Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <Download className="h-4.5 w-4.5 text-slate-500" />
              PWA Settings
            </h3>
            
            <div className="space-y-3">
              {/* App status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                <span className="text-slate-500">Application Mode:</span>
                {isInstalled ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Installed (Standalone)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-500">Web Browser</span>
                )}
              </div>
              
              {/* Offline status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                <span className="text-slate-500">Connection Status:</span>
                {isOnline ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Connected
                  </span>
                ) : (
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Offline Cache Active
                  </span>
                )}
              </div>

              {/* Database status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                <span className="text-slate-500">Database (IndexedDB):</span>
                <span className="font-bold text-slate-800">Dexie Active</span>
              </div>
              
              {/* PWA Install trigger - Shown whenever not running in standalone mode */}
              {!isInstalled && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full font-bold cursor-pointer"
                    onClick={handleInstallClick}
                    icon={<Download className="h-4 w-4" />}
                  >
                    Install Application
                  </Button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Install on your desktop or phone for quick access and full offline estimating support.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 5. Terms & Conditions Default List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
          <FileText className="h-4.5 w-4.5 text-slate-500" />
          Default Terms & Conditions (Pre-populated on New Estimates)
        </h3>

        {/* Terms list */}
        <div className="space-y-2">
          {watchedData.defaultTerms?.map((term: string, index: number) => (
            <div key={index} className="flex items-center gap-3 p-2.5 border border-slate-100 bg-slate-50/20 rounded-lg">
              <span className="font-bold text-xs text-slate-400 w-5 text-right">{index + 1}.</span>
              <input
                type="text"
                value={term}
                onChange={(e) => {
                  const updated = [...watchedData.defaultTerms];
                  updated[index] = e.target.value;
                  setValue('defaultTerms', updated);
                }}
                className="flex-1 text-xs text-slate-700 bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-slate-400 py-0.5"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveTerm(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveTerm(index, 'down')}
                  disabled={index === watchedData.defaultTerms.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                  title="Remove Term"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom term row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add default terms & conditions line item..."
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTerm();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddTerm}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Term
          </Button>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          icon={<Save className="h-4 w-4" />}
        >
          Save Settings
        </Button>
      </div>

      {/* PWA Guidance Modal */}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNativeInstall={installApp}
        isNativeInstallAvailable={isInstallable}
      />

    </form>
  );
};
