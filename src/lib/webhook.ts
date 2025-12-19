import { Partner } from '@/types';

export const sendToCore = async (partner: Partner): Promise<{ success: boolean; error?: string }> => {
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Webhook URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partner),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send to webhook');
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
