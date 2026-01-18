'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Partner, PartnerStatus, PartnerTier, UseForTag, LifecycleStage } from '@/types';
import { format, differenceInDays } from 'date-fns';

interface PartnerTableProps {
  partners: Partner[];
  currentTab: 'potential' | 'contacted' | 'leads' | 'negotiation' | 'signed' | 'all';
  onUpdate: (id: string, updates: Partial<Partner>) => Promise<void>;
  onMove: (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSendToCore: (partner: Partner) => Promise<void>;
  onSendToBrevo: (partner: Partner) => Promise<void>;
  onEditPartner: (partner: Partner) => void;
  isLoading: boolean;
}

type SortField = 'partner_name' | 'lifestyle_category' | 'opportunity_type' | 'created';
type SortDirection = 'asc' | 'desc';

export default function PartnerTable({
  partners,
  currentTab,
  onUpdate,
  onMove,
  onDelete,
  onSendToCore,
  onSendToBrevo,
  onEditPartner,
  isLoading,
}: PartnerTableProps) {
  const [sortField, setSortField] = useState<SortField>('partner_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getTierBadgeStyle = (tier: PartnerTier) => {
    switch (tier) {
      case 'Preferred': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'Standard': return 'bg-gray-100 text-gray-700 border border-gray-300';
      case 'Test': return 'bg-sky-100 text-sky-700 border border-sky-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTagColor = (tag: UseForTag) => {
    switch (tag) {
      case 'Last-minute': return 'bg-red-100 text-red-700';
      case 'VIP/HNW': return 'bg-amber-100 text-amber-700';
      case 'Best value': return 'bg-green-100 text-green-700';
      case 'International': return 'bg-blue-100 text-blue-700';
      case 'Gifting': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLifecycleStyle = (stage: LifecycleStage) => {
    switch (stage) {
      case 'New': return 'text-emerald-600';
      case 'Growing': return 'text-blue-600';
      case 'Mature': return 'text-gray-600';
      case 'At Risk': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getNextStatus = (currentStatus: PartnerStatus): PartnerStatus | null => {
    switch (currentStatus) {
      case 'potential':
        return 'contacted';
      case 'contacted':
        return 'lead';
      case 'lead':
        return 'negotiation';
      case 'negotiation':
        return 'signed';
      default:
        return null;
    }
  };

  const getMoveButtonText = (status: PartnerStatus): string => {
    switch (status) {
      case 'potential':
        return 'Move to Contacted';
      case 'contacted':
        return 'Move to Leads';
      case 'lead':
        return 'Move to Negotiation';
      case 'negotiation':
        return 'Move to Signed';
      case 'signed':
        return 'Send to Core';
      default:
        return '';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPartners = [...partners]
    .filter(p => 
      p.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lifestyle_category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      return 0;
    });

  const handleCheckboxChange = async (id: string, field: keyof Partner, value: boolean) => {
    await onUpdate(id, { [field]: value });
  };

  const handleMoveClick = async (partner: Partner) => {
    if (partner.status === 'signed') {
      await onSendToCore(partner);
    } else {
      const nextStatus = getNextStatus(partner.status);
      if (nextStatus) {
        await onMove(partner.id, nextStatus, partner.status);
      }
    }
  };

  const getDaysInPipeline = (partner: Partner): number => {
    const endDate = partner.signed_at ? new Date(partner.signed_at) : new Date();
    // Use lead_date if available (for partners that started in contacted status)
    // Otherwise use created date
    const startDate = partner.lead_date ? new Date(partner.lead_date) : new Date(partner.created);
    return differenceInDays(endDate, startDate);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-blckbx-dark-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
          <p className="text-blckbx-black/60">Loading partners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blckbx-dark-sand overflow-hidden">
      {/* Table Header */}
      <div className="p-4 border-b border-blckbx-dark-sand flex items-center justify-between">
        <div className="relative">
          <svg 
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-blckbx-black/40" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/50 text-blckbx-black placeholder-blckbx-black/40 w-64 focus:border-blckbx-cta"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-blckbx-black/60">
          <span>{sortedPartners.length} partners</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr className="text-left">
              <th className="p-4 font-medium text-sm w-8"></th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('partner_name')}
              >
                <div className="flex items-center gap-2">
                  Partner
                  {sortField === 'partner_name' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('lifestyle_category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {sortField === 'lifestyle_category' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Commission</th>
              {currentTab === 'all' && (
                <>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Name</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Position</th>
                </>
              )}
              {currentTab !== 'all' && (
                <th className="p-4 font-medium text-sm whitespace-nowrap">Contact</th>
              )}
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('opportunity_type')}
              >
                <div className="flex items-center gap-2">
                  Opp. Type
                  {sortField === 'opportunity_type' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              {currentTab === 'all' && (
                <>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Partnership Type</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Status</th>
                </>
              )}
              {(currentTab === 'negotiation' || currentTab === 'all') && (
                <>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Contacted</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Call Booked</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Call Had</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Contract Sent</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Contract Signed</th>
                </>
              )}
              <th className="p-4 font-medium text-sm whitespace-nowrap">Days</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedPartners.map((partner, index) => (
                <React.Fragment key={partner.id}>
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className={`border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30 ${expandedId === partner.id ? 'bg-blckbx-sand/20' : ''}`}
                >
                  {/* Expand toggle */}
                      <td className="p-3">
                        <button
                          onClick={() => setExpandedId(expandedId === partner.id ? null : partner.id)}
                          className="p-1 rounded hover:bg-blckbx-dark-sand transition-colors"
                        >
                          <svg
                            className={`w-4 h-4 text-blckbx-black/50 transition-transform ${expandedId === partner.id ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      {/* Partner name with status and badges */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              partner.status === 'potential' ? 'bg-yellow-400' :
                              partner.status === 'contacted' ? 'bg-blue-400' :
                              partner.status === 'lead' ? 'bg-blckbx-alert' :
                              partner.status === 'negotiation' ? 'bg-blckbx-cta' :
                              'bg-green-500'
                            }`} />
                            <span className="font-medium text-blckbx-black">{partner.partner_name}</span>
                            {partner.is_default && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500 text-white whitespace-nowrap">
                                USE FIRST
                              </span>
                            )}
                          </div>
                          {partner.lifecycle_stage && currentTab !== 'all' && (
                            <span className={`text-xs ${getLifecycleStyle(partner.lifecycle_stage)}`}>
                              {partner.lifecycle_stage}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Category */}
                      <td className="p-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blckbx-dark-sand text-blckbx-black/70 whitespace-nowrap">
                          {partner.lifestyle_category}
                        </span>
                      </td>
                      {/* Commission */}
                      <td className="p-3">
                        <span className="text-sm text-blckbx-black/70 whitespace-nowrap">
                          {partner.commission || '-'}
                        </span>
                      </td>
                      {/* Contact - Split columns for 'all' tab */}
                      {currentTab === 'all' ? (
                        <>
                          <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{partner.contact_name || '-'}</td>
                          <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{partner.contact_position || '-'}</td>
                        </>
                      ) : (
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="text-blckbx-black/70">{partner.contact_name || '-'}</p>
                            {partner.contact_email && (
                              <a href={`mailto:${partner.contact_email}`} className="text-blckbx-cta hover:underline text-xs">
                                {partner.contact_email}
                              </a>
                            )}
                          </div>
                        </td>
                      )}
                      {/* Opportunity Type */}
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap inline-block w-fit ${
                          partner.opportunity_type === 'Big Ticket'
                            ? 'bg-blckbx-cta/10 text-blckbx-cta'
                            : partner.opportunity_type === 'Low Hanging'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blckbx-alert/20 text-orange-700'
                        }`}>
                          {partner.opportunity_type}
                        </span>
                      </td>
                      {/* Extra columns for 'all' tab */}
                      {currentTab === 'all' && (
                        <>
                          {/* Partnership Type */}
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap inline-block w-fit ${
                              partner.partnership_type === 'Direct'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {partner.partnership_type}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                              partner.status === 'potential' ? 'bg-yellow-100 text-yellow-700' :
                              partner.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                              partner.status === 'lead' ? 'bg-blckbx-alert/20 text-orange-700' :
                              partner.status === 'negotiation' ? 'bg-blckbx-cta/20 text-blckbx-cta' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {partner.status}
                            </span>
                          </td>
                        </>
                      )}
                      {(currentTab === 'negotiation' || currentTab === 'all') && (
                        <>
                          {/* Show checkboxes only for Direct partnerships, show N/A for Affiliates */}
                          {partner.partnership_type === 'Affiliate' ? (
                            <>
                              <td className="p-3 text-center text-blckbx-black/40 text-xs">N/A</td>
                              <td className="p-3 text-center text-blckbx-black/40 text-xs">N/A</td>
                              <td className="p-3 text-center text-blckbx-black/40 text-xs">N/A</td>
                              <td className="p-3 text-center text-blckbx-black/40 text-xs">N/A</td>
                              <td className="p-3 text-center text-blckbx-black/40 text-xs">N/A</td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={partner.contacted}
                                  onChange={(e) => handleCheckboxChange(partner.id, 'contacted', e.target.checked)}
                                  className="custom-checkbox"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={partner.call_booked}
                                  onChange={(e) => handleCheckboxChange(partner.id, 'call_booked', e.target.checked)}
                                  className="custom-checkbox"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={partner.call_had}
                                  onChange={(e) => handleCheckboxChange(partner.id, 'call_had', e.target.checked)}
                                  className="custom-checkbox"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={partner.contract_sent}
                                  onChange={(e) => handleCheckboxChange(partner.id, 'contract_sent', e.target.checked)}
                                  className="custom-checkbox"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={partner.contract_signed}
                                  onChange={(e) => handleCheckboxChange(partner.id, 'contract_signed', e.target.checked)}
                                  className="custom-checkbox"
                                />
                              </td>
                            </>
                          )}
                        </>
                      )}
                      <td className="p-3">
                        <span className="text-sm text-blckbx-black/60">
                          {getDaysInPipeline(partner)}d
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditPartner(partner)}
                            className="p-1.5 rounded bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black hover:text-white transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleMoveClick(partner)}
                            className={`w-24 h-10 rounded text-xs font-medium transition-colors ${
                              partner.status === 'signed'
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : partner.status === 'potential'
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : partner.status === 'contacted'
                                ? 'bg-purple-500 text-white hover:bg-purple-600'
                                : partner.status === 'lead'
                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                            title={getMoveButtonText(partner.status)}
                          >
                            {partner.status === 'signed' ? 'Send to Core' :
                             partner.status === 'potential' ? 'To Contacted' :
                             partner.status === 'contacted' ? 'To Leads' :
                             partner.status === 'lead' ? 'To Negotiation' : 'To Signed'}
                          </button>

                          {partner.status === 'signed' && (
                            <button
                              onClick={() => onSendToBrevo(partner)}
                              className="p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                              title="Send to Brevo"
                            >
                              <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="12" fill="#0B996E"/>
                                <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">B</text>
                              </svg>
                            </button>
                          )}

                          <button
                            onClick={() => onDelete(partner.id)}
                            className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                </motion.tr>
                {/* Expanded Row */}
                {expandedId === partner.id && (
                  <motion.tr
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blckbx-sand/30"
                  >
                    <td colSpan={100} className="p-4">
                      <div className="grid grid-cols-3 gap-6">
                        {/* About This Partner */}
                        <div className="col-span-2">
                          {partner.partner_brief && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-blckbx-black mb-1">About This Partner</h4>
                              <p className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {partner.partner_brief}
                              </p>
                            </div>
                          )}
                          {/* Warning */}
                          {partner.when_not_to_use && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                  <h4 className="text-sm font-medium text-red-800">When Not To Use</h4>
                                  <p className="text-sm text-red-700 mt-1">{partner.when_not_to_use}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Contact & SLA Info */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-blckbx-black mb-2">Contact Details</h4>
                            <div className="text-sm space-y-1 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                              <p className="text-blckbx-black/70"><span className="font-medium">Name:</span> {partner.contact_name || '-'}</p>
                              <p className="text-blckbx-black/70"><span className="font-medium">Position:</span> {partner.contact_position || '-'}</p>
                              <p className="text-blckbx-black/70"><span className="font-medium">Phone:</span> {partner.contact_phone || '-'}</p>
                              <p className="text-blckbx-black/70"><span className="font-medium">Email:</span> {partner.contact_email || '-'}</p>
                              {partner.website && (
                                <p><span className="font-medium">Website:</span> <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blckbx-cta hover:underline">{partner.website}</a></p>
                              )}
                              {partner.login_notes && (
                                <p className="text-blckbx-black/70"><span className="font-medium">Login:</span> {partner.login_notes}</p>
                              )}
                            </div>
                          </div>
                          {partner.sla_notes && (
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-2">SLA Notes</h4>
                              <div className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {partner.sla_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {sortedPartners.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blckbx-dark-sand rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blckbx-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blckbx-black mb-1">No partners found</h3>
          <p className="text-blckbx-black/50">
            {searchTerm ? 'Try a different search term' : 'Add your first partner to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
