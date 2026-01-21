'use client';

import { FunctionSquare, Shield, TrendingUp, Swords } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BottomToolbarProps {
  show: {
    formulaHelper: boolean;
    balanceValidator: boolean;
    difficultyCurve: boolean;
    simulation: boolean;
  };
  setShow: {
    formulaHelper: (value: boolean) => void;
    balanceValidator: (value: boolean) => void;
    difficultyCurve: (value: boolean) => void;
    simulation: (value: boolean) => void;
  };
  isModalOpen: boolean;
}

export default function BottomToolbar({ show, setShow, isModalOpen }: BottomToolbarProps) {
  const t = useTranslations();

  const buttons = [
    {
      key: 'formulaHelper',
      icon: FunctionSquare,
      label: t('bottomTabs.formulaHelper'),
      color: 'var(--primary-blue)',
      isActive: show.formulaHelper,
      onClick: () => setShow.formulaHelper(!show.formulaHelper),
    },
    {
      key: 'balanceValidator',
      icon: Shield,
      label: t('bottomTabs.balanceValidator'),
      color: 'var(--primary-green)',
      isActive: show.balanceValidator,
      onClick: () => setShow.balanceValidator(!show.balanceValidator),
    },
    {
      key: 'difficultyCurve',
      icon: TrendingUp,
      label: t('bottomTabs.difficultyCurve'),
      color: 'var(--primary-purple)',
      isActive: show.difficultyCurve,
      onClick: () => setShow.difficultyCurve(!show.difficultyCurve),
    },
    {
      key: 'simulation',
      icon: Swords,
      label: t('bottomTabs.simulation'),
      color: 'var(--primary-red)',
      isActive: show.simulation,
      onClick: () => setShow.simulation(!show.simulation),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 md:left-56 lg:left-64 right-0 z-30 pointer-events-none">
      <div className="flex justify-around pointer-events-auto">
        {buttons.map((button) => (
          <button
            key={button.key}
            onClick={() => {
              if (!isModalOpen) {
                button.onClick();
              }
            }}
            disabled={isModalOpen}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-t-xl ${
              button.isActive
                ? 'liquid-glass-active'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-t border-l border-r border-[var(--border-primary)]'
            } ${isModalOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              color: button.isActive ? button.color : undefined,
            }}
          >
            <button.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
