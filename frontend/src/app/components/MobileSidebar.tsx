'use client';

import { Sidebar } from '@/components/layout';

interface SidebarCallbacks {
  onShowChart: () => void;
  onShowHelp: () => void;
  onShowCalculator: () => void;
  onShowComparison: () => void;
  onShowReferences: () => void;
  onShowPresetComparison: () => void;
  onShowGameEngineExport: () => void;
  onShowGameEngineImport: () => void;
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  callbacks: SidebarCallbacks;
}

export default function MobileSidebar({ isOpen, onClose, callbacks }: MobileSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute left-0 top-0 bottom-0 w-72 animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <Sidebar {...callbacks} />
      </div>
    </div>
  );
}
