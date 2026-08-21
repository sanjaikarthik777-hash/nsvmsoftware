import React, { useState } from 'react';
import { useQuotationStore } from '../store/quotationStore';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Quotation } from '../types/quotation';
import { Button } from '../components/ui/Button';
import { PwaInstallModal } from '../components/ui/PwaInstallModal';
import { formatCurrency, formatDate } from '../utils/formatting';
import { downloadQuotationDocx } from '../services/docxGenerator';
import { shareViaWhatsApp } from '../services/whatsapp';
import { downloadQuotationPdf } from '../services/pdfGenerator';
import { QuotationPreview } from '../components/preview/QuotationPreview';
import { toast } from '../components/ui/Toast';
import { 
  FilePlus, 
  FileText, 
  FileCheck, 
  Clock, 
  TrendingUp, 
  Edit3, 
  Download, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    quotations, 
    setActivePage, 
    setEditingQuotationId 
  } = useQuotationStore();

  const { isInstallable, isInstalled, installApp } = usePwaInstall();

  const [pdfGeneratingQuotation, setPdfGeneratingQuotation] = useState<Quotation | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
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

  // Switch to new quotation form
  const handleCreateNew = () => {
    setEditingQuotationId(null);
    setActivePage('new-quotation');
  };

  // Calculations for summary cards
  const totalCount = quotations.length;
  const draftCount = quotations.filter(q => q.status === 'draft').length;
  const readyCount = quotations.filter(q => q.status === 'ready' || q.status === 'sent').length;
  
  // Calculate this month's total value and count
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthQuotations = quotations.filter(q => q.createdAt >= startOfMonth);
  const thisMonthTotal = thisMonthQuotations.reduce((sum, q) => sum + q.grandTotal, 0);

  // Take recent 5 quotations
  const recentQuotations = quotations.slice(0, 5);

  // Handle PDF downloads from list using hidden DOM renderer
  const handlePdfDownload = async (quotation: Quotation) => {
    setPdfLoading(quotation.id || null);
    setPdfGeneratingQuotation(quotation);
    
    // Allow React a moment to render the hidden preview inside the DOM
    setTimeout(async () => {
      try {
        await downloadQuotationPdf('hidden-dashboard-pdf', `Quotation_${quotation.quotationNumber}.pdf`);
        toast.success(`PDF downloaded: ${quotation.quotationNumber}`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to generate PDF');
      } finally {
        setPdfGeneratingQuotation(null);
        setPdfLoading(null);
      }
    }, 200);
  };

  // Handle DOCX download
  const handleDocxDownload = async (quotation: Quotation) => {
    try {
      await downloadQuotationDocx(quotation);
      toast.success(`Word document downloaded: ${quotation.quotationNumber}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Word document');
    }
  };

  // Handle WhatsApp click
  const handleWhatsApp = (quotation: Quotation) => {
    // 1. Open WhatsApp immediately on click (synchronous to prevent popup blocking)
    shareViaWhatsApp(quotation);
    
    // 2. Download PDF for attachment
    handlePdfDownload(quotation);
  };

  // Switch to editing quotation
  const handleEdit = (id: string) => {
    setEditingQuotationId(id);
    setActivePage('new-quotation');
  };

  return (
    <div className="space-y-6">
      
      {/* Hidden container for PDF rendering */}
      {pdfGeneratingQuotation && (
        <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
          <QuotationPreview data={pdfGeneratingQuotation} elementId="hidden-dashboard-pdf" />
        </div>
      )}

      {/* Top CTA Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight leading-none my-0">
            Welcome to NSVM Industries Estimator
          </h2>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Create professional, local-first fabrication and material quotations instantly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {!isInstalled && (
            <Button
              variant="outline"
              onClick={handleInstallClick}
              icon={<Download className="h-4 w-4" />}
              className="w-full sm:w-auto font-semibold border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              Install App
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleCreateNew}
            icon={<FilePlus className="h-5 w-5" />}
            className="w-full sm:w-auto font-semibold"
          >
            Create New Quotation
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-700">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">{totalCount}</span>
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Drafts</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">{draftCount}</span>
          </div>
        </div>

        {/* Ready */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ready / Sent</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">{readyCount}</span>
          </div>
        </div>

        {/* This Month Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">This Month</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block truncate max-w-[130px]" title={formatCurrency(thisMonthTotal)}>
              {formatCurrency(thisMonthTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Recent Quotations
          </h3>
          <button 
            onClick={() => setActivePage('quotations')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            View All History
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Quotation No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No quotations found. Click "Create New Quotation" to begin.
                  </td>
                </tr>
              ) : (
                recentQuotations.map((q) => {
                  const statusColors = {
                    draft: 'bg-slate-100 text-slate-700 border-slate-200',
                    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    sent: 'bg-blue-50 text-blue-700 border-blue-200'
                  };

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-950 font-mono">
                        {q.quotationNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {q.customer.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {q.project.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(q.date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-950 font-mono">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[q.status]}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(q.id || '')}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit Quotation"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handlePdfDownload(q)}
                            disabled={pdfLoading === q.id}
                            className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-40"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDocxDownload(q)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Download Word (DOCX)"
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleWhatsApp(q)}
                            className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Send via WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PWA Guidance Modal */}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNativeInstall={installApp}
        isNativeInstallAvailable={isInstallable}
      />
    </div>
  );
};
