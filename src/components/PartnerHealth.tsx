'use client';

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { BigPurchase, Partner, LifestyleCategory } from '@/types';
import {
  StripeUpload,
  ProcessedTransaction,
  PartnerRevenueStats,
  DiscoverySort,
} from '@/types/stripe';
import {
  normaliseMerchant,
  normaliseForFuzzyMatching,
  parseAmount,
  parseDate,
  getDateFromString,
  extractMonth,
  findMatchingPartner,
  findFuzzyMatches,
  processPartnerRevenue,
  getCategoryDistribution,
  getWeeklyData,
  formatAmount,
  formatCompactAmount,
  calculateCommission,
  parseCommission,
  fetchUploads,
  fetchTransactions,
  createUpload,
  batchCreateTransactions,
  hideMerchantTransactions,
  createPartnerFromMerchant,
  appendPartnerAlias,
  assignMerchantToPartner,
  isTransactionEligibleForPartner,
  deleteTransactionsForUpload,
  deleteUpload,
  getUploadForMonth,
} from '@/lib/stripe';
import { pb } from '@/lib/pocketbase';
import { getBigPurchases, updateBigPurchase, updatePartner } from '@/lib/pocketbase';
import { useToast } from '@/contexts/ToastContext';
import { format, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface PartnerHealthProps {
  partners: Partner[];
}

type SubTab = 'overview' | 'discovery' | 'invoice-tracker';
type InvoiceTrackerView = 'pending' | 'history';

const RAG_COLORS = {
  green: '#1EA988',
  amber: '#F4A858',
  red: '#E23737',
};

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

// CSV Upload Modal Component with Fuzzy Matching
function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  signedPartners,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  signedPartners: Partner[];
}) {
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState<'select' | 'preview' | 'review' | 'uploading'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<{ date: string; merchantName: string; amount: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Fuzzy matching state
  const [proposedMatches, setProposedMatches] = useState<Array<{
    merchantName: string;
    partner: Partner;
    score: number;
    suggestedAlias: string;
    confirmed: boolean | null; // null = pending, true = confirmed, false = dismissed
  }>>([]);
  
  // Track which merchants have exact matches (already have aliases)
  const [exactMatchedMerchants, setExactMatchedMerchants] = useState<Set<string>>(new Set());
  
  // Duplicate upload handling
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMonth, setDuplicateMonth] = useState<string | null>(null);
  const [existingUploadId, setExistingUploadId] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }

      setFile(selectedFile);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        const lines = content.trim().split('\n');
        const rows: { date: string; merchantName: string; amount: string }[] = [];

        console.log('[DEBUG] CSV lines count:', lines.length);
        console.log('[DEBUG] First line (header?):', lines[0]);
        console.log('[DEBUG] Second line (first data):', lines[1]);
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Skip if this looks like a header row
          if (line.toLowerCase().includes('date') && line.toLowerCase().includes('merchant')) {
            console.log('[DEBUG] Skipping header row:', line);
            continue;
          }

          // Parse CSV respecting quoted fields
          const parts: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Escaped quote inside quotes
                current += '"';
                j++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              parts.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          // Don't forget the last field
          parts.push(current.trim());
          
          // Remove surrounding quotes from each field
          const cleanParts = parts.map(p => p.replace(/^"|"$/g, ''));
          
          if (cleanParts.length >= 3) {
            // Detect column order by checking which field looks like a date (DD/MM/YYYY)
            const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            let dateField = cleanParts[0];
            let merchantField = cleanParts[1];
            let amountField = cleanParts[2];
            
            // If first field doesn't look like a date, try to find the date field
            if (!dateRegex.test(dateField)) {
              // Check if second field is the date
              if (dateRegex.test(merchantField)) {
                // Columns are: Merchant, Date, Amount
                merchantField = cleanParts[0];
                dateField = cleanParts[1];
                amountField = cleanParts[2];
              } else if (dateRegex.test(amountField)) {
                // Columns are: Merchant, Amount, Date
                merchantField = cleanParts[0];
                amountField = cleanParts[1];
                dateField = cleanParts[2];
              }
            }
            
            // Only add if we have a valid date
            if (dateRegex.test(dateField)) {
              const row = {
                date: dateField,
                merchantName: merchantField,
                amount: amountField,
              };
              console.log('[DEBUG] Adding row:', row);
              rows.push(row);
            } else {
              console.log('[DEBUG] Skipping row - no valid date found:', cleanParts);
            }
          }
        }

        // Check for duplicate month
        if (rows.length > 0) {
          const detectedMonth = extractMonth(rows[0].date);
          const authToken = pb.authStore.token;
          
          if (authToken) {
            try {
              const existingUpload = await getUploadForMonth(detectedMonth, authToken);
              if (existingUpload) {
                setDuplicateMonth(detectedMonth);
                setExistingUploadId(existingUpload.id);
                setShowDuplicateWarning(true);
                setParsedRows(rows);
                return;
              }
            } catch (err) {
              // Continue to preview if check fails
            }
          }
        }

        setParsedRows(rows);
        setStep('preview');
        
        // Reset fuzzy matching state
        setProposedMatches([]);
        setExactMatchedMerchants(new Set());
      };
      reader.readAsText(selectedFile);
    },
    []
  );
  
  // Handle replacing existing upload
  const handleReplaceUpload = async () => {
    if (!existingUploadId || !duplicateMonth) return;
    
    try {
      const authToken = pb.authStore.token;
      if (!authToken) return;
      
      // Delete existing upload and its transactions
      await deleteTransactionsForUpload(existingUploadId, authToken);
      await deleteUpload(existingUploadId, authToken);
      
      showSuccess(`Replaced existing upload for ${duplicateMonth}`);
      setShowDuplicateWarning(false);
      setStep('preview');
      
      // Reset fuzzy matching state
      setProposedMatches([]);
      setExactMatchedMerchants(new Set());
    } catch (err) {
      showError('Failed to replace existing upload');
    }
  };

  // Find fuzzy matches for unmatched merchants
  const findMatches = useCallback(() => {
    // Get unique merchant names
    const uniqueMerchants = Array.from(new Set(parsedRows.map(r => r.merchantName)));
    
    // First pass: exact alias matching (only against signed partners)
    const exactMatches = new Set<string>();
    const unmatched: string[] = [];
    
    for (const merchant of uniqueMerchants) {
      const normalisedMerchant = normaliseMerchant(merchant);
      const matchedPartner = findMatchingPartner(normalisedMerchant, signedPartners);
      if (matchedPartner) {
        exactMatches.add(merchant);
      } else {
        unmatched.push(merchant);
      }
    }
    
    setExactMatchedMerchants(exactMatches);
    
    // Second pass: fuzzy matching on unmatched (only against signed partners)
    const fuzzyMatches = findFuzzyMatches(unmatched, signedPartners, 70);
    
    // Initialize with pending status
    const matchesWithStatus = fuzzyMatches.map(m => ({
      ...m,
      confirmed: null as boolean | null,
    }));
    
    setProposedMatches(matchesWithStatus);
    setStep('review');
  }, [parsedRows, signedPartners]);

  // Toggle match confirmation
  const toggleMatch = (index: number, confirmed: boolean) => {
    setProposedMatches(prev => prev.map((m, i) => 
      i === index ? { ...m, confirmed } : m
    ));
  };

  // Dismiss all remaining pending matches and proceed
  const handleContinue = useCallback(async () => {
    console.log('[DEBUG] handleContinue called', { file: !!file, parsedRows: parsedRows.length });
    if (!file || parsedRows.length === 0) {
      console.log('[DEBUG] Early return - no file or parsed rows');
      return;
    }

    setStep('uploading');

    try {
      const authToken = pb.authStore.token;
      console.log('[DEBUG] Auth token:', authToken ? 'present' : 'missing');
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Get confirmed matches
      const confirmedMatches = proposedMatches.filter(m => m.confirmed === true);
      
      // Build a map of merchant name -> partner for quick lookup
      const merchantToPartnerMap = new Map<string, Partner>();

      const partnersWithAliases = signedPartners.filter((partner) => {
        const candidateFields: unknown[] = [
          partner.stripe_aliases,
          (partner as unknown as { stripe_alias?: unknown }).stripe_alias,
          (partner as unknown as { aliases?: unknown }).aliases,
        ];

        return candidateFields.some((field) => {
          if (Array.isArray(field)) return field.length > 0;
          if (typeof field === 'string') return field.trim().length > 0;
          return false;
        });
      });

      console.log(
        '[UPLOAD-MATCH] Signed partners with non-empty alias fields:',
        `${partnersWithAliases.length}/${signedPartners.length}`
      );
      
      // Add confirmed fuzzy matches
      for (const match of confirmedMatches) {
        merchantToPartnerMap.set(match.merchantName, match.partner);
        
        // Save the alias to the partner
        try {
          await appendPartnerAlias(match.partner.id, match.suggestedAlias, authToken);
        } catch (err) {
          console.error('Failed to append alias:', err);
          // Continue even if alias save fails
        }
      }

      let totalSpend = 0;
      let matchedCount = 0;
      const transactions: {
        date: string;
        merchant_raw: string;
        merchant_normalised: string;
        amount: number;
        partner_id?: string;
      }[] = [];

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        
        // Skip rows with invalid data
        if (!row.date || !row.merchantName || !row.amount) {
          console.log(`[DEBUG] Skipping row ${i} - missing data:`, row);
          continue;
        }
        
        const amount = parseAmount(row.amount);
        totalSpend += amount;

        const normalisedName = normaliseMerchant(row.merchantName);
        if (i < 5) {
          console.log(
            `[UPLOAD-MATCH] Tx ${i + 1} normalised merchant:`,
            JSON.stringify({
              raw: row.merchantName,
              normalised: normalisedName,
            })
          );
        }
        let parsedDate: string;
        try {
          parsedDate = parseDate(row.date);
        } catch (err) {
          console.error(`[DEBUG] Failed to parse row ${i}:`, row, err);
          continue;
        }
        
        // Check for exact match first
        let matchedPartner: Partner | undefined = merchantToPartnerMap.get(row.merchantName);
        
        if (!matchedPartner) {
          // Try exact alias matching (only against signed partners)
          matchedPartner = findMatchingPartner(normalisedName, signedPartners, i < 5) || undefined;
        }

        let matchedPartnerId: string | undefined;
        if (matchedPartner) {
          const eligibleForAttribution = isTransactionEligibleForPartner(parsedDate, matchedPartner);
          if (eligibleForAttribution) {
            matchedPartnerId = matchedPartner.id;
          } else if (i < 5) {
            console.log(
              '[UPLOAD-MATCH] Alias matched but not eligible for attribution:',
              JSON.stringify({
                merchant: row.merchantName,
                partner: matchedPartner.partner_name,
                partnerStatus: matchedPartner.status,
                partnerSignedAt: matchedPartner.signed_at,
                transactionDate: parsedDate,
              })
            );
          }
        }

        if (matchedPartnerId) {
          matchedCount++;
        }

        transactions.push({
          date: parsedDate,
          merchant_raw: row.merchantName,
          merchant_normalised: normalisedName,
          amount,
          partner_id: matchedPartnerId,
        });
      }

      if (transactions.length === 0) {
        throw new Error('No valid transactions to upload');
      }
      
      const month = extractMonth(parsedRows[0]?.date || '');
      const upload = await createUpload(
        {
          month,
          filename: file.name,
          uploaded_by: pb.authStore.model?.id || '',
          total_transactions: transactions.length,
          total_spend: totalSpend,
          matched_count: matchedCount,
          unmatched_count: transactions.length - matchedCount,
        },
        authToken
      );

      const transactionsWithUploadId = transactions.map((tx) => ({
        ...tx,
        upload_id: upload.id,
        category: '',
        is_hidden: false,
      }));

      await batchCreateTransactions(transactionsWithUploadId, authToken, 50);

      const newAliasCount = confirmedMatches.length;
      showSuccess(
        `Uploaded ${parsedRows.length} transactions. ` +
        `${newAliasCount > 0 ? `Added ${newAliasCount} new partner aliases.` : ''}`
      );
      onUploadComplete();
      onClose();
      setStep('select');
      setFile(null);
      setParsedRows([]);
      setProposedMatches([]);
    } catch (err) {
      console.error('[DEBUG] Upload error:', err);
      showError(err instanceof Error ? err.message : 'Upload failed');
      setStep('review');
    }
  }, [file, parsedRows, signedPartners, proposedMatches, onUploadComplete, onClose, showSuccess, showError]);

  const dateRange = useMemo(() => {
    if (parsedRows.length === 0) return null;
    const dates = parsedRows
      .map((r) => getDateFromString(r.date))
      .filter((d) => !isNaN(d.getTime())); // Filter out invalid dates
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { min, max };
  }, [parsedRows]);

  const totalSpend = useMemo(() => {
    return parsedRows.reduce((sum, row) => {
      try {
        return sum + parseAmount(row.amount);
      } catch {
        return sum;
      }
    }, 0);
  }, [parsedRows]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-blckbx-sand rounded-2xl p-6 w-full shadow-2xl transition-all ${
            step === 'review' ? 'max-w-2xl' : 'max-w-lg'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-2xl font-semibold text-blckbx-black">Upload Stripe CSV</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blckbx-dark-sand rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-blckbx-black/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Duplicate Upload Warning */}
          {showDuplicateWarning && duplicateMonth && (
            <div className="mb-4 p-4 bg-blckbx-warning/10 border border-blckbx-warning/30 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blckbx-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-blckbx-black">
                    An upload for {format(new Date(duplicateMonth + '-01'), 'MMMM yyyy')} already exists.
                  </p>
                  <p className="text-sm text-blckbx-black/60 mt-1">
                    Would you like to replace it? This will delete the existing upload and its transactions.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowDuplicateWarning(false)}
                      className="px-3 py-1.5 rounded-lg border border-blckbx-black/20 text-blckbx-black text-sm font-medium hover:bg-blckbx-dark-sand transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReplaceUpload}
                      className="px-3 py-1.5 rounded-lg bg-blckbx-warning text-white text-sm font-medium hover:bg-opacity-90 transition-colors"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-blckbx-black/20 rounded-xl p-8 text-center hover:border-blckbx-cta transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-blckbx-cta/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blckbx-cta"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blckbx-black">Click to upload CSV</p>
                    <p className="text-sm text-blckbx-black/60">Expected format: Date, Merchant Name, Amount</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-blckbx-black/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-blckbx-black/60">File</span>
                  <span className="font-medium text-blckbx-black">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blckbx-black/60">Rows</span>
                  <span className="font-medium text-blckbx-black">{parsedRows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blckbx-black/60">Date Range</span>
                  <span className="font-medium text-blckbx-black">
                    {dateRange &&
                      `${format(dateRange.min, 'dd MMM')} - ${format(dateRange.max, 'dd MMM yyyy')}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blckbx-black/60">Total Spend</span>
                  <span className="font-medium text-blckbx-black">{formatAmount(totalSpend)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 py-3 rounded-lg border border-blckbx-black/20 text-blckbx-black font-medium hover:bg-blckbx-dark-sand transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={findMatches}
                  className="flex-1 py-3 rounded-lg bg-blckbx-cta text-blckbx-black font-medium hover:bg-opacity-90 transition-colors"
                >
                  Find Matches
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col" style={{ maxHeight: '60vh' }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-blckbx-black">Review Proposed Matches</h3>
                  <p className="text-sm text-blckbx-black/60">
                    {proposedMatches.filter(m => m.confirmed === true).length} confirmed,{' '}
                    {proposedMatches.filter(m => m.confirmed === false).length} dismissed,{' '}
                    {proposedMatches.filter(m => m.confirmed === null).length} pending
                  </p>
                </div>
              </div>

              {exactMatchedMerchants.size > 0 && (
                <div className="bg-blckbx-green/10 border border-blckbx-green/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blckbx-green font-medium">
                    ✓ {exactMatchedMerchants.size} merchants already matched via existing aliases
                  </p>
                </div>
              )}

              {proposedMatches.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 bg-blckbx-green/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blckbx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-blckbx-black font-medium">No fuzzy matches needed</p>
                  <p className="text-sm text-blckbx-black/50 mt-1 text-center max-w-sm">
                    {exactMatchedMerchants.size > 0 
                      ? `${exactMatchedMerchants.size} merchants matched existing aliases. Click Continue to upload.`
                      : 'No merchants matched existing partners. All will go to Discovery. Click Continue to upload.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1" style={{ maxHeight: '35vh' }}>
                  {proposedMatches.map((match, index) => (
                    <div
                      key={match.merchantName}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        match.confirmed === true
                          ? 'bg-blckbx-green/10 border-blckbx-green/30'
                          : match.confirmed === false
                          ? 'bg-blckbx-black/5 border-blckbx-black/10 opacity-50'
                          : 'bg-white border-blckbx-black/10'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blckbx-black truncate">{match.merchantName}</span>
                          <svg className="w-4 h-4 text-blckbx-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <span className="font-medium text-blckbx-cta truncate">{match.partner.partner_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blckbx-black/50">
                            Score: {match.score}%
                          </span>
                          <span className="text-xs text-blckbx-black/40">
                            (will add alias: &quot;{match.suggestedAlias}&quot;)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => toggleMatch(index, true)}
                          className={`p-2 rounded-lg transition-colors ${
                            match.confirmed === true
                              ? 'bg-blckbx-green text-white'
                              : 'hover:bg-blckbx-green/10 text-blckbx-black/40 hover:text-blckbx-green'
                          }`}
                          title="Confirm match"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleMatch(index, false)}
                          className={`p-2 rounded-lg transition-colors ${
                            match.confirmed === false
                              ? 'bg-blckbx-error text-white'
                              : 'hover:bg-blckbx-error/10 text-blckbx-black/40 hover:text-blckbx-error'
                          }`}
                          title="Dismiss match"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-blckbx-black/10 mt-auto">
                <button
                  onClick={() => setStep('preview')}
                  className="flex-1 py-3 rounded-lg border border-blckbx-black/20 text-blckbx-black font-medium hover:bg-blckbx-dark-sand transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Continue button clicked');
                    handleContinue();
                  }}
                  className="flex-1 py-3 rounded-lg bg-blckbx-cta text-blckbx-black font-medium hover:bg-opacity-90 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-blckbx-black font-medium">Uploading transactions...</p>
              <p className="text-sm text-blckbx-black/60 mt-1">This may take a moment</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Partner Detail Panel Component
function PartnerDetailPanel({
  partnerStats,
  isOpen,
  onClose,
}: {
  partnerStats: PartnerRevenueStats | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!partnerStats) return null;

  const { partner, transactionCount, totalRevenue, commissionEarned, lastTransaction, avgDealSize, ragStatus } = partnerStats;
  const commissionRate = parseCommission(partner.commission);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-blckbx-sand shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: RAG_COLORS[ragStatus],
                        boxShadow: `0 0 8px ${RAG_COLORS[ragStatus]}`,
                      }}
                    />
                    <span className="text-sm text-blckbx-black/60 capitalize">{ragStatus} health</span>
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-blckbx-black">
                    {partner.partner_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blckbx-cta/20 text-blckbx-black text-xs rounded font-medium">
                      {partner.partner_tier}
                    </span>
                    <span className="text-sm text-blckbx-black/60">{partner.lifestyle_category}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blckbx-dark-sand rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-blckbx-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blckbx-black/5 rounded-xl p-4">
                  <p className="text-sm text-blckbx-black/60 mb-1">Total Revenue</p>
                  <p className="text-2xl font-display font-semibold text-blckbx-black">
                    {formatAmount(totalRevenue)}
                  </p>
                </div>
                <div className="bg-blckbx-black/5 rounded-xl p-4">
                  <p className="text-sm text-blckbx-black/60 mb-1">Commission Earned</p>
                  <p className="text-2xl font-display font-semibold text-blckbx-cta">
                    {formatAmount(commissionEarned)}
                  </p>
                </div>
                <div className="bg-blckbx-black/5 rounded-xl p-4">
                  <p className="text-sm text-blckbx-black/60 mb-1">Transactions</p>
                  <p className="text-2xl font-display font-semibold text-blckbx-black">{transactionCount}</p>
                </div>
                <div className="bg-blckbx-black/5 rounded-xl p-4">
                  <p className="text-sm text-blckbx-black/60 mb-1">Avg Deal Size</p>
                  <p className="text-2xl font-display font-semibold text-blckbx-black">
                    {formatAmount(avgDealSize)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blckbx-black/5 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-blckbx-black/60">Commission Rate</p>
                    <span className="font-medium text-blckbx-black">{commissionRate}%</span>
                  </div>
                  <div className="w-full bg-blckbx-black/10 rounded-full h-2">
                    <div
                      className="bg-blckbx-cta rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(commissionRate * 2, 100)}%` }}
                    />
                  </div>
                </div>

                {lastTransaction && (
                  <div className="bg-blckbx-black/5 rounded-xl p-4">
                    <p className="text-sm text-blckbx-black/60 mb-1">Last Transaction</p>
                    <p className="font-medium text-blckbx-black">{format(lastTransaction, 'dd MMM yyyy')}</p>
                    <p className="text-sm text-blckbx-black/60">
                      {differenceInDays(new Date(), lastTransaction)} days ago
                    </p>
                  </div>
                )}

                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blckbx-cta hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Visit website
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Main PartnerHealth Component
export default function PartnerHealth({ partners }: PartnerHealthProps) {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [uploads, setUploads] = useState<StripeUpload[]>([]);
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [bigPurchases, setBigPurchases] = useState<BigPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerRevenueStats | null>(null);
  const [discoverySort, setDiscoverySort] = useState<DiscoverySort>('revenue');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chartView, setChartView] = useState<'both' | 'revenue' | 'commission'>('both');
  
  // Assign to partner modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMerchantForAssign, setSelectedMerchantForAssign] = useState<{ name: string; category: LifestyleCategory | '' } | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const copiedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Month selector state - 'all' for all time, or specific month string 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedInvoicePartner, setExpandedInvoicePartner] = useState<string | null>(null);
  const [updatingInvoicePartner, setUpdatingInvoicePartner] = useState<string | null>(null);
  const [invoiceTrackerView, setInvoiceTrackerView] = useState<InvoiceTrackerView>('pending');
  const [commissionInvoicedOverrides, setCommissionInvoicedOverrides] = useState<Record<string, boolean>>({});

  // Filter to only signed partners for matching
  const signedPartners = useMemo(() => 
    partners.filter(p => p.status === 'signed'),
    [partners]
  );

  // DEBUG: Log partners count and Addison Lee
  useEffect(() => {
    console.log('[DEBUG] Partners prop received:', partners.length, 'partners');
    console.log('[DEBUG] Signed partners:', signedPartners.length);
    
    const addisonLee = partners.find(p => 
      (p.partner_name || (p as unknown as { name?: string }).name)?.toLowerCase().includes('addison lee')
    );
    if (addisonLee) {
      console.log('Addison Lee:', JSON.stringify({ 
        id: addisonLee.id, 
        name: addisonLee.partner_name || (addisonLee as unknown as { name?: string }).name, 
        aliases: addisonLee.stripe_aliases 
      }));
    }
  }, [partners, signedPartners]);

  // Load data based on selected month
  const loadData = useCallback(async () => {
    console.log('[DEBUG] loadData called, selectedMonth:', selectedMonth);
    setIsLoading(true);
    try {
      const authToken = pb.authStore.token;
      if (!authToken) return;

      const bigPurchasesData = await getBigPurchases();
      setBigPurchases(bigPurchasesData);

      const uploadsData = await fetchUploads(authToken);
      console.log('[DEBUG] Uploads loaded:', uploadsData.length);
      setUploads(uploadsData);

      if (uploadsData.length > 0) {
        // Set default to most recent month if 'all' and we have uploads
        if (selectedMonth === 'all' && uploadsData.length > 0) {
          // Keep 'all' as default - user can select specific month
        }

        let allTransactions: ProcessedTransaction[] = [];

        if (selectedMonth === 'all') {
          // Fetch transactions from ALL uploads
          for (const upload of uploadsData) {
            const txData = await fetchTransactions(upload.id, authToken);
            const processed = txData.map((tx) => ({
              id: tx.id,
              date: new Date(tx.date),
              merchantRaw: tx.merchant_raw,
              merchantNormalised: tx.merchant_normalised,
              amount: tx.amount,
              partnerId: tx.partner_id,
              partner: tx.expand?.partner_id || null,
              category: tx.category,
              isHidden: tx.is_hidden,
            }));
            allTransactions = [...allTransactions, ...processed];
          }
          console.log('[DEBUG] All time transactions loaded:', allTransactions.length);
        } else {
          // Fetch transactions for specific month
          const selectedUpload = uploadsData.find(u => u.month === selectedMonth);
          if (selectedUpload) {
            const txData = await fetchTransactions(selectedUpload.id, authToken);
            allTransactions = txData.map((tx) => ({
              id: tx.id,
              date: new Date(tx.date),
              merchantRaw: tx.merchant_raw,
              merchantNormalised: tx.merchant_normalised,
              amount: tx.amount,
              partnerId: tx.partner_id,
              partner: tx.expand?.partner_id || null,
              category: tx.category,
              isHidden: tx.is_hidden,
            }));
            console.log('[DEBUG] Month-specific transactions loaded:', allTransactions.length);
          }
        }

        setTransactions(allTransactions);
      } else {
        // No uploads - clear transactions to show empty state
        console.log('[DEBUG] No uploads found, clearing transactions');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [showError, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (copiedToastTimeoutRef.current) {
        clearTimeout(copiedToastTimeoutRef.current);
      }
    };
  }, []);

  // Compute metrics
  const { totalRevenue, totalCommission, activePartners, partnerStats, nonPartnerMerchants } =
    useMemo(() => {
      console.log('[DEBUG] processPartnerRevenue input:', transactions.length, 'transactions');
      const result = processPartnerRevenue(transactions);
      console.log('[DEBUG] processPartnerRevenue output:', {
        totalRevenue: result.totalRevenue,
        activePartners: result.activePartners,
        partnerStatsCount: result.partnerStats.size,
        nonPartnerMerchantsCount: result.nonPartnerMerchants.size
      });
      // Log first few partner stats entries to see if partner data exists
      const firstPartner = Array.from(result.partnerStats.values())[0];
      if (firstPartner) {
        console.log('[DEBUG] First partner sample:', {
          name: firstPartner.partner?.partner_name,
          hasPartner: !!firstPartner.partner,
          transactionCount: firstPartner.transactionCount
        });
      }
      return result;
    }, [transactions]);

  const avgCommissionPerPartner = activePartners > 0 ? Math.round(totalCommission / activePartners) : 0;

  // Calculate growth (compare to previous upload if exists)
  const growthPercent = useMemo(() => {
    if (uploads.length < 2) return null;
    const current = uploads[0].total_spend;
    const previous = uploads[1].total_spend;
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }, [uploads]);

  // Weekly data for trend chart
  const weeklyData = useMemo(() => getWeeklyData(transactions), [transactions]);

  // Category distribution
  const categoryData = useMemo(() => getCategoryDistribution(partnerStats), [partnerStats]);

  // Top partners
  const topPartners = useMemo(() => {
    return Array.from(partnerStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }, [partnerStats]);

  // Non-partner stats (simplified - no commission calculations)
  const nonPartnerStats = useMemo(() => {
    const merchants = Array.from(nonPartnerMerchants.values());
    const totalRevenue = merchants.reduce((sum, m) => sum + m.totalRevenue, 0);

    return {
      count: merchants.length,
      totalRevenue,
      topMerchant: merchants.sort((a, b) => b.count - a.count)[0],
    };
  }, [nonPartnerMerchants]);

  // Filtered and sorted discovery list
  const discoveryList = useMemo(() => {
    let list = Array.from(nonPartnerMerchants.values());

    if (categoryFilter !== 'all') {
      list = list.filter((m) => m.category === categoryFilter);
    }

    list.sort((a, b) => {
      switch (discoverySort) {
        case 'frequency':
          return b.count - a.count;
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'recency':
          return b.lastUsed.getTime() - a.lastUsed.getTime();
        default:
          return 0;
      }
    });

    return list;
  }, [nonPartnerMerchants, categoryFilter, discoverySort]);

  // Hide merchant handler
  const handleHideMerchant = async (merchantName: string) => {
    try {
      const authToken = pb.authStore.token;
      if (!authToken || uploads.length === 0) return;

      await hideMerchantTransactions(uploads[0].id, merchantName, authToken);
      showSuccess(`Hidden ${merchantName}`);
      await loadData();
    } catch (error) {
      showError('Failed to hide merchant');
    }
  };

  // Add to pipeline handler
  const handleAddToPipeline = async (merchant: { name: string; category: LifestyleCategory | '' }) => {
    try {
      const authToken = pb.authStore.token;
      if (!authToken) return;

      await createPartnerFromMerchant(merchant.name, merchant.category || 'Misc', authToken);
      showSuccess(`Added ${merchant.name} to pipeline`);
      await loadData();
    } catch (error) {
      showError('Failed to add to pipeline');
    }
  };
  
  // Assign merchant to existing partner handler
  const handleAssignToPartner = async (partnerId: string) => {
    if (!selectedMerchantForAssign || uploads.length === 0) return;
    
    console.log('[DEBUG] handleAssignToPartner - partners count before:', partners.length);
    
    try {
      const authToken = pb.authStore.token;
      if (!authToken) return;

      const suggestedAlias = normaliseForFuzzyMatching(selectedMerchantForAssign.name);
      console.log('[DEBUG] Suggested alias:', suggestedAlias);
      
      const result = await assignMerchantToPartner(
        selectedMerchantForAssign.name,
        partnerId,
        suggestedAlias,
        authToken
      );
      
      console.log('[DEBUG] Assignment complete, updated partner:', result.updatedPartner.partner_name);
      console.log('[DEBUG] Partners count after assignment:', partners.length);

      showSuccess(
        `Assigned ${selectedMerchantForAssign.name} to partner. ` +
        `Updated ${result.updatedTransactions} transactions.`
      );
      setShowAssignModal(false);
      setSelectedMerchantForAssign(null);
      await loadData();
    } catch (error) {
      console.error('[DEBUG] Assignment failed:', error);
      showError('Failed to assign merchant to partner');
    }
  };

  // Delete upload handler
  const handleDeleteUpload = async () => {
    if (uploads.length === 0) return;
    
    setIsDeleting(true);
    try {
      const authToken = pb.authStore.token;
      if (!authToken) return;

      const upload = uploads[0];
      
      // First delete all transactions
      const deletedCount = await deleteTransactionsForUpload(upload.id, authToken);
      
      // Then delete the upload record
      await deleteUpload(upload.id, authToken);
      
      showSuccess(`Deleted upload for ${upload.month}. Removed ${deletedCount} transactions.`);
      setShowDeleteConfirm(false);
      await loadData();
    } catch (error) {
      showError('Failed to delete upload');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    nonPartnerMerchants.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [nonPartnerMerchants]);

  const partnerMap = useMemo(() => {
    return new Map(partners.map((partner) => [partner.id, partner]));
  }, [partners]);

  const getPurchaseAmountDue = useCallback((purchase: BigPurchase): number => {
    if (purchase.amount_to_invoice !== null && purchase.amount_to_invoice !== undefined) {
      return Number(purchase.amount_to_invoice) || 0;
    }
    return Number(purchase.estimated_amount) || 0;
  }, []);

  const invoicePartners = useMemo(() => {
    const grouped = new Map<
      string,
      {
        partnerName: string;
        purchases: BigPurchase[];
        totalPurchases: number;
        totalAmount: number;
        commissionValue: string;
        partnerIds: string[];
        hasCommissionSource: boolean;
        hasBigPurchaseSource: boolean;
        invoiced: boolean;
      }
    >();

    for (const stats of partnerStats.values()) {
      const partnerName = (stats.partner.partner_name || 'Unknown Partner').trim() || 'Unknown Partner';
      grouped.set(partnerName, {
        partnerName,
        purchases: [],
        totalPurchases: stats.transactionCount,
        totalAmount: stats.totalRevenue,
        commissionValue: (stats.partner.commission || '').trim(),
        partnerIds: [stats.partner.id],
        hasCommissionSource: typeof stats.partner.commission === 'string' && stats.partner.commission.trim() !== '',
        hasBigPurchaseSource: false,
        invoiced: !!stats.partner.commission_invoiced,
      });
    }

    for (const purchase of bigPurchases) {
      const partnerName = (purchase.partner_name || 'Unknown Partner').trim() || 'Unknown Partner';
      const existing = grouped.get(partnerName);

      if (existing) {
        existing.purchases.push(purchase);
        existing.totalPurchases += 1;
        existing.totalAmount += getPurchaseAmountDue(purchase);
        existing.hasBigPurchaseSource = true;
      } else {
        grouped.set(partnerName, {
          partnerName,
          purchases: [purchase],
          totalPurchases: 1,
          totalAmount: getPurchaseAmountDue(purchase),
          commissionValue: '',
          partnerIds: [],
          hasCommissionSource: false,
          hasBigPurchaseSource: true,
          invoiced: false,
        });
      }
    }

    for (const partner of partners) {
      const partnerName = (partner.partner_name || 'Unknown Partner').trim() || 'Unknown Partner';
      const commissionValue = typeof partner.commission === 'string' ? partner.commission.trim() : '';
      const existing = grouped.get(partnerName);

      if (existing) {
        existing.hasCommissionSource = existing.hasCommissionSource || commissionValue !== '';
        existing.commissionValue = existing.commissionValue || commissionValue;
        if (!existing.partnerIds.includes(partner.id)) {
          existing.partnerIds.push(partner.id);
        }
      }
    }

    const result = Array.from(grouped.values()).map((group) => ({
      ...group,
      purchases: [...group.purchases].sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()),
      invoiced:
        (group.purchases.length === 0 || group.purchases.every((purchase) => !!purchase.invoiced)) &&
        (group.partnerIds.length === 0 ||
          group.partnerIds.every((partnerId) =>
            partnerId in commissionInvoicedOverrides
              ? commissionInvoicedOverrides[partnerId]
              : !!partnerMap.get(partnerId)?.commission_invoiced
          )),
    }));

    return result
      .filter((group) => group.totalPurchases > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bigPurchases, commissionInvoicedOverrides, getPurchaseAmountDue, partnerMap, partnerStats, partners]);

  const pendingInvoicePartners = useMemo(
    () => invoicePartners.filter((group) => !group.invoiced),
    [invoicePartners]
  );

  const invoiceHistoryPartners = useMemo(
    () => invoicePartners.filter((group) => group.invoiced),
    [invoicePartners]
  );

  const visibleInvoicePartners = invoiceTrackerView === 'pending' ? pendingInvoicePartners : invoiceHistoryPartners;

  const invoicedByPartnerId = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const partner of partners) {
      const partnerName = (partner.partner_name || 'Unknown Partner').trim() || 'Unknown Partner';
      const relatedPurchases = bigPurchases.filter(
        (purchase) =>
          ((purchase.partner_name || 'Unknown Partner').trim() || 'Unknown Partner') === partnerName ||
          purchase.partner_id === partner.id
      );
      const purchasesInvoiced = relatedPurchases.length > 0 && relatedPurchases.every((purchase) => !!purchase.invoiced);
      const commissionInvoiced =
        partner.id in commissionInvoicedOverrides
          ? commissionInvoicedOverrides[partner.id]
          : !!partner.commission_invoiced;
      map.set(partner.id, purchasesInvoiced || commissionInvoiced);
    }

    return map;
  }, [bigPurchases, commissionInvoicedOverrides, partners]);

  const handlePartnerInvoicedToggle = useCallback(
    async (
      partnerName: string,
      checked: boolean,
      purchasesForPartner: BigPurchase[],
      partnerIds: string[]
    ) => {
      if (purchasesForPartner.length === 0 && partnerIds.length === 0) return;

      setUpdatingInvoicePartner(partnerName);
      try {
        const purchaseUpdates = purchasesForPartner.map(async (purchase) => {
            const updated = await updateBigPurchase(purchase.id, { invoiced: checked });
            const payload = {
              id: purchase.id,
              partner_name: updated?.partner_name ?? purchase.partner_name,
              estimated_amount: updated?.estimated_amount ?? purchase.estimated_amount,
              amount_to_invoice:
                updated?.amount_to_invoice !== undefined ? updated.amount_to_invoice : purchase.amount_to_invoice,
              invoiced: updated?.invoiced ?? checked,
            };

            const webhookResponse = await fetch('/api/big-purchase-status-webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (!webhookResponse.ok) {
              const errorPayload = await webhookResponse.json().catch(() => ({}));
              console.error('Big purchase invoiced webhook failed:', errorPayload);
            }
          });

        const commissionUpdates = partnerIds.map((partnerId) =>
          updatePartner(partnerId, { commission_invoiced: checked })
        );

        await Promise.all([...purchaseUpdates, ...commissionUpdates]);
        if (partnerIds.length > 0) {
          setCommissionInvoicedOverrides((current) => {
            const next = { ...current };
            for (const partnerId of partnerIds) {
              next[partnerId] = checked;
            }
            return next;
          });
        }
        showSuccess(`Updated invoiced status for ${partnerName}`);
        await loadData();
      } catch (error) {
        console.error('Failed to update invoiced status and/or webhook:', error);
        showError('Failed to update invoiced status');
      } finally {
        setUpdatingInvoicePartner(null);
      }
    },
    [loadData, showError, showSuccess]
  );

  const handleCopyInvoiceBlock = useCallback(
    async (purchase: BigPurchase) => {
      const linkedPartner = purchase.partner_id ? partnerMap.get(purchase.partner_id) : null;
      const recipient = linkedPartner?.contact_email || purchase.poc || '-';
      const amountDue = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
      }).format(getPurchaseAmountDue(purchase));

      const invoiceBlock =
        `Partner: ${purchase.partner_name}\n` +
        `Email: ${recipient}\n` +
        `Amount Due: ${amountDue}\n` +
        `Commission Notes: ${purchase.commission_notes || '-'}`;

      try {
        await navigator.clipboard.writeText(invoiceBlock);
        setShowCopiedToast(true);
        if (copiedToastTimeoutRef.current) {
          clearTimeout(copiedToastTimeoutRef.current);
        }
        copiedToastTimeoutRef.current = setTimeout(() => {
          setShowCopiedToast(false);
        }, 2500);
      } catch (error) {
        showError('Failed to copy invoice block');
      }
    },
    [getPurchaseAmountDue, partnerMap, showError]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header with Month Selector */}
      {activeTab !== 'invoice-tracker' && (
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {uploads.length > 0 && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-blckbx-dark-sand border-none rounded-lg pl-4 pr-10 py-2 text-sm font-medium text-blckbx-black focus:ring-2 focus:ring-blckbx-cta cursor-pointer"
              >
                <option value="all">All Time</option>
                {uploads.map((upload) => (
                  <option key={upload.id} value={upload.month}>
                    {format(new Date(upload.month + '-01'), 'MMM yyyy')}
                  </option>
                ))}
              </select>
              <svg 
                className="w-4 h-4 text-blckbx-black/50 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          {selectedMonth !== 'all' && uploads.length > 0 && (
            <span className="text-sm text-blckbx-black/50">
              {uploads.find(u => u.month === selectedMonth)?.total_transactions} transactions
            </span>
          )}
          {selectedMonth === 'all' && uploads.length > 0 && (
            <span className="text-sm text-blckbx-black/50">
              {uploads.length} months
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {uploads.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-blckbx-alert/10 text-blckbx-alert border border-blckbx-alert/20 px-4 py-2 rounded-lg font-medium hover:bg-blckbx-alert/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Upload
            </button>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-blckbx-cta text-blckbx-black px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload CSV
          </button>
        </div>
      </div>
      )}

      {/* KPI Cards */}
      {activeTab !== 'invoice-tracker' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-blckbx-black rounded-2xl p-5 text-white"
        >
          <div className="flex items-start justify-between">
            <p className="text-blckbx-sand/60 text-sm mb-1">Client Spend via Partners</p>
            <div className="group relative">
              <svg className="w-4 h-4 text-blckbx-sand/40 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-white rounded-lg shadow-lg text-xs text-blckbx-black opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Total value of client bookings placed through partner sites
              </div>
            </div>
          </div>
          <p className="text-3xl font-display font-semibold">{formatAmount(totalRevenue)}</p>
          {growthPercent !== null && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${growthPercent >= 0 ? 'text-blckbx-green' : 'text-blckbx-error'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={growthPercent >= 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
              </svg>
              {Math.abs(growthPercent).toFixed(1)}% vs last month
            </div>
          )}
          {growthPercent === null && (
            <p className="text-blckbx-sand/40 text-sm mt-2">First month</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-blckbx-cta to-yellow-500 rounded-2xl p-5 text-blckbx-black"
        >
          <p className="text-blckbx-black/60 text-sm mb-1">Commission Earned</p>
          <p className="text-3xl font-display font-semibold">{formatAmount(totalCommission)}</p>
          <p className="text-blckbx-black/60 text-sm mt-2">
            {totalRevenue > 0 ? ((totalCommission / totalRevenue) * 100).toFixed(1) : 0}% avg rate
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blckbx-dark-sand rounded-2xl p-5"
        >
          <p className="text-blckbx-black/60 text-sm mb-1">Active Partners</p>
          <p className="text-3xl font-display font-semibold text-blckbx-black">{activePartners}</p>
          <p className="text-blckbx-black/60 text-sm mt-2">
            of {partners.filter(p => p.status === 'signed').length} signed
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-blckbx-dark-sand rounded-2xl p-5"
        >
          <p className="text-blckbx-black/60 text-sm mb-1">Avg Commission/Partner</p>
          <p className="text-3xl font-display font-semibold text-blckbx-black">
            {formatAmount(avgCommissionPerPartner)}
          </p>
          <p className="text-blckbx-black/60 text-sm mt-2">per active partner</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blckbx-dark-sand rounded-2xl p-5"
        >
          <p className="text-blckbx-black/60 text-sm mb-1">Total Transactions</p>
          <p className="text-3xl font-display font-semibold text-blckbx-black">{transactions.length}</p>
          <p className="text-blckbx-black/60 text-sm mt-2">{uploads[0]?.matched_count || 0} matched</p>
        </motion.div>
      </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-blckbx-black/10">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'discovery', label: 'Discovery' },
          { id: 'invoice-tracker', label: 'Invoice Tracker' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SubTab)}
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === tab.id
                ? 'text-blckbx-black'
                : 'text-blckbx-black/50 hover:text-blckbx-black/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blckbx-cta"
              />
            )}
          </button>
        ))}
      </div>

      {/* Invoice Tracker Tab */}
      {activeTab === 'invoice-tracker' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-blckbx-dark-sand overflow-hidden">
            <div className="p-4 border-b border-blckbx-dark-sand flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-blckbx-black">Invoice Tracker</h3>
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-lg border border-blckbx-dark-sand overflow-hidden">
                  <button
                    onClick={() => {
                      setInvoiceTrackerView('pending');
                      setExpandedInvoicePartner(null);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      invoiceTrackerView === 'pending'
                        ? 'bg-blckbx-cta/20 text-blckbx-black'
                        : 'bg-white text-blckbx-black/60 hover:text-blckbx-black'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceTrackerView('history');
                      setExpandedInvoicePartner(null);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-blckbx-dark-sand ${
                      invoiceTrackerView === 'history'
                        ? 'bg-blckbx-cta/20 text-blckbx-black'
                        : 'bg-white text-blckbx-black/60 hover:text-blckbx-black'
                    }`}
                  >
                    History
                  </button>
                </div>
                <span className="text-sm text-blckbx-black/60">{visibleInvoicePartners.length} partners</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blckbx-dark-sand bg-blckbx-dark-sand">
                    <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black">Partner Name</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black">Total Purchases</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black">Total Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black">Commission</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-blckbx-black">Invoiced</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoicePartners.map((group, index) => (
                    <Fragment key={group.partnerName}>
                      <motion.tr
                        key={group.partnerName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30 cursor-pointer ${
                          expandedInvoicePartner === group.partnerName ? 'bg-blckbx-sand/30' : index % 2 === 0 ? 'bg-white' : 'bg-blckbx-sand/20'
                        } ${group.invoiced ? 'opacity-60' : ''}`}
                        onClick={() =>
                          setExpandedInvoicePartner((current) =>
                            current === group.partnerName ? null : group.partnerName
                          )
                        }
                      >
                        <td className="py-3 px-4 text-sm text-blckbx-black font-medium">
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-4 h-4 text-blckbx-black/50 transition-transform ${
                                expandedInvoicePartner === group.partnerName ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className={group.invoiced ? 'line-through' : ''}>{group.partnerName}</span>
                            {group.invoiced && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700">
                                Invoiced ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-blckbx-black/70">{group.totalPurchases}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-blckbx-black">
                          {new Intl.NumberFormat('en-GB', {
                            style: 'currency',
                            currency: 'GBP',
                            maximumFractionDigits: 0,
                          }).format(group.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-blckbx-black/70">{group.commissionValue || '-'}</td>
                        <td className="py-3 px-4 text-center" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={group.invoiced}
                            disabled={updatingInvoicePartner === group.partnerName}
                            onChange={(event) =>
                              void handlePartnerInvoicedToggle(
                                group.partnerName,
                                event.target.checked,
                                group.purchases,
                                group.partnerIds
                              )
                            }
                            className="custom-checkbox"
                          />
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedInvoicePartner === group.partnerName && (
                          <motion.tr
                            key={`${group.partnerName}-detail`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-blckbx-sand/30"
                          >
                            <td colSpan={5} className="p-4">
                              <div className="space-y-3">
                                {(() => {
                                  const linkedPartners = group.partnerIds
                                    .map((partnerId) => partnerMap.get(partnerId))
                                    .filter((partner): partner is Partner => !!partner);
                                  const contactPartner =
                                    linkedPartners.find(
                                      (partner) =>
                                        !!partner.contact_name ||
                                        !!partner.contact_email ||
                                        !!partner.contact_phone ||
                                        !!partner.contact_position
                                    ) || linkedPartners[0];
                                  const fallbackPoc = group.purchases[0]?.poc || '-';

                                  return (
                                    <div className="bg-white rounded-lg border border-blckbx-dark-sand p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div>
                                          <p className="text-xs text-blckbx-black/50">Contact Name</p>
                                          <p className="text-sm font-medium text-blckbx-black">
                                            {contactPartner?.contact_name || fallbackPoc}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-blckbx-black/50">Position</p>
                                          <p className="text-sm text-blckbx-black">
                                            {contactPartner?.contact_position || '-'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-blckbx-black/50">Email</p>
                                          {contactPartner?.contact_email ? (
                                            <a
                                              href={`mailto:${contactPartner.contact_email}`}
                                              className="text-sm text-blckbx-cta hover:underline break-all"
                                            >
                                              {contactPartner.contact_email}
                                            </a>
                                          ) : (
                                            <p className="text-sm text-blckbx-black">-</p>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-xs text-blckbx-black/50">Phone</p>
                                          <p className="text-sm text-blckbx-black">
                                            {contactPartner?.contact_phone || '-'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {group.purchases.map((purchase) => (
                                  <div key={purchase.id} className="bg-white rounded-lg border border-blckbx-dark-sand p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                      <div>
                                        <p className="text-xs text-blckbx-black/50">POC</p>
                                        <p className="text-sm text-blckbx-black">{purchase.poc || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-blckbx-black/50">Amount</p>
                                        <p className="text-sm text-blckbx-black font-medium">
                                          {new Intl.NumberFormat('en-GB', {
                                            style: 'currency',
                                            currency: 'GBP',
                                            maximumFractionDigits: 0,
                                          }).format(getPurchaseAmountDue(purchase))}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-blckbx-black/50">Purchase Date</p>
                                        <p className="text-sm text-blckbx-black">
                                          {purchase.purchase_date ? format(new Date(purchase.purchase_date), 'dd MMM yyyy') : '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-blckbx-black/50">Category</p>
                                        <p className="text-sm text-blckbx-black">{purchase.category || '-'}</p>
                                      </div>
                                      <div className="md:col-span-2">
                                        <p className="text-xs text-blckbx-black/50">Commission Notes</p>
                                        <p className="text-sm text-blckbx-black">{purchase.commission_notes || '-'}</p>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                      <button
                                        onClick={() => void handleCopyInvoiceBlock(purchase)}
                                        className="px-3 py-1.5 rounded-lg bg-[#D4A843] text-blckbx-black text-sm font-medium hover:bg-opacity-90 transition-colors"
                                      >
                                        Copy to Clipboard
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {visibleInvoicePartners.length === 0 && (
                <div className="text-center py-12 text-blckbx-black/50">
                  {invoiceTrackerView === 'pending'
                    ? 'No partners with uninvoiced matched transactions yet'
                    : 'No invoiced partners in history yet'}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {uploads.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-blckbx-cta/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blckbx-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-semibold text-blckbx-black mb-2">No Data Yet</h3>
              <p className="text-blckbx-black/60 mb-6 max-w-md mx-auto">
                Upload your first Stripe CSV to start tracking partner revenue, commission, and discover new opportunities.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-blckbx-cta text-blckbx-black px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Stripe CSV
              </button>
            </div>
          )}
          {uploads.length > 0 && (
          <>
          {/* Revenue Trend Chart */}
          <div className="bg-blckbx-black rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl font-semibold text-white">Spend & Commission Trend</h3>
              <div className="flex gap-2">
                {(['both', 'revenue', 'commission'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setChartView(view)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      chartView === view
                        ? 'bg-blckbx-cta text-blckbx-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E6B148" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E6B148" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1EA988" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1EA988" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: '#F5F3F0', fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                  />
                  <YAxis
                    tick={{ fill: '#F5F3F0', fontSize: 12 }}
                    tickFormatter={(value) => formatCompactAmount(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1D1C1B',
                      border: '1px solid rgba(230, 177, 72, 0.2)',
                      borderRadius: '8px',
                      color: '#F5F3F0',
                    }}
                    formatter={(value: number) => formatAmount(value)}
                  />
                  {(chartView === 'both' || chartView === 'revenue') && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#E6B148"
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  )}
                  {(chartView === 'both' || chartView === 'commission') && (
                    <Area
                      type="monotone"
                      dataKey="commission"
                      stroke="#1EA988"
                      fillOpacity={1}
                      fill="url(#commissionGradient)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Partners */}
            <div className="bg-blckbx-dark-sand rounded-2xl p-6">
              <h3 className="font-display text-xl font-semibold text-blckbx-black mb-4">
                Top Partners by Spend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPartners} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="partner.partner_name"
                      tick={{ fill: '#1D1C1B', fontSize: 12 }}
                      width={90}
                      interval={0}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1D1C1B',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F5F3F0',
                      }}
                      formatter={(value: number) => formatAmount(value)}
                    />
                    <Bar
                      dataKey="totalRevenue"
                      fill="#E6B148"
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => setSelectedPartner(data)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-blckbx-dark-sand rounded-2xl p-6">
              <h3 className="font-display text-xl font-semibold text-blckbx-black mb-4">
                Revenue by Category
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1D1C1B',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F5F3F0',
                      }}
                      formatter={(value: number) => formatAmount(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {categoryData.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-blckbx-black/70">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Partner List */}
          <div className="bg-blckbx-dark-sand rounded-2xl p-6">
            <h3 className="font-display text-xl font-semibold text-blckbx-black mb-4">All Partners</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blckbx-black/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black/60">Partner</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black/60">Tier</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black/60">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black/60">Commission</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-blckbx-black/60">Txns</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-blckbx-black/60">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(partnerStats.values())
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .map((stats) => (
                      <tr
                        key={stats.partner.id}
                        className="border-b border-blckbx-black/5 hover:bg-blckbx-black/5 cursor-pointer transition-colors"
                        onClick={() => setSelectedPartner(stats)}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-blckbx-black">{stats.partner.partner_name}</p>
                              {invoicedByPartnerId.get(stats.partner.id) && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700">
                                  Invoiced ✓
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blckbx-black/50">{stats.partner.lifestyle_category}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blckbx-cta/20 text-blckbx-black text-xs rounded font-medium">
                            {stats.partner.partner_tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-blckbx-black">
                          {formatAmount(stats.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-blckbx-cta">
                          {formatAmount(stats.commissionEarned)}
                        </td>
                        <td className="py-3 px-4 text-center text-blckbx-black/70">
                          {stats.transactionCount}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                background: RAG_COLORS[stats.ragStatus],
                                boxShadow: `0 0 6px ${RAG_COLORS[stats.ragStatus]}`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </motion.div>
      )}

      {/* Discovery Tab */}
      {activeTab === 'discovery' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blckbx-alert/10 border border-blckbx-alert/20 rounded-2xl p-5">
              <p className="text-blckbx-black/60 text-sm mb-1">Non-Partner Merchants</p>
              <p className="text-3xl font-display font-semibold text-blckbx-black">{nonPartnerStats.count}</p>
              <p className="text-blckbx-alert text-sm mt-2">Potential leads</p>
            </div>
            <div className="bg-blckbx-black rounded-2xl p-5 text-white">
              <p className="text-blckbx-sand/60 text-sm mb-1">Non-Partner Spend</p>
              <p className="text-3xl font-display font-semibold">{formatAmount(nonPartnerStats.totalRevenue)}</p>
              <p className="text-blckbx-sand/60 text-sm mt-2">Total value</p>
            </div>
            <div className="bg-blckbx-cta/20 rounded-2xl p-5">
              <p className="text-blckbx-black/60 text-sm mb-1">Top Discovery</p>
              <p className="text-xl font-display font-semibold text-blckbx-black truncate">
                {nonPartnerStats.topMerchant?.name || '—'}
              </p>
              <p className="text-blckbx-black/60 text-sm mt-2">
                {nonPartnerStats.topMerchant?.count || 0} bookings
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-blckbx-black text-white'
                    : 'bg-blckbx-dark-sand text-blckbx-black hover:bg-blckbx-black/10'
                }`}
              >
                All
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-blckbx-cta text-blckbx-black'
                      : 'bg-blckbx-dark-sand text-blckbx-black hover:bg-blckbx-black/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-blckbx-black/60">Sort by:</span>
              <select
                value={discoverySort}
                onChange={(e) => setDiscoverySort(e.target.value as DiscoverySort)}
                className="bg-blckbx-dark-sand border-none rounded-lg px-3 py-1.5 text-sm text-blckbx-black focus:ring-2 focus:ring-blckbx-cta"
              >
                <option value="revenue">Revenue</option>
                <option value="frequency">Frequency</option>
                <option value="recency">Recency</option>
              </select>
            </div>
          </div>

          {/* Discovery Table */}
          <div className="bg-blckbx-dark-sand rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blckbx-black/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black/60">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black/60">Merchant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blckbx-black/60">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black/60">Bookings</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black/60">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-blckbx-black/60">Last Used</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-blckbx-black/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discoveryList.map((merchant, index) => (
                  <tr key={merchant.name} className="border-b border-blckbx-black/5 hover:bg-blckbx-black/5">
                    <td className="py-3 px-4 text-blckbx-black/50">#{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blckbx-black">{merchant.name}</span>
                        <span className="px-2 py-0.5 bg-blckbx-green/20 text-blckbx-green text-xs rounded-full font-medium">
                          Potential
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {merchant.category && (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: CATEGORY_COLOR_MAP[merchant.category] + '20',
                            color: CATEGORY_COLOR_MAP[merchant.category],
                          }}
                        >
                          {merchant.category}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 bg-blckbx-black/10 rounded-full h-1.5">
                          <div
                            className="bg-blckbx-cta rounded-full h-1.5"
                            style={{
                              width: `${Math.min((merchant.count / (discoveryList[0]?.count || 1)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-blckbx-black text-sm w-6">{merchant.count}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blckbx-black">
                      {formatAmount(merchant.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-blckbx-black/70">
                      {format(merchant.lastUsed, 'dd MMM')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedMerchantForAssign(merchant);
                            setShowAssignModal(true);
                          }}
                          className="p-1.5 hover:bg-blckbx-green/20 rounded-lg transition-colors"
                          title="Link to Partner"
                        >
                          <svg className="w-4 h-4 text-blckbx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleAddToPipeline(merchant)}
                          className="p-1.5 hover:bg-blckbx-cta/20 rounded-lg transition-colors"
                          title="Add to Pipeline"
                        >
                          <svg className="w-4 h-4 text-blckbx-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleHideMerchant(merchant.name)}
                          className="p-1.5 hover:bg-blckbx-black/10 rounded-lg transition-colors"
                          title="Hide"
                        >
                          <svg className="w-4 h-4 text-blckbx-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {discoveryList.length === 0 && (
              <div className="text-center py-12 text-blckbx-black/50">
                No merchants match the selected filter
              </div>
            )}
          </div>
        </motion.div>
      )}

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={loadData}
        signedPartners={signedPartners}
      />

      <PartnerDetailPanel
        partnerStats={selectedPartner}
        isOpen={!!selectedPartner}
        onClose={() => setSelectedPartner(null)}
      />

      {/* Assign to Partner Modal */}
      <AnimatePresence>
        {showAssignModal && selectedMerchantForAssign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-blckbx-sand rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-xl font-semibold text-blckbx-black">
                  Assign to Partner
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-blckbx-dark-sand rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-blckbx-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-blckbx-black/70 mb-4">
                Select a partner for <span className="font-medium text-blckbx-black">{selectedMerchantForAssign.name}</span>:
              </p>
              
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                {signedPartners.length === 0 ? (
                  <p className="text-blckbx-black/50 text-center py-4">No signed partners available</p>
                ) : (
                  signedPartners.map((partner) => (
                    <button
                      key={partner.id}
                      onClick={() => handleAssignToPartner(partner.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-blckbx-dark-sand hover:bg-blckbx-black/10 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-blckbx-black">{partner.partner_name}</p>
                        <p className="text-sm text-blckbx-black/60">{partner.lifestyle_category}</p>
                      </div>
                      <span className="px-2 py-1 bg-blckbx-cta/20 text-blckbx-black text-xs rounded font-medium">
                        {partner.partner_tier}
                      </span>
                    </button>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full py-3 rounded-lg border border-blckbx-black/20 text-blckbx-black font-medium hover:bg-blckbx-dark-sand transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Upload Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-blckbx-sand rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blckbx-alert/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blckbx-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-blckbx-black">
                  Delete Upload?
                </h3>
              </div>
              
              <p className="text-blckbx-black/70 mb-6">
                Delete the upload for <span className="font-medium text-blckbx-black">{format(new Date(uploads[0].month + '-01'), 'MMMM yyyy')}</span>? 
                This will remove all <span className="font-medium text-blckbx-black">{uploads[0].total_transactions}</span> transactions for this month.
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-lg border border-blckbx-black/20 text-blckbx-black font-medium hover:bg-blckbx-dark-sand transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUpload}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-lg bg-blckbx-alert text-white font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCopiedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg bg-blckbx-black text-blckbx-sand text-sm font-medium shadow-lg">
          Copied to clipboard ✓
        </div>
      )}
    </motion.div>
  );
}
