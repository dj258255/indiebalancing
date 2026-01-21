'use client';

import { useState } from 'react';
import { X, Search, FileSpreadsheet, Check, Filter, Link2 } from 'lucide-react';
import {
  sheetTemplates,
  templateCategories,
  gameGenres,
  getTemplatesByCategory,
  createSheetFromTemplate,
  type SheetTemplate,
} from '@/lib/templates';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TemplateSelectorProps {
  projectId: string;
  onClose: () => void;
  onSelect?: (sheetId: string) => void;
}

export default function TemplateSelector({ projectId, onClose, onSelect }: TemplateSelectorProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SheetTemplate | null>(null);

  const { projects, loadProjects } = useProjectStore();

  // 필터링된 템플릿
  const getFilteredTemplates = () => {
    let result = sheetTemplates;

    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // 장르 필터
    if (selectedGenre) {
      result = result.filter((t) => t.genre?.includes(selectedGenre));
    }

    // 카테고리 필터
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    return result;
  };

  const filteredTemplates = getFilteredTemplates();

  // 템플릿으로 시트 생성
  const handleCreateSheet = () => {
    if (!selectedTemplate) return;

    const newSheet = createSheetFromTemplate(selectedTemplate);

    // 프로젝트에 시트 추가
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          sheets: [...p.sheets, newSheet],
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    loadProjects(updatedProjects);
    onSelect?.(newSheet.id);
    onClose();
  };

  // 빈 시트 생성
  const handleCreateEmptySheet = async () => {
    const now = Date.now();
    const { v4: generateId } = await import('uuid');

    const newSheet = {
      id: generateId(),
      name: t('templateSelector.newSheet'),
      columns: [
        { id: generateId(), name: 'ID', type: 'general' as const, width: 80 },
        { id: generateId(), name: t('templateSelector.colName'), type: 'general' as const, width: 150 },
        { id: generateId(), name: t('templateSelector.colValue'), type: 'general' as const, width: 100 },
        { id: generateId(), name: t('templateSelector.colDesc'), type: 'general' as const, width: 200 },
      ],
      rows: [],
      createdAt: now,
      updatedAt: now,
    };

    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          sheets: [...p.sheets, newSheet],
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    loadProjects(updatedProjects);
    onSelect?.(newSheet.id);
    onClose();
  };

  // 필터 초기화
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedGenre(null);
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('templateSelector.title')}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {t('templateSelector.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 필터 영역 */}
        <div
          className="px-6 py-3 border-b space-y-3"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
        >
          {/* 장르 선택 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('templateSelector.gameGenre')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gameGenres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                  className="px-3 py-1.5 text-sm rounded-full border transition-colors"
                  style={{
                    background: selectedGenre === genre.id ? 'var(--accent)' : 'var(--bg-primary)',
                    color: selectedGenre === genre.id ? 'white' : 'var(--text-secondary)',
                    borderColor: selectedGenre === genre.id ? 'var(--accent)' : 'var(--border-secondary)',
                  }}
                  title={genre.description}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 + 활성 필터 (한 줄로) */}
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative flex-shrink-0" style={{ width: '240px' }}>
              <div
                className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center pointer-events-none rounded-l-lg"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <input
                type="text"
                placeholder={t('templateSelector.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--accent)',
                }}
              />
            </div>

            {/* 활성 필터 표시 - 항상 표시 */}
            <div className="flex items-center gap-2 flex-1 min-h-[32px]">
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {t('templateSelector.activeFilters')}
              </span>
              {selectedGenre && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  {gameGenres.find((g) => g.id === selectedGenre)?.name}
                </span>
              )}
              {selectedCategory && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ background: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}
                >
                  {templateCategories.find((c) => c.id === selectedCategory)?.name}
                </span>
              )}
              {searchQuery && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  &quot;{searchQuery}&quot;
                </span>
              )}
              {!selectedGenre && !selectedCategory && !searchQuery && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {t('templateSelector.none')}
                </span>
              )}
              {(selectedGenre || selectedCategory || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-xs underline transition-colors ml-1"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                  {t('templateSelector.reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 카테고리 사이드바 */}
          <div
            className="w-44 border-r p-3 overflow-y-auto"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
          >
            <button
              onClick={handleCreateEmptySheet}
              className="w-full flex items-center gap-2 px-3 py-2 mb-3 text-sm rounded-lg transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t('templateSelector.emptySheet')}
            </button>

            <div
              className="text-xs font-medium uppercase tracking-wide mb-2 px-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('templateSelector.category')}
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors"
              style={{
                background: !selectedCategory ? 'var(--accent-light)' : 'transparent',
                color: !selectedCategory ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (selectedCategory) e.currentTarget.style.background = 'transparent';
              }}
            >
              {t('templateSelector.all')}
            </button>

            {templateCategories.map((cat) => {
              // 현재 장르 필터에 맞는 템플릿 수 계산
              const count = selectedGenre
                ? sheetTemplates.filter(
                    (t) => t.category === cat.id && t.genre?.includes(selectedGenre)
                  ).length
                : getTemplatesByCategory(cat.id).length;

              if (count === 0 && selectedGenre) return null;

              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                  }
                  className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1 flex items-center gap-2 transition-colors"
                  style={{
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 템플릿 목록 */}
          <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg-primary)' }}>
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                <p className="mb-2">{t('templateSelector.noTemplates')}</p>
                <button
                  onClick={clearFilters}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('templateSelector.resetFilters')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="text-left p-4 border rounded-lg transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-primary)',
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-primary)',
                        boxShadow: isSelected ? '0 0 0 2px var(--accent-light)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-primary)';
                          e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-medium truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {template.name}
                          </h3>
                          <p
                            className="text-sm mt-1 line-clamp-2"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {template.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                            style={{ background: 'var(--accent)' }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* 장르 태그 */}
                      {template.genre && template.genre.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.genre.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="px-1.5 py-0.5 text-xs rounded"
                              style={{
                                background: 'var(--accent-light)',
                                color: 'var(--accent)',
                              }}
                            >
                              {gameGenres.find((genre) => genre.id === g)?.name || g}
                            </span>
                          ))}
                          {template.genre.length > 3 && (
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              +{template.genre.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 열 미리보기 */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.columns.slice(0, 4).map((col, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {col.name}
                          </span>
                        ))}
                        {template.columns.length > 4 && (
                          <span
                            className="px-2 py-0.5 text-xs"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            +{template.columns.length - 4}
                          </span>
                        )}
                      </div>

                      {/* 의존성 표시 */}
                      {template.dependencies && template.dependencies.length > 0 && (
                        <div
                          className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                          style={{
                            background: 'var(--primary-purple-light)',
                            color: 'var(--primary-purple)',
                          }}
                        >
                          <Link2 className="w-3 h-3" />
                          <span>
                            {t('templateSelector.requires')} {template.dependencies.map(d => d.sheetName).join(', ')}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {selectedTemplate ? (
              <div className="flex flex-col gap-1">
                <span>
                  {t('templateSelector.selected')} <strong style={{ color: 'var(--text-primary)' }}>{selectedTemplate.name}</strong>{' '}
                  ({t('templateSelector.columns', { count: selectedTemplate.columns.length })}
                  {selectedTemplate.sampleRows?.length
                    ? `, ${t('templateSelector.samples', { count: selectedTemplate.sampleRows.length })}`
                    : ''}
                  )
                </span>
                {selectedTemplate.dependencies && selectedTemplate.dependencies.length > 0 && (
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: 'var(--primary-purple)' }}
                  >
                    <Link2 className="w-3 h-3" />
                    {t('templateSelector.refSheetRequired')} {selectedTemplate.dependencies.map((d, i) => (
                      <span key={d.templateId}>
                        <strong>{d.sheetName}</strong>
                        <span style={{ color: 'var(--text-tertiary)' }}> ({d.description})</span>
                        {i < selectedTemplate.dependencies!.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            ) : (
              <span>{t('templateSelector.templates', { count: filteredTemplates.length })}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreateSheet}
              disabled={!selectedTemplate}
              className={cn('px-4 py-2 rounded-lg transition-colors', !selectedTemplate && 'opacity-50 cursor-not-allowed')}
              style={{
                background: selectedTemplate ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: selectedTemplate ? 'white' : 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => {
                if (selectedTemplate) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (selectedTemplate) e.currentTarget.style.opacity = '1';
              }}
            >
              {t('templateSelector.createSheet')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
