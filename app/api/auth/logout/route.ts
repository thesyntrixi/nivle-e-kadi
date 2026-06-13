// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    maxAge: 0,
  });

  return response;
}
