import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const KNOWN_INSECURE_SECRETS = [
  'your_jwt_secret_key_here',
  'super_secret_jwt_key_campusdesk',
  'campusdesk_secret_jwt_2025',
  'secret',
  'password',
  '123456',
];

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.PORT || '5000', 10);

function initializeJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();

  if (NODE_ENV === 'production') {
    if (!envSecret || KNOWN_INSECURE_SECRETS.includes(envSecret)) {
      throw new Error(
        '[FATAL SECRETS ERROR] In production, JWT_SECRET must be explicitly set to a strong, high-entropy secret. ' +
        'Insecure default or empty secret rejected.'
      );
    }
    if (envSecret.length < 16) {
      throw new Error(
        `[FATAL SECRETS ERROR] JWT_SECRET must be at least 16 characters in production (got ${envSecret.length}).`
      );
    }
    return envSecret;
  }

  // Development mode handling
  if (envSecret && !KNOWN_INSECURE_SECRETS.includes(envSecret)) {
    return envSecret;
  }

  // If secret is missing or insecure in development, use configured secret or generate random ephemeral secret
  if (envSecret) {
    console.warn(
      '[SECURITY WARNING] JWT_SECRET matches a known insecure default. Using configured value for dev convenience. ' +
      'Please update backend/.env with a strong secret before deploying.'
    );
    return envSecret;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  console.warn(
    '[SECURITY NOTICE] No JWT_SECRET configured in backend/.env. Generated ephemeral 256-bit development secret. ' +
    'Set JWT_SECRET in .env for persistent login across restarts.'
  );
  return generated;
}

export const JWT_SECRET = initializeJwtSecret();

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
export const MAX_MENTEES_PER_MENTOR = parseInt(process.env.MAX_MENTEES_PER_MENTOR || '20', 10);

// Google OAuth Configuration
export const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID?.trim() || '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID?.trim() || '';

export const isGoogleAuthConfigured = Boolean(
  GOOGLE_WEB_CLIENT_ID && GOOGLE_WEB_CLIENT_ID.endsWith('.apps.googleusercontent.com')
);

export const ALLOWED_EMAIL_DOMAINS: string[] = process.env.ALLOWED_EMAIL_DOMAINS
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  : [];

export const ALLOW_STUDENT_AUTO_SIGNUP: boolean = process.env.ALLOW_STUDENT_AUTO_SIGNUP === 'true';

// Password authentication toggle (can be disabled in production)
export const ENABLE_PASSWORD_AUTH: boolean = process.env.ENABLE_PASSWORD_AUTH !== 'false';

export function validateEnvironment(): void {
  console.log(`[Config] Running in ${NODE_ENV.toUpperCase()} mode on port ${PORT}`);

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn(
      '[Config Warning] GEMINI_API_KEY is not configured or using placeholder. AI queries will use fallback bylaws.'
    );
  } else {
    const masked = maskSecret(GEMINI_API_KEY);
    console.log(`[Config] Gemini AI integration active with key: ${masked}`);
  }

  // Google OAuth validation check
  if (!isGoogleAuthConfigured) {
    console.warn(
      '[Google Auth Warning] GOOGLE_WEB_CLIENT_ID is not configured or does not end with ".apps.googleusercontent.com". Live Google token verification will be unavailable until a valid Client ID is set in backend/.env.'
    );
  } else if (NODE_ENV !== 'production') {
    console.log('[Google Auth Dev Debug] Backend allowed client ID:', GOOGLE_WEB_CLIENT_ID);
  }
}

export function maskSecret(secret?: string): string {
  if (!secret) return '(none)';
  if (secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
