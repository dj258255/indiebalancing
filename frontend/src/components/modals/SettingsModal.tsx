'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch, Locale } from '@/lib/i18n';
import { useEscapeKey } from '@/hooks';
import { Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSwitch();

  // ESC 키로 닫기
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: Locale) => {
    setLocale(lang);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const languages: { code: Locale; name: string; nativeName: string }[] = [
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('settings.language')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-500/20 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Language List */}
        <div className="py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                backgroundColor: locale === lang.code ? 'var(--accent-light)' : 'transparent',
              }}
            >
              <div className="flex flex-col items-start">
                <span
                  className="text-sm font-medium"
                  style={{ color: locale === lang.code ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {lang.nativeName}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {lang.name}
                </span>
              </div>
              {locale === lang.code && (
                <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
