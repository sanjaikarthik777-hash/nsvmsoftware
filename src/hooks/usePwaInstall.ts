import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level singleton state to preserve the install prompt across component lifecycle & navigation
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstallable = false;
let globalIsInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Attach event listeners immediately at window/module startup so no beforeinstallprompt event is missed
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(display-mode: standalone)');

  const checkIsStandalone = () => {
    const isStandalone = mediaQuery.matches || Boolean((window.navigator as any)?.standalone);
    globalIsInstalled = isStandalone;
    if (isStandalone) {
      globalIsInstallable = false;
    }
    notifyListeners();
  };

  checkIsStandalone();

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        console.log('[PWA Diagnostics] Display mode changed to standalone.');
        globalIsInstalled = true;
        globalIsInstallable = false;
        globalDeferredPrompt = null;
        notifyListeners();
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('[PWA Diagnostics] Global beforeinstallprompt event captured and preserved.');
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    globalIsInstallable = true;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA Diagnostics] Global appinstalled event fired.');
    globalDeferredPrompt = null;
    globalIsInstallable = false;
    globalIsInstalled = true;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [state, setState] = useState({
    isInstallable: globalIsInstallable,
    isInstalled: globalIsInstalled,
  });

  useEffect(() => {
    const handleChange = () => {
      setState({
        isInstallable: globalIsInstallable,
        isInstalled: globalIsInstalled,
      });
    };

    listeners.add(handleChange);
    handleChange(); // Sync state on mount

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;

    try {
      await globalDeferredPrompt.prompt();
      const choiceResult = await globalDeferredPrompt.userChoice;

      globalDeferredPrompt = null;
      globalIsInstallable = false;
      notifyListeners();

      return choiceResult.outcome === 'accepted';
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
      globalDeferredPrompt = null;
      globalIsInstallable = false;
      notifyListeners();
      return false;
    }
  };

  return {
    isInstallable: state.isInstallable,
    isInstalled: state.isInstalled,
    installApp,
  };
}

export function getPlatformInfo() {
  if (typeof window === 'undefined') {
    return { isIOS: false, isAndroid: false, isMobile: false, isChrome: false, isEdge: false, isSafari: false };
  }
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);

  return { isIOS, isAndroid, isMobile, isChrome, isEdge, isSafari };
}
