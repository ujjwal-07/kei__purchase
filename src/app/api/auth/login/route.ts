import { NextResponse } from 'next/server';
import { verifyUserCredentials, signSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const session = await verifyUserCredentials(username, password);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid password for selected profile.' },
        { status: 401 }
      );
    }

    const token = signSessionToken(session);

    const response = NextResponse.json({
      success: true,
      user: session,
    });

    // Set secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Login failed. Please check database connection.' },
      { status: 500 }
    );
  }
}
