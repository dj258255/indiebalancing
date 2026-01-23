'use client';

import { useState, useMemo } from 'react';
import { X, Search, Copy, Check, ChevronRight, Book, Swords, TrendingUp, Coins, Percent, BarChart3, Wrench } from 'lucide-react';
import {
  FORMULA_PRESETS,
  FORMULA_CATEGORIES,
  getPresetsByCategory,
  searchPresets,
  applyPresetParams,
  type FormulaPreset,
  type FormulaCategory,
} from '@/lib/formulaPresets';
import { useTranslations } from 'next-intl';

interface FormulaPresetPickerProps {
  onSelect: (formula: string) => void;
  onClose: () => void;
}

// 카테고리별 아이콘
const CATEGORY_ICONS: Record<FormulaCategory, typeof Swords> = {
  combat: Swords,
  growth: TrendingUp,
  economy: Coins,
  probability: Percent,
  stat: BarChart3,
  utility: Wrench,
};

export default function FormulaPresetPicker({ onSelect, onClose }: FormulaPresetPickerProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FormulaCategory | 'all'>('all');
  const [selectedPreset, setSelectedPreset] = useState<FormulaPreset | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // 카테고리별 그룹화된 프리셋
  const presetsByCategory = useMemo(() => getPresetsByCategory(), []);

  // 필터링된 프리셋
  const filteredPresets = useMemo(() => {
    let presets = searchQuery ? searchPresets(searchQuery) : FORMULA_PRESETS;

    if (selectedCategory !== 'all') {
      presets = presets.filter(p => p.category === selectedCategory);
    }

    return presets;
  }, [searchQuery, selectedCategory]);

  // 프리셋 선택
  const handleSelectPreset = (preset: FormulaPreset) => {
    setSelectedPreset(preset);
    // 기본값으로 파라미터 초기화
    const defaultParams: Record<string, string> = {};
    preset.params?.forEach(p => {
      defaultParams[p.name] = p.defaultValue;
    });
    setParams(defaultParams);
  };

  // 수식 적용
  const handleApply = () => {
    if (!selectedPreset) return;

    const formula = applyPresetParams(selectedPreset, params);
    onSelect(formula);
    onClose();
  };

  // 수식 복사
  const handleCopy = () => {
    if (!selectedPreset) return;

    const formula = applyPresetParams(selectedPreset, params);
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 미리보기 수식
  const previewFormula = selectedPreset ? applyPresetParams(selectedPreset, params) : '';

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-4">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <Book className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('formulaPreset.title')}</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('formulaPreset.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 프리셋 목록 */}
          <div className="w-1/2 border-r flex flex-col" style={{ borderColor: 'var(--border-primary)' }}>
            {/* 검색 */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('formulaPreset.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* 카테고리 탭 */}
            <div className="flex gap-1 p-2 border-b overflow-x-auto" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)]'
                }`}
                style={{ color: selectedCategory === 'all' ? 'white' : 'var(--text-secondary)' }}
              >
                {t('formulaPreset.all')}
              </button>
              {(Object.keys(FORMULA_CATEGORIES) as FormulaCategory[]).map(cat => {
                const Icon = CATEGORY_ICONS[cat];
                const info = FORMULA_CATEGORIES[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat ? '' : 'bg-[var(--bg-tertiary)]'
                    }`}
                    style={{
                      background: selectedCategory === cat ? info.color : undefined,
                      color: selectedCategory === cat ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {info.name}
                  </button>
                );
              })}
            </div>

            {/* 프리셋 목록 */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredPresets.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {t('formulaPreset.noResults')}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPresets.map(preset => {
                    const Icon = CATEGORY_ICONS[preset.category];
                    const catInfo = FORMULA_CATEGORIES[preset.category];
                    const isSelected = selectedPreset?.id === preset.id;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isSelected ? 'ring-2 ring-[var(--accent)]' : ''
                        }`}
                        style={{
                          background: isSelected ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${catInfo.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: catInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {preset.name}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {preset.description}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 상세 & 설정 */}
          <div className="w-1/2 flex flex-col">
            {selectedPreset ? (
              <>
                {/* 프리셋 정보 */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {selectedPreset.name}
                  </div>
                  <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {selectedPreset.description}
                  </div>
                  {selectedPreset.example && (
                    <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      {t('formulaPreset.example')} {selectedPreset.example}
                    </div>
                  )}
                </div>

                {/* 파라미터 설정 */}
                {selectedPreset.params && selectedPreset.params.length > 0 && (
                  <div className="p-4 border-b flex-1 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>{t('formulaPreset.parameters')}</div>
                    <div className="space-y-3">
                      {selectedPreset.params.map(param => (
                        <div key={param.name}>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {param.name} - {param.description}
                          </label>
                          <input
                            type="text"
                            value={params[param.name] || ''}
                            onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                            placeholder={param.defaultValue}
                            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-primary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 미리보기 & 액션 */}
                <div className="p-4">
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('formulaPreset.preview')}</div>
                  <div
                    className="p-3 rounded-lg font-mono text-sm mb-4 break-all"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}
                  >
                    {previewFormula}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          {t('formulaPreset.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('formulaPreset.copy')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleApply}
                      className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
                      style={{
                        background: 'var(--accent)',
                        color: 'white'
                      }}
                    >
                      {t('formulaPreset.apply')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Book className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {t('formulaPreset.selectPreset')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
