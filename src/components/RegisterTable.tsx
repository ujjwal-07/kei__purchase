'use client';

import React, { useState } from 'react';
import { AuthSession, PurchaseRequest } from '@/types';
import { fmtDate, fmtFC, fmtINR } from '@/lib/utils';

interface RegisterTableProps {
  requests: PurchaseRequest[];
  currentUser: AuthSession;
  onEdit: (req: PurchaseRequest) => void;
  onStatusChange: (id: string, newStatus: 'approved' | 'rejected') => void;
  onDelete: (id: string) => void;
}

export const RegisterTable: React.FC<RegisterTableProps> = ({
  requests,
  currentUser,
  onEdit,
  onStatusChange,
  onDelete,
}) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className="empty">
        No entries in the register for this view.{' '}
        {currentUser.role === 'requester'
          ? 'Add a new request above.'
          : 'Nothing pending approval right now.'}
      </div>
    );
  }

  // Group by date
  const groups: Record<string, PurchaseRequest[]> = {};
  requests.forEach((r) => {
    groups[r.date] = groups[r.date] || [];
    groups[r.date].push(r);
  });

  const sortedDates = Object.keys(groups).sort().reverse();
  const isApprover = currentUser.role === 'approver';
  const isRequester = currentUser.role === 'requester';
  const colspan = 11;

  const handleDeleteClick = (id: string) => {
    if (pendingDeleteId === id) {
      onDelete(id);
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(id);
    }
  };

  return (
    <div className="tableScroll">
      <table className="register">
        <thead>
          <tr>
            <th>Ref No.</th>
            <th>Brand</th>
            <th>Model</th>
            <th className="num">Qty</th>
            <th className="num">Unit Value</th>
            <th>Cur.</th>
            <th className="num">Rate (₹)</th>
            <th className="num">Line Total (FC)</th>
            <th className="num">Line Total (INR)</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedDates.map((date) => {
            const dayRequests = groups[date];
            const dayUSD = dayRequests
              .filter((r) => r.currency === 'USD')
              .reduce((s, r) => s + Number(r.lineFC || 0), 0);
            const dayEUR = dayRequests
              .filter((r) => r.currency === 'EUR')
              .reduce((s, r) => s + Number(r.lineFC || 0), 0);
            const dayINR = dayRequests.reduce(
              (s, r) => s + Number(r.inrValue || 0),
              0
            );

            const fcParts: string[] = [];
            if (dayUSD > 0) fcParts.push(fmtFC(dayUSD, 'USD'));
            if (dayEUR > 0) fcParts.push(fmtFC(dayEUR, 'EUR'));
            const fcTotalsText = fcParts.length > 0 ? fcParts.join(' + ') : '—';

            return (
              <React.Fragment key={date}>
                <tr className="dateRow">
                  <td colSpan={colspan}>{fmtDate(date)}</td>
                </tr>

                {dayRequests.map((r) => {
                  const targetId = r.id || r._id || '';
                  const isDeleting = pendingDeleteId === targetId;

                  return (
                    <tr key={targetId} className="dataRow">
                      <td className="ref">{r.ref}</td>
                      <td>
                        <b>{r.brand}</b>
                      </td>
                      <td>
                        {r.model}
                        {r.remarks && (
                          <span className="remarks">&ldquo;{r.remarks}&rdquo;</span>
                        )}
                      </td>
                      <td className="num">{r.qty}</td>
                      <td className="num">{fmtFC(r.value, r.currency)}</td>
                      <td>{r.currency}</td>
                      <td className="num">{r.currency === 'INR' ? '—' : r.rate}</td>
                      <td className="num">{fmtFC(r.lineFC, r.currency)}</td>
                      <td className="num">{fmtINR(r.inrValue)}</td>
                      <td>
                        <span className={`badge ${r.status}`}>{r.status}</span>
                        {r.isEdited && <span className="editedTag">Edited</span>}
                        <div className="auditNote">
                          Req: {r.requestedBy}
                          {r.approvedBy && (
                            <span> · {r.status} by {r.approvedBy}</span>
                          )}
                          {r.editedBy && (
                            <span> · edit by {r.editedBy}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {/* Approver Actions */}
                        {isApprover && (
                          <>
                            {r.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  className="actBtn approve"
                                  onClick={() => onStatusChange(targetId, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="actBtn reject"
                                  onClick={() => onStatusChange(targetId, 'rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Edit button is available for ALL entries (including approved) */}
                            <button
                              type="button"
                              className="actBtn edit"
                              onClick={() => onEdit(r)}
                              title={r.status === 'approved' ? 'Edit approved request' : 'Edit request'}
                            >
                              Edit
                            </button>

                            {r.status === 'approved' && (
                              <button
                                type="button"
                                className="actBtn reject"
                                onClick={() => onStatusChange(targetId, 'rejected')}
                                title="Change to rejected"
                              >
                                Reject
                              </button>
                            )}

                            {isDeleting ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="actBtn confirmDel"
                                  onClick={() => handleDeleteClick(targetId)}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="actBtn del"
                                  onClick={() => setPendingDeleteId(null)}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="actBtn del"
                                onClick={() => handleDeleteClick(targetId)}
                              >
                                Del
                              </button>
                            )}
                          </>
                        )}

                        {/* Requester Actions */}
                        {isRequester && (
                          <>
                            {/* Requesters can edit pending OR approved entries */}
                            <button
                              type="button"
                              className="actBtn edit"
                              onClick={() => onEdit(r)}
                              title={r.status === 'approved' ? 'Edit approved request' : 'Edit request'}
                            >
                              Edit
                            </button>

                            {r.status === 'pending' && (
                              <>
                                {isDeleting ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 600 }}>
                                      Delete?
                                    </span>
                                    <button
                                      type="button"
                                      className="actBtn confirmDel"
                                      onClick={() => handleDeleteClick(targetId)}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      className="actBtn del"
                                      onClick={() => setPendingDeleteId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="actBtn del"
                                    onClick={() => handleDeleteClick(targetId)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                <tr className="totalsRow">
                  <td className="label" colSpan={7}>
                    Day Total
                  </td>
                  <td className="num">{fcTotalsText}</td>
                  <td className="num">{fmtINR(dayINR)}</td>
                  <td colSpan={2}></td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
