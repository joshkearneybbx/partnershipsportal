export type PartnerStatus = 'closed' | 'potential' | 'contacted' | 'lead' | 'negotiation' | 'signed';
export type OpportunityType = 'Big Ticket' | 'Everyday' | 'Low Hanging';
export type PartnershipType = 'Direct' | 'Affiliate';
export type PartnerTier = 'Preferred' | 'Standard' | 'Test';
export type UseForTag = 'Last-minute' | 'VIP/HNW' | 'Best value' | 'International' | 'Gifting';
export type LifecycleStage = 'New' | 'Growing' | 'Mature' | 'At Risk';
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

  // Negotiation checkboxes (only for Direct partnerships)
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  contract_signed: boolean;

  // Stripe integration
  stripe_aliases: string[];

  // Timestamps
  created: string;
  updated: string;
  lead_date: string | null;
  signed_at: string | null;
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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}
