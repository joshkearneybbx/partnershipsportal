import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const partner = await request.json();
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL not configured' },
        { status: 400 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partner),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
