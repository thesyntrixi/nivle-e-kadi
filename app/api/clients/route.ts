import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import {
  getClientsByUserId,
  createClient,
} from '@/lib/database/queries';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

function validateClientBody(body: {
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
}): string | null {
  const name = body.name?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim();
  const companyName = body.company_name?.trim();

  if (!name || name.length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.length > 100) {
    return 'Name must be at most 100 characters';
  }
  if (!email) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Invalid email format';
  }
  if (!phone) {
    return 'Phone number is required';
  }
  if (!PHONE_REGEX.test(phone)) {
    return 'Phone number is invalid';
  }
  if (companyName && companyName.length > 100) {
    return 'Company name must be at most 100 characters';
  }

  return null;
}

async function isEmailTaken(
  userId: string,
  email: string,
  excludeClientId?: string
): Promise<boolean> {
  const result = excludeClientId
    ? await query(
        'SELECT id FROM clients WHERE user_id = $1 AND LOWER(email) = LOWER($2) AND is_active = true AND id != $3',
        [userId, email, excludeClientId]
      )
    : await query(
        'SELECT id FROM clients WHERE user_id = $1 AND LOWER(email) = LOWER($2) AND is_active = true',
        [userId, email]
      );

  return result.rows.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clients = await getClientsByUserId(userId);
    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load clients. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationError = validateClientBody(body);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const email = body.email.trim();
    const phone = body.phone.trim();
    const companyName = body.company_name?.trim() || undefined;

    if (await isEmailTaken(userId, email)) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 409 }
      );
    }

    const client = await createClient(userId, name, phone, email, companyName);
    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create client. Please try again.' },
      { status: 500 }
    );
  }
}
