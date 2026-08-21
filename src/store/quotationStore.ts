import { create } from 'zustand';
import { db, DEFAULT_SETTINGS, initializeDatabase } from '../db/dexie';
import { Quotation, BusinessSettings } from '../types/quotation';
import { generateNextQuotationNumber } from '../utils/quotationNumber';

interface QuotationState {
  settings: BusinessSettings | null;
  quotations: Quotation[];
  activeDraft: Partial<Quotation> | null;
  loading: boolean;
  
  // Navigation State
  activePage: 'dashboard' | 'new-quotation' | 'quotations' | 'settings';
  editingQuotationId: string | null;
  
  // Search & Filters
  searchQuery: string;
  statusFilter: string;
  dateFilter: string;
  
  // Actions
  init: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: BusinessSettings) => Promise<void>;
  loadQuotations: () => Promise<void>;
  saveQuotation: (quotation: Quotation) => Promise<string>;
  deleteQuotation: (id: string) => Promise<void>;
  duplicateQuotation: (quotation: Quotation) => Promise<string>;
  
  // Draft Auto-Save Actions
  saveActiveDraft: (draft: Partial<Quotation>) => Promise<void>;
  loadActiveDraft: () => Promise<Partial<Quotation> | null>;
  clearActiveDraft: () => Promise<void>;
  
  // Navigation Actions
  setActivePage: (page: 'dashboard' | 'new-quotation' | 'quotations' | 'settings') => void;
  setEditingQuotationId: (id: string | null) => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setDateFilter: (filter: string) => void;
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
  settings: null,
  quotations: [],
  activeDraft: null,
  loading: true,
  activePage: 'dashboard',
  editingQuotationId: null,
  searchQuery: '',
  statusFilter: 'all',
  dateFilter: 'all',

  init: async () => {
    set({ loading: true });
    try {
      await initializeDatabase();
      await get().loadSettings();
      await get().loadQuotations();
      await get().loadActiveDraft();
    } catch (e) {
      console.error('Error during database initialization:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadSettings: async () => {
    const record = await db.settings.get('business_info');
    if (record) {
      set({ settings: record.value });
    } else {
      set({ settings: DEFAULT_SETTINGS });
    }
  },

  updateSettings: async (newSettings: BusinessSettings) => {
    await db.settings.put({
      key: 'business_info',
      value: newSettings
    });
    set({ settings: newSettings });
  },

  loadQuotations: async () => {
    const list = await db.quotations.orderBy('createdAt').reverse().toArray();
    set({ quotations: list });
  },

  saveQuotation: async (quotation: Quotation) => {
    // Generate id if new
    const finalQuotation: Quotation = {
      ...quotation,
      id: quotation.id || crypto.randomUUID(),
      updatedAt: Date.now(),
      createdAt: quotation.createdAt || Date.now()
    };
    
    await db.quotations.put(finalQuotation);
    await get().loadQuotations();
    await get().clearActiveDraft();
    return finalQuotation.id as string;
  },

  deleteQuotation: async (id: string) => {
    await db.quotations.delete(id);
    await get().loadQuotations();
  },

  duplicateQuotation: async (quotation: Quotation) => {
    const settings = get().settings || DEFAULT_SETTINGS;
    
    // Generate a fresh unique quotation number for the duplicate
    const nextQuotationNumber = await generateNextQuotationNumber(
      settings.prefix,
      settings.startingNumber
    );

    // Create duplicate
    const newQuotation: Quotation = {
      ...quotation,
      id: crypto.randomUUID(),
      quotationNumber: nextQuotationNumber,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + settings.defaultValidityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      // Maintain same items, but refresh dates
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.quotations.put(newQuotation);
    await get().loadQuotations();
    return newQuotation.id as string;
  },

  saveActiveDraft: async (draft: Partial<Quotation>) => {
    // Save draft in IndexedDB settings table under 'active_draft'
    await db.settings.put({
      key: 'active_draft',
      value: draft
    });
    set({ activeDraft: draft });
  },

  loadActiveDraft: async () => {
    const record = await db.settings.get('active_draft');
    if (record) {
      set({ activeDraft: record.value });
      return record.value;
    }
    return null;
  },

  clearActiveDraft: async () => {
    await db.settings.delete('active_draft');
    set({ activeDraft: null });
  },

  setActivePage: (page) => set({ activePage: page }),
  setEditingQuotationId: (id) => set({ editingQuotationId: id }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setStatusFilter: (filter: string) => set({ statusFilter: filter }),
  setDateFilter: (filter: string) => set({ dateFilter: filter })
}));
