'use client';

import {
  FormulaHelper,
  BalanceValidator,
  DifficultyCurve,
  SimulationPanel,
} from '@/components/panels';

interface BottomPanelsProps {
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
}

const panelBaseStyle = {
  height: '60vh',
  background: 'var(--bg-primary)',
  borderTop: '1px solid var(--border-primary)',
  borderLeft: '1px solid var(--border-primary)',
  borderRight: '1px solid var(--border-primary)',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
};

export default function BottomPanels({ show, setShow }: BottomPanelsProps) {
  return (
    <>
      {show.formulaHelper && (
        <div
          className="fixed bottom-0 z-30 overflow-hidden hidden md:block"
          style={{
            ...panelBaseStyle,
            left: '224px',
            width: 'calc((100% - 224px) / 4)',
          }}
        >
          <FormulaHelper onClose={() => setShow.formulaHelper(false)} />
        </div>
      )}

      {show.balanceValidator && (
        <div
          className="fixed bottom-0 z-30 overflow-hidden hidden md:block"
          style={{
            ...panelBaseStyle,
            left: 'calc((100% - 224px) / 4 + 224px)',
            width: 'calc((100% - 224px) / 4)',
          }}
        >
          <BalanceValidator onClose={() => setShow.balanceValidator(false)} />
        </div>
      )}

      {show.difficultyCurve && (
        <div
          className="fixed bottom-0 z-30 overflow-hidden hidden md:block"
          style={{
            ...panelBaseStyle,
            left: 'calc((100% - 224px) / 4 * 2 + 224px)',
            width: 'calc((100% - 224px) / 4)',
          }}
        >
          <DifficultyCurve onClose={() => setShow.difficultyCurve(false)} />
        </div>
      )}

      {show.simulation && (
        <div
          className="fixed bottom-0 z-30 overflow-hidden hidden md:block"
          style={{
            ...panelBaseStyle,
            left: 'calc((100% - 224px) / 4 * 3 + 224px)',
            width: 'calc((100% - 224px) / 4)',
          }}
        >
          <SimulationPanel onClose={() => setShow.simulation(false)} />
        </div>
      )}
    </>
  );
}
