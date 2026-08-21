import React, { useState, useEffect } from 'react';
import { useQuotationStore } from '../../store/quotationStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Button } from '../ui/Button';
import { PwaInstallModal } from '../ui/PwaInstallModal';
import { Download, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { toast } from '../ui/Toast';

export const Header: React.FC = () => {
  const { activePage } = useQuotationStore();
  const { isInstallable, isInstalled, installApp } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connected to the network');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Working offline. Data is saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await installApp();
      if (accepted) {
        toast.success('App installed successfully');
        return;
      }
    }
    // Open guide modal if native prompt is not active or prompt was dismissed
    setIsModalOpen(true);
  };

  const pageTitles = {
    dashboard: 'Dashboard',
    'new-quotation': 'New Quotation',
    quotations: 'Quotations History',
    settings: 'System Settings',
  };

  return (
    <>
      <header className="no-print flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none my-0">
            {pageTitles[activePage]}
          </h1>
          
          {/* Network Status Badge */}
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              <Wifi className="h-3.5 w-3.5" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
              <WifiOff className="h-3.5 w-3.5" />
              Offline Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Install PWA Button - Shown whenever app is running in browser (not standalone) */}
          {!isInstalled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              icon={<Download className="h-4 w-4" />}
              className="inline-flex font-semibold cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Install App
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle className="h-4 w-4" />
              App Installed
            </span>
          )}
        </div>
      </header>

      {/* PWA Guidance Modal */}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNativeInstall={installApp}
        isNativeInstallAvailable={isInstallable}
      />
    </>
  );
};

