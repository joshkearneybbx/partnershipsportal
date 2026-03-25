'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { Expert, PartnerStatus } from '@/types';

type ExpertTab =
  | 'experts-contacted'
  | 'experts-leads'
  | 'experts-negotiation'
  | 'experts-signed'
  | 'experts-all';

interface ExpertTableProps {
  experts: Expert[];
  currentTab: ExpertTab;
  onUpdate: (id: string, updates: Partial<Expert>) => Promise<void>;
  onMove: (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditExpert: (expert: Expert) => void;
  isLoading: boolean;
}

type SortField = 'expert_name' | 'expert_category' | 'contact_name' | 'created';
type SortDirection = 'asc' | 'desc';

export default function ExpertTable({
  experts,
  currentTab,
  onUpdate,
  onMove,
  onDelete,
  onEditExpert,
  isLoading,
}: ExpertTableProps) {
  const [sortField, setSortField] = useState<SortField>('expert_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isDirectory = currentTab === 'experts-all';
  const showChecklist = currentTab === 'experts-negotiation' || isDirectory;

  const getLifecycleStyle = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'text-emerald-600';
      case 'Growing':
        return 'text-blue-600';
      case 'Mature':
        return 'text-gray-600';
      case 'At Risk':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusStyle = (status: PartnerStatus) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-700';
      case 'lead':
        return 'bg-orange-100 text-orange-700';
      case 'negotiation':
        return 'bg-blckbx-cta/20 text-blckbx-cta';
      case 'signed':
        return 'bg-green-100 text-green-700';
      case 'potential':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNextStatus = (currentStatus: PartnerStatus): PartnerStatus | null => {
    switch (currentStatus) {
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
      case 'contacted':
        return 'To Leads';
      case 'lead':
        return 'To Negotiation';
      case 'negotiation':
        return 'To Signed';
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

  const sortedExperts = [...experts]
    .filter((expert) =>
      expert.expert_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.expertise.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.expert_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expert.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleCheckboxChange = async (id: string, field: keyof Expert, value: boolean) => {
    await onUpdate(id, { [field]: value } as Partial<Expert>);
  };

  const handleMoveClick = async (expert: Expert) => {
    const nextStatus = getNextStatus(expert.status);
    if (nextStatus) {
      await onMove(expert.id, nextStatus, expert.status);
    }
  };

  const getDaysInPipeline = (expert: Expert): number => {
    const endDate = expert.signed_at ? new Date(expert.signed_at) : new Date();
    const startDate = expert.lead_date ? new Date(expert.lead_date) : new Date(expert.created);
    return differenceInDays(endDate, startDate);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-blckbx-dark-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
          <p className="text-blckbx-black/60">Loading experts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blckbx-dark-sand overflow-hidden">
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
            placeholder="Search experts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/50 text-blckbx-black placeholder-blckbx-black/40 w-64 focus:border-blckbx-cta"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-blckbx-black/60">
          <span>{sortedExperts.length} experts</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr className="text-left">
              <th className="p-4 font-medium text-sm w-8"></th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('expert_name')}
              >
                <div className="flex items-center gap-2">
                  Expert Name
                  {sortField === 'expert_name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('expert_category')}
              >
                <div className="flex items-center gap-2">
                  Expert Category
                  {sortField === 'expert_category' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Expertise</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Name</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Email</th>
              {isDirectory && <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Phone</th>}
              <th className="p-4 font-medium text-sm whitespace-nowrap">Website</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Webinar Instructions</th>
              {isDirectory && (
                <>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Commission</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Status</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Partner Tier</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Lifecycle Stage</th>
                </>
              )}
              {showChecklist && (
                <>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Contacted</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Call Booked</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Call Had</th>
                  <th className="p-4 font-medium text-sm text-center whitespace-nowrap">Contract Sent</th>
                </>
              )}
              <th className="p-4 font-medium text-sm whitespace-nowrap">Days</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedExperts.map((expert, index) => (
                <React.Fragment key={expert.id}>
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30 ${expandedId === expert.id ? 'bg-blckbx-sand/20' : ''}`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => setExpandedId(expandedId === expert.id ? null : expert.id)}
                        className="p-1 rounded hover:bg-blckbx-dark-sand transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-blckbx-black/50 transition-transform ${expandedId === expert.id ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            expert.status === 'contacted' ? 'bg-blue-400' :
                            expert.status === 'lead' ? 'bg-blckbx-alert' :
                            expert.status === 'negotiation' ? 'bg-blckbx-cta' :
                            'bg-green-500'
                          }`} />
                          <span className="font-medium text-blckbx-black">{expert.expert_name}</span>
                          {expert.is_default && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500 text-white whitespace-nowrap">
                              USE FIRST
                            </span>
                          )}
                        </div>
                        {!isDirectory && expert.lifecycle_stage && (
                          <span className={`text-xs ${getLifecycleStyle(expert.lifecycle_stage)}`}>
                            {expert.lifecycle_stage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-blckbx-dark-sand text-blckbx-black/70 whitespace-nowrap">
                        {expert.expert_category || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-blckbx-black/70 min-w-[220px]">{expert.expertise || '—'}</td>
                    <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{expert.contact_name || '—'}</td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {expert.contact_email ? (
                        <a href={`mailto:${expert.contact_email}`} className="text-blckbx-cta hover:underline">
                          {expert.contact_email}
                        </a>
                      ) : (
                        <span className="text-blckbx-black/40">—</span>
                      )}
                    </td>
                    {isDirectory && (
                      <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{expert.contact_phone || '—'}</td>
                    )}
                    <td className="p-3 text-sm whitespace-nowrap">
                      {expert.website ? (
                        <a href={expert.website} target="_blank" rel="noopener noreferrer" className="text-blckbx-cta hover:underline">
                          Visit
                        </a>
                      ) : (
                        <span className="text-blckbx-black/40">—</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-blckbx-black/70 min-w-[220px]">{expert.webinar_instructions || '—'}</td>
                    {isDirectory && (
                      <>
                        <td className="p-3">
                          {expert.has_commission ? (
                            expert.commission_rate && expert.commission_rate > 0 ? (
                              <span className="text-sm text-blckbx-black/70 whitespace-nowrap">{expert.commission_rate}%</span>
                            ) : (
                              <span className="text-sm text-blckbx-black/70 whitespace-nowrap">{expert.commission || 'Yes'}</span>
                            )
                          ) : (
                            <span className="text-sm text-blckbx-black/40 whitespace-nowrap">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusStyle(expert.status)}`}>
                            {expert.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{expert.partner_tier || '—'}</td>
                        <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{expert.lifecycle_stage || '—'}</td>
                      </>
                    )}
                    {showChecklist && (
                      <>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={expert.contacted}
                            onChange={(e) => handleCheckboxChange(expert.id, 'contacted', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={expert.call_booked}
                            onChange={(e) => handleCheckboxChange(expert.id, 'call_booked', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={expert.call_had}
                            onChange={(e) => handleCheckboxChange(expert.id, 'call_had', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={expert.contract_sent}
                            onChange={(e) => handleCheckboxChange(expert.id, 'contract_sent', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <span className="text-sm text-blckbx-black/60">{getDaysInPipeline(expert)}d</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditExpert(expert)}
                          className="p-1.5 rounded bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black hover:text-white transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {expert.status !== 'signed' && (
                          <button
                            onClick={() => handleMoveClick(expert)}
                            className="w-28 h-10 rounded text-xs font-medium bg-blckbx-cta text-white hover:bg-opacity-90 transition-colors"
                            title={getMoveButtonText(expert.status)}
                          >
                            {getMoveButtonText(expert.status)}
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(expert.id)}
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
                  {expandedId === expert.id && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blckbx-sand/30"
                    >
                      <td colSpan={100} className="p-4">
                        <div className="grid grid-cols-3 gap-6">
                          <div className="col-span-2 space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-1">Expertise</h4>
                              <p className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {expert.expertise || 'No expertise added'}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-1">Webinar Instructions</h4>
                              <p className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {expert.webinar_instructions || 'No webinar instructions added'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-2">Contact Details</h4>
                              <div className="text-sm space-y-1 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                <p className="text-blckbx-black/70"><span className="font-medium">Name:</span> {expert.contact_name || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Position:</span> {expert.contact_position || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Phone:</span> {expert.contact_phone || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Email:</span> {expert.contact_email || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Website:</span> {expert.website || '-'}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-2">Commercials</h4>
                              <div className="text-sm space-y-1 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                <p className="text-blckbx-black/70"><span className="font-medium">Commission:</span> {expert.commission || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Rate:</span> {expert.commission_rate ? `${expert.commission_rate}%` : '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Tier:</span> {expert.partner_tier || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Lifecycle:</span> {expert.lifecycle_stage || '-'}</p>
                              </div>
                            </div>
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

      {sortedExperts.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blckbx-dark-sand rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blckbx-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blckbx-black mb-1">No experts found</h3>
          <p className="text-blckbx-black/50">
            {searchTerm ? 'Try a different search term' : 'Add your first expert to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
