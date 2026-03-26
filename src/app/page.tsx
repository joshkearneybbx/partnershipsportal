'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from '@/components/Dashboard';
import PartnerTable from '@/components/PartnerTable';
import ExpertTable from '@/components/ExpertTable';
import MembersClubTable from '@/components/MembersClubTable';
import PartnerHealth from '@/components/PartnerHealth';
import BigPurchasesTable from '@/components/BigPurchasesTable';
import Sidebar from '@/components/Sidebar';
import AddPartnerModal from '@/components/AddPartnerModal';
import AddExpertModal from '@/components/AddExpertModal';
import AddMembersClubModal from '@/components/AddMembersClubModal';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  AppTabType,
  BigPurchase,
  Expert,
  MembersClub,
  Partner,
  PartnerStatus,
  PipelineStats,
} from '@/types';
import {
  getPartners,
  getExperts,
  getMembersClubs,
  createPartner,
  createExpert,
  createMembersClub,
  updatePartner,
  updateExpert,
  updateMembersClub,
  updatePartnerStatus,
  updateExpertStatus,
  updateMembersClubStatus,
  uploadPartnerAgreement,
  deletePartnerAgreementFile,
  deletePartner,
  deleteExpert,
  deleteMembersClub,
  getPipelineStats,
  getExpertsPipelineStats,
  getMembersClubsPipelineStats,
  getBigPurchases,
  updateBigPurchase,
  deleteBigPurchase,
  moveBigPurchaseToPotentialLead,
} from '@/lib/pocketbase';
import { calculateDashboardPipelineStats, calculateDashboardWeeklyStats } from '@/lib/dashboardStats';
import { sendToCore, sendToBrevo } from '@/lib/webhook';

type PartnershipTableTab = Extract<
  AppTabType,
  'closed' | 'potential' | 'contacted' | 'leads' | 'negotiation' | 'signed' | 'all'
>;

type ExpertTableTab = Extract<
  AppTabType,
  'experts-contacted' | 'experts-leads' | 'experts-negotiation' | 'experts-signed' | 'experts-all'
>;

type MembersClubTableTab = Extract<
  AppTabType,
  'clubs-contacted' | 'clubs-leads' | 'clubs-negotiation' | 'clubs-signed' | 'clubs-all'
>;

const defaultPipelineStats: PipelineStats = {
  closed: 0,
  potential: 0,
  contacted: 0,
  leads: 0,
  negotiation: 0,
  signed: 0,
  total: 0,
};

const getTabLabel = (tab: AppTabType): string => {
  switch (tab) {
    case 'dashboard':
      return 'Dashboard';
    case 'closed':
      return 'Closed';
    case 'potential':
      return 'Potential Leads';
    case 'contacted':
      return 'Contacted';
    case 'leads':
      return 'Leads';
    case 'negotiation':
      return 'Negotiation';
    case 'signed':
      return 'Signed Partners';
    case 'all':
      return 'Partnership Directory';
    case 'partner-health':
      return 'Partner Health';
    case 'big-purchases':
      return 'Big Purchases';
    case 'experts-dashboard':
      return 'Dashboard';
    case 'experts-contacted':
      return 'Experts Contacted';
    case 'experts-leads':
      return 'Experts Leads';
    case 'experts-negotiation':
      return 'Experts Negotiation';
    case 'experts-signed':
      return 'Experts Signed';
    case 'experts-all':
      return 'All Experts';
    case 'clubs-dashboard':
      return 'Dashboard';
    case 'clubs-contacted':
      return 'Members Clubs Contacted';
    case 'clubs-leads':
      return 'Members Clubs Leads';
    case 'clubs-negotiation':
      return 'Members Clubs Negotiation';
    case 'clubs-signed':
      return 'Members Clubs Signed';
    case 'clubs-all':
      return 'All Members Clubs';
  }
};

const mapExpertToDashboardPartner = (expert: Expert): Partner => ({
  id: expert.id,
  partner_name: expert.expert_name,
  description: expert.expertise,
  lifestyle_category: (expert.expert_category || 'Misc') as Partner['lifestyle_category'],
  contact_name: expert.contact_name,
  contact_position: expert.contact_position,
  contact_phone: expert.contact_phone,
  contact_email: expert.contact_email,
  opportunity_type: 'Everyday',
  price_category: '£',
  partnership_type: 'Direct',
  partnership_link: '',
  website: expert.website,
  login_notes: expert.webinar_instructions,
  status: expert.status,
  partner_tier: expert.partner_tier,
  use_for_tags: [],
  lifecycle_stage: expert.lifecycle_stage,
  is_default: expert.is_default,
  partner_brief: expert.expertise,
  when_not_to_use: '',
  sla_notes: '',
  commission: expert.commission,
  commission_rate: expert.commission_rate,
  has_commission: expert.has_commission,
  commission_invoiced: false,
  contacted: expert.contacted,
  call_booked: expert.call_booked,
  call_had: expert.call_had,
  contract_sent: expert.contract_sent,
  contract_signed: expert.contract_signed,
  stripe_aliases: [],
  partner_agreement: [],
  created: expert.created,
  updated: expert.updated,
  lead_date: expert.lead_date,
  signed_at: expert.signed_at,
});

const mapMembersClubToDashboardPartner = (club: MembersClub): Partner => ({
  id: club.id,
  partner_name: club.club_name,
  description: club.description,
  lifestyle_category: (club.club_name || 'Misc') as Partner['lifestyle_category'],
  contact_name: club.contact_name,
  contact_position: club.contact_position,
  contact_phone: club.contact_phone,
  contact_email: club.contact_email,
  opportunity_type: 'Everyday',
  price_category: '£',
  partnership_type: 'Direct',
  partnership_link: club.partnership_link,
  website: club.website,
  login_notes: club.login_notes,
  status: club.status,
  partner_tier: 'Standard',
  use_for_tags: [],
  lifecycle_stage: 'New',
  is_default: false,
  partner_brief: club.description,
  when_not_to_use: '',
  sla_notes: '',
  commission: club.commission,
  commission_rate: club.commission_rate,
  has_commission: club.has_commission,
  commission_invoiced: false,
  contacted: club.contacted,
  call_booked: club.call_booked,
  call_had: club.call_had,
  contract_sent: club.contract_sent,
  contract_signed: club.contract_signed,
  stripe_aliases: [],
  partner_agreement: [],
  created: club.created,
  updated: club.updated,
  lead_date: club.lead_date,
  signed_at: club.signed_at,
});

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<AppTabType>('dashboard');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [membersClubs, setMembersClubs] = useState<MembersClub[]>([]);
  const [bigPurchases, setBigPurchases] = useState<BigPurchase[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [filteredExperts, setFilteredExperts] = useState<Expert[]>([]);
  const [filteredMembersClubs, setFilteredMembersClubs] = useState<MembersClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [editExpert, setEditExpert] = useState<Expert | null>(null);
  const [editClub, setEditClub] = useState<MembersClub | null>(null);
  const [actionToastMessage, setActionToastMessage] = useState<string | null>(null);
  const actionToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>(defaultPipelineStats);
  const [expertsPipelineStats, setExpertsPipelineStats] = useState<PipelineStats>(defaultPipelineStats);
  const [membersClubsPipelineStats, setMembersClubsPipelineStats] = useState<PipelineStats>(defaultPipelineStats);

  const isExpertsTab = activeTab.startsWith('experts-');
  const isMembersClubsTab = activeTab.startsWith('clubs-');
  const isPartnershipsTab = !isExpertsTab && !isMembersClubsTab;
  const isDashboardTab =
    activeTab === 'dashboard' || activeTab === 'experts-dashboard' || activeTab === 'clubs-dashboard';
  const partnershipTableTab = activeTab as PartnershipTableTab;
  const expertTableTab = activeTab as ExpertTableTab;
  const membersClubTableTab = activeTab as MembersClubTableTab;

  useEffect(() => {
    if (
      !isPartnershipsTab ||
      activeTab === 'dashboard' ||
      activeTab === 'all' ||
      activeTab === 'partner-health' ||
      activeTab === 'big-purchases'
    ) {
      setFilteredPartners(partners);
      return;
    }

    const statusMap: Record<string, string> = {
      closed: 'closed',
      potential: 'potential',
      contacted: 'contacted',
      leads: 'lead',
      negotiation: 'negotiation',
      signed: 'signed',
    };
    const targetStatus = statusMap[activeTab] || activeTab;
    setFilteredPartners(partners.filter((partner) => partner.status === targetStatus));
  }, [partners, activeTab, isPartnershipsTab]);

  useEffect(() => {
    if (!isExpertsTab || activeTab === 'experts-dashboard' || activeTab === 'experts-all') {
      setFilteredExperts(experts);
      return;
    }

    const statusMap: Record<string, PartnerStatus> = {
      'experts-contacted': 'contacted',
      'experts-leads': 'lead',
      'experts-negotiation': 'negotiation',
      'experts-signed': 'signed',
    };
    setFilteredExperts(experts.filter((expert) => expert.status === statusMap[activeTab]));
  }, [experts, activeTab, isExpertsTab]);

  useEffect(() => {
    if (!isMembersClubsTab || activeTab === 'clubs-dashboard' || activeTab === 'clubs-all') {
      setFilteredMembersClubs(membersClubs);
      return;
    }

    const statusMap: Record<string, PartnerStatus> = {
      'clubs-contacted': 'contacted',
      'clubs-leads': 'lead',
      'clubs-negotiation': 'negotiation',
      'clubs-signed': 'signed',
    };
    setFilteredMembersClubs(membersClubs.filter((club) => club.status === statusMap[activeTab]));
  }, [membersClubs, activeTab, isMembersClubsTab]);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [
        partnersData,
        expertsData,
        clubsData,
        pipeline,
        expertsPipeline,
        membersClubsPipeline,
        bigPurchasesData,
      ] = await Promise.all([
        getPartners(),
        getExperts(),
        getMembersClubs(),
        getPipelineStats(),
        getExpertsPipelineStats(),
        getMembersClubsPipelineStats(),
        getBigPurchases(),
      ]);

      setPartners(partnersData);
      setExperts(expertsData);
      setMembersClubs(clubsData);
      setPipelineStats(pipeline);
      setExpertsPipelineStats(expertsPipeline);
      setMembersClubsPipelineStats(membersClubsPipeline);
      setBigPurchases(bigPurchasesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  useEffect(() => {
    return () => {
      if (actionToastTimeoutRef.current) {
        clearTimeout(actionToastTimeoutRef.current);
      }
    };
  }, []);

  const showActionToast = useCallback((message: string) => {
    setActionToastMessage(message);
    if (actionToastTimeoutRef.current) {
      clearTimeout(actionToastTimeoutRef.current);
    }
    actionToastTimeoutRef.current = setTimeout(() => {
      setActionToastMessage(null);
    }, 2500);
  }, []);

  const handleAddPartner = async (partnerData: Omit<Partner, 'id' | 'created' | 'updated'>) => {
    try {
      await createPartner(partnerData);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating partner:', error);
      throw error;
    }
  };

  const handleAddExpert = async (expertData: Omit<Expert, 'id' | 'created' | 'updated'>) => {
    try {
      await createExpert(expertData);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating expert:', error);
      throw error;
    }
  };

  const handleAddClub = async (clubData: Omit<MembersClub, 'id' | 'created' | 'updated'>) => {
    try {
      await createMembersClub(clubData);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating members club:', error);
      throw error;
    }
  };

  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    try {
      await updatePartner(id, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating partner:', error);
      throw error;
    }
  };

  const handleUpdateExpert = async (id: string, updates: Partial<Expert>) => {
    try {
      await updateExpert(id, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating expert:', error);
      throw error;
    }
  };

  const handleUpdateClub = async (id: string, updates: Partial<MembersClub>) => {
    try {
      await updateMembersClub(id, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating members club:', error);
      throw error;
    }
  };

  const handleMovePartner = async (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => {
    try {
      await updatePartnerStatus(id, newStatus, currentStatus);
      await loadData();
    } catch (error) {
      console.error('Error moving partner:', error);
    }
  };

  const handleMoveExpert = async (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => {
    try {
      await updateExpertStatus(id, newStatus, currentStatus);
      await loadData();
    } catch (error) {
      console.error('Error moving expert:', error);
    }
  };

  const handleMoveClub = async (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => {
    try {
      await updateMembersClubStatus(id, newStatus, currentStatus);
      await loadData();
    } catch (error) {
      console.error('Error moving members club:', error);
    }
  };

  const handleSendToCore = async (partner: Partner) => {
    const result = await sendToCore(partner);
    if (result.success) {
      showActionToast('Sent to Core ✓');
    } else {
      showError(`Failed to send to Core: ${result.error || 'Unknown error'}`);
    }
  };

  const handleSendToBrevo = async (partner: Partner) => {
    const result = await sendToBrevo(partner);
    if (result.success) {
      showActionToast('Sent to Brevo ✓');
    } else {
      showError(`Failed to send to Brevo: ${result.error || 'Unknown error'}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;

    try {
      await deletePartner(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const handleDeleteExpert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expert?')) return;

    try {
      await deleteExpert(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting expert:', error);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this members club?')) return;

    try {
      await deleteMembersClub(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting members club:', error);
    }
  };

  const handleEditPartner = (partner: Partner) => {
    setEditPartner(partner);
    setEditExpert(null);
    setEditClub(null);
    setShowAddModal(true);
  };

  const handleEditExpert = (expert: Expert) => {
    setEditExpert(expert);
    setEditPartner(null);
    setEditClub(null);
    setShowAddModal(true);
  };

  const handleEditClub = (club: MembersClub) => {
    setEditClub(club);
    setEditPartner(null);
    setEditExpert(null);
    setShowAddModal(true);
  };

  const handleUploadPartnerAgreement = async (id: string, file: File) => {
    try {
      await uploadPartnerAgreement(id, file);
      await loadData();
      showSuccess('Partner agreement uploaded');
    } catch (error) {
      console.error('Error uploading partner agreement:', error);
      showError('Failed to upload partner agreement');
    }
  };

  const handleDeletePartnerAgreement = async (id: string, fileName: string) => {
    try {
      await deletePartnerAgreementFile(id, fileName);
      await loadData();
      showSuccess('Partner agreement deleted');
    } catch (error) {
      console.error('Error deleting partner agreement:', error);
      showError('Failed to delete partner agreement');
    }
  };

  const handleUpdateBigPurchase = async (id: string, updates: Partial<BigPurchase>) => {
    try {
      const existing = bigPurchases.find((purchase) => purchase.id === id);
      const updatedRecord = await updateBigPurchase(id, updates);

      const invoicedChanged =
        existing &&
        updates.invoiced !== undefined &&
        updates.invoiced !== existing.invoiced;

      if (existing && invoicedChanged) {
        const partnerName = updatedRecord?.partner_name ?? existing.partner_name;
        const estimatedAmount = updatedRecord?.estimated_amount ?? existing.estimated_amount;
        const amountToInvoice =
          updatedRecord?.amount_to_invoice !== undefined
            ? updatedRecord.amount_to_invoice
            : updates.amount_to_invoice !== undefined
            ? updates.amount_to_invoice
            : existing.amount_to_invoice;
        const currentInvoiced = updatedRecord?.invoiced ?? updates.invoiced ?? existing.invoiced;

        try {
          const webhookResponse = await fetch('/api/big-purchase-status-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: existing.id,
              partner_name: partnerName,
              estimated_amount: estimatedAmount,
              amount_to_invoice: amountToInvoice,
              invoiced: currentInvoiced,
            }),
          });
          if (!webhookResponse.ok) {
            const errorPayload = await webhookResponse.json().catch(() => ({}));
            console.error('Big purchase invoiced webhook failed:', errorPayload);
          }
        } catch (webhookError) {
          console.error('Error sending big purchase invoiced webhook:', webhookError);
        }
      }

      await loadData();
      showSuccess('Big purchase updated');
    } catch (error) {
      console.error('Error updating big purchase:', error);
      showError('Failed to update big purchase');
    }
  };

  const handleMoveBigPurchaseToPotentialLead = async (purchase: BigPurchase) => {
    try {
      if (purchase.partner_id || purchase.moved_to_potential) {
        showError('Already in Pipeline');
        return;
      }
      await moveBigPurchaseToPotentialLead(purchase);
      await loadData();
      showSuccess('Added to Potential Leads ✓');
    } catch (error) {
      console.error('Error moving big purchase:', error);
      showError('Failed to move this purchase to Potential Leads');
    }
  };

  const handleDeleteBigPurchase = async (id: string) => {
    try {
      await deleteBigPurchase(id);
      setBigPurchases((current) => current.filter((purchase) => purchase.id !== id));
      showSuccess('Big purchase deleted');
    } catch (error) {
      console.error('Error deleting big purchase:', error);
      showError('Failed to delete big purchase');
      throw error;
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditPartner(null);
    setEditExpert(null);
    setEditClub(null);
  };

  const bigPurchasesCount = bigPurchases.length;
  const activeTabLabel = getTabLabel(activeTab);
  const partnershipsWeeklyStats = calculateDashboardWeeklyStats(partners);
  const partnershipsDashboardStats = calculateDashboardPipelineStats(partners);
  const expertsWeeklyStats = calculateDashboardWeeklyStats(experts);
  const expertsDashboardStats = calculateDashboardPipelineStats(experts);
  const membersClubsWeeklyStats = calculateDashboardWeeklyStats(membersClubs);
  const membersClubsDashboardStats = calculateDashboardPipelineStats(membersClubs);
  const expertDashboardPartners = experts.map(mapExpertToDashboardPartner);
  const membersClubsDashboardPartners = membersClubs.map(mapMembersClubToDashboardPartner);
  const dashboardTab =
    activeTab === 'experts-dashboard'
      ? 'experts-dashboard'
      : activeTab === 'clubs-dashboard'
      ? 'clubs-dashboard'
      : 'dashboard';
  const modalEcosystem = editExpert
    ? 'experts'
    : editClub
    ? 'clubs'
    : isExpertsTab
    ? 'experts'
    : isMembersClubsTab
    ? 'clubs'
    : 'partnerships';

  const addButtonLabel = isExpertsTab
    ? 'Add Expert'
    : isMembersClubsTab
    ? 'Add Members Club'
    : 'Add Partner';

  const countSubtitle = isExpertsTab
    ? `${filteredExperts.length} experts`
    : isMembersClubsTab
    ? `${filteredMembersClubs.length} clubs`
    : `${filteredPartners.length} partners`;

  const handleDashboardTabChange = (tab: 'dashboard' | 'experts-dashboard' | 'clubs-dashboard') => {
    setActiveTab(tab);
  };

  const defaultEntityStatus: PartnerStatus = isExpertsTab || isMembersClubsTab
    ? activeTab.includes('leads')
      ? 'lead'
      : activeTab.includes('negotiation')
      ? 'negotiation'
      : activeTab.includes('signed')
      ? 'signed'
      : 'contacted'
    : activeTab === 'all' || activeTab === 'dashboard' || activeTab === 'partner-health' || activeTab === 'big-purchases'
    ? 'potential'
    : activeTab === 'leads'
    ? 'lead'
    : (activeTab as PartnerStatus);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-blckbx-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
          <p className="text-blckbx-black/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pipelineStats={pipelineStats}
        expertsPipelineStats={expertsPipelineStats}
        membersClubsPipelineStats={membersClubsPipelineStats}
        bigPurchasesCount={bigPurchasesCount}
        onExpandedChange={setSidebarExpanded}
      />

      <main
        className={`flex-1 p-8 transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'ml-72' : 'ml-16'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl font-semibold text-blckbx-black"
              >
                {activeTabLabel}
              </motion.h1>
              <p className="text-blckbx-black/60 mt-1">
                {activeTab === 'dashboard'
                  ? 'Overview of your partnership pipeline'
                  : activeTab === 'experts-dashboard'
                  ? 'Overview of your experts pipeline'
                  : activeTab === 'clubs-dashboard'
                  ? 'Overview of your members clubs pipeline'
                  : activeTab === 'partner-health'
                  ? 'Monitor partnership engagement and activity'
                  : activeTab === 'big-purchases'
                  ? `${bigPurchases.length} purchases`
                  : countSubtitle}
              </p>
            </div>

            {!isDashboardTab &&
              activeTab !== 'partner-health' &&
              activeTab !== 'big-purchases' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-blckbx-cta text-white px-5 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {addButtonLabel}
                </motion.button>
              )}
          </header>

          <AnimatePresence mode="wait">
            {isDashboardTab ? (
              <motion.div
                key={dashboardTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Dashboard
                  activeDashboardTab={dashboardTab}
                  onDashboardTabChange={handleDashboardTabChange}
                  weeklyStats={
                    dashboardTab === 'experts-dashboard'
                      ? expertsWeeklyStats
                      : dashboardTab === 'clubs-dashboard'
                      ? membersClubsWeeklyStats
                      : partnershipsWeeklyStats
                  }
                  pipelineStats={
                    dashboardTab === 'experts-dashboard'
                      ? expertsDashboardStats
                      : dashboardTab === 'clubs-dashboard'
                      ? membersClubsDashboardStats
                      : partnershipsDashboardStats
                  }
                  partners={
                    dashboardTab === 'experts-dashboard'
                      ? expertDashboardPartners
                      : dashboardTab === 'clubs-dashboard'
                      ? membersClubsDashboardPartners
                      : partners
                  }
                  labels={
                    dashboardTab === 'experts-dashboard'
                      ? {
                          entitySingular: 'Expert',
                          entityPlural: 'Experts',
                          categorySectionTitle: 'Expert Categories',
                          recentActivitySubtitle: (partner) =>
                            [partner.lifestyle_category, partner.description].filter(Boolean).join(' • '),
                        }
                      : dashboardTab === 'clubs-dashboard'
                      ? {
                          entitySingular: 'Club',
                          entityPlural: 'Members Clubs',
                          categorySectionTitle: 'Members Clubs',
                          recentActivitySubtitle: (partner) =>
                            [partner.description, partner.contact_name].filter(Boolean).join(' • '),
                        }
                      : {
                          entitySingular: 'Partner',
                          entityPlural: 'Partnerships',
                          categorySectionTitle: 'Lifestyle Categories',
                          recentActivitySubtitle: (partner) =>
                            [partner.lifestyle_category, partner.opportunity_type].filter(Boolean).join(' • '),
                        }
                  }
                />
              </motion.div>
            ) : activeTab === 'partner-health' ? (
              <motion.div
                key="partner-health"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PartnerHealth partners={partners} />
              </motion.div>
            ) : activeTab === 'big-purchases' ? (
              <motion.div
                key="big-purchases"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BigPurchasesTable
                  purchases={bigPurchases}
                  partners={partners}
                  isLoading={isLoading}
                  onUpdate={handleUpdateBigPurchase}
                  onDelete={handleDeleteBigPurchase}
                  onMoveToPotential={handleMoveBigPurchaseToPotentialLead}
                />
              </motion.div>
            ) : isExpertsTab ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ExpertTable
                  experts={filteredExperts}
                  currentTab={expertTableTab}
                  onUpdate={handleUpdateExpert}
                  onMove={handleMoveExpert}
                  onDelete={handleDeleteExpert}
                  onEditExpert={handleEditExpert}
                  isLoading={isLoading}
                />
              </motion.div>
            ) : isMembersClubsTab ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MembersClubTable
                  clubs={filteredMembersClubs}
                  currentTab={membersClubTableTab}
                  onUpdate={handleUpdateClub}
                  onMove={handleMoveClub}
                  onDelete={handleDeleteClub}
                  onEditClub={handleEditClub}
                  isLoading={isLoading}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PartnerTable
                  partners={filteredPartners}
                  currentTab={partnershipTableTab}
                  onUpdate={handleUpdatePartner}
                  onUploadAgreement={handleUploadPartnerAgreement}
                  onDeleteAgreement={handleDeletePartnerAgreement}
                  onMove={handleMovePartner}
                  onDelete={handleDeletePartner}
                  onSendToCore={handleSendToCore}
                  onSendToBrevo={handleSendToBrevo}
                  onEditPartner={handleEditPartner}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {modalEcosystem === 'partnerships' && (
        <AddPartnerModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onAdd={handleAddPartner}
          onEdit={handleUpdatePartner}
          editPartner={editPartner}
          defaultStatus={defaultEntityStatus}
        />
      )}

      {modalEcosystem === 'experts' && (
        <AddExpertModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onAdd={handleAddExpert}
          onEdit={handleUpdateExpert}
          editExpert={editExpert}
          defaultStatus={defaultEntityStatus}
        />
      )}

      {modalEcosystem === 'clubs' && (
        <AddMembersClubModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onAdd={handleAddClub}
          onEdit={handleUpdateClub}
          editClub={editClub}
          defaultStatus={defaultEntityStatus}
        />
      )}

      {actionToastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg bg-blckbx-black text-blckbx-sand text-sm font-medium shadow-lg">
          {actionToastMessage}
        </div>
      )}
    </div>
  );
}
