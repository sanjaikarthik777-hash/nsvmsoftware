import React, { useState } from 'react';
import { useQuotationStore } from '../../store/quotationStore';
import { 
  LayoutDashboard, 
  FilePlus, 
  FileText, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Hammer 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, setEditingQuotationId } = useQuotationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'new-quotation', label: 'New Quotation', icon: <FilePlus className="h-5 w-5" /> },
    { id: 'quotations', label: 'Quotations', icon: <FileText className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
  ] as const;

  const handleNavClick = (pageId: typeof menuItems[number]['id']) => {
    setActivePage(pageId);
    if (pageId === 'new-quotation') {
      // Clear editing ID when clicking "New Quotation" so it opens a fresh empty quotation
      setEditingQuotationId(null);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden no-print flex items-center justify-between bg-slate-900 text-white px-4 py-3 shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Hammer className="h-5 w-5 text-slate-400" />
          <div className="font-bold tracking-wider leading-none">
            <span className="block text-sm">NSVM</span>
            <span className="block text-[10px] text-slate-400">INDUSTRIES</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-300 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden no-print fixed inset-0 z-30 pt-14 bg-slate-900/95 text-white animate-in fade-in duration-150">
          <nav className="flex flex-col p-4 gap-2 mt-4">
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-slate-800 text-white font-medium border-l-4 border-slate-400' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar (Persistent Left Column) */}
      <aside className="hidden md:flex no-print flex-col w-64 bg-slate-900 text-white min-h-screen border-r border-slate-800 flex-shrink-0 sticky top-0">
        {/* Brand/Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
            <Hammer className="h-6 w-6 text-slate-300" />
          </div>
          <div>
            <div className="font-black text-lg tracking-wider leading-none">NSVM</div>
            <div className="text-xs text-slate-400 font-bold tracking-widest mt-0.5">INDUSTRIES</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-sm border-l-4 border-slate-400 pl-3' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          <div>NSVM Billing System</div>
          <div>v1.0.0 (Local First)</div>
        </div>
      </aside>
    </>
  );
};
