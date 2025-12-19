import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Partner } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate that we have real credentials, not placeholders
const isValidUrl = supabaseUrl &&
  supabaseUrl !== 'your_supabase_url' &&
  supabaseUrl.startsWith('http');

const isValidKey = supabaseAnonKey &&
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  supabaseAnonKey.length > 20;

// Only create the client if credentials are available and valid
export const supabase: SupabaseClient | null =
  isValidUrl && isValidKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

// Partner CRUD operations
export const getPartners = async (): Promise<Partner[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getPartnersByStatus = async (status: string): Promise<Partner[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createPartner = async (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at' | 'signed_at'>): Promise<Partner | null> => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('partners')
    .insert([{
      ...partner,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updatePartner = async (id: string, updates: Partial<Partner>): Promise<Partner | null> => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('partners')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updatePartnerStatus = async (id: string, newStatus: string): Promise<Partner | null> => {
  if (!supabase) return null;
  
  const updates: Partial<Partner> = {
    status: newStatus as Partner['status'],
    updated_at: new Date().toISOString(),
  };
  
  // If moving to signed, record the signed_at timestamp
  if (newStatus === 'signed') {
    updates.signed_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deletePartner = async (id: string): Promise<void> => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Get partners from last week
export const getWeeklyStats = async () => {
  if (!supabase) {
    return {
      newLeads: 0,
      inNegotiation: 0,
      signed: 0,
      contacted: 0,
      callsBooked: 0,
      callsHad: 0,
      contractsSent: 0,
      avgDaysToSign: 0,
    };
  }
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .gte('updated_at', oneWeekAgo.toISOString());
  
  if (error) throw error;
  
  const partners = data || [];
  
  return {
    newLeads: partners.filter(p => p.status === 'lead' && new Date(p.created_at) >= oneWeekAgo).length,
    inNegotiation: partners.filter(p => p.status === 'negotiation').length,
    signed: partners.filter(p => p.status === 'signed' && p.signed_at && new Date(p.signed_at) >= oneWeekAgo).length,
    contacted: partners.filter(p => p.contacted).length,
    callsBooked: partners.filter(p => p.call_booked).length,
    callsHad: partners.filter(p => p.call_had).length,
    contractsSent: partners.filter(p => p.contract_sent).length,
    avgDaysToSign: calculateAvgDaysToSign(partners.filter(p => p.signed_at)),
  };
};

const calculateAvgDaysToSign = (signedPartners: Partner[]): number => {
  if (signedPartners.length === 0) return 0;
  
  const totalDays = signedPartners.reduce((acc, partner) => {
    if (partner.signed_at) {
      const created = new Date(partner.created_at);
      const signed = new Date(partner.signed_at);
      const days = Math.ceil((signed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return acc + days;
    }
    return acc;
  }, 0);
  
  return Math.round(totalDays / signedPartners.length);
};

// Get pipeline stats
export const getPipelineStats = async () => {
  if (!supabase) {
    return { leads: 0, negotiation: 0, signed: 0, total: 0 };
  }
  
  const { data, error } = await supabase
    .from('partners')
    .select('status');
  
  if (error) throw error;
  
  const partners = data || [];
  
  return {
    leads: partners.filter(p => p.status === 'lead').length,
    negotiation: partners.filter(p => p.status === 'negotiation').length,
    signed: partners.filter(p => p.status === 'signed').length,
    total: partners.length,
  };
};
