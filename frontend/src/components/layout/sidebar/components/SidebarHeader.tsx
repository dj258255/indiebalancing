/**
 * SidebarHeader - 사이드바 헤더 컴포넌트
 */

'use client';

import Image from 'next/image';
import { ThemeToggle } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslations } from 'next-intl';

export function SidebarHeader() {
  const t = useTranslations();
  const { theme } = useTheme();

  return (
    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
      <div className="flex items-center gap-2">
        <Image src={theme === 'dark' ? '/icon-dark.svg' : '/icon.svg'} alt="Logo" width={24} height={24} className="rounded" />
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t('app.name')}</span>
      </div>
      <ThemeToggle />
    </div>
  );
}
