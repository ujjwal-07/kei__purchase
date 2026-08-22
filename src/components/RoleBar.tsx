'use client';

import React from 'react';
import { AuthSession } from '@/types';

interface RoleBarProps {
  user: AuthSession;
  onLogout: () => void;
  onChangePasswordClick: () => void;
}

export const RoleBar: React.FC<RoleBarProps> = ({
  user,
  onLogout,
  onChangePasswordClick,
}) => {
  return (
    <div className="roleBar">
      <div className="who">
        Signed in as <b>{user.name}</b>
        <span className={`tag ${user.role}`}>
          {user.label}
        </span>
      </div>
      <div className="roleActions">
        <button
          type="button"
          className="actionLink"
          onClick={onChangePasswordClick}
        >
          Change Password
        </button>
        <span style={{ color: 'var(--line-strong)' }}>|</span>
        <button
          type="button"
          className="actionLink danger"
          onClick={onLogout}
        >
          Switch / Logout
        </button>
      </div>
    </div>
  );
};
