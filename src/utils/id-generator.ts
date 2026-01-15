import * as crypto from 'crypto';

/**
 * Generates a unique session ID in the format: sniaff-{random}
 * Example: sniaff-a1b2c3d4
 */
export function generateSessionId(): string {
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `sniaff-${randomPart}`;
}
