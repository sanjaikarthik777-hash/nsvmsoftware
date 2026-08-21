import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Quotation, CompanySnapshot, BusinessSettings } from '../../types/quotation';
import { useQuotationStore } from '../../store/quotationStore';
import { calculateQuotationTotals } from '../../utils/calculations';
import { formatCurrency, formatDate, numberToWords } from '../../utils/formatting';
import { DEFAULT_SETTINGS } from '../../db/dexie';

interface QuotationPreviewProps {
  data: Partial<Quotation>;
  elementId?: string;
}

export const QuotationPreview: React.FC<QuotationPreviewProps> = ({ data, elementId = 'quotation-preview' }) => {
  const { settings } = useQuotationStore();
  
  // Use quotation's company snapshot if available (for saved records),
  // otherwise fallback to current global settings, then default settings
  const company: CompanySnapshot | BusinessSettings = data.company || settings || DEFAULT_SETTINGS;

  const items = data.items || [];
  const labour = data.labour || 0;
  const installation = data.installation || 0;
  const discount = data.discount || 0;
  const discountType = data.discountType || 'percentage';
  const gstPercentage = data.gst || 0;
  const gstEnabled = data.gstEnabled || false;
  const advance = data.advance || 0;

  // Calculate totals centrally
  const totals = calculateQuotationTotals({
    items,
    labour,
    installation,
    discount,
    discountType,
    gstPercentage,
    gstEnabled,
    advance
  });

  // --- Responsive Scaling: shrinks the A4 block to fit any container ---
  const containerRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [wrapperHeight, setWrapperHeight] = useState(0);

  const updateScale = useCallback(() => {
    const container = containerRef.current;
    const a4 = a4Ref.current;
    if (!container || !a4) return;
    const A4_W_PX = 794; // 210mm at 96 dpi
    const availableW = container.offsetWidth - 16; // 8px gutter each side
    const newScale = Math.min(1, availableW / A4_W_PX);
    const centeredLeft = Math.max(0, (container.offsetWidth - A4_W_PX * newScale) / 2);
    setScale(newScale);
    setOffsetLeft(centeredLeft);
    setWrapperHeight(a4.scrollHeight * newScale + 24); // 12px top + 12px bottom padding
  }, []);

  useEffect(() => {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    const container = containerRef.current;
    const a4 = a4Ref.current;
    if (container) ro.observe(container);
    if (a4) ro.observe(a4); // re-scale when content height changes (more items, longer remarks)
    return () => ro.disconnect();
  }, [updateScale]);

  // Re-measure whenever form data changes (content height may grow/shrink)
  useEffect(() => {
    updateScale();
  }, [data, updateScale]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-100/50 relative overflow-hidden"
      style={{
        height: wrapperHeight > 0 ? `${wrapperHeight}px` : 'auto',
        minHeight: '300px',
      }}
    >
      {/* Scale wrapper — positions and scales the A4 block to fit the container */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: `${offsetLeft}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: '210mm',
        }}
      >
        <div
          ref={a4Ref}
          id={elementId}
          className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-lg p-10 font-sans flex flex-col justify-between box-border border border-slate-200 select-none text-[12px] leading-relaxed"
          style={{ contentVisibility: 'auto' }}
        >
          <div>
            {/* Header: Company Profile */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-wider uppercase leading-none">
                    {company.companyName}
                  </h1>
                  {company.tagline && (
                    <p className="text-[10px] text-slate-500 italic mt-1 font-medium tracking-wide">
                      {company.tagline}
                    </p>
                  )}
                  <div className="text-[9.5px] text-slate-600 mt-2.5 max-w-md space-y-0.5">
                    <p>{company.address}</p>
                    <p className="font-semibold text-slate-700">
                      Phone: {company.phone} &nbsp;|&nbsp; Email: {company.email}
                    </p>
                  </div>
                </div>

                {/* Company Logo */}
                {company.logo && (
                  <div className="ml-4 h-16 w-32 flex items-center justify-end overflow-hidden">
                    <img
                      src={company.logo}
                      alt="Company Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {company.gstNumber && (
                <div className="text-[9px] text-slate-500 mt-2">
                  GSTIN: <span className="font-bold text-slate-800">{company.gstNumber}</span>
                </div>
              )}
            </div>

            {/* Document Title Banner */}
            <div className="text-center bg-slate-900 text-white py-1.5 font-bold tracking-widest text-[13px] uppercase rounded-sm mb-5">
              Quotation
            </div>

            {/* Meta Information Details */}
            <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg p-3.5 mb-5 bg-slate-50/50">
              <div>
                <table className="w-full text-[10.5px]">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 font-medium py-0.5">Quotation No:</td>
                      <td className="font-bold text-slate-900 py-0.5">{data.quotationNumber || 'NSVM-xxx'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="text-slate-500 font-medium py-0.5">Quotation Date:</td>
                      <td className="text-slate-800 py-0.5">{formatDate(data.date || '')}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="text-slate-500 font-medium py-0.5">Valid Until:</td>
                      <td className="text-slate-800 py-0.5">{formatDate(data.validUntil || '')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <table className="w-full text-[10.5px]">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-24 text-slate-500 font-medium py-0.5">Prepared By:</td>
                      <td className="text-slate-800 py-0.5">{data.preparedBy || 'N/A'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="text-slate-500 font-medium py-0.5">Project / Work:</td>
                      <td className="text-slate-800 font-semibold py-0.5">{data.project?.name || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer & Site Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-5 border border-slate-200 rounded-lg overflow-hidden">
              {/* Customer Details */}
              <div className="p-3.5">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[10px] tracking-wider">
                  Customer Details
                </h3>
                <div className="space-y-1 text-[10.5px]">
                  <p className="font-bold text-slate-800">{data.customer?.name || 'N/A'}</p>
                  {data.customer?.phone && (
                    <p className="text-slate-600">Phone: <span className="text-slate-800 font-medium">{data.customer.phone}</span></p>
                  )}
                  {data.customer?.billingAddress && (
                    <p className="text-slate-500 leading-normal">{data.customer.billingAddress}</p>
                  )}
                </div>
              </div>

              {/* Site / Project Location Details */}
              <div className="p-3.5 border-l border-slate-200 bg-slate-50/30">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[10px] tracking-wider">
                  Site Location
                </h3>
                <div className="space-y-1 text-[10.5px]">
                  {data.project?.siteLocation ? (
                    <p className="text-slate-700 leading-normal">{data.project.siteLocation}</p>
                  ) : (
                    <p className="text-slate-400 italic">No site location specified</p>
                  )}
                </div>
              </div>
            </div>

            {/* Work / Material Specification Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-3 border-b border-slate-800 text-center w-8">#</th>
                    <th className="py-2.5 px-3 border-b border-slate-800">Work Description</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-center w-28">Dimensions (L x W x H)</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-right w-20">Area</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-center w-24">Material/Grade</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-center w-14">Qty</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-right w-20">Rate (₹)</th>
                    <th className="py-2.5 px-3 border-b border-slate-800 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 italic bg-slate-50/50">
                        No work items added.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      // Build dimensions string
                      let dimStr = '-';
                      if (item.length !== null || item.width !== null || item.height !== null) {
                        const parts = [
                          item.length !== null ? `${item.length}L` : '',
                          item.width !== null ? `${item.width}W` : '',
                          item.height !== null ? `${item.height}H` : ''
                        ].filter(Boolean);
                        dimStr = parts.join(' x ');
                      }

                      const areaStr = item.area !== null ? `${item.area} ${item.unit}` : '-';

                      return (
                        <tr key={item.id} className="item-row hover:bg-slate-50/20">
                          <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800 max-w-[200px] break-words whitespace-pre-line">
                            {item.description}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 font-mono text-[10px]">{dimStr}</td>
                          <td className="py-2 px-3 text-right text-slate-700">{areaStr}</td>
                          <td className="py-2 px-3 text-center text-slate-700">{item.material || '-'}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-800">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-700 font-mono">{formatCurrency(item.rate).replace('₹', '')}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(item.amount).replace('₹', '')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pricing Calculations & Summary Grid */}
            <div className="grid grid-cols-12 gap-5 mb-5 items-start totals-block">
              {/* Left: Remarks & Word Amount */}
              <div className="col-span-7 space-y-4">
                {data.remarks && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider mb-1.5">
                      Additional Remarks / Work Details
                    </h4>
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/30 whitespace-pre-line text-slate-600 leading-relaxed text-[10px]">
                      {data.remarks}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Total Amount in Words:</p>
                  <p className="text-[10.5px] font-bold text-slate-800 italic mt-0.5">
                    {numberToWords(totals.grandTotal)}
                  </p>
                </div>
              </div>

              {/* Right: Totals details list */}
              <div className="col-span-5 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                <table className="w-full text-[10.5px]">
                  <tbody className="divide-y divide-slate-200/60">
                    <tr className="align-middle">
                      <td className="py-2 px-3.5 text-slate-500">Work Subtotal:</td>
                      <td className="py-2 px-3.5 text-right font-semibold text-slate-800 font-mono">
                        {formatCurrency(totals.itemsSubtotal)}
                      </td>
                    </tr>

                    {labour > 0 && (
                      <tr className="align-middle">
                        <td className="py-2 px-3.5 text-slate-500">Labour & Fabrication:</td>
                        <td className="py-2 px-3.5 text-right font-semibold text-slate-800 font-mono">
                          {formatCurrency(labour)}
                        </td>
                      </tr>
                    )}

                    {installation > 0 && (
                      <tr className="align-middle">
                        <td className="py-2 px-3.5 text-slate-500">Installation & Transport:</td>
                        <td className="py-2 px-3.5 text-right font-semibold text-slate-800 font-mono">
                          {formatCurrency(installation)}
                        </td>
                      </tr>
                    )}

                    <tr className="align-middle bg-slate-100/40">
                      <td className="py-2 px-3.5 font-bold text-slate-700">Subtotal:</td>
                      <td className="py-2 px-3.5 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(totals.subtotal)}
                      </td>
                    </tr>

                    {discount > 0 && (
                      <tr className="align-middle text-rose-700">
                        <td className="py-2 px-3.5 text-slate-500">
                          Discount ({discountType === 'percentage' ? `${discount}%` : 'Fixed'}):
                        </td>
                        <td className="py-2 px-3.5 text-right font-semibold font-mono">
                          -{formatCurrency(totals.discountAmount)}
                        </td>
                      </tr>
                    )}

                    {gstEnabled && (
                      <tr className="align-middle">
                        <td className="py-2 px-3.5 text-slate-500">GST ({gstPercentage}%):</td>
                        <td className="py-2 px-3.5 text-right font-semibold text-slate-800 font-mono">
                          {formatCurrency(totals.gstAmount)}
                        </td>
                      </tr>
                    )}

                    <tr className="align-middle bg-slate-900 text-white font-bold text-[11px]">
                      <td className="py-2.5 px-3.5 uppercase tracking-wide">Grand Total:</td>
                      <td className="py-2.5 px-3.5 text-right font-bold font-mono">
                        {formatCurrency(totals.grandTotal)}
                      </td>
                    </tr>

                    <tr className="align-middle">
                      <td className="py-2 px-3.5 text-slate-500">Advance Received:</td>
                      <td className="py-2 px-3.5 text-right font-semibold text-emerald-700 font-mono">
                        {formatCurrency(advance)}
                      </td>
                    </tr>

                    <tr className="align-middle bg-slate-50 text-[10.5px]">
                      <td className="py-2 px-3.5 font-bold text-slate-800">Balance Outstanding:</td>
                      <td className="py-2 px-3.5 text-right font-black text-rose-700 font-mono">
                        {formatCurrency(totals.balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms and Conditions List */}
            {data.terms && data.terms.length > 0 && (
              <div className="mb-8 page-break-avoid">
                <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider mb-2">
                  Terms & Conditions
                </h4>
                <ol className="list-decimal pl-4.5 space-y-1 text-slate-500 text-[9px] leading-relaxed">
                  {data.terms.map((term, index) => (
                    <li key={index} className="pl-0.5">{term}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Footer Signature Blocks */}
          <div className="signature-section pt-8 border-t border-slate-200 mt-6 page-break-avoid">
            <div className="flex justify-between items-end">
              <div className="w-60">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-12">
                  Customer Acceptance
                </p>
                <div className="space-y-2 text-[10px] text-slate-500">
                  <p>Name: ____________________________</p>
                  <p>Signature: _________________________</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-semibold mb-12">
                  For <span className="font-bold text-slate-800 uppercase">{company.companyName}</span>
                </p>
                <div className="space-y-1">
                  <div className="h-0.5 w-44 bg-slate-200 ml-auto" />
                  <p className="text-[10px] text-slate-500 font-bold pt-1.5 uppercase tracking-wide">
                    Authorized Signatory / Seal
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center text-[8.5px] text-slate-400 mt-10">
              Thank you for your business! This is a computer-generated document.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
