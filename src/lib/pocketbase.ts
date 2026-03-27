import PocketBase from 'pocketbase';
import { BigPurchase, BigPurchaseCategory, Expert, MembersClub, Partner, PipelineStats } from '@/types';

const POCKETBASE_URL = 'https://pocketbase.blckbx.co.uk';
const COLLECTION_NAME = 'partnership_portal';
const EXPERTS_COLLECTION_NAME = 'experts_portal';
const MEMBERS_CLUBS_COLLECTION_NAME = 'members_clubs_portal';
const BIG_PURCHASES_COLLECTION = 'big_purchases';
const PARTNER_REVENUE_COLLECTION = 'partner_revenue';

const removeEmptyValues = <T extends Record<string, unknown>>(payload: T, optionalKeys: string[]) => {
  const nextPayload = { ...payload } as Record<string, unknown>;

  optionalKeys.forEach((key) => {
    const value = nextPayload[key];
    if (value === null || value === undefined || value === '') {
      delete nextPayload[key];
    }
  });

  return nextPayload;
};

const removeNullishValues = <T extends Record<string, unknown>>(payload: T, optionalKeys: string[]) => {
  const nextPayload = { ...payload } as Record<string, unknown>;

  optionalKeys.forEach((key) => {
    const value = nextPayload[key];
    if (value === null || value === undefined) {
      delete nextPayload[key];
    }
  });

  return nextPayload;
};

const normalizeStatusValue = (value: unknown): string => {
  if (typeof value !== 'string') return '';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'leads') return 'lead';
  return normalized;
};

const titleCaseStatusValue = (value: string): string => {
  if (value === 'lead') return 'Lead';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const serializeCollectionStatusValue = (value: unknown) => {
  const normalized = normalizeStatusValue(value);
  return normalized ? titleCaseStatusValue(normalized) : value;
};

const normalizeRecordStatus = <T extends { status?: unknown }>(record: T): T => ({
  ...record,
  status: normalizeStatusValue(record.status),
});

const hasStatusValidationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object' || !('data' in error)) return false;
  const pbError = error as { data?: { data?: Record<string, { code?: string }> } };
  return pbError.data?.data?.status?.code === 'validation_invalid_value';
};

const createWithStatusFallback = async <T extends Record<string, unknown>>(
  collectionName: string,
  payload: T
) => {
  try {
    return await pb.collection(collectionName).create(payload);
  } catch (error) {
    if (!hasStatusValidationError(error) || typeof payload.status !== 'string') {
      throw error;
    }

    const fallbackPayload = {
      ...payload,
      status: titleCaseStatusValue(payload.status),
    };
    return await pb.collection(collectionName).create(fallbackPayload);
  }
};

const updateWithStatusFallback = async <T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  payload: T
) => {
  try {
    return await pb.collection(collectionName).update(id, payload);
  } catch (error) {
    if (!hasStatusValidationError(error) || typeof payload.status !== 'string') {
      throw error;
    }

    const fallbackPayload = {
      ...payload,
      status: titleCaseStatusValue(payload.status),
    };
    return await pb.collection(collectionName).update(id, fallbackPayload);
  }
};

// Create PocketBase instance
export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation to prevent issues with React strict mode
pb.autoCancellation(false);

// Debug: Log auth state on module load (client-side only)
if (typeof window !== 'undefined') {
  console.log('[PocketBase] Module loaded');
  console.log('[PocketBase] authStore.isValid:', pb.authStore.isValid);
  console.log('[PocketBase] authStore.token:', pb.authStore.token ? `${pb.authStore.token.substring(0, 20)}...` : 'null');
  console.log('[PocketBase] authStore.model:', pb.authStore.model?.email || 'null');
}

// Partner CRUD operations
export const getPartners = async (): Promise<Partner[]> => {
  try {
    console.log('[PocketBase] getPartners called');
    console.log('[PocketBase] Auth state before request - isValid:', pb.authStore.isValid);
    console.log('[PocketBase] Auth token:', pb.authStore.token ? `${pb.authStore.token.substring(0, 20)}...` : 'null');

    const records = await pb.collection(COLLECTION_NAME).getFullList({
      sort: '-created',
    });
    console.log('[PocketBase] getPartners success, count:', records.length);
    
    // DEBUG: Log stripe_aliases structure for first few partners
    console.log('[PocketBase] DEBUG: First 5 partners stripe_aliases:');
    records.slice(0, 5).forEach((r: unknown, i: number) => {
      const record = r as { partner_name?: string; stripe_aliases?: unknown; partner_agreement?: unknown };
      console.log(`  [${i}] ${record.partner_name}:`, JSON.stringify({
        value: record.stripe_aliases,
        type: typeof record.stripe_aliases,
        isArray: Array.isArray(record.stripe_aliases),
      }));
    });

    console.log('[PocketBase] DEBUG: First 5 partners partner_agreement:');
    records.slice(0, 5).forEach((r: unknown, i: number) => {
      const record = r as { partner_name?: string; partner_agreement?: unknown };
      console.log(`  [${i}] ${record.partner_name}:`, JSON.stringify({
        value: record.partner_agreement,
        type: typeof record.partner_agreement,
        isArray: Array.isArray(record.partner_agreement),
      }));
    });
    
    return records as unknown as Partner[];
  } catch (error) {
    console.error('[PocketBase] Error fetching partners:', error);
    return [];
  }
};

export const getPartnersByStatus = async (status: string): Promise<Partner[]> => {
  try {
    const records = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `status = "${status}"`,
      sort: '-created',
    });
    return records as unknown as Partner[];
  } catch (error) {
    console.error('Error fetching partners by status:', error);
    return [];
  }
};

export const getExperts = async (): Promise<Expert[]> => {
  try {
    const records = await pb.collection(EXPERTS_COLLECTION_NAME).getFullList({
      sort: '-created',
    });
    return records.map((record) => normalizeRecordStatus(record as unknown as Expert)) as Expert[];
  } catch (error) {
    console.error('Error fetching experts:', error);
    return [];
  }
};

export const getMembersClubs = async (): Promise<MembersClub[]> => {
  try {
    const records = await pb.collection(MEMBERS_CLUBS_COLLECTION_NAME).getFullList({
      sort: '-created',
    });
    return records.map((record) => normalizeRecordStatus(record as unknown as MembersClub)) as MembersClub[];
  } catch (error) {
    console.error('Error fetching members clubs:', error);
    return [];
  }
};

export const createPartner = async (
  partner: Omit<Partner, 'id' | 'created' | 'updated'>
): Promise<Partner | null> => {
  try {
    console.log('[PocketBase] Creating partner with data:', JSON.stringify(partner, null, 2));
    const record = await pb.collection(COLLECTION_NAME).create(partner);
    return record as unknown as Partner;
  } catch (error: unknown) {
    console.error('Error creating partner:', error);
    // Log detailed PocketBase error info
    if (error && typeof error === 'object' && 'data' in error) {
      const pbError = error as { data?: { data?: Record<string, unknown> } };
      console.error('[PocketBase] Error details:', JSON.stringify(pbError.data, null, 2));
    }
    throw error;
  }
};

export const createExpert = async (
  expert: Omit<Expert, 'id' | 'created' | 'updated'>
): Promise<Expert | null> => {
  try {
    const payload = removeEmptyValues(
      {
        ...expert,
        status: serializeCollectionStatusValue(expert.status),
        commission_rate: expert.has_commission ? Number(expert.commission_rate ?? 0) : undefined,
      },
      [
        'expertise',
        'expert_category',
        'webinar_instructions',
        'website',
        'commission',
        'commission_rate',
        'lead_date',
        'signed_at',
        'contact_name',
        'contact_position',
        'contact_phone',
        'contact_email',
      ]
    );
    const record = await createWithStatusFallback(EXPERTS_COLLECTION_NAME, payload);
    return normalizeRecordStatus(record as unknown as Expert);
  } catch (error: unknown) {
    console.error('Error creating expert:', error);
    if (error && typeof error === 'object' && 'data' in error) {
      const pbError = error as { data?: { data?: Record<string, unknown> } };
      console.error('[PocketBase] Expert error details:', JSON.stringify(pbError.data, null, 2));
    }
    throw error;
  }
};

export const createMembersClub = async (
  club: Omit<MembersClub, 'id' | 'created' | 'updated'>
): Promise<MembersClub | null> => {
  try {
    const payload = removeEmptyValues(
      {
        ...club,
        status: serializeCollectionStatusValue(club.status),
        commission_rate: club.has_commission ? Number(club.commission_rate ?? 0) : undefined,
      },
      [
        'description',
        'website',
        'login_notes',
        'commission',
        'commission_rate',
        'partnership_link',
        'lead_date',
        'signed_at',
        'contact_name',
        'contact_position',
        'contact_phone',
        'contact_email',
      ]
    );
    const record = await createWithStatusFallback(MEMBERS_CLUBS_COLLECTION_NAME, payload);
    return normalizeRecordStatus(record as unknown as MembersClub);
  } catch (error: unknown) {
    console.error('Error creating members club:', error);
    if (error && typeof error === 'object' && 'data' in error) {
      const pbError = error as { data?: { data?: Record<string, unknown> } };
      console.error('[PocketBase] Members club error details:', JSON.stringify(pbError.data, null, 2));
    }
    throw error;
  }
};

export const updatePartner = async (
  id: string,
  updates: Partial<Partner>
): Promise<Partner | null> => {
  try {
    const record = await pb.collection(COLLECTION_NAME).update(id, updates);
    return record as unknown as Partner;
  } catch (error) {
    console.error('Error updating partner:', error);
    throw error;
  }
};

export const updateExpert = async (
  id: string,
  updates: Partial<Expert>
): Promise<Expert | null> => {
  try {
    const payload = removeNullishValues(
      {
        ...updates,
        status:
          updates.status !== undefined
            ? serializeCollectionStatusValue(updates.status)
            : updates.status,
        commission_rate:
          updates.has_commission === false
            ? undefined
            : updates.commission_rate !== undefined
            ? Number(updates.commission_rate)
            : updates.commission_rate,
      },
      [
        'expertise',
        'expert_category',
        'webinar_instructions',
        'website',
        'commission',
        'commission_rate',
        'lead_date',
        'signed_at',
        'contact_name',
        'contact_position',
        'contact_phone',
        'contact_email',
      ]
    );
    const record = await updateWithStatusFallback(EXPERTS_COLLECTION_NAME, id, payload);
    return normalizeRecordStatus(record as unknown as Expert);
  } catch (error) {
    console.error('Error updating expert:', error);
    throw error;
  }
};

export const updateMembersClub = async (
  id: string,
  updates: Partial<MembersClub>
): Promise<MembersClub | null> => {
  try {
    const payload = removeNullishValues(
      {
        ...updates,
        status:
          updates.status !== undefined
            ? serializeCollectionStatusValue(updates.status)
            : updates.status,
        commission_rate:
          updates.has_commission === false
            ? undefined
            : updates.commission_rate !== undefined
            ? Number(updates.commission_rate)
            : updates.commission_rate,
      },
      [
        'description',
        'website',
        'login_notes',
        'commission',
        'commission_rate',
        'partnership_link',
        'lead_date',
        'signed_at',
        'contact_name',
        'contact_position',
        'contact_phone',
        'contact_email',
      ]
    );
    const record = await updateWithStatusFallback(MEMBERS_CLUBS_COLLECTION_NAME, id, payload);
    return normalizeRecordStatus(record as unknown as MembersClub);
  } catch (error) {
    console.error('Error updating members club:', error);
    throw error;
  }
};

export const uploadPartnerAgreement = async (
  id: string,
  file: File
): Promise<Partner | null> => {
  try {
    const formData = new FormData();
    // For multi-file fields in PocketBase, "+" appends instead of replacing.
    formData.append('partner_agreement+', file);
    const record = await pb.collection(COLLECTION_NAME).update(id, formData);
    return record as unknown as Partner;
  } catch (error) {
    // Fallback for single-file schema setup.
    const fallbackFormData = new FormData();
    fallbackFormData.append('partner_agreement', file);
    const record = await pb.collection(COLLECTION_NAME).update(id, fallbackFormData);
    return record as unknown as Partner;
  }
};

export const deletePartnerAgreementFile = async (
  id: string,
  fileName: string
): Promise<Partner | null> => {
  try {
    const formData = new FormData();
    // PocketBase file field remove syntax for multi-file fields.
    formData.append('partner_agreement-', fileName);
    const record = await pb.collection(COLLECTION_NAME).update(id, formData);
    return record as unknown as Partner;
  } catch (error) {
    // Fallback: overwrite with filtered list if remove syntax is not accepted.
    const existing = await pb.collection(COLLECTION_NAME).getOne(id);
    const raw = (existing as unknown as { partner_agreement?: unknown }).partner_agreement;
    const files = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === 'string')
      : typeof raw === 'string' && raw.length > 0
      ? [raw]
      : [];
    const updated = files.filter((name) => name !== fileName);
    const record = await pb.collection(COLLECTION_NAME).update(id, {
      partner_agreement: updated,
    });
    return record as unknown as Partner;
  }
};

export const updatePartnerStatus = async (
  id: string,
  newStatus: string,
  currentStatus?: string
): Promise<Partner | null> => {
  try {
    const existingRecord = await pb.collection(COLLECTION_NAME).getOne(id);
    const existingPartner = existingRecord as unknown as Partner;

    const updates: Partial<Partner> = {
      status: newStatus as Partner['status'],
    };

    // If moving from contacted to lead, set the lead_date timestamp
    if (currentStatus === 'contacted' && newStatus === 'lead') {
      updates.lead_date = new Date().toISOString();
    }

    // If moving to signed, record signed_at only when it's missing
    if (newStatus === 'signed' && !existingPartner.signed_at) {
      updates.signed_at = new Date().toISOString();
    }

    const record = await pb.collection(COLLECTION_NAME).update(id, updates);
    return record as unknown as Partner;
  } catch (error) {
    console.error('Error updating partner status:', error);
    throw error;
  }
};

export const updateExpertStatus = async (
  id: string,
  newStatus: string,
  currentStatus?: string
): Promise<Expert | null> => {
  try {
    const existingRecord = await pb.collection(EXPERTS_COLLECTION_NAME).getOne(id);
    const existingExpert = normalizeRecordStatus(existingRecord as unknown as Expert);

    const updates: Partial<Expert> = {
      status: serializeCollectionStatusValue(newStatus) as Expert['status'],
    };

    if (currentStatus === 'contacted' && newStatus === 'lead') {
      updates.lead_date = new Date().toISOString();
    }

    if (newStatus === 'signed' && !existingExpert.signed_at) {
      updates.signed_at = new Date().toISOString();
    }

    const record = await updateWithStatusFallback(EXPERTS_COLLECTION_NAME, id, updates);
    return normalizeRecordStatus(record as unknown as Expert);
  } catch (error) {
    console.error('Error updating expert status:', error);
    throw error;
  }
};

export const updateMembersClubStatus = async (
  id: string,
  newStatus: string,
  currentStatus?: string
): Promise<MembersClub | null> => {
  try {
    const existingRecord = await pb.collection(MEMBERS_CLUBS_COLLECTION_NAME).getOne(id);
    const existingClub = normalizeRecordStatus(existingRecord as unknown as MembersClub);

    const updates: Partial<MembersClub> = {
      status: serializeCollectionStatusValue(newStatus) as MembersClub['status'],
    };

    if (currentStatus === 'contacted' && newStatus === 'lead') {
      updates.lead_date = new Date().toISOString();
    }

    if (newStatus === 'signed' && !existingClub.signed_at) {
      updates.signed_at = new Date().toISOString();
    }

    const record = await updateWithStatusFallback(MEMBERS_CLUBS_COLLECTION_NAME, id, updates);
    return normalizeRecordStatus(record as unknown as MembersClub);
  } catch (error) {
    console.error('Error updating members club status:', error);
    throw error;
  }
};

export const deletePartner = async (id: string): Promise<void> => {
  try {
    await pb.collection(COLLECTION_NAME).delete(id);
  } catch (error) {
    console.error('Error deleting partner:', error);
    throw error;
  }
};

export const deleteExpert = async (id: string): Promise<void> => {
  try {
    await pb.collection(EXPERTS_COLLECTION_NAME).delete(id);
  } catch (error) {
    console.error('Error deleting expert:', error);
    throw error;
  }
};

export const deleteMembersClub = async (id: string): Promise<void> => {
  try {
    await pb.collection(MEMBERS_CLUBS_COLLECTION_NAME).delete(id);
  } catch (error) {
    console.error('Error deleting members club:', error);
    throw error;
  }
};

// Stats calculations
export const getWeeklyStats = async () => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const records = await pb.collection(COLLECTION_NAME).getFullList({
      filter: `updated >= "${oneWeekAgo.toISOString()}"`,
    });

    const partners = records as unknown as Partner[];

    return {
      newLeads: partners.filter(
        (p) => p.status === 'lead' && new Date(p.created) >= oneWeekAgo
      ).length,
      inNegotiation: partners.filter((p) => p.status === 'negotiation').length,
      signed: partners.filter(
        (p) =>
          p.status === 'signed' &&
          p.signed_at &&
          new Date(p.signed_at) >= oneWeekAgo
      ).length,
      contacted: partners.filter((p) => p.contacted).length,
      potential: partners.filter((p) => p.status === 'potential').length,
      callsBooked: partners.filter((p) => p.call_booked).length,
      callsHad: partners.filter((p) => p.call_had).length,
      contractsSent: partners.filter((p) => p.contract_sent).length,
      contractsSigned: partners.filter((p) => p.contract_signed).length,
      avgDaysToSign: calculateAvgDaysToSign(
        partners.filter((p) => p.signed_at)
      ),
    };
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    return {
      newLeads: 0,
      inNegotiation: 0,
      signed: 0,
      contacted: 0,
      potential: 0,
      callsBooked: 0,
      callsHad: 0,
      contractsSent: 0,
      contractsSigned: 0,
      avgDaysToSign: 0,
    };
  }
};

const calculateAvgDaysToSign = (signedPartners: Partner[]): number => {
  const validDurations = signedPartners
    .map((partner) => {
      if (!partner.signed_at) return null;

      const startValue = partner.lead_date || partner.created;
      const startDate = new Date(startValue);
      const signedDate = new Date(partner.signed_at);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(signedDate.getTime())) {
        return null;
      }

      const days = Math.ceil(
        (signedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return days >= 0 ? days : null;
    })
    .filter((days): days is number => days !== null);

  if (validDurations.length === 0) return 0;

  return Math.round(validDurations.reduce((acc, days) => acc + days, 0) / validDurations.length);
};

const getPipelineStatsForCollection = async (collectionName: string): Promise<PipelineStats> => {
  try {
    const records = await pb.collection(collectionName).getFullList();
    const partners = records as Array<{ status?: unknown }>;

    const closed = partners.filter((p) => normalizeStatusValue(p.status) === 'closed').length;
    const potential = partners.filter((p) => normalizeStatusValue(p.status) === 'potential').length;
    const contacted = partners.filter((p) => normalizeStatusValue(p.status) === 'contacted').length;
    const leads = partners.filter((p) => normalizeStatusValue(p.status) === 'lead').length;
    const negotiation = partners.filter((p) => normalizeStatusValue(p.status) === 'negotiation').length;
    const signed = partners.filter((p) => normalizeStatusValue(p.status) === 'signed').length;

    return {
      closed,
      potential,
      contacted,
      leads,
      negotiation,
      signed,
      total: closed + potential + contacted + leads + negotiation + signed,
    };
  } catch (error) {
    console.error(`Error fetching pipeline stats for ${collectionName}:`, error);
    return { closed: 0, potential: 0, contacted: 0, leads: 0, negotiation: 0, signed: 0, total: 0 };
  }
};

export const getPipelineStats = async () => getPipelineStatsForCollection(COLLECTION_NAME);

export const getExpertsPipelineStats = async () => getPipelineStatsForCollection(EXPERTS_COLLECTION_NAME);

export const getMembersClubsPipelineStats = async () =>
  getPipelineStatsForCollection(MEMBERS_CLUBS_COLLECTION_NAME);

const mapBigPurchaseCategoryToLifestyle = (category: BigPurchaseCategory): Partner['lifestyle_category'] => {
  switch (category) {
    case 'Hotel':
      return 'Hotels';
    case 'Restaurant':
      return 'Restaurants';
    case 'Travel':
      return 'Travel';
    case 'Wellness':
      return 'Wellness';
    case 'Retail':
      return 'Retail';
    default:
      return 'Misc';
  }
};

export const getBigPurchases = async (): Promise<BigPurchase[]> => {
  try {
    const records = await pb.collection(BIG_PURCHASES_COLLECTION).getFullList({
      sort: '-created',
      fields: 'id,partner_name,poc,estimated_amount,amount_to_invoice,purchase_date,need_by,priority,category,commission_notes,status,contacted_partner,invoiced,partner_id,moved_to_potential,created,updated',
    });
    return records as unknown as BigPurchase[];
  } catch (error) {
    console.error('Error fetching big purchases:', error);
    return [];
  }
};

export const updateBigPurchase = async (
  id: string,
  updates: Partial<BigPurchase>
): Promise<BigPurchase | null> => {
  try {
    const record = await pb.collection(BIG_PURCHASES_COLLECTION).update(id, updates);
    return record as unknown as BigPurchase;
  } catch (error) {
    console.error('Error updating big purchase:', error);
    throw error;
  }
};

export const deleteBigPurchase = async (id: string): Promise<void> => {
  try {
    await pb.collection(BIG_PURCHASES_COLLECTION).delete(id);
  } catch (error) {
    console.error('Error deleting big purchase:', error);
    throw error;
  }
};

export const moveBigPurchaseToPotentialLead = async (
  purchase: BigPurchase
): Promise<{ partner: Partner | null }> => {
  try {
    const newPartnerPayload: Omit<Partner, 'id' | 'created' | 'updated'> = {
      partner_name: purchase.partner_name,
      description: '',
      lifestyle_category: mapBigPurchaseCategoryToLifestyle(purchase.category),
      contact_name: purchase.poc || '',
      contact_position: '',
      contact_phone: '',
      contact_email: '',
      opportunity_type: 'Everyday',
      price_category: '£',
      partnership_type: 'Direct',
      partnership_link: '',
      website: '',
      login_notes: '',
      status: 'potential',
      partner_tier: 'Standard',
      use_for_tags: [],
      lifecycle_stage: 'New',
      is_default: false,
      partner_brief: '',
      when_not_to_use: '',
      sla_notes: '',
      commission: '',
      contacted: false,
      call_booked: false,
      call_had: false,
      contract_sent: false,
      contract_signed: false,
      stripe_aliases: [],
      lead_date: null,
      signed_at: null,
    };

    const createdPartner = await createPartner(newPartnerPayload);
    if (!createdPartner) {
      throw new Error('Failed to create potential lead from big purchase');
    }

    try {
      await updateBigPurchase(purchase.id, {
        partner_id: createdPartner.id,
        moved_to_potential: true,
      });
    } catch (error) {
      console.warn('Failed to set moved_to_potential flag, retrying with partner_id only:', error);
      await updateBigPurchase(purchase.id, {
        partner_id: createdPartner.id,
      });
    }

    return { partner: createdPartner };
  } catch (error) {
    console.error('Error moving big purchase to potential lead:', error);
    throw error;
  }
};

// Auth functions
export const loginWithGoogle = async () => {
  try {
    console.log('[PocketBase] Starting Google OAuth...');

    const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });

    // Debug: Log auth state after login
    console.log('[PocketBase] OAuth completed successfully');
    console.log('[PocketBase] authStore.isValid:', pb.authStore.isValid);
    console.log('[PocketBase] authStore.token:', pb.authStore.token ? `${pb.authStore.token.substring(0, 20)}...` : 'null');
    console.log('[PocketBase] authStore.model:', pb.authStore.model?.email || 'null');

    // Verify token is in localStorage
    if (typeof window !== 'undefined') {
      const storedAuth = localStorage.getItem('pocketbase_auth');
      console.log('[PocketBase] localStorage pocketbase_auth:', storedAuth ? 'exists' : 'missing');
    }

    return authData;
  } catch (error) {
    console.error('[PocketBase] Error logging in with Google:', error);
    throw error;
  }
};

export const logout = () => {
  console.log('[PocketBase] Logging out...');
  pb.authStore.clear();
  console.log('[PocketBase] authStore cleared, isValid:', pb.authStore.isValid);
};

export const getCurrentUser = () => {
  console.log('[PocketBase] getCurrentUser called, isValid:', pb.authStore.isValid);
  if (pb.authStore.isValid) {
    return pb.authStore.model;
  }
  return null;
};

export const isAuthenticated = () => {
  const valid = pb.authStore.isValid;
  console.log('[PocketBase] isAuthenticated:', valid);
  return valid;
};

// Debug helper - call this to check current auth state
export const debugAuthState = () => {
  console.log('=== PocketBase Auth Debug ===');
  console.log('isValid:', pb.authStore.isValid);
  console.log('token:', pb.authStore.token ? `${pb.authStore.token.substring(0, 30)}...` : 'null');
  console.log('model:', pb.authStore.model);
  if (typeof window !== 'undefined') {
    console.log('localStorage pocketbase_auth:', localStorage.getItem('pocketbase_auth'));
  }
  console.log('=============================');
};

// Partner Revenue types
export interface PartnerRevenueRecord {
  id?: string;
  partner: string; // relation ID
  period_start: string; // date
  period_end: string; // date
  revenue: number;
  commission_earned: number;
  transaction_count: number;
  source_filename: string;
  imported_at: string;
}

// Partner Revenue operations
export const findPartnerRevenue = async (
  partnerId: string,
  periodStart: string
): Promise<PartnerRevenueRecord | null> => {
  try {
    const records = await pb.collection(PARTNER_REVENUE_COLLECTION).getFullList({
      filter: `partner = "${partnerId}" && period_start = "${periodStart}"`,
      limit: 1,
    });
    return records.length > 0 ? (records[0] as unknown as PartnerRevenueRecord) : null;
  } catch (error) {
    console.error('[PocketBase] Error finding partner revenue:', error);
    return null;
  }
};

export const createPartnerRevenue = async (
  data: Omit<PartnerRevenueRecord, 'id'>
): Promise<PartnerRevenueRecord | null> => {
  try {
    const record = await pb.collection(PARTNER_REVENUE_COLLECTION).create(data);
    return record as unknown as PartnerRevenueRecord;
  } catch (error) {
    console.error('[PocketBase] Error creating partner revenue:', error);
    return null;
  }
};

export const updatePartnerRevenue = async (
  id: string,
  data: Partial<PartnerRevenueRecord>
): Promise<PartnerRevenueRecord | null> => {
  try {
    const record = await pb.collection(PARTNER_REVENUE_COLLECTION).update(id, data);
    return record as unknown as PartnerRevenueRecord;
  } catch (error) {
    console.error('[PocketBase] Error updating partner revenue:', error);
    return null;
  }
};

export const upsertPartnerRevenue = async (
  data: Omit<PartnerRevenueRecord, 'id'>
): Promise<{ success: boolean; created: boolean }> => {
  // Try to find existing record
  const existing = await findPartnerRevenue(data.partner, data.period_start);
  
  if (existing?.id) {
    // Update existing
    const updated = await updatePartnerRevenue(existing.id, {
      revenue: data.revenue,
      commission_earned: data.commission_earned,
      transaction_count: data.transaction_count,
      source_filename: data.source_filename,
      imported_at: data.imported_at,
    });
    return { success: !!updated, created: false };
  } else {
    // Create new
    const created = await createPartnerRevenue(data);
    return { success: !!created, created: true };
  }
};
