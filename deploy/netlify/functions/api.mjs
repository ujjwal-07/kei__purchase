import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI || 'mongodb+srv://pkalash017_db_user:AQ8ZRbQMkyCbwlTY@cluster0.vbkhpde.mongodb.net/kei_purchase_db?retryWrites=true&w=majority&appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'kei_purchase_db';
const JWT_SECRET = process.env.JWT_SECRET || 'kei_purchase_reg_jwt_secret_2026_super_secure_key';

let cachedClient = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  return cachedClient.db(dbName);
}

const PROFILES = {
  satish: { username: 'satish', name: 'Satish', role: 'requester', label: 'Requester' },
  archana: { username: 'archana', name: 'Archana', role: 'requester', label: 'Requester' },
  soham: { username: 'soham', name: 'Soham Chawla', role: 'approver', label: 'Approver' },
  sanjay: { username: 'sanjay', name: 'Sanjay Chawla', role: 'approver', label: 'Approver' },
};

const DEFAULT_PASSWORDS = {
  satish: 'Satish@123',
  archana: 'Archana@123',
  soham: 'Soham@123',
  sanjay: 'Sanjay@123',
};

async function ensureUsers(db) {
  const usersCol = db.collection('users');
  for (const [key, profile] of Object.entries(PROFILES)) {
    const existing = await usersCol.findOne({ username: key });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORDS[key], salt);
      await usersCol.insertOne({
        username: key,
        name: profile.name,
        role: profile.role,
        label: profile.label,
        passwordHash,
        isDefaultPassword: true,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

export default async function handler(req, context) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const method = req.method;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const db = await getDb();
    await ensureUsers(db);

    // 1. GET /api/auth/profiles
    if (path === '/auth/profiles' && method === 'GET') {
      const users = await db.collection('users').find({}).toArray();
      const profilesList = Object.entries(PROFILES).map(([key, p]) => {
        const doc = users.find(u => u.username === key);
        const isDefault = doc ? doc.isDefaultPassword !== false : true;
        return {
          key,
          name: p.name,
          role: p.role,
          label: p.label,
          isDefaultPassword: isDefault,
        };
      });
      return new Response(JSON.stringify({ success: true, profiles: profilesList }), { headers });
    }

    // 2. POST /api/auth/login
    if (path === '/auth/login' && method === 'POST') {
      const body = await req.json();
      const { username, password } = body;
      const user = await db.collection('users').findOne({ username: username?.toLowerCase() });
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 401, headers });
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401, headers });
      }
      const token = jwt.sign({
        username: user.username,
        name: user.name,
        role: user.role,
        label: user.label,
      }, JWT_SECRET, { expiresIn: '30d' });

      return new Response(JSON.stringify({
        success: true,
        user: {
          username: user.username,
          name: user.name,
          role: user.role,
          label: user.label,
          token,
        },
      }), { headers });
    }

    // 3. POST /api/auth/change-password
    if (path === '/auth/change-password' && method === 'POST') {
      const body = await req.json();
      const { username, currentPassword, newPassword } = body;
      const user = await db.collection('users').findOne({ username: username?.toLowerCase() });
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers });
      }
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Current password is incorrect' }), { status: 400, headers });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      await db.collection('users').updateOne(
        { username: username.toLowerCase() },
        { $set: { passwordHash, isDefaultPassword: false, updatedAt: new Date().toISOString() } }
      );
      return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), { headers });
    }

    // 4. GET /api/requests
    if (path === '/requests' && method === 'GET') {
      const requests = await db.collection('purchaseRequests').find({}).sort({ createdAt: -1 }).toArray();
      const sanitized = requests.map(r => ({
        ...r,
        id: r.id || r._id.toString(),
        _id: r._id.toString(),
      }));
      return new Response(JSON.stringify({ success: true, requests: sanitized }), { headers });
    }

    // 5. POST /api/requests
    if (path === '/requests' && method === 'POST') {
      const body = await req.json();
      const { brand, model, qty, value, currency, rate, remarks, requestedBy } = body;
      const numQty = parseFloat(qty);
      const numVal = parseFloat(value);
      const cur = currency || 'USD';
      const numRate = cur === 'INR' ? 1 : parseFloat(rate);

      const now = Date.now();
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const compact = today.slice(2).replace(/-/g, '');
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      const ref = `PO${compact}-${rand}`;

      const newEntry = {
        id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        ref,
        date: today,
        brand: String(brand).trim(),
        model: String(model).trim(),
        qty: numQty,
        value: numVal,
        currency: cur,
        rate: numRate,
        remarks: remarks ? String(remarks).trim() : '',
        lineFC: Number((numQty * numVal).toFixed(2)),
        inrValue: Number((numQty * numVal * numRate).toFixed(2)),
        requestedBy: requestedBy || 'Satish',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection('purchaseRequests').insertOne(newEntry);
      return new Response(JSON.stringify({
        success: true,
        request: { ...newEntry, _id: result.insertedId.toString() },
      }), { headers });
    }

    // 6. PUT /api/requests/:id (Supports editing approved requests)
    const matchId = path.match(/^\/requests\/([^\/]+)$/);
    if (matchId && method === 'PUT') {
      const targetId = matchId[1];
      const body = await req.json();
      const { brand, model, qty, value, currency, rate, remarks, editedBy } = body;

      const numQty = parseFloat(qty);
      const numVal = parseFloat(value);
      const cur = currency || 'USD';
      const numRate = cur === 'INR' ? 1 : parseFloat(rate);

      let query = { id: targetId };
      if (ObjectId.isValid(targetId)) {
        query = { $or: [{ id: targetId }, { _id: new ObjectId(targetId) }] };
      }

      const existing = await db.collection('purchaseRequests').findOne(query);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers });
      }

      const updateFields = {
        brand: String(brand).trim(),
        model: String(model).trim(),
        qty: numQty,
        value: numVal,
        currency: cur,
        rate: numRate,
        remarks: remarks ? String(remarks).trim() : '',
        lineFC: Number((numQty * numVal).toFixed(2)),
        inrValue: Number((numQty * numVal * numRate).toFixed(2)),
        updatedAt: Date.now(),
      };

      if (existing.status === 'approved') {
        updateFields.isEdited = true;
        updateFields.editedBy = editedBy || 'Approver';
        updateFields.editedAt = new Date().toISOString();
      }

      await db.collection('purchaseRequests').updateOne(query, { $set: updateFields });
      const updated = await db.collection('purchaseRequests').findOne(query);

      return new Response(JSON.stringify({
        success: true,
        request: { ...updated, id: updated.id || updated._id.toString() },
      }), { headers });
    }

    // 7. PATCH /api/requests/:id (Approve / Reject)
    if (matchId && method === 'PATCH') {
      const targetId = matchId[1];
      const body = await req.json();
      const { status, approvedBy } = body;

      let query = { id: targetId };
      if (ObjectId.isValid(targetId)) {
        query = { $or: [{ id: targetId }, { _id: new ObjectId(targetId) }] };
      }

      await db.collection('purchaseRequests').updateOne(query, {
        $set: {
          status,
          approvedBy: approvedBy || 'Approver',
          approvedAt: new Date().toISOString(),
          updatedAt: Date.now(),
        },
      });

      return new Response(JSON.stringify({ success: true, status }), { headers });
    }

    // 8. DELETE /api/requests/:id
    if (matchId && method === 'DELETE') {
      const targetId = matchId[1];
      let query = { id: targetId };
      if (ObjectId.isValid(targetId)) {
        query = { $or: [{ id: targetId }, { _id: new ObjectId(targetId) }] };
      }
      await db.collection('purchaseRequests').deleteOne(query);
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // 9. GET & POST /api/meta
    if (path === '/meta' && method === 'GET') {
      const meta = await db.collection('metadata').findOne({ key: 'backup' });
      return new Response(JSON.stringify({ success: true, meta: meta || null }), { headers });
    }

    if (path === '/meta' && method === 'POST') {
      const body = await req.json();
      await db.collection('metadata').updateOne(
        { key: 'backup' },
        { $set: { key: 'backup', at: new Date().toISOString(), by: body.by || 'User', action: body.action || 'done' } },
        { upsert: true }
      );
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers });
  } catch (err) {
    console.error('API Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), { status: 500, headers });
  }
}
