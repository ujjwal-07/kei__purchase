'use client';

import React, { useState, useEffect } from 'react';
import { Currency, PurchaseRequest } from '@/types';
import { POPULAR_BRANDS, fmtINR } from '@/lib/utils';

interface PurchaseFormProps {
  editingRequest: PurchaseRequest | null;
  onSubmit: (formData: {
    brand: string;
    model: string;
    qty: number;
    value: number;
    currency: Currency;
    rate: number;
    remarks: string;
  }) => Promise<boolean>;
  onCancelEdit: () => void;
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  editingRequest,
  onSubmit,
  onCancelEdit,
}) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [qty, setQty] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rate, setRate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [loading, setLoading] = useState(false);

  // Populate or reset form when editingRequest changes
  useEffect(() => {
    if (editingRequest) {
      setBrand(editingRequest.brand || '');
      setModel(editingRequest.model || '');
      setQty(editingRequest.qty?.toString() || '');
      setValue(editingRequest.value?.toString() || '');
      setCurrency(editingRequest.currency || 'USD');
      setRate(editingRequest.currency === 'INR' ? '1' : editingRequest.rate?.toString() || '');
      setRemarks(editingRequest.remarks || '');
      setShowAddAnother(false);
    } else {
      resetForm();
    }
  }, [editingRequest]);

  const resetForm = () => {
    setBrand('');
    setModel('');
    setQty('');
    setValue('');
    setCurrency('USD');
    setRate('');
    setRemarks('');
  };

  const handleCurrencyChange = (newCur: Currency) => {
    setCurrency(newCur);
    if (newCur === 'INR') {
      setRate('1');
    } else if (rate === '1') {
      setRate('');
    }
  };

  // Live calculation
  const numQty = parseFloat(qty) || 0;
  const numVal = parseFloat(value) || 0;
  const numRate = currency === 'INR' ? 1 : parseFloat(rate) || 0;
  const liveTotalINR = numQty * numVal * numRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onSubmit({
      brand: brand.trim(),
      model: model.trim(),
      qty: numQty,
      value: numVal,
      currency,
      rate: numRate,
      remarks: remarks.trim(),
    });

    setLoading(false);

    if (success) {
      if (!editingRequest) {
        resetForm();
        setShowAddAnother(true);
      }
    }
  };

  const handleAddAnotherClick = () => {
    setShowAddAnother(false);
    const brandInput = document.getElementById('fBrand');
    if (brandInput) brandInput.focus();
  };

  const isEditing = !!editingRequest;
  const isEditingApproved = isEditing && editingRequest.status === 'approved';

  return (
    <div className="panel" id="addPanel">
      {isEditing ? (
        <div className="editModeHeader">
          <span>
            {isEditingApproved
              ? `✏️ Editing Approved Request (${editingRequest.ref}) — updates will preserve approval and record audit trail`
              : `✏️ Editing Request (${editingRequest.ref})`}
          </span>
          <button
            type="button"
            className="actionLink"
            onClick={onCancelEdit}
            style={{ color: 'var(--brass)', fontWeight: 700 }}
          >
            Cancel Edit
          </button>
        </div>
      ) : (
        <>
          <h3>New Purchase Request</h3>
          <p className="hint">
            Enter values in USD, EUR or INR. For USD/EUR, specify today&apos;s exchange rate — the INR line total is computed automatically.
          </p>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div className="formGrid">
          <div className="field wide">
            <label htmlFor="fBrand">Brand</label>
            <input
              id="fBrand"
              type="text"
              list="brandOptions"
              placeholder="Pick or type a brand"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setShowAddAnother(false);
              }}
              autoComplete="off"
              required
            />
            <datalist id="brandOptions">
              {POPULAR_BRANDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          <div className="field wide">
            <label htmlFor="fModel">Model</label>
            <input
              id="fModel"
              type="text"
              placeholder="e.g. Debut B6.2"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setShowAddAnother(false);
              }}
              autoComplete="off"
              required
            />
          </div>

          <div className="field narrow">
            <label htmlFor="fQty">Qty</label>
            <input
              id="fQty"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                setShowAddAnother(false);
              }}
              autoComplete="off"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="fValue">Unit Value</label>
            <input
              id="fValue"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setShowAddAnother(false);
              }}
              autoComplete="off"
              required
            />
          </div>

          <div className="field narrow">
            <label htmlFor="fCurrency">Currency</label>
            <select
              id="fCurrency"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div
            className="field"
            style={{ opacity: currency === 'INR' ? 0.55 : 1 }}
          >
            <label htmlFor="fRate">
              Exchange Rate <small>(₹ per unit)</small>
            </label>
            <input
              id="fRate"
              type="number"
              min="0"
              step="0.01"
              placeholder={currency === 'INR' ? '1' : 'e.g. 86.50'}
              value={rate}
              disabled={currency === 'INR'}
              onChange={(e) => {
                setRate(e.target.value);
                setShowAddAnother(false);
              }}
              autoComplete="off"
              required={currency !== 'INR'}
            />
          </div>

          <div className="field wide">
            <label htmlFor="fRemarks">
              Remarks <small>(optional)</small>
            </label>
            <input
              id="fRemarks"
              type="text"
              placeholder="e.g. urgent, project name, backorder"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="formFooter">
          <div className="liveCalc">
            Line Total (INR): <b>{fmtINR(liveTotalINR)}</b>
          </div>

          <div className="btnGroup">
            {isEditing && (
              <button
                type="button"
                className="actionLink"
                onClick={onCancelEdit}
                style={{ marginRight: '8px' }}
              >
                Cancel edit
              </button>
            )}

            {showAddAnother && !isEditing && (
              <button
                type="button"
                className="addAnotherBtn"
                onClick={handleAddAnotherClick}
              >
                + Add Another
              </button>
            )}

            <button
              type="submit"
              className={`primaryBtn ${isEditing ? 'editing' : ''}`}
              disabled={loading}
            >
              {loading
                ? 'Processing…'
                : isEditing
                ? isEditingApproved
                  ? 'Update Approved Entry'
                  : 'Update Entry'
                : 'Add to Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
