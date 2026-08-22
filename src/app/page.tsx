'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { AuthSession, BackupMeta, Currency, PurchaseRequest } from '@/types';
import { Letterhead } from '@/components/Letterhead';
import { RoleBar } from '@/components/RoleBar';
import { LoginModal } from '@/components/LoginModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { SummaryCards } from '@/components/SummaryCards';
import { PurchaseForm } from '@/components/PurchaseForm';
import { RegisterTable } from '@/components/RegisterTable';
import { BackupBanner } from '@/components/BackupBanner';
import { Toast } from '@/components/Toast';
import { todayISO } from '@/lib/utils';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showChangePassword, setShowChangePassword] = useState<boolean>(false);

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [backupMeta, setBackupMeta] = useState<BackupMeta | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters & Search
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'pending' | 'approved' | 'date'>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [requesterFilter, setRequesterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Check current session
  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (err) {
      console.error('Fetch requests failed:', err);
      setConnected(false);
    }
  }, []);

  // Fetch backup metadata
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/meta');
      if (res.ok) {
        const data = await res.json();
        setBackupMeta(data.meta);
      }
    } catch (err) {
      console.error('Fetch meta failed:', err);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
      fetchMeta();

      // Poll every 6 seconds for live updates
      const interval = setInterval(() => {
        fetchRequests();
      }, 6000);

      return () => clearInterval(interval);
    }
  }, [currentUser, fetchRequests, fetchMeta]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    }
    setCurrentUser(null);
    setEditingRequest(null);
  };

  // Handle Create or Update Request
  const handleFormSubmit = async (formData: {
    brand: string;
    model: string;
    qty: number;
    value: number;
    currency: Currency;
    rate: number;
    remarks: string;
  }): Promise<boolean> => {
    try {
      if (editingRequest) {
        // Update existing (including approved)
        const targetId = editingRequest.id || editingRequest._id;
        const res = await fetch(`/api/requests/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update entry');
        }

        showToast(
          editingRequest.status === 'approved'
            ? `Updated Approved Request: ${formData.brand} — ${formData.model}`
            : `Updated Request: ${formData.brand} — ${formData.model}`,
          'success'
        );
        setEditingRequest(null);
        await fetchRequests();
        return true;
      } else {
        // Create new
        const res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save request');
        }

        showToast(`Saved to MongoDB: ${formData.brand} — ${formData.model}`, 'success');
        await fetchRequests();
        return true;
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
      return false;
    }
  };

  // Status changes (Approver: approve / reject)
  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      showToast(`Request marked as ${newStatus}`, 'success');
      await fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Status change failed', 'error');
    }
  };

  // Delete Request
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete request');
      }

      showToast('Entry removed successfully', 'success');
      await fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  // Filtered requests computation
  const getFilteredRequests = (): PurchaseRequest[] => {
    let list = [...requests];
    const today = todayISO();

    if (filterMode === 'today') {
      list = list.filter((r) => r.date === today);
    } else if (filterMode === 'pending') {
      list = list.filter((r) => r.status === 'pending');
    } else if (filterMode === 'approved') {
      list = list.filter((r) => r.status === 'approved');
    } else if (filterMode === 'date' && filterDate) {
      list = list.filter((r) => r.date === filterDate);
    }

    if (requesterFilter !== 'all') {
      list = list.filter((r) => r.requestedBy?.toLowerCase() === requesterFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.brand?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q) ||
          r.ref?.toLowerCase().includes(q) ||
          r.remarks?.toLowerCase().includes(q) ||
          r.requestedBy?.toLowerCase().includes(q)
      );
    }

    return list;
  };

  // Export to Excel
  const exportToExcel = async (exportAll: boolean = false) => {
    const items = exportAll
      ? [...requests].sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref))
      : getFilteredRequests().sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));

    if (items.length === 0) {
      showToast('No entries found to export.', 'error');
      return;
    }

    const rows = items.map((r) => ({
      Date: r.date,
      'Ref No.': r.ref,
      Brand: r.brand,
      Model: r.model,
      Qty: r.qty,
      'Unit Value': r.value,
      Currency: r.currency,
      'Exchange Rate (₹)': r.currency === 'INR' ? '' : r.rate,
      'Line Total (FC)': Number(r.lineFC.toFixed(2)),
      'Line Total (INR)': Math.round(r.inrValue),
      Status: r.status,
      'Requested By': r.requestedBy,
      'Approved By': r.approvedBy || '',
      'Edited By': r.editedBy || '',
      Remarks: r.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 14 }, // Ref No.
      { wch: 16 }, // Brand
      { wch: 22 }, // Model
      { wch: 8 },  // Qty
      { wch: 13 }, // Unit Value
      { wch: 10 }, // Currency
      { wch: 17 }, // Rate
      { wch: 16 }, // Line Total FC
      { wch: 16 }, // Line Total INR
      { wch: 12 }, // Status
      { wch: 15 }, // Requested By
      { wch: 16 }, // Approved By
      { wch: 16 }, // Edited By
      { wch: 25 }, // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register');

    const stamp = todayISO();
    const label = exportAll
      ? 'FULL_BACKUP'
      : filterMode === 'today'
      ? 'Today'
      : filterMode === 'pending'
      ? 'Pending'
      : filterMode === 'approved'
      ? 'Approved'
      : filterMode === 'date'
      ? filterDate
      : 'AllDates';

    XLSX.writeFile(wb, `KEI_Purchase_Register_${label}_${stamp}.xlsx`);

    if (exportAll) {
      try {
        await fetch('/api/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'done' }),
        });
        await fetchMeta();
      } catch (err) {
        console.error('Backup record error:', err);
      }
    }
  };

  const handleSkipBackup = async () => {
    try {
      await fetch('/api/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skipped' }),
      });
      await fetchMeta();
      showToast('Backup reminder snoozed for 7 days', 'success');
    } catch (err) {
      console.error('Skip backup error:', err);
    }
  };

  if (authChecking) {
    return (
      <div className="appWrap">
        <div className="loading">Initializing KEI Purchase Register…</div>
      </div>
    );
  }

  return (
    <div className="appWrap">
      <Letterhead connected={connected} dbLabel="MongoDB Atlas" />

      {!currentUser ? (
        <LoginModal
          onSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Welcome, ${user.name}!`, 'success');
          }}
        />
      ) : (
        <>
          <RoleBar
            user={currentUser}
            onLogout={handleLogout}
            onChangePasswordClick={() => setShowChangePassword(true)}
          />

          {showChangePassword && (
            <ChangePasswordModal
              user={currentUser}
              onClose={() => setShowChangePassword(false)}
              onSuccess={(msg) => showToast(msg, 'success')}
            />
          )}

          <Toast
            message={toast?.message || null}
            type={toast?.type || 'success'}
            onClose={() => setToast(null)}
          />

          <SummaryCards requests={requests} />

          {/* Requesters see form always; Approvers see form when editing */}
          {(currentUser.role === 'requester' || editingRequest) && (
            <PurchaseForm
              editingRequest={editingRequest}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => setEditingRequest(null)}
            />
          )}

          <BackupBanner
            meta={backupMeta}
            hasRecords={requests.length > 0}
            onRunBackup={() => {
              exportToExcel(true);
              showToast('Backup downloaded and logged in MongoDB Atlas.', 'success');
            }}
            onSkipBackup={handleSkipBackup}
          />

          {/* Filter & Export Row */}
          <div className="filterRow">
            <button
              type="button"
              className={`chip ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('all');
                setFilterDate('');
              }}
            >
              All Dates
            </button>
            <button
              type="button"
              className={`chip ${filterMode === 'today' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('today');
                setFilterDate('');
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={`chip ${filterMode === 'pending' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('pending');
                setFilterDate('');
              }}
            >
              Pending Only
            </button>
            <button
              type="button"
              className={`chip ${filterMode === 'approved' ? 'active' : ''}`}
              onClick={() => {
                setFilterMode('approved');
                setFilterDate('');
              }}
            >
              Approved
            </button>

            <input
              type="date"
              className="filterDateInput"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (e.target.value) {
                  setFilterMode('date');
                }
              }}
              title="Filter by specific date"
            />

            <select
              className="filterSelect"
              value={requesterFilter}
              onChange={(e) => setRequesterFilter(e.target.value)}
            >
              <option value="all">Requested By: All</option>
              <option value="satish">Requested By: Satish</option>
              <option value="archana">Requested By: Archana</option>
            </select>

            <input
              type="text"
              className="searchInput"
              placeholder="Search brand, model, ref…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button
              type="button"
              className="exportBtn"
              onClick={() => exportToExcel(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export to Excel
            </button>
          </div>

          <RegisterTable
            requests={getFilteredRequests()}
            currentUser={currentUser}
            onEdit={(req) => {
              setEditingRequest(req);
              const panel = document.getElementById('addPanel');
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
