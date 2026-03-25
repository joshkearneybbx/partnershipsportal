'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { MembersClub, PartnerStatus } from '@/types';

type MembersClubTab =
  | 'clubs-contacted'
  | 'clubs-leads'
  | 'clubs-negotiation'
  | 'clubs-signed'
  | 'clubs-all';

interface MembersClubTableProps {
  clubs: MembersClub[];
  currentTab: MembersClubTab;
  onUpdate: (id: string, updates: Partial<MembersClub>) => Promise<void>;
  onMove: (id: string, newStatus: PartnerStatus, currentStatus?: PartnerStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditClub: (club: MembersClub) => void;
  isLoading: boolean;
}

type SortField = 'club_name' | 'contact_name' | 'created';
type SortDirection = 'asc' | 'desc';

export default function MembersClubTable({
  clubs,
  currentTab,
  onUpdate,
  onMove,
  onDelete,
  onEditClub,
  isLoading,
}: MembersClubTableProps) {
  const [sortField, setSortField] = useState<SortField>('club_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isDirectory = currentTab === 'clubs-all';
  const showChecklist = currentTab === 'clubs-negotiation' || isDirectory;

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

  const sortedClubs = [...clubs]
    .filter((club) =>
      club.club_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleCheckboxChange = async (id: string, field: keyof MembersClub, value: boolean) => {
    await onUpdate(id, { [field]: value } as Partial<MembersClub>);
  };

  const handleMoveClick = async (club: MembersClub) => {
    const nextStatus = getNextStatus(club.status);
    if (nextStatus) {
      await onMove(club.id, nextStatus, club.status);
    }
  };

  const getDaysInPipeline = (club: MembersClub): number => {
    const endDate = club.signed_at ? new Date(club.signed_at) : new Date();
    const startDate = club.lead_date ? new Date(club.lead_date) : new Date(club.created);
    return differenceInDays(endDate, startDate);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-blckbx-dark-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
          <p className="text-blckbx-black/60">Loading members clubs...</p>
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
            placeholder="Search members clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/50 text-blckbx-black placeholder-blckbx-black/40 w-72 focus:border-blckbx-cta"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-blckbx-black/60">
          <span>{sortedClubs.length} clubs</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr className="text-left">
              <th className="p-4 font-medium text-sm w-8"></th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('club_name')}
              >
                <div className="flex items-center gap-2">
                  Club Name
                  {sortField === 'club_name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Description</th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors whitespace-nowrap"
                onClick={() => handleSort('contact_name')}
              >
                <div className="flex items-center gap-2">
                  Contact Name
                  {sortField === 'contact_name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Email</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Contact Phone</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Website</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Login Notes</th>
              <th className="p-4 font-medium text-sm whitespace-nowrap">Partnership Link</th>
              {isDirectory && (
                <>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Commission</th>
                  <th className="p-4 font-medium text-sm whitespace-nowrap">Status</th>
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
              {sortedClubs.map((club, index) => (
                <React.Fragment key={club.id}>
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30 ${expandedId === club.id ? 'bg-blckbx-sand/20' : ''}`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => setExpandedId(expandedId === club.id ? null : club.id)}
                        className="p-1 rounded hover:bg-blckbx-dark-sand transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-blckbx-black/50 transition-transform ${expandedId === club.id ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          club.status === 'contacted' ? 'bg-blue-400' :
                          club.status === 'lead' ? 'bg-blckbx-alert' :
                          club.status === 'negotiation' ? 'bg-blckbx-cta' :
                          'bg-green-500'
                        }`} />
                        <span className="font-medium text-blckbx-black">{club.club_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-blckbx-black/70 min-w-[220px]">{club.description || '—'}</td>
                    <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{club.contact_name || '—'}</td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {club.contact_email ? (
                        <a href={`mailto:${club.contact_email}`} className="text-blckbx-cta hover:underline">
                          {club.contact_email}
                        </a>
                      ) : (
                        <span className="text-blckbx-black/40">—</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-blckbx-black/70 whitespace-nowrap">{club.contact_phone || '—'}</td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {club.website ? (
                        <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-blckbx-cta hover:underline">
                          Visit
                        </a>
                      ) : (
                        <span className="text-blckbx-black/40">—</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-blckbx-black/70 min-w-[220px]">{club.login_notes || '—'}</td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {club.partnership_link ? (
                        <a href={club.partnership_link} target="_blank" rel="noopener noreferrer" className="text-blckbx-cta hover:underline">
                          Open
                        </a>
                      ) : (
                        <span className="text-blckbx-black/40">—</span>
                      )}
                    </td>
                    {isDirectory && (
                      <>
                        <td className="p-3">
                          {club.has_commission ? (
                            club.commission_rate && club.commission_rate > 0 ? (
                              <span className="text-sm text-blckbx-black/70 whitespace-nowrap">{club.commission_rate}%</span>
                            ) : (
                              <span className="text-sm text-blckbx-black/70 whitespace-nowrap">{club.commission || 'Yes'}</span>
                            )
                          ) : (
                            <span className="text-sm text-blckbx-black/40 whitespace-nowrap">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusStyle(club.status)}`}>
                            {club.status}
                          </span>
                        </td>
                      </>
                    )}
                    {showChecklist && (
                      <>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={club.contacted}
                            onChange={(e) => handleCheckboxChange(club.id, 'contacted', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={club.call_booked}
                            onChange={(e) => handleCheckboxChange(club.id, 'call_booked', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={club.call_had}
                            onChange={(e) => handleCheckboxChange(club.id, 'call_had', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={club.contract_sent}
                            onChange={(e) => handleCheckboxChange(club.id, 'contract_sent', e.target.checked)}
                            className="custom-checkbox"
                          />
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <span className="text-sm text-blckbx-black/60">{getDaysInPipeline(club)}d</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditClub(club)}
                          className="p-1.5 rounded bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black hover:text-white transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {club.status !== 'signed' && (
                          <button
                            onClick={() => handleMoveClick(club)}
                            className="w-28 h-10 rounded text-xs font-medium bg-blckbx-cta text-white hover:bg-opacity-90 transition-colors"
                            title={getMoveButtonText(club.status)}
                          >
                            {getMoveButtonText(club.status)}
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(club.id)}
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
                  {expandedId === club.id && (
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
                              <h4 className="text-sm font-medium text-blckbx-black mb-1">Description</h4>
                              <p className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {club.description || 'No description added'}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-1">Login Notes</h4>
                              <p className="text-sm text-blckbx-black/70 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                {club.login_notes || 'No login notes added'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-2">Contact Details</h4>
                              <div className="text-sm space-y-1 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                <p className="text-blckbx-black/70"><span className="font-medium">Name:</span> {club.contact_name || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Position:</span> {club.contact_position || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Phone:</span> {club.contact_phone || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Email:</span> {club.contact_email || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Website:</span> {club.website || '-'}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blckbx-black mb-2">Commercials</h4>
                              <div className="text-sm space-y-1 bg-white p-3 rounded-lg border border-blckbx-dark-sand">
                                <p className="text-blckbx-black/70"><span className="font-medium">Partnership Link:</span> {club.partnership_link || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Commission:</span> {club.commission || '-'}</p>
                                <p className="text-blckbx-black/70"><span className="font-medium">Rate:</span> {club.commission_rate ? `${club.commission_rate}%` : '-'}</p>
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

      {sortedClubs.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blckbx-dark-sand rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blckbx-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blckbx-black mb-1">No members clubs found</h3>
          <p className="text-blckbx-black/50">
            {searchTerm ? 'Try a different search term' : 'Add your first members club to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
