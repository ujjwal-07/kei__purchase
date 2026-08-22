import { Currency } from '@/types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  INR: '₹',
};

export const POPULAR_BRANDS = [
  'ELAC',
  'Fyne Audio',
  'Primare',
  'Advance Paris',
  'ToneWinner',
  'Totem Acoustic',
  'Origin Acoustics',
  'Adept Audio',
  'Fonestar',
  'Ecler',
  'Inakustik',
  'Kasper',
  'Dune HD',
  'JVC',
];

export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function fmtINR(n: number | undefined | null): string {
  const val = Math.round(Number(n || 0));
  return '₹' + val.toLocaleString('en-IN');
}

export function fmtFC(n: number | undefined | null, currency: Currency): string {
  const val = Number(n || 0);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  return symbol + val.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateRef(dateStr?: string): string {
  const date = dateStr || todayISO();
  const compact = date.slice(2).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PO${compact}-${rand}`;
}
