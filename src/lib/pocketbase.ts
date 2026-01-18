import PocketBase from 'pocketbase';
import { Partner } from '@/types';

const POCKETBASE_URL = 'https://pocketbase.blckbx.co.uk';
const COLLECTION_NAME = 'partnership_portal';

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

export const updatePartnerStatus = async (
  id: string,
  newStatus: string,
  currentStatus?: string
): Promise<Partner | null> => {
  try {
    const updates: Partial<Partner> = {
      status: newStatus as Partner['status'],
    };

    // If moving from contacted to lead, set the lead_date timestamp
    if (currentStatus === 'contacted' && newStatus === 'lead') {
      updates.lead_date = new Date().toISOString();
    }

    // If moving to signed, record the signed_at timestamp
    if (newStatus === 'signed') {
      updates.signed_at = new Date().toISOString();
    }

    const record = await pb.collection(COLLECTION_NAME).update(id, updates);
    return record as unknown as Partner;
  } catch (error) {
    console.error('Error updating partner status:', error);
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
  if (signedPartners.length === 0) return 0;

  const totalDays = signedPartners.reduce((acc, partner) => {
    if (partner.signed_at) {
      const created = new Date(partner.created);
      const signed = new Date(partner.signed_at);
      const days = Math.ceil(
        (signed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      );
      return acc + days;
    }
    return acc;
  }, 0);

  return Math.round(totalDays / signedPartners.length);
};

export const getPipelineStats = async () => {
  try {
    const records = await pb.collection(COLLECTION_NAME).getFullList();
    const partners = records as unknown as Partner[];

    const potential = partners.filter((p) => p.status === 'potential').length;
    const contacted = partners.filter((p) => p.status === 'contacted').length;
    const leads = partners.filter((p) => p.status === 'lead').length;
    const negotiation = partners.filter((p) => p.status === 'negotiation').length;
    const signed = partners.filter((p) => p.status === 'signed').length;

    return {
      potential,
      contacted,
      leads,
      negotiation,
      signed,
      total: potential + contacted + leads + negotiation + signed,
    };
  } catch (error) {
    console.error('Error fetching pipeline stats:', error);
    return { potential: 0, contacted: 0, leads: 0, negotiation: 0, signed: 0, total: 0 };
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
