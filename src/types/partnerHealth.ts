import { Partner, LifestyleCategory } from './index';

export interface StripeUpload {
  id: string;
  month: string;
  filename: string;
  uploaded_by: string;
  total_transactions: number;
  total_spend: number;
  matched_count: number;
  unmatched_count: number;
  created: string;
}

export interface StripeTransaction {
  id: string;
  upload_id: string;
  date: string;
  merchant_raw: string;
  merchant_normalised: string;
  amount: number;
  partner_id: string | null;
  category: LifestyleCategory | '';
  is_hidden: boolean;
  created: string;
  expand?: {
    partner_id?: Partner;
  };
}

export interface ProcessedTransaction {
  id: string;
  date: Date;
  merchantRaw: string;
  merchantNormalised: string;
  amount: number; // in pence
  partnerId: string | null;
  partner: Partner | null;
  category: LifestyleCategory | '';
  isHidden: boolean;
}

export interface MerchantStats {
  name: string;
  count: number;
  totalSpend: number;
  lastUsed: Date;
  category: LifestyleCategory | '';
}

export interface PartnerUsageStats {
  partner: Partner;
  bookingCount: number;
  totalSpend: number;
  lastUsed: Date | null;
  daysSinceLastUsed: number;
  ragStatus: 'green' | 'amber' | 'red';
}

export interface CSVRow {
  date: string;
  merchantName: string;
  amount: string;
}

export type HealthSubTab = 'overview' | 'partner-usage' | 'discovery';
export type DiscoverySort = 'frequency' | 'spend' | 'recency';
