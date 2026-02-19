'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from '@/components/Dashboard';
import PartnerTable from '@/components/PartnerTable';
import PartnerHealth from '@/components/PartnerHealth';
import BigPurchasesTable from '@/components/BigPurchasesTable';
import Sidebar from '@/components/Sidebar';
import AddPartnerModal from '@/components/AddPartnerModal';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { BigPurchase, Partner, PartnerStatus, WeeklyStats, PipelineStats } from '@/types';
import {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  uploadPartnerAgreement,
  deletePartnerAgreementFile,
  deletePartner,
  getWeeklyStats,
  getPipelineStats,
  getBigPurchases,
  updateBigPurchase,
  moveBigPurchaseToPotentialLead,
} from '@/lib/pocketbase';
import { sendToCore, sendToBrevo } from '@/lib/webhook';

type TabType =
  | 'dashboard'
  | 'closed'
  | 'potential'
  | 'contacted'
  | 'leads'
  | 'negotiation'
  | 'signed'
  | 'all'
  | 'partner-health'
  | 'big-purchases';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [bigPurchases, setBigPurchases] = useState<BigPurchase[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [actionToastMessage, setActionToastMessage] = useState<string | null>(null);
  const actionToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
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
  });
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    closed: 0,
    potential: 0,
    contacted: 0,
    leads: 0,
    negotiation: 0,
    signed: 0,
    total: 0,
  });

  // Filter partners when partners or activeTab changes
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'all' || activeTab === 'partner-health' || activeTab === 'big-purchases') {
      setFilteredPartners(partners);
    } else {
      // Map tab names to status values (tabs are plural, statuses are singular)
      const statusMap: Record<string, string> = {
        'closed': 'closed',
        'potential': 'potential',
        'contacted': 'contacted',
        'leads': 'lead',
        'negotiation': 'negotiation',
        'signed': 'signed',
      };
      const targetStatus = statusMap[activeTab] || activeTab;

      // Debug logging
      console.log('[Filter] activeTab:', activeTab);
      console.log('[Filter] targetStatus:', targetStatus);
      console.log('[Filter] All partners:', partners.map(p => ({ name: p.partner_name, status: p.status })));

      const filtered = partners.filter((p) => {
        const match = p.status === targetStatus;
        console.log(`[Filter] Partner "${p.partner_name}" status="${p.status}" matches="${match}"`);
        return match;
      });

      console.log('[Filter] Filtered result count:', filtered.length);
      setFilteredPartners(filtered);
    }
  }, [partners, activeTab]);

  // Load data from PocketBase
  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [partnersData, weekly, pipeline, bigPurchasesData] = await Promise.all([
        getPartners(),
        getWeeklyStats(),
        getPipelineStats(),
        getBigPurchases(),
      ]);
      setPartners(partnersData);
      setWeeklyStats(weekly);
      setPipelineStats(pipeline);
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

  const handleAddPartner = async (
    partnerData: Omit<Partner, 'id' | 'created' | 'updated'>
  ) => {
    try {
      await createPartner(partnerData);
      await loadData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating partner:', error);
    }
  };

  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    try {
      await updatePartner(id, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating partner:', error);
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

  const handleEditPartner = (partner: Partner) => {
    setEditPartner(partner);
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

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditPartner(null);
  };

  const purchasedBigPurchasesCount = bigPurchases.filter((purchase) => purchase.status === 'purchased').length;

  // Show loading state while checking auth
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

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pipelineStats={pipelineStats}
        bigPurchasesPurchasedCount={purchasedBigPurchasesCount}
        onExpandedChange={setSidebarExpanded}
      />

      <main
        className={`flex-1 p-8 transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'ml-72' : 'ml-16'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8 flex justify-between items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl font-semibold text-blckbx-black"
              >
                {activeTab === 'dashboard'
                  ? 'Dashboard'
                  : activeTab === 'potential'
                  ? 'Potential Leads'
                  : activeTab === 'contacted'
                  ? 'Contacted'
                  : activeTab === 'leads'
                  ? 'Leads'
                  : activeTab === 'negotiation'
                  ? 'Negotiation'
                  : activeTab === 'signed'
                  ? 'Signed Partners'
                  : activeTab === 'partner-health'
                  ? 'Partner Health'
                  : activeTab === 'big-purchases'
                  ? 'Big Purchases'
                  : 'Partnership Directory'}
              </motion.h1>
              <p className="text-blckbx-black/60 mt-1">
                {activeTab === 'dashboard'
                  ? 'Overview of your partnership pipeline'
                  : activeTab === 'partner-health'
                  ? 'Monitor partnership engagement and activity'
                  : activeTab === 'big-purchases'
                  ? `${bigPurchases.length} purchases`
                  : `${filteredPartners.length} partners`}
              </p>
            </div>

            {activeTab !== 'dashboard' && activeTab !== 'partner-health' && activeTab !== 'big-purchases' && (
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
                Add Partner
              </motion.button>
            )}
          </header>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Dashboard
                  weeklyStats={weeklyStats}
                  pipelineStats={pipelineStats}
                  partners={partners}
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
                  onMoveToPotential={handleMoveBigPurchaseToPotentialLead}
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
                  currentTab={activeTab}
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

      {/* Add/Edit Partner Modal */}
      <AddPartnerModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onAdd={handleAddPartner}
        onEdit={handleUpdatePartner}
        editPartner={editPartner}
        defaultStatus={
          activeTab === 'all' || activeTab === 'dashboard' || activeTab === 'partner-health' || activeTab === 'big-purchases'
            ? 'potential'
            : activeTab === 'leads'
            ? 'lead'
            : (activeTab as PartnerStatus)
        }
      />

      {actionToastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg bg-blckbx-black text-blckbx-sand text-sm font-medium shadow-lg">
          {actionToastMessage}
        </div>
      )}
    </div>
  );
}
