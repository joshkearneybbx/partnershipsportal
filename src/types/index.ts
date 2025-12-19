export type PartnerStatus = 'lead' | 'negotiation' | 'signed';
export type OpportunityType = 'Big Ticket' | 'Everyday' | 'Low Hanging';
export type PartnershipType = 'Direct' | 'Affiliate';
export type LifestyleCategory = 
  | 'Travel' 
  | 'Dining' 
  | 'Entertainment' 
  | 'Wellness' 
  | 'Retail' 
  | 'Automotive'
  | 'Property'
  | 'Finance'
  | 'Technology'
  | 'Fashion'
  | 'Other';

export interface Partner {
  id: string;
  partner_name: string;
  lifestyle_category: LifestyleCategory;
  contact_name: string;
  position: string;
  contact_number: string;
  email: string;
  opportunity_type: OpportunityType;
  partnership_type: PartnershipType;
  partnership_link: string;
  website: string;
  login_notes: string;
  status: PartnerStatus;
  
  // Negotiation checkboxes
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  
  // Timestamps
  created_at: string;
  signed_at: string | null;
  updated_at: string;
  
  // Calculated field
  days_to_sign?: number;
}

export interface WeeklyStats {
  newLeads: number;
  inNegotiation: number;
  signed: number;
  contacted: number;
  callsBooked: number;
  callsHad: number;
  contractsSent: number;
  avgDaysToSign: number;
}

export interface PipelineStats {
  leads: number;
  negotiation: number;
  signed: number;
  total: number;
}
