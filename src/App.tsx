import { useEffect } from 'react';
import { useQuotationStore } from './store/quotationStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/Toast';
import { Dashboard } from './pages/Dashboard';
import { NewQuotation } from './pages/NewQuotation';
import { Quotations } from './pages/Quotations';
import { Settings } from './pages/Settings';
import nsvmLogo from '/nsvm-logo.png';

function App() {
  const { init, activePage, loading } = useQuotationStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <img src={nsvmLogo} alt="NSVM Industries" className="h-20 w-auto object-contain animate-pulse" />
          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Loading Local Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      {/* Responsive Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'new-quotation' && <NewQuotation />}
          {activePage === 'quotations' && <Quotations />}
          {activePage === 'settings' && <Settings />}
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default App;
