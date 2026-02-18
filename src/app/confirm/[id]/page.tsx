'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

const categories = ['Hotel', 'Restaurant', 'Wellness', 'Retail', 'Travel', 'Gifting', 'Other'] as const;

type PageState =
  | 'loading'
  | 'ready'
  | 'not_found'
  | 'expired'
  | 'already_purchased'
  | 'success'
  | 'error';

interface PurchaseFormData {
  partner_name: string;
  poc: string;
  estimated_amount: number | '';
  purchase_date: string;
  category: string;
}

const emptyForm: PurchaseFormData = {
  partner_name: '',
  poc: '',
  estimated_amount: '',
  purchase_date: '',
  category: 'Other',
};

export default function ConfirmPurchasePage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (typeof params?.id === 'string' ? params.id : ''), [params]);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [formData, setFormData] = useState<PurchaseFormData>(emptyForm);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPurchase = useCallback(async () => {
    if (!id) return;

    setPageState('loading');
    setMessage('');

    try {
      const response = await fetch(`/api/confirm/${id}`, { cache: 'no-store' });
      const payload = await response.json();

      if (payload.state === 'ready' && payload.record) {
        setFormData({
          partner_name: payload.record.partner_name || '',
          poc: payload.record.poc || '',
          estimated_amount: Number.isFinite(payload.record.estimated_amount)
            ? payload.record.estimated_amount
            : '',
          purchase_date: payload.record.purchase_date || '',
          category: payload.record.category || 'Other',
        });
        setPageState('ready');
        return;
      }

      if (payload.state === 'not_found') {
        setPageState('not_found');
        setMessage(payload.message || "This purchase doesn't exist");
        return;
      }

      if (payload.state === 'expired') {
        setPageState('expired');
        setMessage(payload.message || 'This link has expired — please contact the partnerships team.');
        return;
      }

      if (payload.state === 'already_purchased') {
        setPageState('already_purchased');
        setMessage(payload.message || 'This purchase has already been confirmed ✅');
        return;
      }

      setPageState('error');
      setMessage(payload.message || 'Something went wrong while loading this purchase.');
    } catch {
      setPageState('error');
      setMessage('Something went wrong while loading this purchase.');
    }
  }, [id]);

  useEffect(() => {
    void loadPurchase();
  }, [loadPurchase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`/api/confirm/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimated_amount: Number(formData.estimated_amount),
        }),
      });
      const payload = await response.json();

      if (payload.state === 'success') {
        setPageState('success');
        setMessage(payload.message || 'Purchase confirmed ✅ — the partnerships team has been notified.');
        return;
      }

      if (payload.state === 'not_found') {
        setPageState('not_found');
        setMessage(payload.message || "This purchase doesn't exist");
        return;
      }

      if (payload.state === 'expired') {
        setPageState('expired');
        setMessage(payload.message || 'This link has expired — please contact the partnerships team.');
        return;
      }

      if (payload.state === 'already_purchased') {
        setPageState('already_purchased');
        setMessage(payload.message || 'This purchase has already been confirmed ✅');
        return;
      }

      setMessage(payload.message || 'Unable to confirm purchase. Please try again.');
    } catch {
      setMessage('Unable to confirm purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1C1D1F] text-[#F5F3F0] px-4 py-10 sm:py-16">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-[#D4A843] flex items-center justify-center">
            <span className="font-display text-xl font-bold text-white">B</span>
          </div>
          <div>
            <p className="font-display text-2xl leading-none">BlckBx</p>
            <p className="text-xs text-[#F5F3F0]/70 mt-1">Purchase Confirmation</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#232427] p-6 sm:p-7 shadow-xl">
          {pageState === 'loading' && <p className="text-[#F5F3F0]/80">Loading purchase...</p>}

          {pageState === 'not_found' && <p className="text-lg">{message || "This purchase doesn't exist"}</p>}

          {pageState === 'expired' && (
            <p className="text-lg">{message || 'This link has expired — please contact the partnerships team.'}</p>
          )}

          {pageState === 'already_purchased' && (
            <p className="text-lg">{message || 'This purchase has already been confirmed ✅'}</p>
          )}

          {pageState === 'success' && (
            <p className="text-lg text-[#D4A843]">
              {message || 'Purchase confirmed ✅ — the partnerships team has been notified.'}
            </p>
          )}

          {pageState === 'error' && <p className="text-lg text-red-300">{message || 'Something went wrong.'}</p>}

          {pageState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="font-display text-3xl">Confirm Purchase</h1>
              <p className="text-[#F5F3F0]/70 text-sm">
                Review and adjust the details below before confirming this purchase.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1.5">Partner Name</label>
                <input
                  type="text"
                  value={formData.partner_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, partner_name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/15 bg-[#2B2D31] px-4 py-2.5 text-[#F5F3F0] placeholder:text-[#F5F3F0]/35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">POC</label>
                <input
                  type="text"
                  value={formData.poc}
                  onChange={(e) => setFormData((prev) => ({ ...prev, poc: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/15 bg-[#2B2D31] px-4 py-2.5 text-[#F5F3F0] placeholder:text-[#F5F3F0]/35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Estimated Amount £</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      estimated_amount: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  required
                  className="w-full rounded-lg border border-white/15 bg-[#2B2D31] px-4 py-2.5 text-[#F5F3F0] placeholder:text-[#F5F3F0]/35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/15 bg-[#2B2D31] px-4 py-2.5 text-[#F5F3F0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/15 bg-[#2B2D31] px-4 py-2.5 text-[#F5F3F0]"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {message && <p className="text-sm text-red-300">{message}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#D4A843] text-[#1C1D1F] font-semibold py-2.5 hover:brightness-95 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Purchase'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
