export interface BrevoSendOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  fromName: string;
  fromEmail: string;
}

function getBrevoApiKey(): string | null {
  const apiKey = process.env.BREVO_API_KEY?.trim() || process.env.SMTP_KEY?.trim();
  if (!apiKey) return null;
  // SMTP relay keys (xsmtpsib-*) do not work with the REST API.
  if (apiKey.startsWith('xsmtpsib-') && !process.env.BREVO_API_KEY?.trim()) {
    return null;
  }
  return apiKey;
}

export function isBrevoSmtpHost(host?: string | null): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized.includes('brevo.com') || normalized.includes('sendinblue.com');
}

export function shouldUseBrevoApi(_host?: string | null): boolean {
  if (process.env.SMTP_TRANSPORT === 'smtp') return false;
  return Boolean(getBrevoApiKey());
}

export function getEmailTransportInfo(host?: string | null): {
  transport: 'brevo-api' | 'smtp';
  brevoApiConfigured: boolean;
  brevoHost: boolean;
} {
  const brevoHost = isBrevoSmtpHost(host ?? process.env.SMTP_HOST);
  const brevoApiConfigured = Boolean(getBrevoApiKey());
  return {
    transport: shouldUseBrevoApi(host) ? 'brevo-api' : 'smtp',
    brevoApiConfigured,
    brevoHost,
  };
}

export async function verifyBrevoApiKey(): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Brevo HTTP API key is required on cloud hosts that block SMTP port 587. Add BREVO_API_KEY in your backend environment (Brevo → Settings → SMTP & API → API keys).',
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return { ok: true };
    }

    const body = await response.text();
    return {
      ok: false,
      error: `Brevo API rejected the key (${response.status}): ${body.slice(0, 200)}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brevo API request failed';
    return { ok: false, error: message };
  }
}

export async function sendBrevoEmail(
  options: BrevoSendOptions
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return {
      sent: false,
      error:
        'Brevo API key missing. Set BREVO_API_KEY in the backend environment to send email over HTTPS (required on Render free tier).',
    };
  }

  try {
    const payload: Record<string, unknown> = {
      sender: {
        name: options.fromName,
        email: options.fromEmail,
      },
      to: [{ email: options.to }],
      subject: options.subject,
      textContent: options.text,
    };

    if (options.html) {
      payload.htmlContent = options.html;
    }

    if (options.replyTo) {
      payload.replyTo = { email: options.replyTo };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      return { sent: true };
    }

    const body = await response.text();
    return {
      sent: false,
      error: formatBrevoApiError(response.status, body),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send via Brevo API';
    console.error('Brevo API send error:', error);
    return { sent: false, error: message };
  }
}

function formatBrevoApiError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || lower.includes('unauthorized') || lower.includes('api key')) {
    return 'Brevo API key is invalid. Create an API key in Brevo → Settings → SMTP & API → API keys and set BREVO_API_KEY.';
  }
  if (lower.includes('sender') && lower.includes('not valid')) {
    return 'Sender email is not verified in Brevo. Verify noreply@fasttesters.com in Brevo → Senders & IP.';
  }
  return `Brevo API error (${status}): ${body.slice(0, 240)}`;
}

export function formatSmtpError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'SMTP connection failed';
  const lower = message.toLowerCase();

  if (
    lower.includes('connection timeout') ||
    lower.includes('etimedout') ||
    lower.includes('timed out') ||
    lower.includes('econnrefused')
  ) {
    return [
      'Connection timeout — your server cannot reach the SMTP host on port 587.',
      'Render and other cloud free tiers block outbound SMTP.',
      'Fix: add BREVO_API_KEY to the backend (uses HTTPS port 443), or upgrade to a paid instance / whitelist your server IP in Brevo.',
    ].join(' ');
  }

  if (lower.includes('unauthorized ip') || lower.includes('525')) {
    return [
      'Brevo blocked this server IP.',
      'Fix: Brevo → Settings → Security → Authorized IPs → add your server outbound IP, or deactivate SMTP IP blocking.',
    ].join(' ');
  }

  if (lower.includes('invalid login') || lower.includes('authentication')) {
    return `SMTP authentication failed: ${message}`;
  }

  return message;
}
