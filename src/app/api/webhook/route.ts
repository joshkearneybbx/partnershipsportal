import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[API/Webhook] Received request');

  try {
    const payload = await request.json();
    const webhookUrl = process.env.WEBHOOK_URL;

    console.log('[API/Webhook] Partner:', payload.partner?.partner_name || 'unknown');
    console.log('[API/Webhook] Target URL:', webhookUrl ? 'configured' : 'MISSING');

    if (!webhookUrl) {
      console.error('[API/Webhook] WEBHOOK_URL environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Webhook URL not configured. Set WEBHOOK_URL in environment variables.' },
        { status: 400 }
      );
    }

    console.log('[API/Webhook] Forwarding to n8n...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[API/Webhook] n8n response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/Webhook] n8n error response:', errorText);
      throw new Error(`Webhook returned ${response.status}: ${errorText}`);
    }

    console.log('[API/Webhook] Successfully forwarded to n8n');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Webhook] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
