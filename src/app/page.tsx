'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from '@/components/Dashboard';
import PartnerTable from '@/components/PartnerTable';
import Sidebar from '@/components/Sidebar';
import AddPartnerModal from '@/components/AddPartnerModal';
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
  isSupabaseConfigured
} from '@/lib/supabase';
import { sendToCore } from '@/lib/webhook';

// Mock data for demo purposes (remove when Supabase is connected)
const mockPartners: Partner[] = [
  {
    id: '1',
    partner_name: 'Soho House',
    lifestyle_category: 'Entertainment',
    contact_name: 'James Wilson',
    position: 'Partnership Director',
    contact_number: '+44 7700 900123',
    email: 'james@sohohouse.com',
    opportunity_type: 'Big Ticket',
    partnership_type: 'Direct',
    partnership_link: 'https://sohohouse.com',
    website: 'https://sohohouse.com',
    login_notes: '',
    status: 'lead',
    contacted: false,
    call_booked: false,
    call_had: false,
    contract_sent: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    partner_name: 'Blacklane',
    lifestyle_category: 'Travel',
    contact_name: 'Sophie Miller',
    position: 'B2B Manager',
    contact_number: '+44 7700 900456',
    email: 'sophie@blacklane.com',
    opportunity_type: 'Everyday',
    partnership_type: 'Affiliate',
    partnership_link: 'https://blacklane.com',
    website: 'https://blacklane.com',
    login_notes: 'Portal login: partners@blacklane.com',
    status: 'negotiation',
    contacted: true,
    call_booked: true,
    call_had: true,
    contract_sent: false,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    partner_name: 'The Dorchester',
    lifestyle_category: 'Travel',
    contact_name: 'Marcus Brown',
    position: 'GM',
    contact_number: '+44 7700 900789',
    email: 'marcus@dorchestercollection.com',
    opportunity_type: 'Big Ticket',
    partnership_type: 'Direct',
    partnership_link: 'https://dorchestercollection.com',
    website: 'https://dorchestercollection.com',
    login_notes: '',
    status: 'signed',
    contacted: true,
    call_booked: true,
    call_had: true,
    contract_sent: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    partner_name: 'Harrods',
    lifestyle_category: 'Retail',
    contact_name: 'Emma Thompson',
    position: 'Partnerships Lead',
    contact_number: '+44 7700 900111',
    email: 'emma@harrods.com',
    opportunity_type: 'Big Ticket',
    partnership_type: 'Direct',
    partnership_link: 'https://harrods.com',
    website: 'https://harrods.com',
    login_notes: '',
    status: 'negotiation',
    contacted: true,
    call_booked: true,
    call_had: false,
    contract_sent: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    partner_name: 'Quintessentially',
    lifestyle_category: 'Other',
    contact_name: 'Oliver Scott',
    position: 'CEO',
    contact_number: '+44 7700 900222',
    email: 'oliver@quintessentially.com',
    opportunity_type: 'Big Ticket',
    partnership_type: 'Affiliate',
    partnership_link: 'https://quintessentially.com',
    website: 'https://quintessentially.com',
    login_notes: '',
    status: 'lead',
    contacted: false,
    call_booked: false,
    call_had: false,
    contract_sent: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: null,
    updated_at: new Date().toISOString(),
  },
];

type TabType = 'dashboard' | 'leads' | 'negotiation' | 'signed' | 'all' | 'partner-health';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [partners, setPartners] = useState<Partner[]>(mockPartners);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    newLeads: 2,
    inNegotiation: 2,
    signed: 1,
    contacted: 3,
    callsBooked: 3,
    callsHad: 2,
    contractsSent: 1,
    avgDaysToSign: 28,
  });
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    leads: 2,
    negotiation: 2,
    signed: 1,
    total: 5,
  });

  // Use mock data for demo, switch to Supabase when configured
  const useMockData = !isSupabaseConfigured();

  // Filter partners when partners or activeTab changes
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'all' || activeTab === 'partner-health') {
      setFilteredPartners(partners);
    } else {
      setFilteredPartners(partners.filter(p => p.status === activeTab));
    }
  }, [partners, activeTab]);

  // Calculate stats when partners change (mock mode only)
  useEffect(() => {
    if (!useMockData) return;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    setWeeklyStats({
      newLeads: partners.filter(p => p.status === 'lead' && new Date(p.created_at) >= oneWeekAgo).length,
      inNegotiation: partners.filter(p => p.status === 'negotiation').length,
      signed: partners.filter(p => p.status === 'signed' && p.signed_at && new Date(p.signed_at) >= oneWeekAgo).length,
      contacted: partners.filter(p => p.contacted).length,
      callsBooked: partners.filter(p => p.call_booked).length,
      callsHad: partners.filter(p => p.call_had).length,
      contractsSent: partners.filter(p => p.contract_sent).length,
      avgDaysToSign: 28,
    });

    setPipelineStats({
      leads: partners.filter(p => p.status === 'lead').length,
      negotiation: partners.filter(p => p.status === 'negotiation').length,
      signed: partners.filter(p => p.status === 'signed').length,
      total: partners.length,
    });
  }, [partners, useMockData]);

  // Refresh data from Supabase
  const refreshData = useCallback(async () => {
    if (useMockData) return;

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
      console.error('Error refreshing data:', error);
    }
  }, [useMockData]);

  // Load data from Supabase on mount
  useEffect(() => {
    if (useMockData) return;

    const loadData = async () => {
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
    };

    loadData();
  }, [useMockData]);

  const handleAddPartner = async (partnerData: Omit<Partner, 'id' | 'created_at' | 'updated_at' | 'signed_at'>) => {
    if (useMockData) {
      const newPartner: Partner = {
        ...partnerData,
        id: String(Date.now()),
        created_at: new Date().toISOString(),
        signed_at: null,
        updated_at: new Date().toISOString(),
      };
      setPartners(prev => [newPartner, ...prev]);
      setShowAddModal(false);
      return;
    }

    try {
      await createPartner(partnerData);
      await refreshData();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating partner:', error);
    }
  };

  const handleUpdatePartner = async (id: string, updates: Partial<Partner>) => {
    if (useMockData) {
      setPartners(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ));
      return;
    }

    try {
      await updatePartner(id, updates);
      await refreshData();
    } catch (error) {
      console.error('Error updating partner:', error);
    }
  };

  const handleMovePartner = async (id: string, newStatus: PartnerStatus) => {
    if (useMockData) {
      setPartners(prev => prev.map(p => {
        if (p.id === id) {
          const updates: Partial<Partner> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
          };
          if (newStatus === 'signed') {
            updates.signed_at = new Date().toISOString();
          }
          return { ...p, ...updates };
        }
        return p;
      }));
      return;
    }

    try {
      await updatePartnerStatus(id, newStatus);
      await refreshData();
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
    
    if (useMockData) {
      setPartners(prev => prev.filter(p => p.id !== id));
      return;
    }

    try {
      await deletePartner(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pipelineStats={pipelineStats}
        onExpandedChange={setSidebarExpanded}
      />

      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${sidebarExpanded ? 'ml-72' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8 flex justify-between items-center">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl font-semibold text-blckbx-black"
              >
                {activeTab === 'dashboard' ? 'Dashboard' :
                 activeTab === 'leads' ? 'Leads' :
                 activeTab === 'negotiation' ? 'Negotiation' :
                 activeTab === 'signed' ? 'Signed Partners' :
                 activeTab === 'partner-health' ? 'Partner Health' : 'All Partners'}
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                  onMove={handleMovePartner}
                  onDelete={handleDeletePartner}
                  onSendToCore={handleSendToCore}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Partner Modal */}
      <AddPartnerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPartner}
        defaultStatus={activeTab === 'all' ? 'lead' : activeTab as PartnerStatus}
      />
    </div>
  );
}
