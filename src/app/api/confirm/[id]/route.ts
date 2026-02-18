import { NextRequest, NextResponse } from 'next/server';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://pocketbase.blckbx.co.uk';
const COLLECTION = 'big_purchases';
const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
const CATEGORIES = ['Hotel', 'Restaurant', 'Wellness', 'Retail', 'Travel', 'Gifting', 'Other'] as const;

type PurchaseCategory = (typeof CATEGORIES)[number];

interface ResolvedFields {
  partnerName: string;
  poc: string;
  estimatedAmount: string;
  purchaseDate: string;
  category: string;
  status: string;
}

const fallbackFieldNames: ResolvedFields = {
  partnerName: 'partner_name',
  poc: 'poc',
  estimatedAmount: 'estimated_amount',
  purchaseDate: 'purchase_date',
  category: 'category',
  status: 'status',
};

const pickExistingField = (record: Record<string, unknown>, candidates: string[], fallback: string): string =>
  candidates.find((key) => key in record) || fallback;

const resolveFields = (record: Record<string, unknown>): ResolvedFields => ({
  partnerName: pickExistingField(record, ['partner_name', 'partnerName', 'partner'], fallbackFieldNames.partnerName),
  poc: pickExistingField(record, ['poc', 'POC', 'point_of_contact'], fallbackFieldNames.poc),
  estimatedAmount: pickExistingField(
    record,
    ['estimated_amount', 'estimated_amount_gbp', 'estimatedAmount'],
    fallbackFieldNames.estimatedAmount
  ),
  purchaseDate: pickExistingField(record, ['purchase_date', 'purchaseDate', 'date'], fallbackFieldNames.purchaseDate),
  category: pickExistingField(record, ['category'], fallbackFieldNames.category),
  status: pickExistingField(record, ['status'], fallbackFieldNames.status),
});

const getString = (value: unknown): string => (typeof value === 'string' ? value : '');
const getNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normaliseForClient = (record: Record<string, unknown>) => {
  const fields = resolveFields(record);
  const rawDate = getString(record[fields.purchaseDate]);
  const dateValue = rawDate ? new Date(rawDate) : null;

  return {
    id: getString(record.id),
    created: getString(record.created),
    status: getString(record[fields.status]),
    partner_name: getString(record[fields.partnerName]),
    poc: getString(record[fields.poc]),
    estimated_amount: getNumber(record[fields.estimatedAmount]),
    purchase_date:
      dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue.toISOString().slice(0, 10) : '',
    category: getString(record[fields.category]),
  };
};

const isExpiredFlaggedRecord = (record: ReturnType<typeof normaliseForClient>): boolean => {
  if (record.status !== 'flagged' || !record.created) return false;
  const createdAt = new Date(record.created);
  if (Number.isNaN(createdAt.getTime())) return false;
  return Date.now() - createdAt.getTime() > THREE_WEEKS_MS;
};

const fetchPocketBaseRecord = async (id: string) => {
  const response = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION}/records/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  return response;
};

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const response = await fetchPocketBaseRecord(id);

    if (response.status === 404) {
      return NextResponse.json({ state: 'not_found', message: "This purchase doesn't exist" }, { status: 404 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { state: 'error', message: `Failed to load purchase (${response.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const record = normaliseForClient(await response.json());

    if (record.status === 'purchased') {
      return NextResponse.json({ state: 'already_purchased', message: 'This purchase has already been confirmed ✅' });
    }

    if (isExpiredFlaggedRecord(record)) {
      return NextResponse.json({
        state: 'expired',
        message: 'This link has expired — please contact the partnerships team.',
      });
    }

    if (record.status !== 'flagged') {
      return NextResponse.json(
        { state: 'error', message: `This purchase is in "${record.status}" status and cannot be confirmed here.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ state: 'ready', record });
  } catch (error) {
    return NextResponse.json(
      { state: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const partnerName = getString(body.partner_name).trim();
    const poc = getString(body.poc).trim();
    const estimatedAmount = Number(body.estimated_amount);
    const purchaseDate = getString(body.purchase_date).trim();
    const category = getString(body.category).trim() as PurchaseCategory;

    if (!partnerName || !poc || !purchaseDate || !Number.isFinite(estimatedAmount) || estimatedAmount < 0) {
      return NextResponse.json(
        { state: 'error', message: 'Please complete all fields with valid values.' },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ state: 'error', message: 'Invalid category selected.' }, { status: 400 });
    }

    const existingResponse = await fetchPocketBaseRecord(id);
    if (existingResponse.status === 404) {
      return NextResponse.json({ state: 'not_found', message: "This purchase doesn't exist" }, { status: 404 });
    }
    if (!existingResponse.ok) {
      const errorText = await existingResponse.text();
      return NextResponse.json(
        { state: 'error', message: `Failed to load purchase (${existingResponse.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const existingRaw = (await existingResponse.json()) as Record<string, unknown>;
    const existing = normaliseForClient(existingRaw);
    const fields = resolveFields(existingRaw);

    if (existing.status === 'purchased') {
      return NextResponse.json(
        { state: 'already_purchased', message: 'This purchase has already been confirmed ✅' },
        { status: 409 }
      );
    }

    if (isExpiredFlaggedRecord(existing)) {
      return NextResponse.json(
        { state: 'expired', message: 'This link has expired — please contact the partnerships team.' },
        { status: 410 }
      );
    }

    if (existing.status !== 'flagged') {
      return NextResponse.json(
        { state: 'error', message: `This purchase is in "${existing.status}" status and cannot be confirmed here.` },
        { status: 409 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      [fields.partnerName]: partnerName,
      [fields.poc]: poc,
      [fields.estimatedAmount]: estimatedAmount,
      [fields.purchaseDate]: purchaseDate,
      [fields.category]: category,
      [fields.status]: 'purchased',
    };

    const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION}/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return NextResponse.json(
        { state: 'error', message: `Failed to update purchase (${updateResponse.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const updatedRecord = normaliseForClient(await updateResponse.json());

    const webhookUrl = process.env.BIG_PURCHASE_CONFIRM_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { state: 'error', message: 'BIG_PURCHASE_CONFIRM_WEBHOOK_URL is not configured.' },
        { status: 500 }
      );
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'partnerships-portal',
        action: 'big_purchase_confirmed',
        timestamp: new Date().toISOString(),
        purchase: {
          id: updatedRecord.id,
          partner_name: updatedRecord.partner_name,
          poc: updatedRecord.poc,
          estimated_amount: updatedRecord.estimated_amount,
          purchase_date: updatedRecord.purchase_date,
          category: updatedRecord.category,
          status: 'purchased',
        },
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      return NextResponse.json(
        { state: 'error', message: `Purchase updated, but webhook failed (${webhookResponse.status}): ${errorText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      state: 'success',
      message: 'Purchase confirmed ✅ — the partnerships team has been notified.',
      record: updatedRecord,
    });
  } catch (error) {
    return NextResponse.json(
      { state: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
