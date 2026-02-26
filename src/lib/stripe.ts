import { Partner, LifestyleCategory } from '@/types';
import {
  StripeUpload,
  StripeTransaction,
  ProcessedTransaction,
  MerchantStats,
  PartnerRevenueStats,
  WeeklyRevenueData,
} from '@/types/stripe';

const POCKETBASE_URL = 'https://pocketbase.blckbx.co.uk';
const warnedPartnersMissingSignedAt = new Set<string>();

/**
 * Normalise merchant name for grouping and matching
 * Groups known variants and cleans the name
 */
export function normaliseMerchant(raw: string): string {
  let name = raw.toUpperCase().trim();

  // Group known variants
  if (name.match(/AMAZON|AMZN/)) return 'AMAZON';
  if (name.match(/BRITISH AIRWAYS|BRITISH AWYS/)) return 'BRITISH AIRWAYS';
  if (name.match(/ADDISONLEE|ADDISON LEE/)) return 'ADDISON LEE';
  if (name.match(/TRAINLINE/)) return 'TRAINLINE';
  if (name.match(/TESCO/)) return 'TESCO';
  if (name.match(/SAINSBURY/)) return 'SAINSBURYS';
  if (name.match(/WAITROSE/)) return 'WAITROSE';
  if (name.match(/EASYJET/)) return 'EASYJET';
  if (name.match(/RYANAIR/)) return 'RYANAIR';
  if (name.match(/BLACKLANE/)) return 'BLACKLANE';
  if (name.match(/SUSHISAMBA/)) return 'SUSHISAMBA';
  if (name.match(/BLOOMANDWILD|BLOOM & WILD/)) return 'BLOOM & WILD';
  if (name.match(/CURZON/)) return 'CURZON';
  if (name.match(/NOTONTHEHIGHSTREET/)) return 'NOTONTHEHIGHSTREET';
  if (name.match(/MARKS&SPENCER|M&S/)) return 'MARKS & SPENCER';
  if (name.match(/THORTFUL/)) return 'THORTFUL';
  if (name.match(/UBER/)) return 'UBER';
  if (name.match(/SPOTIFY/)) return 'SPOTIFY';
  if (name.match(/NETFLIX/)) return 'NETFLIX';
  if (name.match(/ASDA/)) return 'ASDA';
  if (name.match(/MORRISONS/)) return 'MORRISONS';
  if (name.match(/JOHN LEWIS/)) return 'JOHN LEWIS';
  if (name.match(/SELFRIDGES/)) return 'SELFRIDGES';
  if (name.match(/HARRODS/)) return 'HARRODS';
  if (name.match(/BOOKING\.COM/)) return 'BOOKING.COM';
  if (name.match(/AIRBNB/)) return 'AIRBNB';
  if (name.match(/EXPEDIA/)) return 'EXPEDIA';
  if (name.match(/HILTON/)) return 'HILTON';
  if (name.match(/MARRIOTT/)) return 'MARRIOTT';
  if (name.match(/PREMIER INN/)) return 'PREMIER INN';
  if (name.match(/HOLIDAY INN/)) return 'HOLIDAY INN';
  if (name.match(/BA.COM/)) return 'BRITISH AIRWAYS';
  if (name.match(/VIRGIN ATLANTIC/)) return 'VIRGIN ATLANTIC';
  if (name.match(/DELIVEROO/)) return 'DELIVEROO';
  if (name.match(/JUST EAT/)) return 'JUST EAT';
  if (name.match(/GYM|GYMBOX|DAVID LLOYD|PUREGYM/)) return 'GYM';
  if (name.match(/BOOTS/)) return 'BOOTS';
  if (name.match(/SUPERDRUG/)) return 'SUPERDRUG';
  if (name.match(/PARKING|NCP/)) return 'PARKING';
  if (name.match(/DVLA/)) return 'DVLA';
  if (name.match(/OCTOPUS ENERGY/)) return 'OCTOPUS ENERGY';
  if (name.match(/BRITISH GAS/)) return 'BRITISH GAS';
  if (name.match(/O2/)) return 'O2';
  if (name.match(/VODAFONE/)) return 'VODAFONE';
  if (name === 'EE' || name.startsWith('EE *')) return 'EE';
  if (name.match(/SKY/)) return 'SKY';
  if (name.match(/VIRGIN MEDIA/)) return 'VIRGIN MEDIA';

  // Strip Shopify/Square prefixes
  if (name.startsWith('SP ')) return name.replace('SP ', '').trim();
  if (name.startsWith('SQ *')) return name.replace('SQ *', '').trim();

  return name;
}

/**
 * Get RAG health status based on booking frequency and recency
 */
export function getRAGStatus(
  bookingCount: number,
  daysSinceLastUsed: number
): 'green' | 'amber' | 'red' {
  if (bookingCount >= 3 && daysSinceLastUsed <= 14) return 'green';
  if (bookingCount >= 1 && daysSinceLastUsed <= 21) return 'amber';
  return 'red';
}

/**
 * Parse amount string from CSV (format: £X,XXX.XX) to pence
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr || typeof amountStr !== 'string') {
    throw new Error(`Invalid amount input: ${amountStr}`);
  }
  
  // Remove £ symbol and commas, then parse
  const cleanAmount = amountStr.replace(/[£,]/g, '').trim();
  const amount = parseFloat(cleanAmount);
  
  if (isNaN(amount)) {
    throw new Error(`Invalid amount value: "${amountStr}" (cleaned: "${cleanAmount}")`);
  }
  
  return Math.round(amount * 100); // Convert to pence
}

/**
 * Format pence to display amount (£X,XXX.XX)
 */
export function formatAmount(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format pence to compact display (£X.Xk or £XM)
 */
export function formatCompactAmount(pence: number): string {
  const pounds = pence / 100;
  if (pounds >= 1000000) {
    return `£${(pounds / 1000000).toFixed(1)}M`;
  }
  if (pounds >= 1000) {
    return `£${(pounds / 1000).toFixed(1)}k`;
  }
  return `£${pounds.toFixed(2)}`;
}

/**
 * Parse date from DD/MM/YYYY to ISO format
 */
export function parseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date components: day=${day}, month=${month}, year=${year}`);
  }
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date.toISOString();
}

/**
 * Get date from DD/MM/YYYY string
 */
export function getDateFromString(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date(NaN); // Return invalid date
  }
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
    return new Date(NaN); // Return invalid date
  }
  return new Date(year, month - 1, day);
}

/**
 * Extract month from date string (YYYY-MM format)
 */
export function extractMonth(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`Invalid date input for extractMonth: ${dateStr}`);
  }
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format for extractMonth (expected DD/MM/YYYY): ${dateStr}`);
  }
  
  const [day, month, year] = parts.map(Number);
  
  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date components in extractMonth: day=${day}, month=${month}, year=${year} from "${dateStr}"`);
  }
  
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse commission string to number (handles "10%" or "10")
 */
export function parseCommission(commissionStr: string): number {
  if (!commissionStr) return 0;
  const clean = commissionStr.replace('%', '').trim();
  const value = parseFloat(clean);
  return isNaN(value) ? 0 : value;
}

function getDateKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Returns true when a transaction should be attributed to the partner.
 * Attribution is only valid for signed partners and tx dates on/after signed_at.
 */
export function isTransactionEligibleForPartner(
  transactionDate: string | Date,
  partner: Partner
): boolean {
  if (partner.status !== 'signed') return false;

  if (!partner.signed_at) {
    if (!warnedPartnersMissingSignedAt.has(partner.id)) {
      warnedPartnersMissingSignedAt.add(partner.id);
      console.warn(
        `[Partner Attribution] Signed partner "${partner.partner_name}" (${partner.id}) has no signed_at. Skipping attribution.`
      );
    }
    return false;
  }

  const transactionDateKey = getDateKey(transactionDate);
  const signedDateKey = getDateKey(partner.signed_at);

  if (!transactionDateKey || !signedDateKey) {
    console.warn(
      `[Partner Attribution] Invalid date detected for partner "${partner.partner_name}" (${partner.id}).`
    );
    return false;
  }

  return transactionDateKey >= signedDateKey;
}

/**
 * Normalise a name for fuzzy matching
 * Removes spaces, punctuation, common suffixes, uppercases
 */
export function normaliseForFuzzyMatching(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[.,\-_']/g, '') // Remove punctuation
    .replace(/\.(COM|CO\.UK|CO\.JP|CO)$/g, '') // Remove domain suffixes
    .replace(/(LTD|LIMITED|LLC|INC|PLC|CORP|CORPORATION)$/g, '') // Remove company suffixes
    .replace(/\*.*$/, '') // Remove everything after * (like ADDISONLEE* EXTRA → ADDISONLEE)
    .trim();
}

/**
 * Calculate fuzzy match score between merchant and partner
 * Returns score 0-100, where 100 is perfect match
 */
export function calculateFuzzyScore(merchantName: string, partnerName: string): number {
  const normalisedMerchant = normaliseForFuzzyMatching(merchantName);
  const normalisedPartner = normaliseForFuzzyMatching(partnerName);
  
  if (!normalisedMerchant || !normalisedPartner) return 0;
  
  // Exact match after normalisation
  if (normalisedMerchant === normalisedPartner) return 100;
  
  // One contains the other
  if (normalisedMerchant.includes(normalisedPartner)) {
    // Calculate how much of the merchant is the partner name
    return Math.round((normalisedPartner.length / normalisedMerchant.length) * 90);
  }
  
  if (normalisedPartner.includes(normalisedMerchant)) {
    return Math.round((normalisedMerchant.length / normalisedPartner.length) * 80);
  }
  
  // Check for substantial overlap (at least 6 characters)
  let maxOverlap = 0;
  for (let i = 0; i < normalisedMerchant.length - 5; i++) {
    for (let len = 6; len <= Math.min(normalisedMerchant.length - i, normalisedPartner.length); len++) {
      const substring = normalisedMerchant.substring(i, i + len);
      if (normalisedPartner.includes(substring) && len > maxOverlap) {
        maxOverlap = len;
      }
    }
  }
  
  if (maxOverlap >= 6) {
    return Math.round((maxOverlap / Math.max(normalisedMerchant.length, normalisedPartner.length)) * 60);
  }
  
  return 0;
}

/**
 * Find potential fuzzy matches for unmatched merchants
 * Returns array of proposed matches with scores
 */
export function findFuzzyMatches(
  unmatchedMerchants: string[],
  partners: Partner[],
  minScore: number = 70
): Array<{
  merchantName: string;
  partner: Partner;
  score: number;
  suggestedAlias: string;
}> {
  const matches: Array<{
    merchantName: string;
    partner: Partner;
    score: number;
    suggestedAlias: string;
  }> = [];
  
  for (const merchantName of unmatchedMerchants) {
    let bestMatch: { partner: Partner; score: number } | null = null;
    
    for (const partner of partners) {
      const score = calculateFuzzyScore(merchantName, partner.partner_name);
      
      if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { partner, score };
      }
    }
    
    if (bestMatch) {
      // Generate suggested alias from the merchant name
      const suggestedAlias = normaliseForFuzzyMatching(merchantName);
      
      matches.push({
        merchantName,
        partner: bestMatch.partner,
        score: bestMatch.score,
        suggestedAlias,
      });
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Parse stripe_aliases from various formats PocketBase might return
 */
function parseStripeAliases(aliases: unknown): string[] {
  console.log('[DEBUG] Raw stripe_aliases value:', JSON.stringify(aliases));
  console.log('[DEBUG] Type:', typeof aliases);

  if (!aliases) {
    console.log('[DEBUG] No aliases found, returning empty array');
    return [];
  }

  // If it's already an array, return it
  if (Array.isArray(aliases)) {
    console.log('[DEBUG] Already an array:', JSON.stringify(aliases));
    return aliases as string[];
  }

  // If it's a string, try to parse as JSON
  if (typeof aliases === 'string') {
    try {
      const parsed = JSON.parse(aliases);
      console.log('[DEBUG] Parsed JSON string:', JSON.stringify(parsed));
      return Array.isArray(parsed) ? parsed : [aliases];
    } catch {
      // Not valid JSON, treat as single alias
      console.log('[DEBUG] Not valid JSON, treating as single alias:', aliases);
      return [aliases];
    }
  }

  console.log('[DEBUG] Unknown format, returning empty array');
  return [];
}

/**
 * Find matching partner for a merchant name based on stripe_aliases
 */
export function findMatchingPartner(
  merchantName: string,
  partners: Partner[]
): Partner | null {
  const normalisedMerchant = merchantName.toUpperCase().trim();
  const isAddisonRelated = normalisedMerchant.includes('ADDISON');
  
  if (isAddisonRelated) {
    console.log('[DEBUG-ADDISON] ==========================================');
    console.log('[DEBUG-ADDISON] Looking for match for merchant:', merchantName);
    console.log('[DEBUG-ADDISON] Normalised merchant:', normalisedMerchant);
    console.log('[DEBUG-ADDISON] Total partners to check:', partners.length);
  }

  for (const partner of partners) {
    const aliases = parseStripeAliases(partner.stripe_aliases);
    const partnerName = partner.partner_name || (partner as unknown as { name?: string }).name || 'Unknown';
    
    // Special logging for Addison Lee
    if (partnerName.toUpperCase().includes('ADDISON LEE')) {
      console.log('[DEBUG-ADDISON] Partner object:', JSON.stringify({
        name: partnerName,
        stripe_aliases: partner.stripe_aliases,
        aliasType: typeof partner.stripe_aliases,
        parsedAliases: aliases
      }, null, 2));
    }
    
    if (isAddisonRelated && aliases.length > 0) {
      console.log(`[DEBUG-ADDISON] Partner "${partnerName}" has aliases:`, JSON.stringify(aliases));
    }

    for (const alias of aliases) {
      const normalisedAlias = alias.toUpperCase().trim();
      
      if (isAddisonRelated) {
        console.log(`[DEBUG-ADDISON] Comparing: "${normalisedMerchant}" startsWith("${normalisedAlias}") = ${normalisedMerchant.startsWith(normalisedAlias)}`);
        console.log(`[DEBUG-ADDISON] Comparing: "${normalisedMerchant}" includes("${normalisedAlias}") = ${normalisedMerchant.includes(normalisedAlias)}`);
      }
      
      if (
        normalisedMerchant.startsWith(normalisedAlias) ||
        normalisedMerchant.includes(normalisedAlias)
      ) {
        if (isAddisonRelated) {
          console.log(`[DEBUG-ADDISON] ✓✓✓ MATCHED! "${merchantName}" → "${partnerName}" via alias "${alias}"`);
          console.log('[DEBUG-ADDISON] ==========================================');
        }
        return partner;
      }
    }
  }

  if (isAddisonRelated) {
    console.log(`[DEBUG-ADDISON] ✗✗✗ No match found for "${merchantName}"`);
    console.log('[DEBUG-ADDISON] ==========================================');
  }
  return null;
}

/**
 * Calculate commission for a transaction amount
 */
export function calculateCommission(amountPence: number, commissionRate: number): number {
  return Math.round(amountPence * (commissionRate / 100));
}

/**
 * Group transactions by week for trend analysis
 */
export function getWeeklyData(transactions: ProcessedTransaction[]): WeeklyRevenueData[] {
  const weekMap = new Map<string, { revenue: number; commission: number }>();

  for (const tx of transactions) {
    if (tx.partnerId && tx.partner && isTransactionEligibleForPartner(tx.date, tx.partner)) {
      const date = new Date(tx.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Sunday
      const weekKey = weekStart.toISOString().split('T')[0];

      const commissionRate = parseCommission(tx.partner.commission);
      const commission = calculateCommission(tx.amount, commissionRate);

      const existing = weekMap.get(weekKey);
      if (existing) {
        existing.revenue += tx.amount;
        existing.commission += commission;
      } else {
        weekMap.set(weekKey, { revenue: tx.amount, commission: commission });
      }
    }
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      revenue: data.revenue,
      commission: data.commission,
    }));
}

/**
 * Process transactions and compute partner revenue stats
 */
export function processPartnerRevenue(
  transactions: ProcessedTransaction[]
): {
  totalRevenue: number;
  totalCommission: number;
  activePartners: number;
  partnerStats: Map<string, PartnerRevenueStats>;
  nonPartnerMerchants: Map<string, MerchantStats>;
} {
  const partnerStats = new Map<string, PartnerRevenueStats>();
  const nonPartnerMerchants = new Map<string, MerchantStats>();

  let totalRevenue = 0;
  let totalCommission = 0;

  for (const tx of transactions) {
    if (tx.isHidden) continue;

    const shouldCountAsPartner =
      tx.partnerId && tx.partner && isTransactionEligibleForPartner(tx.date, tx.partner);

    if (shouldCountAsPartner && tx.partnerId && tx.partner) {
      totalRevenue += tx.amount;

      const commissionRate = parseCommission(tx.partner.commission);
      const commission = calculateCommission(tx.amount, commissionRate);
      totalCommission += commission;

      const existing = partnerStats.get(tx.partnerId);
      if (existing) {
        existing.transactionCount++;
        existing.totalRevenue += tx.amount;
        existing.commissionEarned += commission;
        if (tx.date > existing.lastTransaction!) {
          existing.lastTransaction = tx.date;
        }
      } else {
        partnerStats.set(tx.partnerId, {
          partner: tx.partner,
          transactionCount: 1,
          totalRevenue: tx.amount,
          commissionEarned: commission,
          lastTransaction: tx.date,
          daysSinceLastTransaction: 0,
          ragStatus: 'red',
          avgDealSize: tx.amount,
        });
      }
    } else {
      // Non-partner merchant
      const merchantName = tx.merchantNormalised;
      const existing = nonPartnerMerchants.get(merchantName);
      if (existing) {
        existing.count++;
        existing.totalRevenue += tx.amount;
        if (tx.date > existing.lastUsed) {
          existing.lastUsed = tx.date;
        }
      } else {
        nonPartnerMerchants.set(merchantName, {
          name: merchantName,
          count: 1,
          totalRevenue: tx.amount,
          lastUsed: tx.date,
          category: tx.category || '',
        });
      }
    }
  }

  // Calculate RAG status and average deal size for partners
  const now = new Date();
  for (const stats of partnerStats.values()) {
    if (stats.lastTransaction) {
      const diffTime = Math.abs(now.getTime() - stats.lastTransaction.getTime());
      stats.daysSinceLastTransaction = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      stats.daysSinceLastTransaction = 999;
    }
    stats.ragStatus = getRAGStatus(stats.transactionCount, stats.daysSinceLastTransaction);
    stats.avgDealSize = stats.totalRevenue / stats.transactionCount;
  }

  return {
    totalRevenue,
    totalCommission,
    activePartners: partnerStats.size,
    partnerStats,
    nonPartnerMerchants,
  };
}

/**
 * Get category distribution from partner transactions
 */
export function getCategoryDistribution(
  partnerStats: Map<string, PartnerRevenueStats>
): { name: string; value: number; color: string }[] {
  const categoryMap = new Map<string, number>();

  for (const stats of partnerStats.values()) {
    const category = stats.partner.lifestyle_category;
    const existing = categoryMap.get(category) || 0;
    categoryMap.set(category, existing + stats.totalRevenue);
  }

  const CATEGORY_COLOR_MAP: Record<string, string> = {
    Airline: '#0369A1',
    Travel: '#6B1488',
    Hotels: '#FFBB95',
    Supermarkets: '#22C55E',
    Restaurants: '#3B82F6',
    Trades: '#EF4444',
    Misc: '#F59E0B',
    Childcare: '#8B5CF6',
    'Kids + Family': '#EC4899',
    Services: '#14B8A6',
    Eldercare: '#64748B',
    Taxis: '#DC2626',
    Flowers: '#059669',
    'Department Store': '#7C3AED',
    Affiliates: '#DB2777',
    Beauty: '#0891B2',
    Retail: '#0D9488',
    Jewellery: '#C026D3',
    Cars: '#EA580C',
    Electronics: '#4F46E5',
    Home: '#16A34A',
    'Health + Fitness': '#E11D48',
    "Children's Parties and Events": '#FB7185',
    Wellness: '#06B6D4',
    Ski: '#7DD3FC',
    Experiences: '#A855F7',
  };

  return Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLOR_MAP[name] || '#6366F1',
    }))
    .sort((a, b) => b.value - a.value);
}

// PocketBase API functions

/**
 * Fetch all uploads
 */
export async function fetchUploads(authToken: string): Promise<StripeUpload[]> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_uploads/records?sort=-created`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch uploads');
  }

  const data = await response.json();
  return data.items;
}

/**
 * Fetch transactions for an upload
 */
export async function fetchTransactions(
  uploadId: string,
  authToken: string
): Promise<StripeTransaction[]> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records?filter=upload_id="${uploadId}"&expand=partner_id&perPage=1000`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  const data = await response.json();
  return data.items;
}

/**
 * Create a new upload record
 */
export async function createUpload(
  uploadData: {
    month: string;
    filename: string;
    uploaded_by: string;
    total_transactions: number;
    total_spend: number;
    matched_count: number;
    unmatched_count: number;
  },
  authToken: string
): Promise<StripeUpload> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections/stripe_uploads/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
    body: JSON.stringify(uploadData),
  });

  if (!response.ok) {
    throw new Error('Failed to create upload');
  }

  return response.json();
}

/**
 * Create a transaction record
 */
export async function createTransaction(
  transactionData: {
    upload_id: string;
    date: string;
    merchant_raw: string;
    merchant_normalised: string;
    amount: number;
    partner_id?: string | null;
    category?: string;
    is_hidden?: boolean;
  },
  authToken: string
): Promise<StripeTransaction> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify(transactionData),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create transaction');
  }

  return response.json();
}

/**
 * Batch create transactions
 */
export async function batchCreateTransactions(
  transactions: Array<{
    upload_id: string;
    date: string;
    merchant_raw: string;
    merchant_normalised: string;
    amount: number;
    partner_id?: string | null;
    category?: string;
    is_hidden?: boolean;
  }>,
  authToken: string,
  batchSize: number = 50
): Promise<StripeTransaction[]> {
  const results: StripeTransaction[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchPromises = batch.map((tx) => createTransaction(tx, authToken));

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error creating batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Update transaction (for hiding merchants or setting category)
 */
export async function updateTransaction(
  id: string,
  updates: { is_hidden?: boolean; category?: string; partner_id?: string | null },
  authToken: string
): Promise<StripeTransaction> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update transaction');
  }

  return response.json();
}

/**
 * Hide all transactions for a merchant in an upload
 */
export async function hideMerchantTransactions(
  uploadId: string,
  merchantName: string,
  authToken: string
): Promise<number> {
  // First, fetch all transactions for this merchant in the upload
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records?filter=upload_id="${uploadId}"&&merchant_normalised="${merchantName}"&perPage=1000`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch merchant transactions');
  }

  const data = await response.json();
  const transactions = data.items as StripeTransaction[];

  // Update all transactions to be hidden
  const updatePromises = transactions.map((tx) =>
    updateTransaction(tx.id, { is_hidden: true }, authToken)
  );

  await Promise.all(updatePromises);
  return transactions.length;
}

/**
 * Delete all transactions for an upload
 */
export async function deleteTransactionsForUpload(
  uploadId: string,
  authToken: string
): Promise<number> {
  // First, fetch all transactions for this upload
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records?filter=upload_id="${uploadId}"&perPage=1000`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions for upload');
  }

  const data = await response.json();
  const transactions = data.items as StripeTransaction[];

  // Delete all transactions
  const deletePromises = transactions.map((tx) =>
    fetch(
      `${POCKETBASE_URL}/api/collections/stripe_transactions/records/${tx.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: authToken,
        },
      }
    )
  );

  await Promise.all(deletePromises);
  return transactions.length;
}

/**
 * Delete an upload record
 */
export async function deleteUpload(
  uploadId: string,
  authToken: string
): Promise<void> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_uploads/records/${uploadId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete upload');
  }
}

/**
 * Check if an upload exists for a given month
 */
export async function getUploadForMonth(
  month: string,
  authToken: string
): Promise<StripeUpload | null> {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_uploads/records?filter=month="${month}"&perPage=1`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check for existing upload');
  }

  const data = await response.json();
  return data.items?.[0] || null;
}

/**
 * Assign a merchant to an existing partner
 * Adds alias to partner and updates all transactions
 */
export async function assignMerchantToPartner(
  merchantName: string,
  partnerId: string,
  suggestedAlias: string,
  authToken: string
): Promise<{ updatedTransactions: number; updatedPartner: Partner }> {
  console.log('[DEBUG] assignMerchantToPartner called:', { merchantName, partnerId, suggestedAlias });
  
  // First, append the alias to the partner
  const updatedPartner = await appendPartnerAlias(partnerId, suggestedAlias, authToken);
  console.log('[DEBUG] Partner updated successfully:', updatedPartner.partner_name);

  // Guard against invalid partner state
  if (updatedPartner.status !== 'signed') {
    throw new Error(`Cannot link merchant to non-signed partner: ${updatedPartner.partner_name}`);
  }
  if (!updatedPartner.signed_at) {
    console.warn(
      `[Partner Attribution] Signed partner "${updatedPartner.partner_name}" (${updatedPartner.id}) has no signed_at. No transactions linked.`
    );
    return {
      updatedTransactions: 0,
      updatedPartner,
    };
  }

  // Fetch all transactions with this merchant normalised name across all uploads
  const filter = encodeURIComponent(`merchant_normalised="${merchantName}"`);
  const allTxResponse = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records?filter=${filter}&perPage=1000`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );
  
  if (!allTxResponse.ok) {
    throw new Error('Failed to fetch transactions');
  }
  
  const allData = await allTxResponse.json();
  const allTransactions = allData.items as StripeTransaction[];
  console.log('[DEBUG] Total transactions for merchant:', merchantName, allTransactions.length);
  
  if (allTransactions.length > 0) {
    console.log('[DEBUG] First match sample:', {
      id: allTransactions[0].id,
      merchantRaw: allTransactions[0].merchant_raw,
      merchantNormalised: allTransactions[0].merchant_normalised
    });
  }

  // Attribute only transactions on/after signed_at; pre-signed tx remain unmatched
  let attributedCount = 0;
  const updatePromises = allTransactions
    .map((tx) => {
      const shouldAttribute = isTransactionEligibleForPartner(tx.date, updatedPartner);
      const nextPartnerId = shouldAttribute ? partnerId : null;

      if (shouldAttribute && tx.partner_id !== partnerId) {
        attributedCount++;
      }

      const shouldUpdatePartner = tx.partner_id !== nextPartnerId;
      const shouldUnhide = shouldAttribute && tx.is_hidden;

      if (!shouldUpdatePartner && !shouldUnhide) {
        return null;
      }

      return updateTransaction(
        tx.id,
        { partner_id: nextPartnerId, ...(shouldUnhide ? { is_hidden: false } : {}) },
        authToken
      );
    })
    .filter((promise): promise is Promise<StripeTransaction> => promise !== null);

  await Promise.all(updatePromises);
  console.log('[DEBUG] Updated', updatePromises.length, 'transactions. Attributed:', attributedCount);

  return {
    updatedTransactions: attributedCount,
    updatedPartner,
  };
}

/**
 * Unlink a merchant from any partner by clearing partner_id for all merchant transactions.
 */
export async function unlinkMerchantFromPartner(
  merchantName: string,
  authToken: string
): Promise<number> {
  const filter = encodeURIComponent(`merchant_normalised="${merchantName}"`);
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_transactions/records?filter=${filter}&perPage=1000`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions for unlink');
  }

  const data = await response.json();
  const transactions = (data.items as StripeTransaction[]).filter((tx) => tx.partner_id !== null);
  await Promise.all(
    transactions.map((tx) => updateTransaction(tx.id, { partner_id: null }, authToken))
  );

  return transactions.length;
}

/**
 * Create a new partner from a discovered merchant
 */
export async function createPartnerFromMerchant(
  merchantName: string,
  category: LifestyleCategory,
  authToken: string
): Promise<Partner> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections/partnership_portal/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
    body: JSON.stringify({
      partner_name: merchantName,
      status: 'contacted',
      lifestyle_category: category || 'Misc',
      stripe_aliases: [merchantName],
      description: '',
      contact_name: '',
      contact_position: '',
      contact_phone: '',
      contact_email: '',
      opportunity_type: 'Everyday',
      price_category: '£',
      partnership_type: 'Direct',
      partnership_link: '',
      website: '',
      login_notes: '',
      partner_tier: 'Standard',
      use_for_tags: [],
      lifecycle_stage: 'New',
      is_default: false,
      partner_brief: '',
      when_not_to_use: '',
      sla_notes: '',
      commission: '',
      contacted: true,
      call_booked: false,
      call_had: false,
      contract_sent: false,
      contract_signed: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create partner');
  }

  return response.json();
}

/**
 * Append a new alias to a partner's stripe_aliases array
 */
export async function appendPartnerAlias(
  partnerId: string,
  newAlias: string,
  authToken: string
): Promise<Partner> {
  console.log('[DEBUG] appendPartnerAlias called:', { partnerId, newAlias });
  
  // First fetch current partner to get existing aliases
  const getResponse = await fetch(
    `${POCKETBASE_URL}/api/collections/partnership_portal/records/${partnerId}`,
    {
      headers: {
        Authorization: authToken,
      },
    }
  );

  if (!getResponse.ok) {
    console.error('[DEBUG] Failed to fetch partner:', getResponse.status, await getResponse.text());
    throw new Error('Failed to fetch partner');
  }

  const partner = await getResponse.json();
  console.log('[DEBUG] Current partner:', partner.partner_name, 'existing aliases:', partner.stripe_aliases);
  
  const existingAliases: string[] = partner.stripe_aliases || [];
  
  // Only add if not already present (case-insensitive check)
  const aliasExists = existingAliases.some(
    (a: string) => a.toUpperCase() === newAlias.toUpperCase()
  );
  
  if (aliasExists) {
    console.log('[DEBUG] Alias already exists, skipping update');
    return partner; // Already has this alias, no update needed
  }

  const updatedAliases = [...existingAliases, newAlias];
  console.log('[DEBUG] Updating aliases to:', updatedAliases);

  const patchResponse = await fetch(
    `${POCKETBASE_URL}/api/collections/partnership_portal/records/${partnerId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify({
        stripe_aliases: updatedAliases,
      }),
    }
  );

  if (!patchResponse.ok) {
    console.error('[DEBUG] Failed to update partner:', patchResponse.status, await patchResponse.text());
    throw new Error('Failed to update partner aliases');
  }

  const result = await patchResponse.json();
  console.log('[DEBUG] Update successful, new aliases:', result.stripe_aliases);
  return result;
}
