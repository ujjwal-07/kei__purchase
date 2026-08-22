'use client';

import React, { useState } from 'react';
import { AuthSession } from '@/types';

interface ChangePasswordModalProps {
  user: AuthSession;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      onSuccess('Password updated successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>Change Password</h2>
        <p>Update your password for profile <b>{user.name}</b>.</p>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: '14px' }}>
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoFocus
            />
          </div>

          <div className="field" style={{ marginBottom: '14px' }}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="field" style={{ marginBottom: '16px' }}>
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--red)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '14px',
                padding: '8px 10px',
                background: 'var(--red-bg)',
                border: '1px solid var(--red-border)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="primaryBtn"
              style={{ background: 'var(--panel)', color: 'var(--ink)', border: '1px solid var(--line-strong)' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primaryBtn"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
