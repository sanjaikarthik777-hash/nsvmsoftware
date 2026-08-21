import React, { useState, useCallback } from 'react';
import { useQuotationStore } from '../store/quotationStore';
import { Quotation } from '../types/quotation';
import { QuotationForm } from '../components/forms/QuotationForm';
import { QuotationPreview } from '../components/preview/QuotationPreview';
import { Button } from '../components/ui/Button';
import { downloadQuotationPdf } from '../services/pdfGenerator';
import { downloadQuotationDocx } from '../services/docxGenerator';
import { shareViaWhatsApp } from '../services/whatsapp';
import { toast } from '../components/ui/Toast';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  ArrowLeft,
  Eye,
  Edit2
} from 'lucide-react';

export const NewQuotation: React.FC = () => {
  const { 
    setActivePage, 
    setEditingQuotationId, 
    editingQuotationId
  } = useQuotationStore();

  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  
  const handleWatch = useCallback((data: Partial<Quotation>) => {
    setFormData(data);
  }, []);
  const [formData, setFormData] = useState<Partial<Quotation>>({});
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Success handler after saving
  const handleSuccess = () => {
    setActivePage('quotations');
    setEditingQuotationId(null);
  };

  // Exit/Cancel handler
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to exit? Unsaved draft edits will be recovered next time.')) {
      setEditingQuotationId(null);
      setActivePage('dashboard');
    }
  };

  // PDF download handler
  const handlePdfDownload = async () => {
    setIsPdfLoading(true);
    try {
      const qNum = formData.quotationNumber || 'Draft';
      await downloadQuotationPdf('new-quotation-preview', `Quotation_${qNum}.pdf`);
      toast.success(`PDF downloaded: ${qNum}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // DOCX download handler
  const handleDocxDownload = async () => {
    if (!formData.quotationNumber) return;
    try {
      await downloadQuotationDocx(formData as Quotation);
      toast.success(`Word document downloaded: ${formData.quotationNumber}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Word document');
    }
  };

  // WhatsApp share handler
  const handleWhatsApp = () => {
    if (!formData.quotationNumber) return;
    // 1. Open WhatsApp Web direct link synchronously on click
    shareViaWhatsApp(formData as Quotation);
    
    // 2. Download PDF for attachment
    handlePdfDownload();
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Editor Header Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-slate-200 rounded-xl shadow-2xs no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 my-0">
              {editingQuotationId ? 'Edit Quotation Details' : 'Create Estimate'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {formData.quotationNumber ? `No: ${formData.quotationNumber}` : 'Generating number...'}
            </p>
          </div>
        </div>

        {/* Action Panel for Preview Output */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePdfDownload}
            isLoading={isPdfLoading}
            icon={<Download className="h-4 w-4 text-rose-600" />}
            className="flex-1 sm:flex-none"
          >
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDocxDownload}
            icon={<FileText className="h-4 w-4 text-blue-600" />}
            className="flex-1 sm:flex-none"
          >
            DOCX
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            icon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
            className="flex-1 sm:flex-none"
          >
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Tab Switcher for Mobile Devices */}
      <div className="md:hidden flex border-b border-slate-200 bg-white rounded-lg p-1.5 gap-1.5 shadow-2xs no-print">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'form' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Edit2 className="h-4 w-4" />
          Edit Form
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'preview' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Eye className="h-4 w-4" />
          Live Preview
        </button>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT: Input Form (Full width on mobile if 'form' active, hidden on mobile if 'preview' active) */}
        <div className={`md:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs no-print ${
          activeTab === 'form' ? 'block' : 'hidden md:block'
        }`}>
          <QuotationForm 
            onSuccess={handleSuccess} 
            onCancel={handleCancel}
            onWatch={handleWatch}
          />
        </div>

        {/* RIGHT: A4 Live Preview (Full width on mobile if 'preview' active, hidden on mobile if 'form' active) */}
        <div className={`md:col-span-6 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-inner sticky top-24 ${
          activeTab === 'preview' ? 'block' : 'hidden md:block'
        }`}>
          <QuotationPreview data={formData} elementId="new-quotation-preview" />
        </div>
      </div>
    </div>
  );
};
