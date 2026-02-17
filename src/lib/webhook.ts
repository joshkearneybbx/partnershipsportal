import { Partner } from '@/types';

export const sendToCore = async (partner: Partner): Promise<{ success: boolean; error?: string }> => {
  console.log('[Webhook] Sending partner to Core:', partner.partner_name);

  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'partnerships-portal',
        timestamp: new Date().toISOString(),
        action: 'send_to_core',
        partner: {
          id: partner.id,
          partner_name: partner.partner_name,
          description: partner.description,
          lifestyle_category: partner.lifestyle_category,
          contact_name: partner.contact_name,
          contact_position: partner.contact_position,
          contact_phone: partner.contact_phone,
          contact_email: partner.contact_email,
          opportunity_type: partner.opportunity_type,
          price_category: partner.price_category,
          partnership_type: partner.partnership_type,
          partnership_link: partner.partnership_link,
          website: partner.website,
          login_notes: partner.login_notes,
          status: partner.status,
          partner_tier: partner.partner_tier,
          use_for_tags: partner.use_for_tags,
          lifecycle_stage: partner.lifecycle_stage,
          is_default: partner.is_default,
          partner_brief: partner.partner_brief,
          when_not_to_use: partner.when_not_to_use,
          sla_notes: partner.sla_notes,
          commission: partner.commission,
          contacted: partner.contacted,
          call_booked: partner.call_booked,
          call_had: partner.call_had,
          contract_sent: partner.contract_sent,
          contract_signed: partner.contract_signed,
          created: partner.created,
          updated: partner.updated,
          lead_date: partner.lead_date,
          signed_at: partner.signed_at,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Webhook] API returned error:', errorData);
      throw new Error(errorData.error || 'Failed to send to webhook');
    }

    console.log('[Webhook] Successfully sent to Core');
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendToBrevo = async (partner: Partner): Promise<{ success: boolean; error?: string }> => {
  console.log('[Webhook] Sending partner to Brevo:', partner.partner_name);

  try {
    const response = await fetch('/api/brevo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'partnerships-portal',
        timestamp: new Date().toISOString(),
        action: 'send_to_brevo',
        partner: {
          id: partner.id,
          partner_name: partner.partner_name,
          description: partner.description,
          lifestyle_category: partner.lifestyle_category,
          contact_name: partner.contact_name,
          contact_position: partner.contact_position,
          contact_phone: partner.contact_phone,
          contact_email: partner.contact_email,
          opportunity_type: partner.opportunity_type,
          price_category: partner.price_category,
          partnership_type: partner.partnership_type,
          partnership_link: partner.partnership_link,
          website: partner.website,
          login_notes: partner.login_notes,
          status: partner.status,
          partner_tier: partner.partner_tier,
          use_for_tags: partner.use_for_tags,
          lifecycle_stage: partner.lifecycle_stage,
          is_default: partner.is_default,
          partner_brief: partner.partner_brief,
          when_not_to_use: partner.when_not_to_use,
          sla_notes: partner.sla_notes,
          commission: partner.commission,
          contacted: partner.contacted,
          call_booked: partner.call_booked,
          call_had: partner.call_had,
          contract_sent: partner.contract_sent,
          contract_signed: partner.contract_signed,
          created: partner.created,
          updated: partner.updated,
          lead_date: partner.lead_date,
          signed_at: partner.signed_at,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Webhook] API returned error:', errorData);
      throw new Error(errorData.error || 'Failed to send to Brevo');
    }

    console.log('[Webhook] Successfully sent to Brevo');
    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
