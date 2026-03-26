'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/contexts/ToastContext';
import { MembersClub, PartnerStatus } from '@/types';

interface AddMembersClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (club: Omit<MembersClub, 'id' | 'created' | 'updated'>) => Promise<void>;
  onEdit?: (id: string, updates: Partial<MembersClub>) => Promise<void>;
  editClub?: MembersClub | null;
  defaultStatus: PartnerStatus;
}

const getEmptyFormData = (defaultStatus: PartnerStatus) => ({
  club_name: '',
  description: '',
  status: defaultStatus,
  contact_name: '',
  contact_position: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  login_notes: '',
  commission: '',
  has_commission: false,
  commission_rate: 0,
  partnership_link: '',
  contacted: false,
  call_booked: false,
  call_had: false,
  contract_sent: false,
  contract_signed: false,
  lead_date: null as string | null,
  signed_at: null as string | null,
});

export default function AddMembersClubModal({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  editClub,
  defaultStatus,
}: AddMembersClubModalProps) {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData(defaultStatus));

  const isEditMode = !!editClub;

  useEffect(() => {
    if (!isOpen) return;

    if (editClub) {
      setFormData({
        club_name: editClub.club_name || '',
        description: editClub.description || '',
        status: editClub.status || defaultStatus,
        contact_name: editClub.contact_name || '',
        contact_position: editClub.contact_position || '',
        contact_phone: editClub.contact_phone || '',
        contact_email: editClub.contact_email || '',
        website: editClub.website || '',
        login_notes: editClub.login_notes || '',
        commission: editClub.commission || '',
        has_commission: editClub.has_commission || (!!editClub.commission && editClub.commission.trim() !== ''),
        commission_rate: editClub.commission_rate ?? 0,
        partnership_link: editClub.partnership_link || '',
        contacted: editClub.contacted || false,
        call_booked: editClub.call_booked || false,
        call_had: editClub.call_had || false,
        contract_sent: editClub.contract_sent || false,
        contract_signed: editClub.contract_signed || false,
        lead_date: editClub.lead_date || null,
        signed_at: editClub.signed_at || null,
      });
    } else {
      setFormData(getEmptyFormData(defaultStatus));
    }
  }, [isOpen, editClub, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        commission: formData.has_commission ? formData.commission : '',
        commission_rate: formData.has_commission ? formData.commission_rate : 0,
      };

      if (isEditMode && editClub && onEdit) {
        await onEdit(editClub.id, submissionData);
        showSuccess(`Members club "${formData.club_name}" updated successfully`);
      } else {
        await onAdd(submissionData);
        showSuccess(`Members club "${formData.club_name}" added successfully`);
      }
      onClose();
    } catch (error) {
      console.error('Error saving members club:', error);
      showError(isEditMode ? 'Failed to update members club. Please try again.' : 'Failed to add members club. Please try again.');
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
                    {isEditMode ? 'Edit Members Club' : 'Add New Members Club'}
                  </h2>
                  <p className="text-blckbx-sand/60 text-sm mt-0.5">
                    {isEditMode ? `Editing ${editClub?.club_name}` : 'Fill in the members club details below'}
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
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Club Name *</label>
                    <input
                      type="text"
                      name="club_name"
                      value={formData.club_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                      placeholder="e.g., Annabel's"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black resize-none focus:border-blckbx-cta"
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Partnership Link</label>
                    <input
                      type="url"
                      name="partnership_link"
                      value={formData.partnership_link}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">Login Notes</label>
                    <textarea
                      name="login_notes"
                      value={formData.login_notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black resize-none focus:border-blckbx-cta"
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
                      <span className="text-sm font-medium text-blckbx-black">Commission earned on this club</span>
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
                          />
                        </div>
                      </div>
                    )}
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
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Members Club'}
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
