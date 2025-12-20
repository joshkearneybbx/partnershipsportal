'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Partner, PartnerStatus, OpportunityType, PartnershipType, LifestyleCategory, PartnerTier, UseForTag, LifecycleStage } from '@/types';

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (partner: Omit<Partner, 'id' | 'created' | 'updated'>) => Promise<void>;
  defaultStatus: PartnerStatus;
}

const lifestyleCategories: LifestyleCategory[] = [
  'Travel',
  'Hotels',
  'Supermarkets',
  'Restaurants',
  'Trades',
  'Misc',
  'Childcare',
  'Kids + Family',
  'Services',
  'Eldercare',
  'Taxis',
  'Flowers',
  'Department Store',
  'Affiliates',
  'Beauty',
  'Retail',
  'Jewellery',
  'Cars',
  'Electronics',
  'Home',
  'Health + Fitness',
];

const partnerTiers: PartnerTier[] = ['Preferred', 'Standard', 'Test'];
const useForTags: UseForTag[] = ['Last-minute', 'VIP/HNW', 'Best value', 'International', 'Gifting'];
const lifecycleStages: LifecycleStage[] = ['New', 'Growing', 'Mature', 'At Risk'];

export default function AddPartnerModal({ isOpen, onClose, onAdd, defaultStatus }: AddPartnerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    partner_name: '',
    lifestyle_category: 'Misc' as LifestyleCategory,
    contact_name: '',
    contact_position: '',
    contact_phone: '',
    contact_email: '',
    opportunity_type: 'Everyday' as OpportunityType,
    partnership_type: 'Direct' as PartnershipType,
    partnership_link: '',
    website: '',
    login_notes: '',
    status: defaultStatus,
    // New classification fields
    partner_tier: 'Standard' as PartnerTier,
    use_for_tags: [] as UseForTag[],
    lifecycle_stage: 'New' as LifecycleStage,
    is_default: false,
    // New detail fields
    partner_brief: '',
    when_not_to_use: '',
    sla_notes: '',
    // Negotiation
    contacted: false,
    call_booked: false,
    call_had: false,
    contract_sent: false,
    signed_at: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onAdd(formData);
      setFormData({
        partner_name: '',
        lifestyle_category: 'Misc',
        contact_name: '',
        contact_position: '',
        contact_phone: '',
        contact_email: '',
        opportunity_type: 'Everyday',
        partnership_type: 'Direct',
        partnership_link: '',
        website: '',
        login_notes: '',
        status: defaultStatus,
        partner_tier: 'Standard',
        use_for_tags: [],
        lifecycle_stage: 'New',
        is_default: false,
        partner_brief: '',
        when_not_to_use: '',
        sla_notes: '',
        contacted: false,
        call_booked: false,
        call_had: false,
        contract_sent: false,
        signed_at: null,
      });
    } catch (error) {
      console.error('Error adding partner:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleTagToggle = (tag: UseForTag) => {
    setFormData((prev) => ({
      ...prev,
      use_for_tags: prev.use_for_tags.includes(tag)
        ? prev.use_for_tags.filter((t) => t !== tag)
        : [...prev.use_for_tags, tag],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-blckbx-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-blckbx-black text-blckbx-sand px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold">Add New Partner</h2>
                  <p className="text-blckbx-sand/60 text-sm mt-0.5">Fill in the partner details below</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-2 gap-4">
                  {/* Partner Name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Partner Name *
                    </label>
                    <input
                      type="text"
                      name="partner_name"
                      value={formData.partner_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., Soho House"
                    />
                  </div>

                  {/* Lifestyle Category */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Lifestyle Category *
                    </label>
                    <select
                      name="lifestyle_category"
                      value={formData.lifestyle_category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    >
                      {lifestyleCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Opportunity Type */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Opportunity Type *
                    </label>
                    <select
                      name="opportunity_type"
                      value={formData.opportunity_type}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    >
                      <option value="Big Ticket">Big Ticket</option>
                      <option value="Everyday">Everyday</option>
                      <option value="Low Hanging">Low Hanging</option>
                    </select>
                  </div>

                  {/* Partnership Type */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Partnership Type *
                    </label>
                    <select
                      name="partnership_type"
                      value={formData.partnership_type}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black focus:border-blckbx-cta"
                    >
                      <option value="Direct">Direct</option>
                      <option value="Affiliate">Affiliate</option>
                    </select>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., https://partner.com"
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., James Wilson"
                    />
                  </div>

                  {/* Contact Position */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      name="contact_position"
                      value={formData.contact_position}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., Partnership Director"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., +44 7700 900123"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., james@sohohouse.com"
                    />
                  </div>

                  {/* Partnership Link */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Partnership Link
                    </label>
                    <input
                      type="url"
                      name="partnership_link"
                      value={formData.partnership_link}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., https://affiliate.link"
                    />
                  </div>

                  {/* Login Notes */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Login Notes
                    </label>
                    <input
                      type="text"
                      name="login_notes"
                      value={formData.login_notes}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., Portal login credentials"
                    />
                  </div>

                  {/* SLA Notes */}
                  <div>
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      SLA Notes
                    </label>
                    <input
                      type="text"
                      name="sla_notes"
                      value={formData.sla_notes}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta"
                      placeholder="e.g., 24hr response time"
                    />
                  </div>

                  {/* Partner Classification Section */}
                  <div className="col-span-2 border-t border-blckbx-dark-sand pt-4 mt-2">
                    <p className="text-sm font-medium text-blckbx-black mb-3">Partner Classification</p>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Partner Tier */}
                      <div>
                        <label className="block text-xs font-medium text-blckbx-black/70 mb-1">
                          Tier
                        </label>
                        <select
                          name="partner_tier"
                          value={formData.partner_tier}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black text-sm focus:border-blckbx-cta"
                        >
                          {partnerTiers.map((tier) => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lifecycle Stage */}
                      <div>
                        <label className="block text-xs font-medium text-blckbx-black/70 mb-1">
                          Lifecycle Stage
                        </label>
                        <select
                          name="lifecycle_stage"
                          value={formData.lifecycle_stage}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black text-sm focus:border-blckbx-cta"
                        >
                          {lifecycleStages.map((stage) => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>

                      {/* Is Default */}
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            name="is_default"
                            checked={formData.is_default}
                            onChange={handleChange}
                            className="custom-checkbox"
                          />
                          <span className="text-sm text-blckbx-black">Use First (Default)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Use For Tags */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-2">
                      Use For Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {useForTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            formData.use_for_tags.includes(tag)
                              ? 'bg-blckbx-cta text-white'
                              : 'bg-blckbx-dark-sand text-blckbx-black/70 hover:bg-blckbx-black/10'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Partner Brief */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Partner Brief
                    </label>
                    <textarea
                      name="partner_brief"
                      value={formData.partner_brief}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-blckbx-sand/30 text-blckbx-black placeholder-blckbx-black/40 focus:border-blckbx-cta resize-none"
                      placeholder="Brief description about this partner..."
                    />
                  </div>

                  {/* When Not To Use */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      When Not To Use
                    </label>
                    <textarea
                      name="when_not_to_use"
                      value={formData.when_not_to_use}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-blckbx-dark-sand rounded-lg bg-red-50 text-blckbx-black placeholder-blckbx-black/40 focus:border-red-400 resize-none"
                      placeholder="Important warnings or restrictions..."
                    />
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blckbx-black mb-1">
                      Initial Status
                    </label>
                    <div className="flex gap-3">
                      {(['lead', 'negotiation', 'signed'] as PartnerStatus[]).map((status) => (
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
                          <span
                            className={`w-3 h-3 rounded-full ${
                              status === 'lead'
                                ? 'bg-blckbx-alert'
                                : status === 'negotiation'
                                ? 'bg-blckbx-cta'
                                : 'bg-green-500'
                            }`}
                          />
                          <span className="font-medium capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Negotiation Checkboxes */}
                  {(formData.status === 'negotiation' || formData.status === 'signed') && (
                    <div className="col-span-2 p-4 bg-blckbx-sand/50 rounded-lg">
                      <p className="text-sm font-medium text-blckbx-black mb-3">Negotiation Progress</p>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { name: 'contacted', label: 'Contacted' },
                          { name: 'call_booked', label: 'Call Booked' },
                          { name: 'call_had', label: 'Call Had' },
                          { name: 'contract_sent', label: 'Contract Sent' },
                        ].map((item) => (
                          <label key={item.name} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name={item.name}
                              checked={formData[item.name as keyof typeof formData] as boolean}
                              onChange={handleChange}
                              className="custom-checkbox"
                            />
                            <span className="text-sm text-blckbx-black/70">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-blckbx-dark-sand">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg border border-blckbx-dark-sand text-blckbx-black hover:bg-blckbx-dark-sand transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-blckbx-cta text-white font-medium hover:bg-blckbx-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Partner
                      </>
                    )}
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
