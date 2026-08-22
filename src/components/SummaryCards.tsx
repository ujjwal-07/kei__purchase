'use client';

import React from 'react';
import { PurchaseRequest } from '@/types';
import { fmtFC, fmtINR, todayISO } from '@/lib/utils';

interface SummaryCardsProps {
  requests: PurchaseRequest[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ requests }) => {
  const todayStr = todayISO();
  const todayRequests = requests.filter((r) => r.date === todayStr);
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const totalUSD = todayRequests
    .filter((r) => r.currency === 'USD')
    .reduce((s, r) => s + Number(r.lineFC || 0), 0);

  const totalEUR = todayRequests
    .filter((r) => r.currency === 'EUR')
    .reduce((s, r) => s + Number(r.lineFC || 0), 0);

  const totalINR = todayRequests.reduce(
    (s, r) => s + Number(r.inrValue || 0),
    0
  );

  const cards = [
    { n: todayRequests.length.toString(), l: "Today's Requests" },
    { n: pendingRequests.length.toString(), l: 'Pending Approval' },
    { n: fmtFC(totalUSD, 'USD'), l: 'Total Value — USD' },
    { n: fmtFC(totalEUR, 'EUR'), l: 'Total Value — EUR' },
    { n: fmtINR(totalINR), l: 'Total Order Value — INR' },
  ];

  return (
    <div className="summaryGrid">
      {cards.map((c, i) => (
        <div key={i} className="sumCard">
          <div className="n">{c.n}</div>
          <div className="l">{c.l}</div>
        </div>
      ))}
    </div>
  );
};
