import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal(''))
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Project or work name is required'),
  siteLocation: z.string().optional().or(z.literal(''))
});

export const quotationItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  length: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  area: z.number().nullable().optional(),
  material: z.string().optional().or(z.literal('')),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().min(0, 'Rate must be positive or zero'),
  amount: z.number().min(0, 'Amount must be positive or zero')
});

export const businessSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  tagline: z.string().optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  gstNumber: z.string().optional().or(z.literal('')),
  
  prefix: z.string().min(1, 'Quotation prefix is required'),
  startingNumber: z.number().min(1, 'Starting number must be at least 1'),
  defaultValidityDays: z.number().min(1, 'Validity days must be at least 1'),
  defaultGstPercentage: z.number().min(0).max(100),
  defaultTerms: z.array(z.string())
});

export const quotationSchema = z.object({
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  date: z.string().min(1, 'Date is required'),
  validUntil: z.string().min(1, 'Validity date is required'),
  customer: customerSchema,
  project: projectSchema,
  preparedBy: z.string().optional().or(z.literal('')),
  items: z.array(quotationItemSchema).min(1, 'Add at least one work item'),
  remarks: z.string().optional().or(z.literal('')),
  labour: z.number().min(0, 'Labour charges must be positive or zero'),
  installation: z.number().min(0, 'Installation charges must be positive or zero'),
  discount: z.number().min(0, 'Discount must be positive or zero'),
  discountType: z.enum(['fixed', 'percentage']),
  gst: z.number().min(0).max(100),
  gstEnabled: z.boolean(),
  advance: z.number().min(0, 'Advance payment must be positive or zero'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  bankUpi: z.string().optional().or(z.literal(''))
});

