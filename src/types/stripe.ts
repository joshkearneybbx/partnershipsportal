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
  amount: number;
  partnerId: string | null;
  partner: Partner | null;
  category: LifestyleCategory | '';
  isHidden: boolean;
}

export interface MerchantStats {
  name: string;
  count: number;
  totalRevenue: number;
  lastUsed: Date;
  category: LifestyleCategory | '';
}

export interface PartnerRevenueStats {
  partner: Partner;
  transactionCount: number;
  totalRevenue: number;
  commissionEarned: number;
  lastTransaction: Date | null;
  daysSinceLastTransaction: number;
  ragStatus: 'green' | 'amber' | 'red';
  avgDealSize: number;
}

export interface WeeklyRevenueData {
  week: string;
  revenue: number;
  commission: number;
}

export type DiscoverySort = 'frequency' | 'revenue' | 'recency';

export interface NonPartnerMerchant {
  name: string;
  count: number;
  totalRevenue: number;
  lastUsed: Date;
  category: LifestyleCategory | '';
}
