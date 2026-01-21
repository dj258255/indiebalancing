'use client';

import { useState } from 'react';
import { X, Download, Code, FileJson, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { exportForGameEngine, EXPORT_FORMATS, type ExportFormat } from '@/lib/gameEngineExport';
import { downloadFile } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useTranslations } from 'next-intl';

interface GameEngineExportModalProps {
  onClose: () => void;
}

export default function GameEngineExportModal({ onClose }: GameEngineExportModalProps) {
  // ESC 키로 모달 닫기
  useEscapeKey(onClose);
  const t = useTranslations('gameEngineExport');

  const { projects, currentProjectId, currentSheetId } = useProjectStore();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [className, setClassName] = useState('');
  const [previewFiles, setPreviewFiles] = useState<{ filename: string; content: string; type: string }[]>([]);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // 형식 선택 시 미리보기 생성
  const handleSelectFormat = (format: ExportFormat) => {
    setSelectedFormat(format);
    setExpandedFile(null);

    if (currentSheet) {
      const files = exportForGameEngine(currentSheet, format, { className: className || undefined });
      setPreviewFiles(files);
      if (files.length > 0) {
        setExpandedFile(files[0].filename);
      }
    }
  };

  // 클래스명 변경 시 미리보기 갱신
  const handleClassNameChange = (value: string) => {
    setClassName(value);

    if (currentSheet && selectedFormat) {
      const files = exportForGameEngine(currentSheet, selectedFormat, { className: value || undefined });
      setPreviewFiles(files);
    }
  };

  // 파일 다운로드
  const handleDownload = (file: { filename: string; content: string; type: string }) => {
    downloadFile(file.content, file.filename, file.type);
  };

  // 모든 파일 다운로드
  const handleDownloadAll = () => {
    for (const file of previewFiles) {
      downloadFile(file.content, file.filename, file.type);
    }
  };

  // 복사
  const handleCopy = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // 엔진별 그룹화
  const formatsByEngine = EXPORT_FORMATS.reduce((acc, fmt) => {
    if (!acc[fmt.engine]) acc[fmt.engine] = [];
    acc[fmt.engine].push(fmt);
    return acc;
  }, {} as Record<string, typeof EXPORT_FORMATS>);

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <Code className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('subtitle')}</p>
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
          {/* 왼쪽: 형식 선택 */}
          <div className="w-1/3 border-r p-4 space-y-4 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
            {/* 시트 정보 */}
            {currentSheet && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('sheetToExport')}</div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{currentSheet.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {currentSheet.rows.length}행 × {currentSheet.columns.length}열
                </div>
              </div>
            )}

            {/* 클래스명 입력 */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('className')}
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => handleClassNameChange(e.target.value)}
                placeholder={currentSheet ? currentSheet.name.replace(/\s/g, '') : 'MyData'}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* 엔진별 형식 선택 */}
            {Object.entries(formatsByEngine).map(([engine, formats]) => (
              <div key={engine}>
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {engine}
                </div>
                <div className="space-y-1">
                  {formats.map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => handleSelectFormat(fmt.id)}
                      disabled={!currentSheet}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors disabled:opacity-50 ${
                        selectedFormat === fmt.id ? 'ring-2 ring-[var(--accent)]' : ''
                      }`}
                      style={{
                        background: selectedFormat === fmt.id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {fmt.name}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {fmt.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 오른쪽: 미리보기 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {previewFiles.length > 0 ? (
              <>
                {/* 파일 목록 */}
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('filesGenerated', { count: previewFiles.length })}
                  </div>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {t('downloadAll')}
                  </button>
                </div>

                {/* 파일 미리보기 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {previewFiles.map(file => (
                    <div
                      key={file.filename}
                      className="rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--border-primary)' }}
                    >
                      <div
                        className="w-full flex items-center justify-between p-3 cursor-pointer"
                        style={{ background: 'var(--bg-tertiary)' }}
                        onClick={() => setExpandedFile(expandedFile === file.filename ? null : file.filename)}
                      >
                        <div className="flex items-center gap-2">
                          <FileJson className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {file.filename}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(file.filename, file.content);
                            }}
                            className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                            title={t('copy')}
                          >
                            {copiedFile === file.filename ? (
                              <Check className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
                            ) : (
                              <Copy className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                            className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                            title={t('download')}
                          >
                            <Download className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                          <div className="p-1">
                            {expandedFile === file.filename ? (
                              <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                            ) : (
                              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedFile === file.filename && (
                        <div className="p-3 max-h-64 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
                          <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                            {file.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {currentSheet ? t('selectFormat') : t('selectSheetFirst')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 - 도움말 */}
        <div className="px-6 py-3 border-t text-xs flex items-center gap-2" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
          <ExternalLink className="w-3 h-3" />
          {t('footerHelp')}
        </div>
      </div>
    </div>
  );
}
