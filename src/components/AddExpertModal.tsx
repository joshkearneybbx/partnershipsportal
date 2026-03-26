'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/contexts/ToastContext';
import { Expert, LifecycleStage, PartnerStatus, PartnerTier } from '@/types';

interface AddExpertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expert: Omit<Expert, 'id' | 'created' | 'updated'>) => Promise<void>;
  onEdit?: (id: string, updates: Partial<Expert>) => Promise<void>;
  editExpert?: Expert | null;
  defaultStatus: PartnerStatus;
}

const partnerTiers: PartnerTier[] = ['Preferred', 'Standard', 'Test'];
const lifecycleStages: LifecycleStage[] = ['New', 'Growing', 'Mature', 'At Risk'];

const getEmptyFormData = (defaultStatus: PartnerStatus) => ({
  expert_name: '',
  expertise: '',
  expert_category: '',
  status: defaultStatus,
  webinar_instructions: '',
  website: '',
  commission: '',
  has_commission: false,
  commission_rate: 0,
  partner_tier: 'Standard' as PartnerTier,
  lifecycle_stage: 'New' as LifecycleStage,
  is_default: false,
  contacted: false,
  call_booked: false,
  call_had: false,
  contract_sent: false,
  contract_signed: false,
  lead_date: null as string | null,
  signed_at: null as string | null,
  contact_name: '',
  contact_position: '',
  contact_phone: '',
  contact_email: '',
});

export default function AddExpertModal({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  editExpert,
  defaultStatus,
}: AddExpertModalProps) {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData(defaultStatus));

  const isEditMode = !!editExpert;

  useEffect(() => {
    if (!isOpen) return;

    if (editExpert) {
      setFormData({
        expert_name: editExpert.expert_name || '',
        expertise: editExpert.expertise || '',
        expert_category: editExpert.expert_category || '',
        status: editExpert.status || defaultStatus,
        webinar_instructions: editExpert.webinar_instructions || '',
        website: editExpert.website || '',
        commission: editExpert.commission || '',
        has_commission: editExpert.has_commission || (!!editExpert.commission && editExpert.commission.trim() !== ''),
        commission_rate: editExpert.commission_rate ?? 0,
        partner_tier: editExpert.partner_tier || 'Standard',
        lifecycle_stage: editExpert.lifecycle_stage || 'New',
        is_default: editExpert.is_default || false,
        contacted: editExpert.contacted || false,
        call_booked: editExpert.call_booked || false,
        call_had: editExpert.call_had || false,
        contract_sent: editExpert.contract_sent || false,
        contract_signed: editExpert.contract_signed || false,
        lead_date: editExpert.lead_date || null,
        signed_at: editExpert.signed_at || null,
        contact_name: editExpert.contact_name || '',
        contact_position: editExpert.contact_position || '',
        contact_phone: editExpert.contact_phone || '',
        contact_email: editExpert.contact_email || '',
      });
    } else {
      setFormData(getEmptyFormData(defaultStatus));
    }
  }, [isOpen, editExpert, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        commission: formData.has_commission ? formData.commission : '',
        commission_rate: formData.has_commission ? formData.commission_rate : 0,
      };

      if (isEditMode && editExpert && onEdit) {
        await onEdit(editExpert.id, submissionData);
        showSuccess(`Expert "${formData.expert_name}" updated successfully`);
      } else {
        await onAdd(submissionData);
        showSuccess(`Expert "${formData.expert_name}" added successfully`);
      }
      onClose();
    } catch (error) {
      console.error('Error saving expert:', error);
      showError(isEditMode ? 'Failed to update expert. Please try again.' : 'Failed to add expert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? value === ''
            ? 0
            : Number(value)
          : value,
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-blckbx-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="bg-blckbx-black text-blckbx-sand px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    {isEditMode ? 'Edit Expert' : 'Add New Expert'}
                  </h2>
                  <p className="text-blckbx-sand/60 text-sm mt-0.5">
                    {isEditMode ? `Editing ${editExpert?.expert_name}` : 'Fill in the expert details below'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Expert Name *</label>
                    <input
                      type="text"
                      name="expert_name"
                      value={formData.expert_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                      placeholder="e.g., Jane Smith"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Expertise</label>
                    <textarea
                      name="expertise"
                      value={formData.expertise}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black resize-none focus:border-blckbx-cta"
                      placeholder="e.g., Private aviation expert with UHNW network"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Expert Category</label>
                    <input
                      type="text"
                      name="expert_category"
                      value={formData.expert_category}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                      placeholder="e.g., Travel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                      placeholder="https://expert.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Webinar Instructions</label>
                    <textarea
                      name="webinar_instructions"
                      value={formData.webinar_instructions}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black resize-none focus:border-blckbx-cta"
                      placeholder="Preparation notes, joining links, or delivery instructions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Contact Name</label>
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Position</label>
                    <input
                      type="text"
                      name="contact_position"
                      value={formData.contact_position}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Contact Email</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        name="has_commission"
                        checked={formData.has_commission}
                        onChange={handleChange}
                        className="custom-checkbox"
                      />
                      <span className="text-sm font-medium text-blckbx-black">Commission earned on this expert</span>
                    </label>
                    {formData.has_commission && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blckbx-black mb-1">Commission Rate (%)</label>
                          <input
                            type="number"
                            name="commission_rate"
                            value={formData.commission_rate}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blckbx-black mb-1">Commission Notes</label>
                          <input
                            type="text"
                            name="commission"
                            value={formData.commission}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                            placeholder="e.g., 10% revenue share"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 border-t border-blckbx-dark-sand pt-4 mt-2">
                    <p className="text-sm font-medium text-blckbx-black mb-3">Classification</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-blckbx-black/70 mb-1">Partner Tier</label>
                        <select
                          name="partner_tier"
                          value={formData.partner_tier}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-sm text-blckbx-black focus:border-blckbx-cta"
                        >
                          {partnerTiers.map((tier) => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blckbx-black/70 mb-1">Lifecycle Stage</label>
                        <select
                          name="lifecycle_stage"
                          value={formData.lifecycle_stage}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-sm text-blckbx-black focus:border-blckbx-cta"
                        >
                          {lifecycleStages.map((stage) => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            name="is_default"
                            checked={formData.is_default}
                            onChange={handleChange}
                            className="custom-checkbox"
                          />
                          <span className="text-sm text-blckbx-black">Use First</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      {isEditMode ? 'Status' : 'Initial Status'}
                    </label>
                    <div className="flex gap-3">
                      {(['contacted', 'lead', 'negotiation', 'signed'] as PartnerStatus[]).map((status) => (
                        <label
                          key={status}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.status === status
                              ? 'border-blckbx-cta bg-blckbx-cta/10 text-blckbx-cta'
                              : 'border-blckbx-dark-sand hover:border-blckbx-black/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={formData.status === status}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span className="capitalize text-sm font-medium">{status === 'lead' ? 'Leads' : status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg border border-blckbx-dark-sand text-blckbx-black hover:bg-blckbx-sand/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-blckbx-cta text-white font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Expert'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
