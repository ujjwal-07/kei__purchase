export type RoleType = 'requester' | 'approver';

export type UserProfileKey = 'satish' | 'archana' | 'soham' | 'sanjay';

export interface UserProfile {
  username: UserProfileKey;
  name: string;
  role: RoleType;
  label: string;
}

export interface UserDoc extends UserProfile {
  _id?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt?: string;
}

export type Currency = 'USD' | 'EUR' | 'INR';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseRequest {
  id: string; // unique reference / uuid (or MongoDB _id string)
  _id?: string;
  ref: string; // POYYMMDD-XXXXX
  date: string; // YYYY-MM-DD
  brand: string;
  model: string;
  qty: number;
  value: number; // Unit value in currency
  currency: Currency;
  rate: number; // Exchange rate (1 for INR)
  remarks?: string;
  lineFC: number; // qty * value
  inrValue: number; // qty * value * rate
  requestedBy: string; // 'Satish' | 'Archana'
  status: RequestStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  editedBy?: string | null;
  editedAt?: string | null;
  isEdited?: boolean;
  createdAt: number; // timestamp in ms
  updatedAt?: number;
}

export interface BackupMeta {
  _id?: string;
  at: string; // ISO string
  by: string; // name
  action: 'done' | 'skipped';
}

export interface AuthSession {
  username: UserProfileKey;
  name: string;
  role: RoleType;
  label: string;
}
