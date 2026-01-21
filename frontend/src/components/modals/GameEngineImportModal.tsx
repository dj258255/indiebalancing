'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { importFromGameEngine, detectFormat, IMPORT_FORMATS, type ImportFormat, type ImportResult } from '@/lib/gameEngineImport';
import { v4 as uuidv4 } from 'uuid';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface GameEngineImportModalProps {
  onClose: () => void;
}

export default function GameEngineImportModal({ onClose }: GameEngineImportModalProps) {
  // ESC 키로 모달 닫기
  useEscapeKey(onClose);

  const { currentProjectId, createSheet, addColumn, addRow, updateCell, getCurrentProject } = useProjectStore();
  const currentProject = getCurrentProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFormat, setSelectedFormat] = useState<ImportFormat | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // 파일 읽기
  const readFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      // 형식 자동 감지
      const detectedFormat = detectFormat(file.name, content);
      if (detectedFormat) {
        setSelectedFormat(detectedFormat);
        // 미리보기 생성
        const result = importFromGameEngine(content, detectedFormat);
        setPreviewResult(result);
      }

      // 시트 이름 기본값
      const baseName = file.name.replace(/\.(json|csv)$/i, '');
      setSheetName(baseName);
    };
    reader.readAsText(file);
    setFile(file);
  }, []);

  // 드래그 앤 드롭
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      readFile(droppedFile);
    }
  }, [readFile]);

  // 파일 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      readFile(selectedFile);
    }
  }, [readFile]);

  // 형식 변경 시 미리보기 갱신
  const handleFormatChange = (format: ImportFormat) => {
    setSelectedFormat(format);
    if (fileContent) {
      const result = importFromGameEngine(fileContent, format);
      setPreviewResult(result);
    }
  };

  // Import 실행
  const handleImport = async () => {
    if (!currentProjectId || !previewResult?.success || !sheetName.trim()) return;

    setIsImporting(true);

    try {
      // 시트 생성
      const sheetId = createSheet(currentProjectId, sheetName.trim());

      // 기존 기본 컬럼 삭제를 위해 시트 정보 가져오기
      const project = getCurrentProject();
      const sheet = project?.sheets.find(s => s.id === sheetId);

      if (!sheet) {
        throw new Error('시트 생성 실패');
      }

      // 컬럼 ID 매핑
      const columnIdMap = new Map<number, string>();

      // 컬럼 추가 (기본 컬럼 이후에)
      previewResult.columns.forEach((col, idx) => {
        const colId = addColumn(currentProjectId, sheetId, {
          name: col.name,
          type: col.type,
          width: col.width,
        });
        columnIdMap.set(idx, colId);
      });

      // 행 추가
      for (const rowData of previewResult.rows) {
        const rowId = addRow(currentProjectId, sheetId);

        // 셀 값 설정
        previewResult.columns.forEach((col, idx) => {
          const colId = columnIdMap.get(idx);
          if (colId) {
            // rowData.cells의 키는 임시 ID이므로 인덱스로 매핑
            const cellKeys = Object.keys(rowData.cells);
            const cellValue = rowData.cells[cellKeys[idx]];
            if (cellValue !== undefined && cellValue !== null) {
              updateCell(currentProjectId, sheetId, rowId, colId, cellValue);
            }
          }
        });
      }

      setImportSuccess(true);

      // 2초 후 모달 닫기
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      setPreviewResult(prev => prev ? {
        ...prev,
        success: false,
        error: '가져오기 중 오류가 발생했습니다.',
      } : null);
    } finally {
      setIsImporting(false);
    }
  };

  // 엔진별 그룹화
  const formatsByEngine = IMPORT_FORMATS.reduce((acc, fmt) => {
    if (!acc[fmt.engine]) acc[fmt.engine] = [];
    acc[fmt.engine].push(fmt);
    return acc;
  }, {} as Record<string, typeof IMPORT_FORMATS>);

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-green-light)' }}>
              <Upload className="w-5 h-5" style={{ color: 'var(--primary-green)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>게임 엔진 Import</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Unity, Unreal, Godot 형식에서 가져오기
              </p>
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
          {/* 왼쪽: 파일 업로드 & 형식 선택 */}
          <div className="w-1/3 border-r p-4 space-y-4 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
            {/* 파일 업로드 영역 */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-[var(--accent)] bg-[var(--accent-light)]' : ''
              }`}
              style={{ borderColor: dragOver ? 'var(--accent)' : 'var(--border-primary)' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.cs,.gd,.h"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileJson className="w-8 h-8 mx-auto" style={{ color: 'var(--accent)' }} />
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    클릭하여 다른 파일 선택
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto" style={{ color: 'var(--text-tertiary)' }} />
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    파일을 드래그하거나 클릭
                  </div>
                  <div className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
                    <div>지원 형식:</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>.json</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>.csv</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>.cs</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>.gd</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>.h</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 시트 이름 */}
            {file && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  시트 이름
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="새 시트 이름"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}

            {/* 형식 선택 */}
            {file && (
              <>
                <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  파일 형식
                </div>
                {Object.entries(formatsByEngine).map(([engine, formats]) => (
                  <div key={engine}>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      {engine}
                    </div>
                    <div className="space-y-1">
                      {formats.map(fmt => (
                        <button
                          key={fmt.id}
                          onClick={() => handleFormatChange(fmt.id)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                            selectedFormat === fmt.id ? 'ring-2 ring-[var(--accent)]' : ''
                          }`}
                          style={{
                            background: selectedFormat === fmt.id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {fmt.name}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--accent)' }}>
                                {fmt.accept}
                              </span>
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
              </>
            )}
          </div>

          {/* 오른쪽: 미리보기 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {previewResult ? (
              <>
                {/* 상태 표시 */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  {previewResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--primary-green)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {previewResult.columns.length}개 컬럼, {previewResult.rows.length}개 행 감지됨
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" style={{ color: 'var(--primary-red)' }} />
                      <span className="text-sm" style={{ color: 'var(--primary-red)' }}>
                        {previewResult.error}
                      </span>
                    </div>
                  )}
                  {previewResult.warnings?.map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4" style={{ color: 'var(--primary-yellow)' }} />
                      <span className="text-xs" style={{ color: 'var(--primary-yellow)' }}>
                        {warning}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 미리보기 테이블 */}
                {previewResult.success && (
                  <div className="flex-1 overflow-auto p-4">
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      미리보기 (처음 10행)
                    </div>
                    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-primary)' }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            {previewResult.columns.map((col, i) => (
                              <th
                                key={i}
                                className="px-3 py-2 text-left font-medium whitespace-nowrap"
                                style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-primary)' }}
                              >
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewResult.rows.slice(0, 10).map((row, rowIdx) => (
                            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                              {previewResult.columns.map((col, colIdx) => {
                                const cellKeys = Object.keys(row.cells);
                                const value = row.cells[cellKeys[colIdx]];
                                return (
                                  <td
                                    key={colIdx}
                                    className="px-3 py-2 whitespace-nowrap"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {value !== null && value !== undefined ? String(value) : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewResult.rows.length > 10 && (
                      <div className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
                        ... 외 {previewResult.rows.length - 10}개 행
                      </div>
                    )}
                  </div>
                )}

                {/* Import 버튼 */}
                {previewResult.success && (
                  <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <button
                      onClick={handleImport}
                      disabled={isImporting || !sheetName.trim() || importSuccess}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: importSuccess ? 'var(--primary-green)' : 'var(--accent)',
                        color: 'white',
                      }}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          가져오는 중...
                        </>
                      ) : importSuccess ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          가져오기 완료!
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          새 시트로 가져오기
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    파일을 선택하면 미리보기가 표시됩니다
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
