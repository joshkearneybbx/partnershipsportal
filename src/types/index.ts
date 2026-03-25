export type PartnerStatus = 'closed' | 'potential' | 'contacted' | 'lead' | 'negotiation' | 'signed';
export type OpportunityType = 'Big Ticket' | 'Everyday' | 'Low Hanging';
export type PartnershipType = 'Direct' | 'Affiliate';
export type PartnerTier = 'Preferred' | 'Standard' | 'Test';
export type UseForTag = 'Last-minute' | 'VIP/HNW' | 'Best value' | 'International' | 'Gifting';
export type LifecycleStage = 'New' | 'Growing' | 'Mature' | 'At Risk';
export type PriceCategory = '£' | '££' | '£££' | '££££';
export type LifestyleCategory =
  | 'Travel'
  | 'Airline'
  | 'Hotels'
  | 'Supermarkets'
  | 'Restaurants'
  | 'Trades'
  | 'Misc'
  | 'Childcare'
  | 'Kids + Family'
  | 'Services'
  | 'Eldercare'
  | 'Taxis'
  | 'Flowers'
  | 'Department Store'
  | 'Affiliates'
  | 'Beauty'
  | 'Retail'
  | 'Jewellery'
  | 'Cars'
  | 'Electronics'
  | 'Home'
  | 'Health + Fitness'
  | 'Events'
  | 'Wellness'
  | 'Ski'
  | 'Experiences'
  | "Children's Parties and Events";

export type BigPurchaseStatus = 'flagged' | 'purchased';
export type BigPurchaseCategory = 'Hotel' | 'Restaurant' | 'Wellness' | 'Retail' | 'Travel' | 'Gifting' | 'Other';
export type BigPurchasePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Partner {
  id: string;
  partner_name: string;
  description: string;
  lifestyle_category: LifestyleCategory;
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  contact_email: string;
  opportunity_type: OpportunityType;
  price_category: PriceCategory;
  partnership_type: PartnershipType;
  partnership_link: string;
  website: string;
  login_notes: string;
  status: PartnerStatus;

  // Partner classification
  partner_tier: PartnerTier;
  use_for_tags: UseForTag[];
  lifecycle_stage: LifecycleStage;
  is_default: boolean;

  // Partner details
  partner_brief: string;
  when_not_to_use: string;
  sla_notes: string;
  commission: string;
  commission_rate?: number;
  has_commission?: boolean;
  commission_invoiced?: boolean;

  // Negotiation checkboxes (only for Direct partnerships)
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  contract_signed: boolean;

  // Stripe integration
  stripe_aliases: string[];
  partner_agreement?: string[];

  // Timestamps
  created: string;
  updated: string;
  lead_date: string | null;
  signed_at: string | null;
}

export interface BigPurchase {
  id: string;
  partner_name: string;
  poc: string;
  estimated_amount: number;
  amount_to_invoice: number | null;
  purchase_date: string;
  need_by?: string | null;
  priority?: BigPurchasePriority | null;
  category: BigPurchaseCategory;
  commission_notes: string;
  status: BigPurchaseStatus;
  contacted_partner?: boolean;
  invoiced: boolean;
  partner_id: string | null;
  moved_to_potential?: boolean;
  created: string;
  updated: string;
}

export interface WeeklyStats {
  newLeads: number;
  inNegotiation: number;
  signed: number;
  contacted: number;
  potential: number;
  callsBooked: number;
  callsHad: number;
  contractsSent: number;
  contractsSigned: number;
  avgDaysToSign: number;
}

export interface PipelineStats {
  closed: number;
  potential: number;
  contacted: number;
  leads: number;
  negotiation: number;
  signed: number;
  total: number;
}

export interface Expert {
  id: string;
  expert_name: string;
  expertise: string;
  expert_category: string;
  status: PartnerStatus;
  webinar_instructions: string;
  website: string;
  commission: string;
  has_commission?: boolean;
  commission_rate?: number;
  partner_tier: PartnerTier;
  lifecycle_stage: LifecycleStage;
  is_default: boolean;
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  contract_signed: boolean;
  lead_date: string | null;
  signed_at: string | null;
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  contact_email: string;
  created: string;
  updated: string;
}

export interface MembersClub {
  id: string;
  club_name: string;
  description: string;
  status: PartnerStatus;
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  login_notes: string;
  commission: string;
  has_commission?: boolean;
  commission_rate?: number;
  partnership_link: string;
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  contract_signed: boolean;
  lead_date: string | null;
  signed_at: string | null;
  created: string;
  updated: string;
}

export type AppTabType =
  | 'dashboard'
  | 'closed'
  | 'potential'
  | 'contacted'
  | 'leads'
  | 'negotiation'
  | 'signed'
  | 'all'
  | 'partner-health'
  | 'big-purchases'
  | 'experts-dashboard'
  | 'experts-contacted'
  | 'experts-leads'
  | 'experts-negotiation'
  | 'experts-signed'
  | 'experts-all'
  | 'clubs-dashboard'
  | 'clubs-contacted'
  | 'clubs-leads'
  | 'clubs-negotiation'
  | 'clubs-signed'
  | 'clubs-all';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}
