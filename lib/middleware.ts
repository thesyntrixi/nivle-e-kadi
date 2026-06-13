// lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './token';

export type AuthenticatedRequest = NextRequest & {
  userId: string;
};

type RouteHandler = (request: AuthenticatedRequest) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: RouteHandler) {
  return async (request: NextRequest) => {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = decoded.userId;

    return handler(authenticatedRequest);
  };
}
