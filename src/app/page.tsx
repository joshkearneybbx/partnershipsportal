'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from '@/components/Dashboard';
import PartnerTable from '@/components/PartnerTable';
import Sidebar from '@/components/Sidebar';
import AddPartnerModal from '@/components/AddPartnerModal';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/contexts/AuthContext';
import { Partner, PartnerStatus, WeeklyStats, PipelineStats } from '@/types';
import {
  getPartners,
  getPartnersByStatus,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner,
  getWeeklyStats,
  getPipelineStats,
} from '@/lib/pocketbase';
import { sendToCore } from '@/lib/webhook';

type TabType = 'dashboard' | 'leads' | 'negotiation' | 'signed' | 'all' | 'partner-health';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    newLeads: 0,
    inNegotiation: 0,
    signed: 0,
    contacted: 0,
    callsBooked: 0,
    callsHad: 0,
    contractsSent: 0,
    contractsSigned: 0,
    avgDaysToSign: 0,
  });
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    leads: 0,
    negotiation: 0,
    signed: 0,
    total: 0,
  });

  // Filter partners when partners or activeTab changes
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'all' || activeTab === 'partner-health') {
      setFilteredPartners(partners);
    } else {
      // Map tab names to status values (tabs are plural, statuses are singular)
      const statusMap: Record<string, string> = {
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
      const [partnersData, weekly, pipeline] = await Promise.all([
        getPartners(),
        getWeeklyStats(),
        getPipelineStats(),
      ]);
      setPartners(partnersData);
      setWeeklyStats(weekly);
      setPipelineStats(pipeline);
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

  const handleMovePartner = async (id: string, newStatus: PartnerStatus) => {
    try {
      await updatePartnerStatus(id, newStatus);
      await loadData();
    } catch (error) {
      console.error('Error moving partner:', error);
    }
  };

  const handleSendToCore = async (partner: Partner) => {
    const result = await sendToCore(partner);
    if (result.success) {
      alert(`Successfully sent ${partner.partner_name} to Core!`);
    } else {
      alert(`Failed to send to Core: ${result.error || 'Unknown error'}`);
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

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditPartner(null);
  };

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
                  : activeTab === 'leads'
                  ? 'Leads'
                  : activeTab === 'negotiation'
                  ? 'Negotiation'
                  : activeTab === 'signed'
                  ? 'Signed Partners'
                  : activeTab === 'partner-health'
                  ? 'Partner Health'
                  : 'All Partners'}
              </motion.h1>
              <p className="text-blckbx-black/60 mt-1">
                {activeTab === 'dashboard'
                  ? 'Overview of your partnership pipeline'
                  : activeTab === 'partner-health'
                  ? 'Monitor partnership engagement and activity'
                  : `${filteredPartners.length} partners`}
              </p>
            </div>

            {activeTab !== 'dashboard' && activeTab !== 'partner-health' && (
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
              ></motion.div>
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
                  onMove={handleMovePartner}
                  onDelete={handleDeletePartner}
                  onSendToCore={handleSendToCore}
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
          activeTab === 'all' || activeTab === 'dashboard' || activeTab === 'partner-health'
            ? 'lead'
            : activeTab === 'leads'
            ? 'lead'
            : (activeTab as PartnerStatus)
        }
      />
    </div>
  );
}
