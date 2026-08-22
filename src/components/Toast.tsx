'use client';

import React from 'react';

interface ToastProps {
  message: string | null;
  type: 'success' | 'error';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            marginLeft: '12px',
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};
