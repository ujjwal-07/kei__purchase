import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getSession, ensureDefaultUsers } from '@/lib/auth';
import { generateRef, todayISO } from '@/lib/utils';
import { PurchaseRequest } from '@/types';

export async function GET() {
  try {
    await ensureDefaultUsers();
    const db = await getDatabase();
    const collection = db.collection<PurchaseRequest>('purchaseRequests');

    const requests = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Map _id to id string if needed
    const sanitized = requests.map((doc: any) => ({
      ...doc,
      id: doc.id || doc._id.toString(),
      _id: doc._id.toString(),
    }));

    return NextResponse.json({ success: true, requests: sanitized });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await request.json();
    const { brand, model, qty, value, currency, rate, remarks } = body;

    // Validation
    const missing: string[] = [];
    if (!brand || !String(brand).trim()) missing.push('Brand');
    if (!model || !String(model).trim()) missing.push('Model');
    const numQty = parseFloat(String(qty).replace(/,/g, ''));
    if (!numQty || numQty < 1) missing.push('Qty');
    const numValue = parseFloat(String(value).replace(/,/g, ''));
    if (!numValue || numValue <= 0) missing.push('Unit Value');

    const cur = currency || 'USD';
    const numRate = cur === 'INR' ? 1 : parseFloat(String(rate).replace(/,/g, ''));
    if (cur !== 'INR' && (!numRate || numRate <= 0)) missing.push('Exchange Rate');

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please fill required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('purchaseRequests');

    const now = Date.now();
    const today = todayISO();
    const ref = generateRef(today);
    const lineFC = Number((numQty * numValue).toFixed(2));
    const inrValue = Number((numQty * numValue * numRate).toFixed(2));
    const customId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // Duplicate check within last 15 seconds
    const recentDup = await collection.findOne({
      brand: String(brand).trim(),
      model: String(model).trim(),
      qty: numQty,
      value: numValue,
      currency: cur,
      createdAt: { $gte: now - 15000 },
    });

    if (recentDup) {
      return NextResponse.json(
        { error: 'This looks like an entry added moments ago. Please wait a few seconds before re-adding.' },
        { status: 409 }
      );
    }

    const newEntry: PurchaseRequest = {
      id: customId,
      ref,
      date: today,
      brand: String(brand).trim(),
      model: String(model).trim(),
      qty: numQty,
      value: numValue,
      currency: cur,
      rate: numRate,
      remarks: remarks ? String(remarks).trim() : '',
      lineFC,
      inrValue,
      requestedBy: session.name,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newEntry as any);

    return NextResponse.json({
      success: true,
      request: {
        ...newEntry,
        _id: result.insertedId.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save purchase request' },
      { status: 500 }
    );
  }
}
