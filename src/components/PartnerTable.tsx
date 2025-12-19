'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Partner, PartnerStatus } from '@/types';
import { format, differenceInDays } from 'date-fns';

interface PartnerTableProps {
  partners: Partner[];
  currentTab: 'leads' | 'negotiation' | 'signed' | 'all';
  onUpdate: (id: string, updates: Partial<Partner>) => Promise<void>;
  onMove: (id: string, newStatus: PartnerStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSendToCore: (partner: Partner) => Promise<void>;
  isLoading: boolean;
}

type SortField = 'partner_name' | 'lifestyle_category' | 'opportunity_type' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function PartnerTable({
  partners,
  currentTab,
  onUpdate,
  onMove,
  onDelete,
  onSendToCore,
  isLoading,
}: PartnerTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Partner>>({});
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const getNextStatus = (currentStatus: PartnerStatus): PartnerStatus | null => {
    switch (currentStatus) {
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

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setEditData(partner);
  };

  const handleSave = async () => {
    if (editingId && editData) {
      await onUpdate(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCheckboxChange = async (id: string, field: keyof Partner, value: boolean) => {
    await onUpdate(id, { [field]: value });
  };

  const handleMoveClick = async (partner: Partner) => {
    if (partner.status === 'signed') {
      await onSendToCore(partner);
    } else {
      const nextStatus = getNextStatus(partner.status);
      if (nextStatus) {
        await onMove(partner.id, nextStatus);
      }
    }
  };

  const getDaysInPipeline = (partner: Partner): number => {
    const endDate = partner.signed_at ? new Date(partner.signed_at) : new Date();
    return differenceInDays(endDate, new Date(partner.created_at));
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
              <th 
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors"
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
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors"
                onClick={() => handleSort('lifestyle_category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {sortField === 'lifestyle_category' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="p-4 font-medium text-sm">Contact</th>
              <th className="p-4 font-medium text-sm">Position</th>
              <th className="p-4 font-medium text-sm">Email</th>
              <th
                className="p-4 font-medium text-sm cursor-pointer hover:bg-blckbx-cta/80 transition-colors"
                onClick={() => handleSort('opportunity_type')}
              >
                <div className="flex items-center gap-2">
                  Type
                  {sortField === 'opportunity_type' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="p-4 font-medium text-sm">Partnership</th>
              <th className="p-4 font-medium text-sm">Website</th>
              <th className="p-4 font-medium text-sm">Login Notes</th>
              {(currentTab === 'negotiation' || currentTab === 'all') && (
                <>
                  <th className="p-4 font-medium text-sm text-center">Contacted</th>
                  <th className="p-4 font-medium text-sm text-center">Call Booked</th>
                  <th className="p-4 font-medium text-sm text-center">Call Had</th>
                  <th className="p-4 font-medium text-sm text-center">Contract Sent</th>
                </>
              )}
              <th className="p-4 font-medium text-sm">Days</th>
              <th className="p-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedPartners.map((partner, index) => (
                <motion.tr
                  key={partner.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30"
                >
                  {editingId === partner.id ? (
                    // Edit Mode
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.partner_name || ''}
                          onChange={(e) => setEditData({ ...editData, partner_name: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editData.lifestyle_category || ''}
                          onChange={(e) => setEditData({ ...editData, lifestyle_category: e.target.value as Partner['lifestyle_category'] })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        >
                          {['Travel', 'Dining', 'Entertainment', 'Wellness', 'Retail', 'Automotive', 'Property', 'Finance', 'Technology', 'Fashion', 'Other'].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.contact_name || ''}
                          onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.position || ''}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editData.opportunity_type || ''}
                          onChange={(e) => setEditData({ ...editData, opportunity_type: e.target.value as Partner['opportunity_type'] })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        >
                          <option value="Big Ticket">Big Ticket</option>
                          <option value="Everyday">Everyday</option>
                          <option value="Low Hanging">Low Hanging</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={editData.partnership_type || ''}
                          onChange={(e) => setEditData({ ...editData, partnership_type: e.target.value as Partner['partnership_type'] })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        >
                          <option value="Direct">Direct</option>
                          <option value="Affiliate">Affiliate</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="url"
                          value={editData.website || ''}
                          onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editData.login_notes || ''}
                          onChange={(e) => setEditData({ ...editData, login_notes: e.target.value })}
                          className="w-full px-2 py-1 border border-blckbx-dark-sand rounded text-sm bg-white"
                        />
                      </td>
                      {(currentTab === 'negotiation' || currentTab === 'all') && (
                        <>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-center">-</td>
                        </>
                      )}
                      <td className="p-3">-</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            partner.status === 'lead' ? 'bg-blckbx-alert' :
                            partner.status === 'negotiation' ? 'bg-blckbx-cta' :
                            'bg-green-500'
                          }`} />
                          <span className="font-medium text-blckbx-black">{partner.partner_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blckbx-dark-sand text-blckbx-black/70">
                          {partner.lifestyle_category}
                        </span>
                      </td>
                      <td className="p-3 text-blckbx-black/70 text-sm">{partner.contact_name}</td>
                      <td className="p-3 text-blckbx-black/70 text-sm">{partner.position}</td>
                      <td className="p-3">
                        <a 
                          href={`mailto:${partner.email}`} 
                          className="text-blckbx-cta hover:underline text-sm"
                        >
                          {partner.email}
                        </a>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          partner.opportunity_type === 'Big Ticket'
                            ? 'bg-blckbx-cta/10 text-blckbx-cta'
                            : partner.opportunity_type === 'Low Hanging'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blckbx-alert/20 text-orange-700'
                        }`}>
                          {partner.opportunity_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          partner.partnership_type === 'Direct'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {partner.partnership_type}
                        </span>
                      </td>
                      <td className="p-3">
                        {partner.website ? (
                          <a
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blckbx-cta hover:underline text-sm"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-blckbx-black/40 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-blckbx-black/70 text-sm truncate max-w-[150px] block" title={partner.login_notes}>
                          {partner.login_notes || '-'}
                        </span>
                      </td>
                      {(currentTab === 'negotiation' || currentTab === 'all') && (
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
                            onClick={() => handleEdit(partner)}
                            className="p-1.5 rounded bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black hover:text-white transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          
                          {partner.partnership_link && (
                            <a
                              href={partner.partnership_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black hover:text-white transition-colors"
                              title="Visit website"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          
                          <button
                            onClick={() => handleMoveClick(partner)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              partner.status === 'signed'
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-blckbx-cta text-white hover:bg-blckbx-cta/80'
                            }`}
                            title={getMoveButtonText(partner.status)}
                          >
                            {partner.status === 'signed' ? 'Send to Core' : 
                             partner.status === 'lead' ? 'To Negotiation' : 'To Signed'}
                          </button>
                          
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
                    </>
                  )}
                </motion.tr>
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
