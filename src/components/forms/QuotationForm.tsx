import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quotationSchema } from '../../schemas/quotationSchema';
import { Quotation, CompanySnapshot } from '../../types/quotation';
import { useQuotationStore } from '../../store/quotationStore';
import { calculateQuotationTotals, calculateArea } from '../../utils/calculations';
import { generateNextQuotationNumber } from '../../utils/quotationNumber';
import { formatCurrency } from '../../utils/formatting';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save,
  Copy
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../db/dexie';

interface QuotationFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
  onWatch?: (data: Partial<Quotation>) => void;
}



export const QuotationForm: React.FC<QuotationFormProps> = ({ onSuccess, onCancel, onWatch }) => {
  const { 
    settings, 
    editingQuotationId, 
    quotations, 
    saveQuotation,
    saveActiveDraft,
    clearActiveDraft,
    activeDraft
  } = useQuotationStore();

  const [isLoading, setIsLoading] = useState(false);
  const currentSettings = settings || DEFAULT_SETTINGS;

  // Initialize form
  const { 
    register, 
    control, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors } 
  } = useForm<Quotation>({
    resolver: zodResolver(quotationSchema) as any,
    defaultValues: {
      quotationNumber: '',
      date: new Date().toISOString().split('T')[0],
      validUntil: '',
      customer: { name: '', phone: '', billingAddress: '' },
      project: { name: '', siteLocation: '' },
      preparedBy: '',
      items: [],
      remarks: '',
      labour: 0,
      installation: 0,
      discount: 0,
      discountType: 'percentage',
      gst: currentSettings.defaultGstPercentage,
      gstEnabled: false,
      advance: 0,
      paymentMode: 'Cash',
      terms: currentSettings.defaultTerms
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items'
  });

  // Watch entire form state to populate live preview and calculate totals
  const watchedData = watch();

  // Trigger onWatch callback for parent state syncing
  useEffect(() => {
    if (onWatch) {
      onWatch(watchedData);
    }
  }, [watchedData, onWatch]);

  // Load quotation data if editing or recover draft
  useEffect(() => {
    const setupForm = async () => {
      if (editingQuotationId) {
        // Load existing quotation
        const quot = quotations.find(q => q.id === editingQuotationId);
        if (quot) {
          reset(quot);
        } else {
          toast.error('Quotation not found');
          onCancel();
        }
      } else if (activeDraft && Object.keys(activeDraft).length > 0) {
        // Recover draft if available
        reset(activeDraft as Quotation);
        toast.info('Unsaved draft recovered');
      } else {
        // Create new quotation, populate defaults
        const nextNum = await generateNextQuotationNumber(
          currentSettings.prefix,
          currentSettings.startingNumber
        );
        
        const today = new Date();
        const validDate = new Date(today);
        validDate.setDate(today.getDate() + currentSettings.defaultValidityDays);

        reset({
          quotationNumber: nextNum,
          date: today.toISOString().split('T')[0],
          validUntil: validDate.toISOString().split('T')[0],
          customer: { name: '', phone: '', billingAddress: '' },
          project: { name: '', siteLocation: '' },
          preparedBy: '',
          items: [
            {
              id: crypto.randomUUID(),
              description: '',
              length: null,
              width: null,
              height: null,
              area: null,
              material: '',
              quantity: 1,
              unit: 'Nos',
              rate: 0,
              amount: 0
            }
          ],
          remarks: '',
          labour: 0,
          installation: 0,
          discount: 0,
          discountType: 'percentage',
          gst: currentSettings.defaultGstPercentage,
          gstEnabled: false,
          advance: 0,
          paymentMode: 'Cash',
          terms: currentSettings.defaultTerms
        });
      }
    };
    setupForm();
  }, [editingQuotationId, reset, quotations, activeDraft]);

  // Debounced auto-save draft
  useEffect(() => {
    if (!watchedData.quotationNumber) return;
    
    const delay = setTimeout(() => {
      saveActiveDraft(watchedData);
    }, 1000);

    return () => clearTimeout(delay);
  }, [watchedData, saveActiveDraft]);

  // Calculate live totals
  const totals = calculateQuotationTotals({
    items: watchedData.items || [],
    labour: watchedData.labour || 0,
    installation: watchedData.installation || 0,
    discount: watchedData.discount || 0,
    discountType: watchedData.discountType || 'percentage',
    gstPercentage: watchedData.gst || 0,
    gstEnabled: watchedData.gstEnabled || false,
    advance: watchedData.advance || 0
  });

  // Smart Auto-Calculation Handler for Row Dimensions, Area, and Amount
  const handleItemFieldChange = (index: number, updatedField?: 'length' | 'width' | 'height' | 'quantity' | 'unit' | 'rate' | 'area') => {
    const item = watchedData.items?.[index];
    if (!item) return;

    let currentArea = item.area;

    // Recalculate area if length/width change
    if (updatedField === 'length' || updatedField === 'width' || updatedField === 'height') {
      const calculatedArea = calculateArea(item.length, item.width, item.height);
      if (calculatedArea !== null) {
        currentArea = calculatedArea;
        setValue(`items.${index}.area`, calculatedArea);
      }
    }

    // Smart amount auto-calculation
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.rate) || 0;
    const area = Number(currentArea) || 0;
    const unit = item.unit;

    let computedAmount = 0;
    if ((unit === 'Sq.ft' || unit === 'Sq.m' || unit === 'Running ft') && area > 0) {
      computedAmount = Math.round(area * rate * qty);
    } else {
      computedAmount = Math.round(qty * rate);
    }

    if (computedAmount >= 0) {
      setValue(`items.${index}.amount`, computedAmount);
    }
  };

  // Duplicate an existing row
  const handleDuplicateRow = (index: number) => {
    const itemToClone = watchedData.items[index];
    if (!itemToClone) return;
    
    append({
      ...itemToClone,
      id: crypto.randomUUID(),
      description: itemToClone.description ? `${itemToClone.description} (Copy)` : ''
    });
    toast.success('Row duplicated');
  };



  // Terms and conditions inline state
  const [newTermText, setNewTermText] = useState('');

  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    const currentTerms = watchedData.terms || [];
    setValue('terms', [...currentTerms, newTermText.trim()]);
    setNewTermText('');
  };

  const handleRemoveTerm = (index: number) => {
    const currentTerms = watchedData.terms || [];
    setValue('terms', currentTerms.filter((_: any, i: number) => i !== index));
  };

  const handleMoveTerm = (index: number, direction: 'up' | 'down') => {
    const currentTerms = watchedData.terms || [];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentTerms.length - 1) return;
    
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...currentTerms];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;
    
    setValue('terms', reordered);
  };

  // Submit form
  const onSubmit = async (data: Quotation) => {
    setIsLoading(true);
    try {
      const companySnapshot: CompanySnapshot = {
        companyName: currentSettings.companyName,
        tagline: currentSettings.tagline,
        logo: currentSettings.logo,
        address: currentSettings.address,
        phone: currentSettings.phone,
        email: currentSettings.email,
        gstNumber: currentSettings.gstNumber
      };

      const finalQuotation: Quotation = {
        ...data,
        id: editingQuotationId || undefined,
        company: companySnapshot,
        subtotal: totals.itemsSubtotal,
        grandTotal: totals.grandTotal,
        balance: totals.balance,
        status: editingQuotationId ? data.status : 'draft',
        createdAt: editingQuotationId ? (quotations.find(q => q.id === editingQuotationId)?.createdAt || Date.now()) : Date.now()
      };

      const id = await saveQuotation(finalQuotation);
      await clearActiveDraft();
      toast.success(editingQuotationId ? 'Quotation updated successfully' : 'Quotation created successfully');
      onSuccess(id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save quotation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as any))} className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin">
      
      {/* 1. Header Meta Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Quotation Number
          </label>
          <input
            type="text"
            {...register('quotationNumber')}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.quotationNumber && (
            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.quotationNumber.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Quotation Date
          </label>
          <input
            type="date"
            {...register('date')}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.date && (
            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Valid Until
          </label>
          <input
            type="date"
            {...register('validUntil')}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {errors.validUntil && (
            <p className="text-xs text-rose-600 mt-1 font-medium">{errors.validUntil.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Prepared By
          </label>
          <input
            type="text"
            placeholder="Owner / Estimator name"
            {...register('preparedBy')}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* 2. Customer & Project Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Details Column */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Customer Details
          </h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name *</label>
            <input
              type="text"
              placeholder="Enter customer name"
              {...register('customer.name')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {errors.customer?.name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customer.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              {...register('customer.phone')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {errors.customer?.phone && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customer.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Billing Address</label>
            <textarea
              rows={2}
              placeholder="Customer address"
              {...register('customer.billingAddress')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
          </div>
        </div>

        {/* Project Details Column */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Project Details
          </h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Project / Work Name *</label>
            <input
              type="text"
              placeholder="e.g. MS Main Gate Fabrication"
              {...register('project.name')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {errors.project?.name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.project.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Site / Work Location</label>
            <textarea
              rows={3}
              placeholder="Enter site delivery/fabrication location details"
              {...register('project.siteLocation')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Work / Material Specification Table (Enhanced & Comfortable) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
              Work / Material Specification Table
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Auto-calculates Area (L x W) and Amount (Qty x Rate or Area x Rate). Reorder or duplicate rows easily.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Custom Item */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({
                id: crypto.randomUUID(),
                description: '',
                length: null,
                width: null,
                height: null,
                area: null,
                material: '',
                quantity: 1,
                unit: 'Nos',
                rate: 0,
                amount: 0
              })}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Dynamic Table Scroll Container */}
        <div className="overflow-x-auto scrollbar-thin border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-left text-xs min-w-[1050px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-2 text-center w-10">#</th>
                <th className="py-3 px-2 text-center w-16">Move</th>
                <th className="py-3 px-3 w-56">Work Description *</th>
                <th className="py-3 px-2 text-center w-36">Dimensions (L x W x H)</th>
                <th className="py-3 px-2 text-center w-20">Area</th>
                <th className="py-3 px-2 w-32">Material / Spec</th>
                <th className="py-3 px-2 text-center w-16">Qty *</th>
                <th className="py-3 px-2 w-24">Unit *</th>
                <th className="py-3 px-2 text-right w-24">Rate (₹) *</th>
                <th className="py-3 px-2 text-right w-28">Amount (₹) *</th>
                <th className="py-3 px-2 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {fields.map((field, idx) => {
                return (
                  <tr key={field.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Index */}
                    <td className="py-3 px-2 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Move Row Up / Down */}
                    <td className="py-3 px-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => move(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, idx + 1)}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    
                    {/* Description */}
                    <td className="py-3 px-3">
                      <textarea
                        rows={2}
                        placeholder="e.g. Balcony Grill Fabrication & Installation..."
                        {...register(`items.${idx}.description` as const)}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-y"
                      />
                      {errors.items?.[idx]?.description && (
                        <p className="text-[10px] text-rose-600 mt-0.5">{errors.items[idx]?.description?.message}</p>
                      )}
                    </td>

                    {/* Compact Dimension Inputs (L x W x H) */}
                    <td className="py-3 px-2">
                      <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 border border-slate-200 rounded-md">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 text-center">L</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            {...register(`items.${idx}.length` as const, { 
                              valueAsNumber: true,
                              onChange: () => handleItemFieldChange(idx, 'length')
                            })}
                            className="w-full text-center bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 text-center">W</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            {...register(`items.${idx}.width` as const, { 
                              valueAsNumber: true,
                              onChange: () => handleItemFieldChange(idx, 'width')
                            })}
                            className="w-full text-center bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 text-center">H</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            {...register(`items.${idx}.height` as const, { 
                              valueAsNumber: true,
                              onChange: () => handleItemFieldChange(idx, 'height')
                            })}
                            className="w-full text-center bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Area */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        step="any"
                        placeholder="Area"
                        {...register(`items.${idx}.area` as const, { 
                          valueAsNumber: true,
                          onChange: () => handleItemFieldChange(idx, 'area')
                        })}
                        className="w-full text-center bg-slate-50 border border-slate-200 rounded-md px-1 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono text-xs"
                      />
                    </td>

                    {/* Material with Quick Suggestions */}
                    <td className="py-3 px-2 space-y-1">
                      <input
                        type="text"
                        placeholder="e.g. SS 304"
                        {...register(`items.${idx}.material` as const)}
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />

                    </td>

                    {/* Qty */}
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        placeholder="1"
                        {...register(`items.${idx}.quantity` as const, { 
                          valueAsNumber: true,
                          onChange: () => handleItemFieldChange(idx, 'quantity')
                        })}
                        className="w-full text-center bg-white border border-slate-200 rounded-md px-1 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      {errors.items?.[idx]?.quantity && (
                        <p className="text-[10px] text-rose-600 mt-0.5">{errors.items[idx]?.quantity?.message}</p>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-2">
                      <select
                        {...register(`items.${idx}.unit` as const, {
                          onChange: () => handleItemFieldChange(idx, 'unit')
                        })}
                        className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="Nos">Nos</option>
                        <option value="Sq.ft">Sq.ft</option>
                        <option value="Running ft">Running ft</option>
                        <option value="Kg">Kg</option>
                        <option value="Meter">Meter</option>
                        <option value="Sq.m">Sq.m</option>
                        <option value="Set">Set</option>
                        <option value="Piece">Piece</option>
                        <option value="Ls">Lump sum</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        placeholder="Rate"
                        {...register(`items.${idx}.rate` as const, { 
                          valueAsNumber: true,
                          onChange: () => handleItemFieldChange(idx, 'rate')
                        })}
                        className="w-full text-right bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                      />
                      {errors.items?.[idx]?.rate && (
                        <p className="text-[10px] text-rose-600 mt-0.5">{errors.items[idx]?.rate?.message}</p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        placeholder="Amount"
                        {...register(`items.${idx}.amount` as const, { valueAsNumber: true })}
                        className="w-full text-right bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono text-xs"
                      />
                      {errors.items?.[idx]?.amount && (
                        <p className="text-[10px] text-rose-600 mt-0.5">{errors.items[idx]?.amount?.message}</p>
                      )}
                    </td>

                    {/* Actions: Duplicate & Delete */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Duplicate Row"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Charges & Payment Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Remarks & Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs md:col-span-1 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Remarks & Comments
          </h3>
          <div>
            <textarea
              rows={6}
              placeholder="Add payment structure details, delivery timelines, specific remarks, or itemized descriptions..."
              {...register('remarks')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
          </div>
        </div>

        {/* Financial Adjustments Forms */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs md:col-span-1 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Charges & Adjustments
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Labour Charges (₹)</label>
              <input
                type="number"
                {...register('labour', { valueAsNumber: true })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Installation / Transport (₹)</label>
              <input
                type="number"
                {...register('installation', { valueAsNumber: true })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Discount Value</label>
              <input
                type="number"
                {...register('discount', { valueAsNumber: true })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select
                {...register('discountType')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="percentage">%</option>
                <option value="fixed">Flat</option>
              </select>
            </div>
          </div>

          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">GST Enable Tax</span>
              <Controller
                control={control}
                name="gstEnabled"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded-md text-slate-900 border-slate-300 focus:ring-slate-500 cursor-pointer"
                  />
                )}
              />
            </div>
            
            {watchedData.gstEnabled && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">GST Tax Percentage (%)</label>
                <input
                  type="number"
                  {...register('gst', { valueAsNumber: true })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary Column */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs md:col-span-1 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
            Payment Summary
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Advance Received (₹)</label>
            <input
              type="number"
              {...register('advance', { valueAsNumber: true })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-emerald-800 font-bold focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode</label>
            <select
              {...register('paymentMode')}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Outstanding helper summary */}
          <div className="border border-slate-100 bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Grand Total:</span>
              <span className="font-bold text-slate-800">{formatCurrency(totals.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Advance:</span>
              <span className="font-bold text-emerald-700">-{formatCurrency(watchedData.advance || 0)}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-700">Balance:</span>
              <span className="font-black text-rose-700">{formatCurrency(totals.balance)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Terms & Conditions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wide">
          <span className="w-1.5 h-3.5 bg-slate-900 rounded-xs" />
          Terms & Conditions
        </h3>
        
        {/* Terms list */}
        <div className="space-y-2">
          {watchedData.terms?.map((term: string, index: number) => (
            <div key={index} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 bg-white">
              <span className="font-bold text-xs text-slate-400 w-5 text-right">{index + 1}.</span>
              <input
                type="text"
                value={term}
                onChange={(e) => {
                  const updated = [...watchedData.terms];
                  updated[index] = e.target.value;
                  setValue('terms', updated);
                }}
                className="flex-1 text-xs text-slate-700 bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-slate-400 py-0.5"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveTerm(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveTerm(index, 'down')}
                  disabled={index === watchedData.terms.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                  title="Remove Term"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom term row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add custom terms & conditions line item..."
            value={newTermText}
            onChange={(e) => setNewTermText(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTerm();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddTerm}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Term
          </Button>
        </div>
      </div>

      {/* 6. Form Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          icon={<Save className="h-4 w-4" />}
        >
          {editingQuotationId ? 'Save Quotation' : 'Save As Draft'}
        </Button>
      </div>
      
    </form>
  );
};
