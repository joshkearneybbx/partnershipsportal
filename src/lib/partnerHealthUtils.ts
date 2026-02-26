import { Partner, LifestyleCategory } from '@/types';
import { CSVRow, ProcessedTransaction, MerchantStats, PartnerUsageStats } from '@/types/partnerHealth';

const POCKETBASE_URL = 'https://pocketbase.blckbx.co.uk';

/**
 * Normalise merchant name for grouping and display
 * Handles common variants and returns a clean display name
 */
export function normaliseMerchant(raw: string): string {
  let normalised = raw.toUpperCase().trim();
  
  // Common merchant patterns and their display names
  const merchantPatterns: { patterns: string[]; displayName: string }[] = [
    { patterns: ['AMAZON', 'AMAZON.CO.UK', 'AMAZON.COM', 'AMZN'], displayName: 'Amazon' },
    { patterns: ['BRITISH AIRWAYS', 'BA.COM', 'BRITISH AIR', 'BA HOLIDAYS'], displayName: 'British Airways' },
    { patterns: ['TRAINLINE', 'THE TRAINLINE', 'TRAINLINE.COM'], displayName: 'Trainline' },
    { patterns: ['UBER', 'UBER TRIP', 'UBER EATS'], displayName: 'Uber' },
    { patterns: ['ADDISONLEE', 'ADDISON LEE', 'ADDISONLEE*'], displayName: 'Addison Lee' },
    { patterns: ['TESCO', 'TESCO.COM', 'TESCO STORES'], displayName: 'Tesco' },
    { patterns: ['SAINSBURYS', "SAINSBURY'S", 'SAINSBURY'], displayName: "Sainsbury's" },
    { patterns: ['ASDA', 'ASDA.COM'], displayName: 'Asda' },
    { patterns: ['MORRISONS', 'WM MORRISON'], displayName: 'Morrisons' },
    { patterns: ['WAITROSE', 'WAITROSE.COM'], displayName: 'Waitrose' },
    { patterns: ['MARKS & SPENCER', 'M&S', 'MARKS AND SPENCER', 'M+S'], displayName: 'Marks & Spencer' },
    { patterns: ['JOHN LEWIS', 'JOHNLEWIS.COM', 'JOHNLEWIS'], displayName: 'John Lewis' },
    { patterns: ['SELFRIDGES', 'SELFRIDGES.COM'], displayName: 'Selfridges' },
    { patterns: ['HARRODS', 'HARRODS.COM'], displayName: 'Harrods' },
    { patterns: ['NET-A-PORTER', 'NET A PORTER', 'NETAPORTER'], displayName: 'Net-a-Porter' },
    { patterns: ['MR PORTER', 'MRPORTER', 'MRPORTER.COM'], displayName: 'Mr Porter' },
    { patterns: ['FARFETCH', 'FARFETCH.COM'], displayName: 'Farfetch' },
    { patterns: ['SPOTIFY', 'SPOTIFY.COM'], displayName: 'Spotify' },
    { patterns: ['NETFLIX', 'NETFLIX.COM'], displayName: 'Netflix' },
    { patterns: ['APPLE', 'APPLE.COM', 'APPLE STORE', 'APL*'], displayName: 'Apple' },
    { patterns: ['GOOGLE', 'GOOGLE.COM', 'GOOGLE *'], displayName: 'Google' },
    { patterns: ['MICROSOFT', 'MSFT *', 'MICROSOFT*'], displayName: 'Microsoft' },
    { patterns: ['STEAM', 'STEAM GAMES', 'VALVE'], displayName: 'Steam' },
    { patterns: ['DELIVEROO', 'DELIVEROO.CO.UK'], displayName: 'Deliveroo' },
    { patterns: ['JUST EAT', 'JUSTEAT', 'JUST-EAT'], displayName: 'Just Eat' },
    { patterns: ['DOMINOS', "DOMINO'S", 'DOMINO'], displayName: "Domino's" },
    { patterns: ['NANDOS', "NANDO'S"], displayName: "Nando's" },
    { patterns: ['STARBUCKS', 'STARBUCKS.CO.UK'], displayName: 'Starbucks' },
    { patterns: ['COSTA', 'COSTA COFFEE'], displayName: 'Costa Coffee' },
    { patterns: ['PRET', 'PRET A MANGER', 'PRETAMANGER'], displayName: 'Pret a Manger' },
    { patterns: ['WASABI', 'WASABI.CO.UK'], displayName: 'Wasabi' },
    { patterns: ['LEON', 'LEON RESTAURANTS'], displayName: 'Leon' },
    { patterns: ['ITSU', 'ITSU LTD'], displayName: 'itsu' },
    { patterns: ['BOOTS', 'BOOTS.COM'], displayName: 'Boots' },
    { patterns: ['SUPERDRUG', 'SUPERDRUG.COM'], displayName: 'Superdrug' },
    { patterns: ['LOOKFANTASTIC', 'LOOK FANTASTIC'], displayName: 'Lookfantastic' },
    { patterns: ['SEPHORA', 'SEPHORA.CO.UK'], displayName: 'Sephora' },
    { patterns: ['CULT BEAUTY', 'CULTBEAUTY'], displayName: 'Cult Beauty' },
    { patterns: ['SPACE NK', 'SPACENK'], displayName: 'Space NK' },
    { patterns: ['HAIRCUT', 'BARBERS', 'BARBER'], displayName: 'Hair/Barber' },
    { patterns: ['DRY CLEANER', 'DRYCLEANER', 'DRYCLEAN'], displayName: 'Dry Cleaning' },
    { patterns: ['OCTOPUS ENERGY', 'OCTOPUS', 'OCTOPUS ENERG'], displayName: 'Octopus Energy' },
    { patterns: ['BRITISH GAS', 'BRITISHGAS'], displayName: 'British Gas' },
    { patterns: ['O2', 'O2 UK', 'O2 MOBILE'], displayName: 'O2' },
    { patterns: ['VODAFONE', 'VODAFONE UK'], displayName: 'Vodafone' },
    { patterns: ['THREE', '3 MOBILE', 'THREE UK'], displayName: 'Three' },
    { patterns: ['EE', 'EE LIMITED', 'EE MOBILE'], displayName: 'EE' },
    { patterns: ['SKY', 'SKY UK', 'SKY.COM'], displayName: 'Sky' },
    { patterns: ['VIRGIN MEDIA', 'VIRGIN', 'VIRGINMEDIA'], displayName: 'Virgin Media' },
    { patterns: ['DVLA', 'DVLA TAX', 'DVLA LICENCE'], displayName: 'DVLA' },
    { patterns: ['PARKING', 'PARKING.COM', 'PARKING CHARGE'], displayName: 'Parking' },
    { patterns: ['CONGESTION CHARGE', 'CONGESTION', 'TFL CONGESTION', 'ULEZ'], displayName: 'Congestion/ULEZ' },
    { patterns: ['TFL', 'TFL.GOV.UK', 'TRANSPORT FOR LONDON', 'OYSTER'], displayName: 'TFL' },
    { patterns: ['NATIONAL RAIL', 'NATIONALRAIL'], displayName: 'National Rail' },
    { patterns: ['GWR', 'GREAT WESTERN RAILWAY'], displayName: 'GWR' },
    { patterns: ['LNER', 'LONDON NORTH EASTERN'], displayName: 'LNER' },
    { patterns: ['VIRGIN TRAINS', 'VIRGINTRAIN'], displayName: 'Virgin Trains' },
    { patterns: ['EASYJET', 'EASYJET.COM', 'EASY JET'], displayName: 'easyJet' },
    { patterns: ['RYANAIR', 'RYANAIR.COM'], displayName: 'Ryanair' },
    { patterns: ['JET2', 'JET2.COM'], displayName: 'Jet2' },
    { patterns: ['BOOKING.COM', 'BOOKINGCOM', 'BOOKING.COM*'], displayName: 'Booking.com' },
    { patterns: ['AIRBNB', 'AIRBNB.COM', 'AIRB&B'], displayName: 'Airbnb' },
    { patterns: ['EXPEDIA', 'EXPEDIA.CO.UK'], displayName: 'Expedia' },
    { patterns: ['HILTON', 'HILTON HOTELS', 'HILTON.COM'], displayName: 'Hilton' },
    { patterns: ['MARRIOTT', 'MARRIOTT HOTELS', 'MARRIOTT.COM'], displayName: 'Marriott' },
    { patterns: ['IHG', 'IHG HOTELS', 'HOLIDAY INN', 'CROWNE PLAZA'], displayName: 'IHG Hotels' },
    { patterns: ['ACCOR', 'ACCOR HOTELS', 'IBIS', 'NOVOTEL'], displayName: 'Accor' },
    { patterns: ['PREMIER INN', 'PREMIERINN', 'WHITBREAD'], displayName: 'Premier Inn' },
    { patterns: ['GYM', 'GYM MEMBERSHIP', 'THE GYM'], displayName: 'Gym' },
    { patterns: ['PUREGYM', 'PURE GYM'], displayName: 'PureGym' },
    { patterns: ['DAVID LLOYD', 'DAVIDLLOYD'], displayName: 'David Lloyd' },
    { patterns: ['VIRGIN ACTIVE', 'VIRGINACTIVE'], displayName: 'Virgin Active' },
    { patterns: ['CLASSPASS', 'CLASS PASS'], displayName: 'ClassPass' },
    { patterns: ['PELOTON', 'PELOTON.COM', 'PELOTON BIKE'], displayName: 'Peloton' },
    { patterns: ['PHARMACY', 'BOOTS PHARMACY', 'LLOYDS PHARMACY'], displayName: 'Pharmacy' },
    { patterns: ['DENTIST', 'DENTAL', 'DENTAL CARE'], displayName: 'Dentist' },
    { patterns: ['OPTICIAN', 'SPECSAVERS', 'VISION EXPRESS'], displayName: 'Optician' },
    { patterns: ['VET', 'VETS', 'VETERINARY'], displayName: 'Vet' },
    { patterns: ['PET', 'PET SUPPLIES', 'PETS AT HOME'], displayName: 'Pet Supplies' },
    { patterns: ['FLOWERS', 'FLOWER DELIVERY', 'INTERFLORA'], displayName: 'Flowers' },
    { patterns: ['MOONPIG', 'MOONPIG.COM'], displayName: 'Moonpig' },
    { patterns: ['FUNKY PIGEON', 'FUNKYPIGEON'], displayName: 'Funky Pigeon' },
    { patterns: ['AMERICAN EXPRESS', 'AMEX', 'AMERICANEXPRESS'], displayName: 'American Express' },
    { patterns: ['BARCLAYCARD', 'BARCLAYS CARD'], displayName: 'Barclaycard' },
    { patterns: ['HSBC', 'HSBC BANK'], displayName: 'HSBC' },
    { patterns: ['LLOYDS BANK', 'LLOYDSBANK'], displayName: 'Lloyds Bank' },
    { patterns: ['NATWEST', 'NATWEST BANK'], displayName: 'NatWest' },
    { patterns: ['SANTANDER', 'SANTANDER UK'], displayName: 'Santander' },
    { patterns: ['MONZO', 'MONZO BANK'], displayName: 'Monzo' },
    { patterns: ['STARLING', 'STARLING BANK'], displayName: 'Starling' },
    { patterns: ['REVOLUT', 'REVOLUT LTD'], displayName: 'Revolut' },
    { patterns: ['WISE', 'WISE.COM', 'TRANSFERWISE'], displayName: 'Wise' },
    { patterns: ['PAYPAL', 'PAYPAL *', 'PAYPAL.COM'], displayName: 'PayPal' },
    { patterns: ['STRIPE', 'STRIPE.COM', 'STRIPE *'], displayName: 'Stripe' },
    { patterns: ['XEROX', 'XERO', 'XERO.COM'], displayName: 'Xero' },
    { patterns: ['QUICKBOOKS', 'QUICKBOOKS.COM'], displayName: 'QuickBooks' },
    { patterns: ['FREEAGENT', 'FREEAGENT.COM'], displayName: 'FreeAgent' },
    { patterns: ['SLACK', 'SLACK.COM'], displayName: 'Slack' },
    { patterns: ['NOTION', 'NOTION.SO'], displayName: 'Notion' },
    { patterns: ['TRELLO', 'TRELLO.COM'], displayName: 'Trello' },
    { patterns: ['ASANA', 'ASANA.COM'], displayName: 'Asana' },
    { patterns: ['MONDAY.COM', 'MONDAY', 'MONDAYCOM'], displayName: 'Monday.com' },
    { patterns: ['CLICKUP', 'CLICKUP.COM'], displayName: 'ClickUp' },
    { patterns: ['ZOOM', 'ZOOM.US'], displayName: 'Zoom' },
    { patterns: ['TEAMS', 'MICROSOFT TEAMS'], displayName: 'Microsoft Teams' },
    { patterns: ['DROPBOX', 'DROPBOX.COM'], displayName: 'Dropbox' },
    { patterns: ['GOOGLE DRIVE', 'GOOGLEDRIVE'], displayName: 'Google Drive' },
    { patterns: ['ONEDRIVE', 'ONEDRIVE.COM'], displayName: 'OneDrive' },
    { patterns: ['WEWORK', 'WE WORK'], displayName: 'WeWork' },
    { patterns: ['REGUS', 'REGUS.COM'], displayName: 'Regus' },
    { patterns: ['WORKSPACE', 'WORKSPACE.COM'], displayName: 'Workspace' },
    { patterns: ['IKEA', 'IKEA.COM', 'IKEA UK'], displayName: 'IKEA' },
    { patterns: ['ARGOS', 'ARGOS.CO.UK'], displayName: 'Argos' },
    { patterns: ['CURRYS', 'CURRYS.CO.UK', 'CURRY S'], displayName: 'Currys' },
    { patterns: ['AO.COM', 'AO.COM LTD'], displayName: 'AO.com' },
    { patterns: ['VERY', 'VERY.CO.UK'], displayName: 'Very' },
    { patterns: ['LITTLEWOODS', 'LITTLEWOODS.COM'], displayName: 'Littlewoods' },
    { patterns: ['NEXT', 'NEXT.CO.UK', 'NEXT PLC'], displayName: 'Next' },
    { patterns: ['ASOS', 'ASOS.COM'], displayName: 'ASOS' },
    { patterns: ['BOOHOO', 'BOOHOO.COM'], displayName: 'Boohoo' },
    { patterns: ['PRETTY LITTLE THING', 'PRETTYLITTLETHING'], displayName: 'PrettyLittleThing' },
    { patterns: ['MISSGUIDED', 'MISSGUIDED.COM'], displayName: 'Missguided' },
    { patterns: ['ZARA', 'ZARA.COM', 'ZARA UK'], displayName: 'Zara' },
    { patterns: ['H&M', 'H & M', 'H&M.COM'], displayName: 'H&M' },
    { patterns: ['UNIQLO', 'UNIQLO.COM'], displayName: 'Uniqlo' },
    { patterns: ['PRIMARK', 'PRIMARK.COM'], displayName: 'Primark' },
    { patterns: ['TK MAXX', 'TKMAXX', 'TJ MAXX'], displayName: 'TK Maxx' },
    { patterns: ['HOMESENSE', 'HOMESENSE UK'], displayName: 'Homesense' },
    { patterns: ['B&Q', 'B & Q', 'BANDQ'], displayName: 'B&Q' },
    { patterns: ['WICKES', 'WICKES.CO.UK'], displayName: 'Wickes' },
    { patterns: ['HOMEBASE', 'HOMEBASE.CO.UK'], displayName: 'Homebase' },
    { patterns: ['SCREWFIX', 'SCREWFIX.COM'], displayName: 'Screwfix' },
    { patterns: ['TRAVIS PERKINS', 'TRAVISPERKINS'], displayName: 'Travis Perkins' },
    { patterns: ['PLUMB CENTER', 'PLUMBCENTER'], displayName: 'Plumb Center' },
    { patterns: ['JEWSON', 'JEWSON.CO.UK'], displayName: 'Jewson' },
    { patterns: ['HOWDENS', 'HOWDENS JOINERY'], displayName: 'Howdens' },
    { patterns: ['MAGNET', 'MAGNET KITCHENS'], displayName: 'Magnet' },
    { patterns: ['WREN', 'WREN KITCHENS'], displayName: 'Wren Kitchens' },
  ];
  
  // Check each pattern group
  for (const group of merchantPatterns) {
    for (const pattern of group.patterns) {
      if (group.displayName === 'EE' && pattern === 'EE') {
        if (normalised === 'EE' || normalised.startsWith('EE *')) {
          return group.displayName;
        }
        continue;
      }

      if (normalised.startsWith(pattern) || normalised.includes(pattern)) {
        return group.displayName;
      }
    }
  }
  
  // If no pattern matched, clean up the name but keep original
  // Remove common prefixes/suffixes
  normalised = normalised
    .replace(/^WWW\./, '')
    .replace(/\.COM$/, '')
    .replace(/\.CO\.UK$/, '')
    .replace(/\*$/, '')
    .replace(/\d+$/, '')
    .trim();
  
  // Title case for display
  return normalised
    .split(' ')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get RAG status based on booking count and days since last use
 */
export function getRAGStatus(bookingCount: number, daysSinceLastUsed: number): 'green' | 'amber' | 'red' {
  if (bookingCount >= 3 && daysSinceLastUsed <= 14) return 'green';
  if (bookingCount >= 1 && daysSinceLastUsed <= 21) return 'amber';
  return 'red';
}

/**
 * Parse amount string from CSV (format: £X,XXX.XX) to pence
 */
export function parseAmount(amountStr: string): number {
  // Remove £ symbol and commas, then parse
  const cleanAmount = amountStr.replace(/[£,]/g, '').trim();
  const amount = parseFloat(cleanAmount);
  return Math.round(amount * 100); // Convert to pence
}

/**
 * Format pence to display amount (£X.XX)
 */
export function formatAmount(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  const rows: CSVRow[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with commas inside quotes
    const matches = line.match(/(?:"([^"]*)"|([^,]*))/g);
    if (matches) {
      const parts = matches
        .filter(m => m !== undefined)
        .map(m => m.replace(/^"|"$/g, '').trim())
        .filter(m => m.length > 0);
      
      if (parts.length >= 3) {
        rows.push({
          date: parts[0],
          merchantName: parts[1],
          amount: parts[2],
        });
      }
    }
  }
  
  return rows;
}

/**
 * Parse date from DD/MM/YYYY to ISO format
 */
export function parseDate(dateStr: string): string {
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toISOString();
}

/**
 * Get date from DD/MM/YYYY string
 */
export function getDateFromString(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Extract month from date string (YYYY-MM format)
 */
export function extractMonth(dateStr: string): string {
  const [day, month, year] = dateStr.split('/').map(Number);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Find matching partner for a merchant name based on stripe_aliases
 */
export function findMatchingPartner(
  merchantName: string, 
  partners: Partner[]
): Partner | null {
  const normalisedMerchant = merchantName.toUpperCase().trim();
  
  for (const partner of partners) {
    const aliases: string[] = partner.stripe_aliases || [];
    for (const alias of aliases) {
      const normalisedAlias = alias.toUpperCase().trim();
      if (normalisedMerchant.startsWith(normalisedAlias) || 
          normalisedMerchant.includes(normalisedAlias)) {
        return partner;
      }
    }
  }
  
  return null;
}

/**
 * Process transactions and compute stats
 */
export function processTransactions(
  transactions: ProcessedTransaction[]
): {
  totalTransactions: number;
  partnerTransactions: number;
  nonPartnerTransactions: number;
  partnerSpend: number;
  nonPartnerSpend: number;
  uniquePartners: Set<string>;
  uniqueMerchants: Map<string, MerchantStats>;
  partnerUsage: Map<string, PartnerUsageStats>;
} {
  const uniquePartners = new Set<string>();
  const uniqueMerchants = new Map<string, MerchantStats>();
  const partnerUsage = new Map<string, PartnerUsageStats>();
  
  let totalTransactions = 0;
  let partnerTransactions = 0;
  let nonPartnerTransactions = 0;
  let partnerSpend = 0;
  let nonPartnerSpend = 0;
  
  for (const tx of transactions) {
    totalTransactions++;
    
    if (tx.partnerId && tx.partner) {
      partnerTransactions++;
      partnerSpend += tx.amount;
      uniquePartners.add(tx.partnerId);
      
      // Update partner usage stats
      const existing = partnerUsage.get(tx.partnerId);
      if (existing) {
        existing.bookingCount++;
        existing.totalSpend += tx.amount;
        if (tx.date > existing.lastUsed!) {
          existing.lastUsed = tx.date;
        }
      } else {
        partnerUsage.set(tx.partnerId, {
          partner: tx.partner,
          bookingCount: 1,
          totalSpend: tx.amount,
          lastUsed: tx.date,
          daysSinceLastUsed: 0,
          ragStatus: 'red',
        });
      }
    } else {
      nonPartnerTransactions++;
      nonPartnerSpend += tx.amount;
      
      // Update merchant stats
      const merchantName = tx.merchantNormalised;
      const existing = uniqueMerchants.get(merchantName);
      if (existing) {
        existing.count++;
        existing.totalSpend += tx.amount;
        if (tx.date > existing.lastUsed) {
          existing.lastUsed = tx.date;
        }
      } else {
        uniqueMerchants.set(merchantName, {
          name: merchantName,
          count: 1,
          totalSpend: tx.amount,
          lastUsed: tx.date,
          category: tx.category || '',
        });
      }
    }
  }
  
  // Calculate RAG status for partners
  const now = new Date();
  for (const stats of partnerUsage.values()) {
    if (stats.lastUsed) {
      const diffTime = Math.abs(now.getTime() - stats.lastUsed.getTime());
      stats.daysSinceLastUsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      stats.daysSinceLastUsed = 999;
    }
    stats.ragStatus = getRAGStatus(stats.bookingCount, stats.daysSinceLastUsed);
  }
  
  return {
    totalTransactions,
    partnerTransactions,
    nonPartnerTransactions,
    partnerSpend,
    nonPartnerSpend,
    uniquePartners,
    uniqueMerchants,
    partnerUsage,
  };
}

/**
 * Fetch all uploads
 */
export async function fetchUploads(authToken: string) {
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
export async function fetchTransactions(uploadId: string, authToken: string) {
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
export async function createUpload(uploadData: {
  month: string;
  filename: string;
  uploaded_by: string;
  total_transactions: number;
  total_spend: number;
  matched_count: number;
  unmatched_count: number;
}, authToken: string) {
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/stripe_uploads/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify(uploadData),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create upload');
  }
  
  return response.json();
}

/**
 * Create a transaction record
 */
export async function createTransaction(transactionData: {
  upload_id: string;
  date: string;
  merchant_raw: string;
  merchant_normalised: string;
  amount: number;
  partner_id?: string;
  category?: string;
  is_hidden?: boolean;
}, authToken: string) {
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
    partner_id?: string;
    category?: string;
    is_hidden?: boolean;
  }>,
  authToken: string,
  batchSize: number = 50
) {
  const results = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchPromises = batch.map(tx => createTransaction(tx, authToken));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error creating batch ${i / batchSize + 1}:`, error);
      throw error;
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Update transaction (for hiding merchants)
 */
export async function updateTransaction(
  id: string,
  updates: { is_hidden?: boolean; category?: string },
  authToken: string
) {
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
 * Hide all transactions for a merchant
 */
export async function hideMerchant(
  uploadId: string,
  merchantName: string,
  authToken: string
) {
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
  const transactions = data.items;
  
  // Update all transactions to be hidden
  const updatePromises = transactions.map((tx: { id: string }) =>
    updateTransaction(tx.id, { is_hidden: true }, authToken)
  );
  
  await Promise.all(updatePromises);
  return transactions.length;
}
