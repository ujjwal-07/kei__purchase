import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getDatabase } from './mongodb';
import { AuthSession, UserProfile, UserProfileKey } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'kei_purchase_default_secret_key_2026';
const COOKIE_NAME = 'kei_auth_session';

export const PROFILES: Record<UserProfileKey, UserProfile> = {
  satish: { username: 'satish', name: 'Satish', role: 'requester', label: 'Requester' },
  archana: { username: 'archana', name: 'Archana', role: 'requester', label: 'Requester' },
  soham: { username: 'soham', name: 'Soham Chawla', role: 'approver', label: 'Approver' },
  sanjay: { username: 'sanjay', name: 'Sanjay Chawla', role: 'approver', label: 'Approver' },
};

export const DEFAULT_PASSWORDS: Record<UserProfileKey, string> = {
  satish: 'Satish@123',
  archana: 'Archana@123',
  soham: 'Soham@123',
  sanjay: 'Sanjay@123',
};

/**
 * Ensures all 4 predefined profiles exist in the MongoDB `users` collection with hashed passwords.
 */
export async function ensureDefaultUsers() {
  try {
    const db = await getDatabase();
    const usersCol = db.collection('users');

    for (const [key, profile] of Object.entries(PROFILES)) {
      const existing = await usersCol.findOne({ username: key });
      if (!existing) {
        const defaultPassword = DEFAULT_PASSWORDS[key as UserProfileKey];
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        await usersCol.insertOne({
          username: key,
          name: profile.name,
          role: profile.role,
          label: profile.label,
          passwordHash,
          isDefaultPassword: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`[Auth] Seeded user profile: ${key}`);
      }
    }
  } catch (err) {
    console.error('[Auth] Error ensuring default users:', err);
  }
}

/**
 * Get public profile list and check if they are still on default passwords.
 */
export async function getProfilesPublicStatus() {
  await ensureDefaultUsers();
  const db = await getDatabase();
  const users = await db.collection('users').find({}).toArray();

  return Object.entries(PROFILES).map(([key, profile]) => {
    const userDoc = users.find((u) => u.username === key);
    // If isDefaultPassword is explicitly false or if password was updated separately
    const isDefault = userDoc ? userDoc.isDefaultPassword !== false : true;

    return {
      key: key as UserProfileKey,
      name: profile.name,
      role: profile.role,
      label: profile.label,
      isDefaultPassword: isDefault,
      defaultPw: isDefault ? DEFAULT_PASSWORDS[key as UserProfileKey] : null,
    };
  });
}

/**
 * Verify user password against database hash.
 */
export async function verifyUserCredentials(username: string, passwordAttempt: string) {
  await ensureDefaultUsers();
  const db = await getDatabase();
  const user = await db.collection('users').findOne({ username: username.toLowerCase().trim() });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(passwordAttempt, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    username: user.username as UserProfileKey,
    name: user.name,
    role: user.role,
    label: user.label,
  } as AuthSession;
}

/**
 * Sign JWT session token.
 */
export function signSessionToken(payload: AuthSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify JWT session token.
 */
export function verifySessionToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Extract authenticated user session from request cookies.
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Update user password in database and mark isDefaultPassword to false.
 */
export async function updateUserPassword(username: UserProfileKey, newPassword: string): Promise<boolean> {
  const db = await getDatabase();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const res = await db.collection('users').updateOne(
    { username },
    {
      $set: {
        passwordHash,
        isDefaultPassword: false,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return res.matchedCount > 0;
}

export { COOKIE_NAME };
