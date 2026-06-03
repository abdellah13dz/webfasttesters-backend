interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MINIMUM_SCORE = 0.5;

export async function verifyRecaptcha(
  token: string,
  expectedAction?: string
): Promise<{
  success: boolean;
  score: number | null;
  passed: boolean;
  error?: string;
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY is not set. Skipping reCAPTCHA verification.');
    return { success: true, score: null, passed: true };
  }

  if (!token) {
    return {
      success: false,
      score: null,
      passed: false,
      error: 'reCAPTCHA token is required',
    };
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data: RecaptchaVerifyResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        score: data.score ?? null,
        passed: false,
        error: `reCAPTCHA verification failed: ${data['error-codes']?.join(', ') || 'Unknown error'}`,
      };
    }

    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        score: data.score ?? null,
        passed: false,
        error: `reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${data.action}`,
      };
    }

    const passed = (data.score ?? 0) >= MINIMUM_SCORE;

    return {
      success: true,
      score: data.score ?? null,
      passed,
      error: passed ? undefined : `reCAPTCHA score too low: ${data.score} (minimum: ${MINIMUM_SCORE})`,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      score: null,
      passed: false,
      error: 'reCAPTCHA verification service unavailable',
    };
  }
}
