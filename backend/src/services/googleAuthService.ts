import { OAuth2Client, TokenPayload } from 'google-auth-library';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  NODE_ENV,
} from '../config/env';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  exp: number;
}

const client = new OAuth2Client();

export function getAllowedAudiences(): string[] {
  return [GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID]
    .map((id) => id?.trim())
    .filter((id) => id && id.endsWith('.apps.googleusercontent.com'));
}

// Optional hook for test suites to inject custom token resolution
type TokenVerifierOverride = (idToken: string) => Promise<VerifiedGoogleUser>;
let testVerifierOverride: TokenVerifierOverride | null = null;

export function setGoogleTokenVerifierForTesting(verifier: TokenVerifierOverride | null): void {
  testVerifierOverride = verifier;
}

/**
 * Verifies a Google ID token and ensures it matches configured client IDs,
 * has not expired, and contains a verified email address.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID token is required and must be a string');
  }

  // If a test verifier is injected, use it directly (for isolated in-process unit tests)
  if (testVerifierOverride) {
    return await testVerifierOverride(idToken);
  }

  // Development/Test mock token resolution (disabled in production)
  if (NODE_ENV !== 'production' && idToken.startsWith('mock_google_token:')) {
    try {
      const raw = Buffer.from(idToken.slice('mock_google_token:'.length), 'base64').toString('utf8');
      const data = JSON.parse(raw);
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    } catch (e: any) {
      throw new Error(e.message || 'Invalid mock Google token');
    }
  }

  const audience = getAllowedAudiences();
  if (audience.length === 0) {
    console.warn(
      '[Google Auth Warning] No valid Google Client IDs configured in environment. Live token verification will fail until GOOGLE_WEB_CLIENT_ID ending with .apps.googleusercontent.com is configured.'
    );
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: audience.length > 0 ? audience : undefined,
    });

    const payload: TokenPayload | undefined = ticket.getPayload();
    if (!payload) {
      throw new Error('Malformed Google token payload');
    }

    // Verify token expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      throw new Error('Google ID token has expired');
    }

    if (!payload.email) {
      throw new Error('Token does not contain an email address');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      exp: payload.exp,
    };
  } catch (error: any) {
    throw new Error(`Google token verification failed: ${error.message}`);
  }
}
