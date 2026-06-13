import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import {
  getClientById,
  updateClient,
  deleteClient,
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

async function getOwnedClient(userId: string, clientId: string) {
  const client = await getClientById(clientId);
  if (!client || !client.is_active || client.user_id !== userId) {
    return null;
  }
  return client;
}

async function isEmailTaken(
  userId: string,
  email: string,
  excludeClientId: string
): Promise<boolean> {
  const result = await query(
    'SELECT id FROM clients WHERE user_id = $1 AND LOWER(email) = LOWER($2) AND is_active = true AND id != $3',
    [userId, email, excludeClientId]
  );
  return result.rows.length > 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await getOwnedClient(userId, params.id);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load client. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await getOwnedClient(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
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
    const companyName = body.company_name?.trim() || null;

    if (await isEmailTaken(userId, email, params.id)) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 409 }
      );
    }

    const client = await updateClient(params.id, {
      name,
      email,
      phone,
      company_name: companyName,
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update client. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await getOwnedClient(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    await deleteClient(params.id);
    return NextResponse.json({
      success: true,
      message: 'Client deleted',
    });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete client. Please try again.' },
      { status: 500 }
    );
  }
}
