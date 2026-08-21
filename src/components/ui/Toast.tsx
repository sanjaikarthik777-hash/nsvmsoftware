import React from 'react';
import { create } from 'zustand';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type, duration = 3500) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    
    // Automatically remove toast after duration
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  }
}));

// Export a clean toast trigger object
export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, 'success', duration),
  error: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, 'error', duration),
  info: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, 'info', duration),
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full no-print">
      {toasts.map((item) => {
        const bgColors = {
          success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          error: 'bg-rose-50 border-rose-200 text-rose-900',
          info: 'bg-blue-50 border-blue-200 text-blue-900'
        };

        const icons = {
          success: <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />,
          error: <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />,
          info: <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
        };

        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-200 ${bgColors[item.type]}`}
          >
            {icons[item.type]}
            <div className="flex-1 text-sm font-medium leading-5">
              {item.message}
            </div>
            <button
              onClick={() => removeToast(item.id)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded-md cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
