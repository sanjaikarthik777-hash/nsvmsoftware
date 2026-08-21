import { useEffect } from 'react';
import { useQuotationStore } from './store/quotationStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/Toast';
import { Dashboard } from './pages/Dashboard';
import { NewQuotation } from './pages/NewQuotation';
import { Quotations } from './pages/Quotations';
import { Settings } from './pages/Settings';
import { Hammer } from 'lucide-react';

function App() {
  const { init, activePage, loading } = useQuotationStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg animate-pulse">
            <Hammer className="h-10 w-10 text-slate-300 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center">
            <span className="block text-base font-black tracking-widest uppercase">NSVM INDUSTRIES</span>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Loading Local Workspace...
            </span>
          </div>
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
