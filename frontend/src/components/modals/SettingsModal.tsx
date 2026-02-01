'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch, Locale } from '@/lib/i18n';
import { useEscapeKey } from '@/hooks';
import { useAuthStore } from '@/stores/authStore';
import { Check, Globe, Cloud, Monitor } from 'lucide-react';

type SettingsTab = 'language' | 'sync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSwitch();
  const [activeTab, setActiveTab] = useState<SettingsTab>('language');

  // Auth store
  const { serverUrl, setServerUrl, isAuthenticated, user, logout } = useAuthStore();
  const [inputServerUrl, setInputServerUrl] = useState(serverUrl ?? '');

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

  const handleSaveServerUrl = () => {
    const url = inputServerUrl.trim();
    setServerUrl(url || null);
  };

  const languages: { code: Locale; name: string; nativeName: string }[] = [
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];

  const tabs = [
    { id: 'language' as const, icon: Globe, label: t('settings.language') },
    { id: 'sync' as const, icon: Cloud, label: t('settings.sync') },
  ];

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
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
            {t('settings.title')}
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

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 pt-3"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="py-4">
          {activeTab === 'language' && (
            <div>
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
          )}

          {activeTab === 'sync' && (
            <div className="px-5 space-y-4">
              {/* 현재 모드 표시 */}
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <Monitor className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('settings.currentMode')}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {serverUrl ? t('settings.cloudMode') : t('settings.localMode')}
                  </div>
                </div>
              </div>

              {/* 서버 URL 설정 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('settings.serverUrl')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputServerUrl}
                    onChange={(e) => setInputServerUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="flex-1 px-3 py-2 text-sm rounded-lg"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleSaveServerUrl}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                    }}
                  >
                    {t('common.save')}
                  </button>
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {t('settings.serverUrlHint')}
                </p>
              </div>

              {/* 로그인 상태 */}
              {serverUrl && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {isAuthenticated && user ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {user.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {user.email}
                        </div>
                      </div>
                      <button
                        onClick={logout}
                        className="px-3 py-1 text-xs font-medium rounded-lg transition-colors hover:bg-red-500/20"
                        style={{ color: 'var(--error)' }}
                      >
                        {t('settings.logout')}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {t('settings.notLoggedIn')}
                      </p>
                      <button
                        onClick={() => {
                          // TODO: 로그인 모달 열기
                          console.log('Open login modal');
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'white',
                        }}
                      >
                        {t('settings.login')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 로컬 모드 안내 */}
              {!serverUrl && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--accent)' }}>
                    {t('settings.localModeDescription')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
