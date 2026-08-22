import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, user: null, error: error?.message });
  }
}
