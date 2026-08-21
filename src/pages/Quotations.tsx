import React, { useState } from 'react';
import { useQuotationStore } from '../store/quotationStore';
import { Quotation, QuotationStatus } from '../types/quotation';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { formatCurrency, formatDate } from '../utils/formatting';
import { downloadQuotationDocx } from '../services/docxGenerator';
import { shareViaWhatsApp } from '../services/whatsapp';
import { downloadQuotationPdf } from '../services/pdfGenerator';
import { QuotationPreview } from '../components/preview/QuotationPreview';
import { toast } from '../components/ui/Toast';
import { 
  Search, 
  Trash2, 
  Copy, 
  Edit3, 
  Download, 
  MessageSquare, 
  FileText, 
  Calendar,
  X,
  Filter,
  Eye
} from 'lucide-react';

export const Quotations: React.FC = () => {
  const { 
    quotations, 
    searchQuery, 
    statusFilter, 
    dateFilter,
    setSearchQuery, 
    setStatusFilter, 
    setDateFilter,
    deleteQuotation,
    duplicateQuotation,
    setActivePage,
    setEditingQuotationId
  } = useQuotationStore();

  // Selected quotation for read-only viewing in a dialog (Optional, but great UX)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  // Delete confirmation modal states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF background rendering state
  const [pdfGeneratingQuotation, setPdfGeneratingQuotation] = useState<Quotation | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // DOCX loading state (prevents duplicate clicks)
  const [docxLoadingId, setDocxLoadingId] = useState<string | null>(null);

  // Filter logic
  const filteredQuotations = quotations.filter((q) => {
    // 1. Text Search (Matches quotation number, customer name, or project name)
    const qNum = q.quotationNumber.toLowerCase();
    const custName = q.customer.name.toLowerCase();
    const projName = q.project.name.toLowerCase();
    const search = searchQuery.toLowerCase().trim();
    
    const matchesSearch = 
      qNum.includes(search) || 
      custName.includes(search) || 
      projName.includes(search);
      
    // 2. Status Filter
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    
    // 3. Date Filter
    let matchesDate = true;
    const createdAt = q.createdAt || Date.now();
    const now = new Date();
    
    if (dateFilter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      matchesDate = createdAt >= startOfMonth;
    } else if (dateFilter === 'last_30_days') {
      const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
      matchesDate = createdAt >= last30Days;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Handle Edit Action
  const handleEdit = (id: string) => {
    setEditingQuotationId(id);
    setActivePage('new-quotation');
  };

  // Handle Delete Confirmation
  const handleDeleteRequest = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteQuotation(deletingId);
      toast.success('Quotation deleted successfully');
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quotation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Duplicate Action
  const handleDuplicate = async (quotation: Quotation) => {
    try {
      const newId = await duplicateQuotation(quotation);
      toast.success(`Duplicate quotation created!`);
      // Take the user straight to the editor to update customer info
      setEditingQuotationId(newId);
      setActivePage('new-quotation');
    } catch (err) {
      console.error(err);
      toast.error('Failed to duplicate quotation');
    }
  };

  // Handle PDF Compile (Hidden DOM Renderer)
  const handlePdfDownload = async (quotation: Quotation) => {
    if (pdfLoadingId) return; // prevent duplicate
    setPdfLoadingId(quotation.id || null);
    setPdfGeneratingQuotation(quotation);
    
    // Wait longer (500ms) so the hidden QuotationPreview fully renders
    // before html2canvas captures it — especially important on slower mobile
    setTimeout(async () => {
      try {
        await downloadQuotationPdf('hidden-history-pdf', `Quotation_${quotation.quotationNumber}.pdf`);
        toast.success(`PDF downloaded: ${quotation.quotationNumber}`);
      } catch (err) {
        console.error(err);
        toast.error('Unable to generate PDF. Please try again.');
      } finally {
        setPdfGeneratingQuotation(null);
        setPdfLoadingId(null);
      }
    }, 500);
  };

  // Handle DOCX download
  const handleDocxDownload = async (quotation: Quotation) => {
    if (docxLoadingId) return; // prevent duplicate
    setDocxLoadingId(quotation.id || null);
    try {
      await downloadQuotationDocx(quotation);
      toast.success(`Word document downloaded: ${quotation.quotationNumber}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Word document. Please try again.');
    } finally {
      setDocxLoadingId(null);
    }
  };

  // Handle WhatsApp Link Share
  const handleWhatsAppShare = (quotation: Quotation) => {
    // 1. Open WhatsApp immediately on click (synchronous to prevent popup blocking)
    shareViaWhatsApp(quotation);
    // 2. Download PDF for attachment
    handlePdfDownload(quotation);
  };

  // Status transition buttons inside row (Draft -> Ready -> Sent)
  const handleToggleStatus = async (quotation: Quotation, nextStatus: QuotationStatus) => {
    try {
      const updated: Quotation = {
        ...quotation,
        status: nextStatus
      };
      await useQuotationStore.getState().saveQuotation(updated);
      toast.success(`Status updated to ${nextStatus}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden container for PDF rendering with explicit A4 width */}
      {pdfGeneratingQuotation && (
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '794px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -99999,
          }}
        >
          <QuotationPreview data={pdfGeneratingQuotation} elementId="hidden-history-pdf" />
        </div>
      )}

      {/* 1. Header Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs no-print flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search number, customer or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-700 font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-700 font-semibold cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Quotations History List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-28">Quotation No</th>
                <th className="py-3.5 px-4 w-44">Customer Details</th>
                <th className="py-3.5 px-4 w-48">Project Description</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic bg-slate-50/20">
                    {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                      ? 'No quotations match the active filters.' 
                      : 'No quotations stored in the local database. Click "New Quotation" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const statusColors = {
                    draft: 'bg-slate-100 text-slate-700 border-slate-200',
                    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    sent: 'bg-blue-50 text-blue-700 border-blue-200'
                  };

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Quotation No */}
                      <td className="py-4 px-4 font-bold text-slate-900 font-mono">
                        {q.quotationNumber}
                      </td>
                      
                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{q.customer.name}</div>
                        {q.customer.phone && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{q.customer.phone}</div>
                        )}
                      </td>
                      
                      {/* Project info */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-700">{q.project.name}</div>
                        {q.project.siteLocation && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5" title={q.project.siteLocation}>
                            {q.project.siteLocation}
                          </div>
                        )}
                      </td>
                      
                      {/* Date */}
                      <td className="py-4 px-4 text-slate-500 font-mono">
                        {formatDate(q.date)}
                      </td>
                      
                      {/* Grand Total */}
                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(q.grandTotal)}
                      </td>
                      
                      {/* Status Toggle Box */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[q.status]}`}>
                            {q.status}
                          </span>
                          
                          {/* Quick Status transition picker */}
                          <div className="flex gap-1 no-print">
                            {q.status === 'draft' && (
                              <button
                                onClick={() => handleToggleStatus(q, 'ready')}
                                className="text-[8.5px] font-bold text-emerald-600 border border-emerald-200 px-1 py-0.5 rounded hover:bg-emerald-50 cursor-pointer"
                              >
                                Mark Ready
                              </button>
                            )}
                            {q.status === 'ready' && (
                              <button
                                onClick={() => handleToggleStatus(q, 'sent')}
                                className="text-[8.5px] font-bold text-blue-600 border border-blue-200 px-1 py-0.5 rounded hover:bg-blue-50 cursor-pointer"
                              >
                                Mark Sent
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Action buttons */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* View details */}
                          <button
                            onClick={() => setSelectedQuotation(q)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="View Document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(q.id || '')}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(q)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* PDF */}
                          <button
                            onClick={() => handlePdfDownload(q)}
                            disabled={!!pdfLoadingId}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={pdfLoadingId === q.id ? 'Generating PDF...' : 'Download PDF'}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* DOCX */}
                          <button
                            onClick={() => handleDocxDownload(q)}
                            disabled={!!docxLoadingId}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={docxLoadingId === q.id ? 'Generating Word...' : 'Download Word (.docx)'}
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppShare(q)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Send via WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteRequest(q.id || '')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* 3. Delete Confirmation Dialog */}
      <Dialog
        isOpen={deletingId !== null}
        title="Delete Quotation?"
        description="Are you absolutely sure you want to delete this quotation? This action cannot be undone and the record will be permanently deleted from local storage."
        confirmText="Delete permanently"
        confirmVariant="danger"
        cancelText="Cancel"
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />

      {/* 4. Full Document Modal View (Read Only Preview Modal) */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="relative w-full max-w-4xl bg-slate-100 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Title & Actions */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 my-0">
                  Quotation Preview: {selectedQuotation.quotationNumber}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {selectedQuotation.customer.name} - {selectedQuotation.project.name}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePdfDownload(selectedQuotation)}
                  isLoading={pdfLoadingId === selectedQuotation.id}
                  disabled={!!pdfLoadingId || !!docxLoadingId}
                  icon={<Download className="h-4 w-4 text-rose-600" />}
                >
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDocxDownload(selectedQuotation)}
                  isLoading={docxLoadingId === selectedQuotation.id}
                  disabled={!!pdfLoadingId || !!docxLoadingId}
                  icon={<FileText className="h-4 w-4 text-blue-600" />}
                >
                  DOCX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWhatsAppShare(selectedQuotation)}
                  disabled={!!pdfLoadingId || !!docxLoadingId}
                  icon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
                >
                  WhatsApp
                </Button>
                <button
                  onClick={() => setSelectedQuotation(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors ml-2 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <QuotationPreview data={selectedQuotation} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
