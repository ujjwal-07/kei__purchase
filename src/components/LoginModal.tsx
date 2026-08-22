'use client';

import React, { useState, useEffect } from 'react';
import { AuthSession, UserProfileKey } from '@/types';

interface LoginModalProps {
  onSuccess: (user: AuthSession) => void;
}

interface ProfileItem {
  key: UserProfileKey;
  name: string;
  label: string;
  isDefaultPassword: boolean;
  defaultPw: string | null;
}

const INITIAL_PROFILES: ProfileItem[] = [
  { key: 'satish', name: 'Satish', label: 'Requester', isDefaultPassword: true, defaultPw: 'Satish@123' },
  { key: 'archana', name: 'Archana', label: 'Requester', isDefaultPassword: true, defaultPw: 'Archana@123' },
  { key: 'soham', name: 'Soham Chawla', label: 'Approver', isDefaultPassword: true, defaultPw: 'Soham@123' },
  { key: 'sanjay', name: 'Sanjay Chawla', label: 'Approver', isDefaultPassword: true, defaultPw: 'Sanjay@123' },
];

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [profiles, setProfiles] = useState<ProfileItem[]>(INITIAL_PROFILES);
  const [selectedKey, setSelectedKey] = useState<UserProfileKey>('satish');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch updated status of profiles to check if password was changed
  useEffect(() => {
    async function loadProfilesStatus() {
      try {
        const res = await fetch('/api/auth/profiles');
        if (res.ok) {
          const data = await res.json();
          if (data.profiles && Array.isArray(data.profiles)) {
            setProfiles(data.profiles);
          }
        }
      } catch (err) {
        console.error('Failed to load profile status:', err);
      }
    }
    loadProfilesStatus();
  }, []);

  const selectedProfile = profiles.find((p) => p.key === selectedKey) || profiles[0];

  const handleProfileSelect = (key: UserProfileKey) => {
    setSelectedKey(key);
    setPassword('');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedKey,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check password.');
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDefault = () => {
    if (selectedProfile && selectedProfile.defaultPw) {
      setPassword(selectedProfile.defaultPw);
      setError(null);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>Who&apos;s working?</h2>
        <p>Select your profile and enter password to access the Purchase Order Register.</p>

        <div className="roleSelectGrid">
          {profiles.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`profileCardBtn ${selectedKey === p.key ? 'selected' : ''}`}
              onClick={() => handleProfileSelect(p.key)}
            >
              {p.name}
              <small>{p.label}</small>
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="loginPasswordSection">
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Password for {selectedProfile?.name}
          </label>

          <div className="passwordInputWrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pwToggleBtn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <div
              style={{
                color: 'var(--red)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '12px',
                padding: '6px 10px',
                background: 'var(--red-bg)',
                border: '1px solid var(--red-border)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="loginSubmitBtn"
            disabled={loading}
          >
            {loading ? 'Authenticating…' : `Sign in as ${selectedProfile?.name}`}
          </button>
        </form>
      </div>
    </div>
  );
};
