'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, HelpCircle, Lock, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FormulaAutocomplete from './FormulaAutocomplete';
import type { Column, ColumnType, DataType, ValidationConfig } from '@/types';

interface ColumnModalProps {
  column?: Column;
  columns: Column[];
  onSave: (data: {
    name: string;
    type: ColumnType;
    formula?: string;
    validation?: ValidationConfig;
    locked?: boolean;
    exportName?: string;
  }) => void;
  onClose: () => void;
  mode: 'add' | 'edit';
}

export default function ColumnModal({
  column,
  columns,
  onSave,
  onClose,
  mode,
}: ColumnModalProps) {
  const t = useTranslations();
  const [name, setName] = useState(column?.name || '');
  const [type, setType] = useState<ColumnType>(column?.type || 'general');
  const [formula, setFormula] = useState(column?.formula || '');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showValidation, setShowValidation] = useState(!!column?.validation);
  const [dataType, setDataType] = useState<DataType>(column?.validation?.dataType || 'any');
  const [minValue, setMinValue] = useState(column?.validation?.min?.toString() || '');
  const [maxValue, setMaxValue] = useState(column?.validation?.max?.toString() || '');
  const [required, setRequired] = useState(column?.validation?.required || false);
  const [locked, setLocked] = useState(column?.locked || false);
  const [exportName, setExportName] = useState(column?.exportName || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (formula.startsWith('=') && formula.length > 1) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [formula]);

  const handleSave = () => {
    if (!name.trim()) return;

    const data: {
      name: string;
      type: ColumnType;
      formula?: string;
      validation?: ValidationConfig;
      locked?: boolean;
      exportName?: string;
    } = {
      name: name.trim(),
      type,
      locked,
    };

    // Export Name 설정 (빈 문자열이면 undefined로)
    if (exportName.trim()) {
      data.exportName = exportName.trim();
    }

    if (type === 'formula') {
      data.formula = formula.startsWith('=') ? formula : `=${formula}`;
    }

    if (showValidation) {
      data.validation = {
        dataType,
        required,
      };
      if (minValue !== '') {
        data.validation.min = parseFloat(minValue);
      }
      if (maxValue !== '') {
        data.validation.max = parseFloat(maxValue);
      }
    }

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="card w-full max-w-md animate-scaleIn max-h-[95vh] overflow-y-auto">
        <div className="border-b px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between" style={{
          borderColor: 'var(--border-primary)'
        }}>
          <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
            {mode === 'add' ? t('column.addTitle') : t('column.editTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('column.name')}
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={t('column.namePlaceholder')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              {t('column.exportName')}
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                ({t('common.optional')})
              </span>
            </label>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={t('column.exportNamePlaceholder')}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('column.exportNameHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('column.type')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('general')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  type === 'general' ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  background: type === 'general' ? 'var(--accent-light)' : 'var(--bg-primary)',
                  borderColor: type === 'general' ? 'var(--accent)' : 'var(--border-primary)',
                  color: type === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--accent)',
                }}
              >
                <div className="font-semibold">{t('column.typeGeneral')}</div>
                <div className="text-xs mt-0.5 opacity-70">{t('column.typeGeneralDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => setType('formula')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  type === 'formula' ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  background: type === 'formula' ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                  borderColor: type === 'formula' ? 'var(--primary-purple)' : 'var(--border-primary)',
                  color: type === 'formula' ? 'var(--primary-purple)' : 'var(--text-secondary)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--primary-purple)',
                }}
              >
                <div className="font-semibold">ƒ {t('column.typeFormula')}</div>
                <div className="text-xs mt-0.5 opacity-70">{t('column.typeFormulaDesc')}</div>
              </button>
            </div>
          </div>

          {type === 'formula' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('column.formula')}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder={t('column.formulaPlaceholder')}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--primary-purple)',
                    color: 'var(--text-primary)'
                  }}
                />
                {showAutocomplete && (
                  <FormulaAutocomplete
                    value={formula}
                    columns={columns.filter(c => c.id !== column?.id)}
                    onSelect={(newValue) => {
                      setFormula(newValue);
                      inputRef.current?.focus();
                    }}
                  />
                )}
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {t('column.formulaHelp')}
              </p>
            </div>
          )}

          <div className="border-t pt-3" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setShowValidation(!showValidation)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: showValidation ? 'var(--primary-blue)' : 'var(--border-secondary)',
                    background: showValidation ? 'var(--primary-blue)' : 'transparent',
                  }}
                >
                  {showValidation && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('column.validation')}
                </span>
              </label>
              <div className="relative group">
                <HelpCircle className="w-4 h-4 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                <div className="absolute right-0 bottom-full mb-2 w-56 p-2 rounded-lg shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('column.validationHelp')}</p>
                  <p>{t('column.validationHelpDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          {showValidation && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {t('column.dataType')}
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as DataType)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="any">{t('column.dataTypeAuto')}</option>
                  <option value="number">{t('column.dataTypeNumber')}</option>
                  <option value="integer">{t('column.dataTypeInteger')}</option>
                  <option value="text">{t('column.dataTypeText')}</option>
                </select>
              </div>

              {(dataType === 'number' || dataType === 'integer' || dataType === 'any') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      {t('column.minValue')}
                    </label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                      placeholder={t('column.none')}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      {t('column.maxValue')}
                    </label>
                    <input
                      type="number"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                      placeholder={t('column.none')}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setRequired(!required)}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: required ? 'var(--primary-blue)' : 'var(--border-secondary)',
                    background: required ? 'var(--primary-blue)' : 'transparent',
                  }}
                >
                  {required && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('column.required')}
                </span>
              </label>
            </div>
          )}

          <div className="border-t pt-3" style={{ borderColor: 'var(--border-primary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                onClick={() => setLocked(!locked)}
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: locked ? 'var(--warning)' : 'var(--border-secondary)',
                  background: locked ? 'var(--warning)' : 'transparent',
                }}
              >
                {locked && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <Lock className="w-4 h-4" style={{ color: locked ? 'var(--warning)' : 'var(--text-tertiary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('column.lock')}
              </span>
            </label>
          </div>
        </div>
        <div className="border-t px-4 sm:px-5 py-3 sm:py-4 flex justify-end gap-2" style={{
          borderColor: 'var(--border-primary)'
        }}>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            {mode === 'add' ? t('common.add') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
