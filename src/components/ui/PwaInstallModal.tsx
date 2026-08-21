import React, { useState } from 'react';
import { getPlatformInfo } from '../../hooks/usePwaInstall';
import { Button } from './Button';
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  MoreVertical,
  Layers,
  Check
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => Promise<boolean>;
  isNativeInstallAvailable?: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  isNativeInstallAvailable = false
}) => {
  const platform = getPlatformInfo();
  
  // Default selected tab based on user's current platform
  const initialTab = platform.isIOS ? 'ios' : platform.isAndroid ? 'android' : 'desktop';
  const [activeTab, setActiveTab] = useState<'desktop' | 'ios' | 'android'>(initialTab);

  if (!isOpen) return null;

  const handleNativeClick = async () => {
    if (onNativeInstall) {
      const installed = await onNativeInstall();
      if (installed) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700 text-emerald-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight my-0">
                Install NSVM Billing App
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Install on your device for full offline access & quick launch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Native Install Trigger Banner if event captured */}
        {isNativeInstallAvailable && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>One-click automated installation is available!</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNativeClick}
              icon={<Download className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Install Now
            </Button>
          </div>
        )}

        {/* Device Selection Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white border-slate-900 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Desktop (Chrome / Edge)
          </button>
          
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white border-slate-900 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            iPhone / iPad
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white border-slate-900 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Android
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700">
          
          {/* Desktop Guide */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-600">
                To install NSVM Billing as a desktop application on Chrome or Microsoft Edge:
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Look at the Address Bar</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Look at the right end of your browser's address bar for the <strong className="text-slate-800">Install icon (⤓ or ⊕)</strong> and click it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Or use Browser Menu (⋮)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click the <strong className="text-slate-800">Three Dots (⋮)</strong> menu top-right &gt; select <strong className="text-slate-800">"Install NSVM Billing..."</strong> or <strong className="text-slate-800">"Save and share" &gt; "Install page as app"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Confirm Installation</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click <strong className="text-slate-800">"Install"</strong> in the browser prompt window. The app will pin to your desktop or start menu!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS Guide */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-600">
                To install NSVM Billing on iPhone or iPad (Safari browser):
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Tap the Share Button
                      <Share className="h-3.5 w-3.5 text-blue-600" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      In Safari, tap the <strong className="text-slate-800">Share icon</strong> (square with an arrow pointing upward) at the bottom toolbar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Select "Add to Home Screen"
                      <PlusSquare className="h-3.5 w-3.5 text-slate-700" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scroll down the options list and tap <strong className="text-slate-800">"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Tap "Add"</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap <strong className="text-slate-800">"Add"</strong> in the top-right corner. An app icon will appear directly on your home screen!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Guide */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-600">
                To install NSVM Billing on Android devices (Chrome browser):
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Tap Chrome Menu
                      <MoreVertical className="h-3.5 w-3.5 text-slate-700" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap the <strong className="text-slate-800">Three Dots (⋮)</strong> menu at the top-right of your Chrome browser.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Tap "Install app"</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap <strong className="text-slate-800">"Install app"</strong> or <strong className="text-slate-800">"Add to Home screen"</strong> from the dropdown list.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Confirm Prompt</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap <strong className="text-slate-800">"Install"</strong> when prompted. The application will install as a standalone native app!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* App Benefits summary box */}
          <div className="bg-slate-900 text-slate-300 p-4 rounded-xl space-y-2 border border-slate-800 mt-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              Why Install NSVM Billing?
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Full offline data access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Instant app launcher icon</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>No browser navigation bar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Fast local IndexedDB storage</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="font-bold cursor-pointer"
          >
            Close Guide
          </Button>
        </div>

      </div>
    </div>
  );
};
