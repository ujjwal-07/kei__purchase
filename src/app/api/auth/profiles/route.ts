import { NextResponse } from 'next/server';
import { getProfilesPublicStatus } from '@/lib/auth';

export async function GET() {
  try {
    const profiles = await getProfilesPublicStatus();
    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    console.error('Error getting profiles:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
