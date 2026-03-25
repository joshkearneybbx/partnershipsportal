import { PipelineStats, WeeklyStats } from '@/types';

export interface DashboardStatsSource {
  created: string;
  updated: string;
  status: string;
  lead_date?: string | null;
  signed_at: string | null;
  contacted: boolean;
  call_booked: boolean;
  call_had: boolean;
  contract_sent: boolean;
  contract_signed: boolean;
}

const getDaysToSign = (record: Pick<DashboardStatsSource, 'created' | 'lead_date' | 'signed_at'>): number | null => {
  if (!record.signed_at) return null;

  const startValue = record.lead_date || record.created;
  const startDate = new Date(startValue);
  const signedDate = new Date(record.signed_at);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(signedDate.getTime())) {
    return null;
  }

  const days = Math.ceil((signedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
};

export const calculateDashboardWeeklyStats = <T extends DashboardStatsSource>(records: T[]): WeeklyStats => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const signedDurations = records
    .map((record) => getDaysToSign(record))
    .filter((days): days is number => days !== null);

  const avgDaysToSign = signedDurations.length
    ? Math.round(
        signedDurations.reduce((total, days) => total + days, 0) / signedDurations.length
      )
    : 0;

  return {
    newLeads: records.filter((record) => record.status === 'lead' && new Date(record.created) >= oneWeekAgo).length,
    inNegotiation: records.filter((record) => record.status === 'negotiation').length,
    signed: records.filter((record) => record.status === 'signed' && record.signed_at && new Date(record.signed_at) >= oneWeekAgo).length,
    contacted: records.filter((record) => record.contacted).length,
    potential: records.filter((record) => record.status === 'potential').length,
    callsBooked: records.filter((record) => record.call_booked).length,
    callsHad: records.filter((record) => record.call_had).length,
    contractsSent: records.filter((record) => record.contract_sent).length,
    contractsSigned: records.filter((record) => record.contract_signed).length,
    avgDaysToSign,
  };
};

export const calculateDashboardPipelineStats = <T extends DashboardStatsSource>(records: T[]): PipelineStats => {
  const closed = records.filter((record) => record.status === 'closed').length;
  const potential = records.filter((record) => record.status === 'potential').length;
  const contacted = records.filter((record) => record.status === 'contacted').length;
  const leads = records.filter((record) => record.status === 'lead').length;
  const negotiation = records.filter((record) => record.status === 'negotiation').length;
  const signed = records.filter((record) => record.status === 'signed').length;

  return {
    closed,
    potential,
    contacted,
    leads,
    negotiation,
    signed,
    total: closed + potential + leads + negotiation + signed,
  };
};
