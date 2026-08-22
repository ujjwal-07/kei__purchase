import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { brand, model, qty, value, currency, rate, remarks } = body;

    const numQty = parseFloat(String(qty).replace(/,/g, ''));
    const numValue = parseFloat(String(value).replace(/,/g, ''));
    const cur = currency || 'USD';
    const numRate = cur === 'INR' ? 1 : parseFloat(String(rate).replace(/,/g, ''));

    if (!brand || !model || !numQty || !numValue || (cur !== 'INR' && !numRate)) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    const collection = db.collection('purchaseRequests');

    // Find target document by custom id or Mongo _id
    let query: any = { id: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    const existing = await collection.findOne(query);
    if (!existing) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    const lineFC = Number((numQty * numValue).toFixed(2));
    const inrValue = Number((numQty * numValue * numRate).toFixed(2));
    const now = Date.now();

    const updateFields: any = {
      brand: String(brand).trim(),
      model: String(model).trim(),
      qty: numQty,
      value: numValue,
      currency: cur,
      rate: numRate,
      remarks: remarks ? String(remarks).trim() : '',
      lineFC,
      inrValue,
      updatedAt: now,
    };

    // If editing an approved entry, preserve approved status but add audit tracking
    if (existing.status === 'approved') {
      updateFields.isEdited = true;
      updateFields.editedBy = session.name;
      updateFields.editedAt = new Date().toISOString();
    }

    await collection.updateOne(query, { $set: updateFields });

    const updatedDoc = await collection.findOne(query);

    return NextResponse.json({
      success: true,
      request: {
        ...updatedDoc,
        id: updatedDoc?.id || updatedDoc?._id.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'approver') {
      return NextResponse.json(
        { error: 'Only Approvers can approve or reject purchase requests.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = await getDatabase();
    const collection = db.collection('purchaseRequests');

    let query: any = { id: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    const updateFields: any = {
      status,
      approvedBy: session.name,
      approvedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    };

    const result = await collection.updateOne(query, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error changing request status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDatabase();
    const collection = db.collection('purchaseRequests');

    let query: any = { id: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    const result = await collection.deleteOne(query);
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete request' },
      { status: 500 }
    );
  }
}
