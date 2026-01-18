import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[API/Brevo] Received request');

  try {
    const payload = await request.json();
    const webhookUrl = process.env.BREVO_WEBHOOK_URL;

    console.log('[API/Brevo] Partner:', payload.partner?.partner_name || 'unknown');
    console.log('[API/Brevo] Target URL:', webhookUrl ? 'configured' : 'MISSING');

    if (!webhookUrl) {
      console.error('[API/Brevo] BREVO_WEBHOOK_URL environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Brevo Webhook URL not configured. Set BREVO_WEBHOOK_URL in environment variables.' },
        { status: 400 }
      );
    }

    console.log('[API/Brevo] Forwarding to Brevo...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[API/Brevo] Brevo response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/Brevo] Brevo error response:', errorText);
      throw new Error(`Brevo webhook returned ${response.status}: ${errorText}`);
    }

    console.log('[API/Brevo] Successfully forwarded to Brevo');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Brevo] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
