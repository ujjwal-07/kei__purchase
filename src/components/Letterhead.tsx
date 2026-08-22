'use client';

import React from 'react';
import { fmtDate, todayISO } from '@/lib/utils';

interface LetterheadProps {
  connected: boolean;
  dbLabel?: string;
}

export const Letterhead: React.FC<LetterheadProps> = ({ connected, dbLabel = 'MongoDB Atlas' }) => {
  return (
    <div className="letterhead">
      <div className="masthead">
        KEI Purchase Department
        <span className="doc">Purchase Order Register</span>
      </div>
      <div className="todayMeta">
        <div>Register Date · <b>{fmtDate(todayISO())}</b></div>
        <div className={`connStatus ${connected ? 'ok' : 'bad'}`}>
          <span className="connDot" />
          {connected ? `Connected (${dbLabel})` : 'Connecting to Atlas…'}
        </div>
      </div>
    </div>
  );
};
