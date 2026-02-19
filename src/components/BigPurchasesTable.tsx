'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { BigPurchase, BigPurchaseCategory, BigPurchaseStatus, Partner } from '@/types';

type StatusFilter = 'all' | BigPurchaseStatus;

interface BigPurchasesTableProps {
  purchases: BigPurchase[];
  partners: Partner[];
  isLoading: boolean;
  onUpdate: (id: string, updates: Partial<BigPurchase>) => Promise<void>;
  onMoveToPotential: (purchase: BigPurchase) => Promise<void>;
}

const categoryOptions: BigPurchaseCategory[] = [
  'Hotel',
  'Restaurant',
  'Wellness',
  'Retail',
  'Travel',
  'Gifting',
  'Other',
];

const statusOptions: BigPurchaseStatus[] = ['flagged', 'purchased'];

const getCategoryBadgeStyle = (category: BigPurchaseCategory): string => {
  switch (category) {
    case 'Hotel':
      return 'bg-sky-100 text-sky-700';
    case 'Restaurant':
      return 'bg-orange-100 text-orange-700';
    case 'Wellness':
      return 'bg-emerald-100 text-emerald-700';
    case 'Retail':
      return 'bg-indigo-100 text-indigo-700';
    case 'Travel':
      return 'bg-blue-100 text-blue-700';
    case 'Gifting':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-blckbx-dark-sand text-blckbx-black/70';
  }
};

export default function BigPurchasesTable({
  purchases,
  partners,
  isLoading,
  onUpdate,
  onMoveToPotential,
}: BigPurchasesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPurchase, setSelectedPurchase] = useState<BigPurchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const filteredPurchases = useMemo(() => {
    const byStatus =
      statusFilter === 'all'
        ? purchases
        : purchases.filter((purchase) => purchase.status === statusFilter);

    return byStatus.filter((purchase) => {
      const needle = searchTerm.toLowerCase();
      const partnerName = (purchase.partner_name || '').toLowerCase();
      const poc = (purchase.poc || '').toLowerCase();
      const category = (purchase.category || '').toLowerCase();
      return (
        partnerName.includes(needle) ||
        poc.includes(needle) ||
        category.includes(needle)
      );
    });
  }, [purchases, searchTerm, statusFilter]);

  const closeModal = () => {
    setSelectedPurchase(null);
  };

  const handleInvoicedToggle = async (purchase: BigPurchase, checked: boolean) => {
    await onUpdate(purchase.id, { invoiced: checked });
  };

  const handleModalSave = async () => {
    if (!selectedPurchase) return;
    setIsSaving(true);
    try {
      await onUpdate(selectedPurchase.id, {
        poc: selectedPurchase.poc,
        amount_to_invoice: selectedPurchase.amount_to_invoice,
        purchase_date: selectedPurchase.purchase_date,
        category: selectedPurchase.category,
        commission_notes: selectedPurchase.commission_notes,
        status: selectedPurchase.status,
        invoiced: selectedPurchase.invoiced,
        partner_id: selectedPurchase.partner_id,
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToPotential = async () => {
    if (!selectedPurchase) return;
    const alreadyInPipeline = !!selectedPurchase.partner_id || !!selectedPurchase.moved_to_potential;
    if (alreadyInPipeline) return;
    setIsMoving(true);
    try {
      await onMoveToPotential(selectedPurchase);
      closeModal();
    } finally {
      setIsMoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-blckbx-dark-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blckbx-cta border-t-transparent rounded-full animate-spin" />
          <p className="text-blckbx-black/60">Loading big purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-blckbx-dark-sand overflow-hidden">
        <div className="p-4 border-b border-blckbx-dark-sand flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            {(['all', 'flagged', 'purchased'] as StatusFilter[]).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors border ${
                    active
                      ? 'bg-blckbx-cta/20 border-blckbx-cta/40 text-blckbx-black font-semibold'
                      : 'bg-blckbx-dark-sand/60 border-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-dark-sand'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blckbx-black/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9 pr-3 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/50 text-blckbx-black placeholder-blckbx-black/40 w-64 focus:border-blckbx-cta"
              />
            </div>
            <span className="text-sm text-blckbx-black/60">{filteredPurchases.length} purchases</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="text-left border-b border-blckbx-dark-sand bg-blckbx-dark-sand">
                <th className="p-4 text-sm font-medium text-blckbx-black">Partner Name</th>
                <th className="p-4 text-sm font-medium text-blckbx-black">POC</th>
                <th className="p-4 text-sm font-medium text-blckbx-black">Amount</th>
                <th className="p-4 text-sm font-medium text-blckbx-black">Purchase Date</th>
                <th className="p-4 text-sm font-medium text-blckbx-black">Category</th>
                <th className="p-4 text-sm font-medium text-blckbx-black">Status</th>
                <th className="p-4 text-sm font-medium text-blckbx-black text-center">Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase, index) => (
                <motion.tr
                  key={purchase.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-blckbx-dark-sand/50 hover:bg-blckbx-sand/30 cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-blckbx-sand/20'
                  }`}
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  <td className="p-4 text-sm text-blckbx-black">
                    <div className="flex items-center gap-2">
                      <span>{purchase.partner_name}</span>
                      {(purchase.moved_to_potential || purchase.partner_id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          In Pipeline
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-blckbx-black/70">{purchase.poc || '-'}</td>
                  <td className="p-4 text-sm text-blckbx-black/70">
                    {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(
                      Number(purchase.estimated_amount || 0)
                    )}
                  </td>
                  <td className="p-4 text-sm text-blckbx-black/70">
                    {purchase.purchase_date ? format(new Date(purchase.purchase_date), 'dd MMM yyyy') : '-'}
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeStyle(purchase.category)}`}>
                      {purchase.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        purchase.status === 'flagged'
                          ? 'bg-[#D4A843]/20 text-[#D4A843]'
                          : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {purchase.status}
                    </span>
                  </td>
                  <td className="p-4 text-center" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!purchase.invoiced}
                      onChange={(event) => void handleInvoicedToggle(purchase, event.target.checked)}
                      className="custom-checkbox"
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPurchases.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-blckbx-black/50">{searchTerm ? 'No purchases match your search' : 'No big purchases found'}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPurchase && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-2xl bg-[#232427] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-[#1C1D1F] flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl text-[#F5F3F0]">Edit Big Purchase</h2>
                    <p className="text-sm text-[#F5F3F0]/60 mt-0.5">{selectedPurchase.partner_name}</p>
                  </div>
                  <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/10 text-[#F5F3F0]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Partner Name</label>
                      <input
                        type="text"
                        value={selectedPurchase.partner_name}
                        readOnly
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]/80"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">POC</label>
                      <input
                        type="text"
                        value={selectedPurchase.poc}
                        onChange={(event) =>
                          setSelectedPurchase((prev) => (prev ? { ...prev, poc: event.target.value } : prev))
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Estimated Amount</label>
                      <input
                        type="text"
                        value={new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: 'GBP',
                          maximumFractionDigits: 0,
                        }).format(Number(selectedPurchase.estimated_amount || 0))}
                        readOnly
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]/80"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Amount to Invoice</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedPurchase.amount_to_invoice ?? ''}
                        onChange={(event) =>
                          setSelectedPurchase((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  amount_to_invoice:
                                    event.target.value === '' ? null : Number(event.target.value),
                                }
                              : prev
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={selectedPurchase.purchase_date ? selectedPurchase.purchase_date.slice(0, 10) : ''}
                        onChange={(event) =>
                          setSelectedPurchase((prev) => (prev ? { ...prev, purchase_date: event.target.value } : prev))
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Category</label>
                      <select
                        value={selectedPurchase.category}
                        onChange={(event) =>
                          setSelectedPurchase((prev) =>
                            prev ? { ...prev, category: event.target.value as BigPurchaseCategory } : prev
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Commission Notes</label>
                      <textarea
                        rows={3}
                        value={selectedPurchase.commission_notes || ''}
                        onChange={(event) =>
                          setSelectedPurchase((prev) =>
                            prev ? { ...prev, commission_notes: event.target.value } : prev
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0] resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Status</label>
                      <select
                        value={selectedPurchase.status}
                        onChange={(event) =>
                          setSelectedPurchase((prev) =>
                            prev ? { ...prev, status: event.target.value as BigPurchaseStatus } : prev
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F3F0] mb-1">Linked Partner</label>
                      <select
                        value={selectedPurchase.partner_id || ''}
                        onChange={(event) =>
                          setSelectedPurchase((prev) =>
                            prev ? { ...prev, partner_id: event.target.value || null } : prev
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#F5F3F0]"
                      >
                        <option value="">Unlinked</option>
                        {partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.partner_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-sm text-[#F5F3F0]">
                        <input
                          type="checkbox"
                          checked={!!selectedPurchase.invoiced}
                          onChange={(event) =>
                            setSelectedPurchase((prev) =>
                              prev ? { ...prev, invoiced: event.target.checked } : prev
                            )
                          }
                          className="custom-checkbox"
                        />
                        Invoiced
                      </label>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void handleMoveToPotential()}
                    disabled={isMoving || !!selectedPurchase.partner_id || !!selectedPurchase.moved_to_potential}
                    className="px-4 py-2.5 rounded-lg bg-[#D4A843] text-[#1C1D1F] font-semibold hover:brightness-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMoving
                      ? 'Moving...'
                      : selectedPurchase.partner_id || selectedPurchase.moved_to_potential
                      ? 'Already in Pipeline'
                      : 'Move to Potential Leads'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2.5 rounded-lg border border-white/20 text-[#F5F3F0] hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModalSave()}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-lg bg-[#D4A843] text-[#1C1D1F] font-semibold hover:brightness-95 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
