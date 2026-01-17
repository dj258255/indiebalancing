'use client';

import { useState } from 'react';
import { X, Search, FileSpreadsheet, Check, Filter } from 'lucide-react';
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

interface TemplateSelectorProps {
  projectId: string;
  onClose: () => void;
  onSelect?: (sheetId: string) => void;
}

export default function TemplateSelector({ projectId, onClose, onSelect }: TemplateSelectorProps) {
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
      name: '새 시트',
      columns: [
        { id: generateId(), name: 'ID', type: 'text' as const, width: 80 },
        { id: generateId(), name: '이름', type: 'text' as const, width: 150 },
        { id: generateId(), name: '값', type: 'number' as const, width: 100 },
        { id: generateId(), name: '설명', type: 'text' as const, width: 200 },
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">새 시트 만들기</h2>
            <p className="text-sm text-gray-500 mt-1">
              장르와 카테고리로 필터링하여 적합한 템플릿을 선택하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 필터 영역 */}
        <div className="px-6 py-3 border-b bg-gray-50 space-y-3">
          {/* 장르 선택 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">게임 장르</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gameGenres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    selectedGenre === genre.id
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  )}
                  title={genre.description}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 활성 필터 표시 */}
          {(selectedGenre || selectedCategory || searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">활성 필터:</span>
              {selectedGenre && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {gameGenres.find((g) => g.id === selectedGenre)?.name}
                </span>
              )}
              {selectedCategory && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {templateCategories.find((c) => c.id === selectedCategory)?.name}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                  &quot;{searchQuery}&quot;
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                초기화
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 카테고리 사이드바 */}
          <div className="w-44 border-r bg-gray-50 p-3 overflow-y-auto">
            <button
              onClick={handleCreateEmptySheet}
              className="w-full flex items-center gap-2 px-3 py-2 mb-3 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <FileSpreadsheet className="w-4 h-4" />
              빈 시트
            </button>

            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
              카테고리
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm mb-1',
                !selectedCategory
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-600'
              )}
            >
              전체
            </button>

            {templateCategories.map((cat) => {
              // 현재 장르 필터에 맞는 템플릿 수 계산
              const count = selectedGenre
                ? sheetTemplates.filter(
                    (t) => t.category === cat.id && t.genre?.includes(selectedGenre)
                  ).length
                : getTemplatesByCategory(cat.id).length;

              if (count === 0 && selectedGenre) return null;

              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                  }
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm mb-1 flex items-center gap-2',
                    selectedCategory === cat.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-200 text-gray-600'
                  )}
                >
                  <span>{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-xs text-gray-400">{count}</span>
                </button>
              );
            })}
          </div>

          {/* 템플릿 목록 */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="mb-2">해당 조건의 템플릿이 없습니다.</p>
                <button
                  onClick={clearFilters}
                  className="text-blue-500 hover:underline text-sm"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={cn(
                      'text-left p-4 border rounded-lg transition-all',
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
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
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
                          >
                            {gameGenres.find((genre) => genre.id === g)?.name || g}
                          </span>
                        ))}
                        {template.genre.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{template.genre.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 컬럼 미리보기 */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.columns.slice(0, 4).map((col, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {col.name}
                        </span>
                      ))}
                      {template.columns.length > 4 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{template.columns.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedTemplate ? (
              <span>
                선택: <strong>{selectedTemplate.name}</strong> ({selectedTemplate.columns.length}개 컬럼
                {selectedTemplate.sampleRows?.length
                  ? `, ${selectedTemplate.sampleRows.length}개 샘플`
                  : ''}
                )
              </span>
            ) : (
              <span>{filteredTemplates.length}개 템플릿</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              취소
            </button>
            <button
              onClick={handleCreateSheet}
              disabled={!selectedTemplate}
              className={cn(
                'px-4 py-2 rounded-lg',
                selectedTemplate
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              시트 만들기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
