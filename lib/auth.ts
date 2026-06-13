// lib/auth.ts
import { compare, hash } from 'bcryptjs';
import { query } from './db';
import { User } from './database/types';

export { generateToken, verifyToken } from './token';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);

  if (!isPasswordValid) {
    return null;
  }

  return user;
}
