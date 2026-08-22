'use client';

import React from 'react';
import { BackupMeta } from '@/types';

interface BackupBannerProps {
  meta: BackupMeta | null;
  hasRecords: boolean;
  onRunBackup: () => void;
  onSkipBackup: () => void;
}

const BACKUP_INTERVAL_DAYS = 7;

function daysSince(iso?: string): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

export const BackupBanner: React.FC<BackupBannerProps> = ({
  meta,
  hasRecords,
  onRunBackup,
  onSkipBackup,
}) => {
  if (!hasRecords) return null;

  const days = daysSince(meta?.at);
  if (days < BACKUP_INTERVAL_DAYS) return null;

  const neverBackedUp = !meta || !meta.at;
  const daysText = neverBackedUp
    ? 'No backup has been taken yet.'
    : `It has been ${Math.floor(days)} days since the last backup${
        meta?.by ? ` (by ${meta.by})` : ''
      }.`;

  return (
    <div className="backupBanner">
      <div className="bbText">
        Weekly backup due
        <small>{daysText} Download all records as Excel and keep the file safe.</small>
      </div>
      <div className="bbActions">
        <button type="button" className="backupSkip" onClick={onSkipBackup}>
          Remind next week
        </button>
        <button type="button" className="backupBtn" onClick={onRunBackup}>
          Download backup now
        </button>
      </div>
    </div>
  );
};
