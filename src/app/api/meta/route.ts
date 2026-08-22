import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const db = await getDatabase();
    const meta = await db.collection('metadata').findOne({ key: 'backup' });
    return NextResponse.json({ success: true, meta: meta || null });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json({ success: false, meta: null });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'done' | 'skipped'

    const db = await getDatabase();
    await db.collection('metadata').updateOne(
      { key: 'backup' },
      {
        $set: {
          key: 'backup',
          at: new Date().toISOString(),
          by: session.name,
          action: action || 'done',
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving metadata:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save metadata' }, { status: 500 });
  }
}
