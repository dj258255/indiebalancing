'use client';

import { useState, useRef, useMemo } from 'react';

interface BattleLogEntry {
  time: number;
  actor: string;
  remainingHp?: number;
  target?: string;
}

interface HpTimelineGraphProps {
  log: BattleLogEntry[];
  unit1Name: string;
  unit2Name: string;
  unit1MaxHp: number;
  unit2MaxHp: number;
}

export function HpTimelineGraph({
  log,
  unit1Name,
  unit2Name,
  unit1MaxHp,
  unit2MaxHp
}: HpTimelineGraphProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ time: number; unit1Hp: number; unit2Hp: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 로그에서 시간별 HP 추출
  const hpTimeline = useMemo(() => {
    const timeline: { time: number; unit1Hp: number; unit2Hp: number }[] = [];
    let unit1Hp = unit1MaxHp;
    let unit2Hp = unit2MaxHp;

    timeline.push({ time: 0, unit1Hp, unit2Hp });

    for (const entry of log) {
      if (entry.remainingHp !== undefined && entry.target) {
        if (entry.target === unit1Name) {
          unit1Hp = entry.remainingHp;
        } else if (entry.target === unit2Name) {
          unit2Hp = entry.remainingHp;
        }
        timeline.push({ time: entry.time, unit1Hp: Math.max(0, unit1Hp), unit2Hp: Math.max(0, unit2Hp) });
      }
    }

    return timeline;
  }, [log, unit1Name, unit2Name, unit1MaxHp, unit2MaxHp]);

  if (hpTimeline.length < 2) return null;

  const maxTime = Math.max(...hpTimeline.map(t => t.time));

  const getX = (time: number) => (time / maxTime) * 100;
  const getY = (hp: number, maxUnitHp: number) => 100 - (hp / maxUnitHp) * 100;

  // SVG path 생성
  const createPath = (getData: (point: typeof hpTimeline[0]) => number, maxUnitHp: number) => {
    return hpTimeline.map((point, i) => {
      const x = getX(point.time);
      const y = getY(getData(point), maxUnitHp);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const unit1Path = createPath(p => p.unit1Hp, unit1MaxHp);
  const unit2Path = createPath(p => p.unit2Hp, unit2MaxHp);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * maxTime;

    // 가장 가까운 포인트 찾기
    let closest = hpTimeline[0];
    for (const point of hpTimeline) {
      if (Math.abs(point.time - x) < Math.abs(closest.time - x)) {
        closest = point;
      }
    }
    setHoveredPoint(closest);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative h-32 rounded-lg overflow-hidden cursor-crosshair"
        style={{ background: 'var(--bg-primary)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {/* Grid lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Unit 1 HP line */}
          <path d={unit1Path} fill="none" stroke="var(--primary-blue)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

          {/* Unit 2 HP line */}
          <path d={unit2Path} fill="none" stroke="var(--primary-red)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              <line
                x1={getX(hoveredPoint.time)} y1="0"
                x2={getX(hoveredPoint.time)} y2="100"
                stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={getX(hoveredPoint.time)}
                cy={getY(hoveredPoint.unit1Hp, unit1MaxHp)}
                r="3" fill="var(--primary-blue)"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={getX(hoveredPoint.time)}
                cy={getY(hoveredPoint.unit2Hp, unit2MaxHp)}
                r="3" fill="var(--primary-red)"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded text-xs z-10"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
          >
            <div style={{ color: 'var(--text-tertiary)' }}>{hoveredPoint.time.toFixed(1)}s</div>
            <div style={{ color: 'var(--primary-blue)' }}>{unit1Name}: {hoveredPoint.unit1Hp.toFixed(0)} HP</div>
            <div style={{ color: 'var(--primary-red)' }}>{unit2Name}: {hoveredPoint.unit2Hp.toFixed(0)} HP</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>0s</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ background: 'var(--primary-blue)' }} />
            {unit1Name}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ background: 'var(--primary-red)' }} />
            {unit2Name}
          </span>
        </div>
        <span>{maxTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}
