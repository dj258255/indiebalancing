'use client';

import { useEscapeKey } from '@/hooks';
import { useTranslations } from 'next-intl';
import { Users, TrendingUp, Settings, Table2, Sliders } from 'lucide-react';

import { useEntityDefinition } from './entity-definition/hooks/useEntityDefinition';
import {
  SheetSelector,
  ColumnMappingSelector,
  StatDefinitionEditor,
  EntitySelector,
  CurvePreview,
  LevelRangeSelector,
  OverrideEditor,
  PreviewTable,
  GenerationOptions,
  InterpolationTypeSelector,
  TagFilter,
  HelpPanel,
} from './entity-definition/components';

// number input spinner 숨기는 스타일
const hideSpinnerStyle = `
  .hide-spinner::-webkit-outer-spin-button,
  .hide-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .hide-spinner[type=number] {
    -moz-appearance: textfield;
  }
`;

// 섹션 구분선 컴포넌트
function SectionDivider({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
    </div>
  );
}

interface EntityDefinitionProps {
  onClose?: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

export default function EntityDefinition({ onClose, showHelp = false }: EntityDefinitionProps) {
  useEscapeKey(onClose ?? (() => {}), !!onClose);
  const t = useTranslations('entityDefinition');

  const {
    // 프로젝트 선택
    projects,
    selectedProjectId,
    selectProject,
    // 시트 선택
    availableSheets,
    selectedSourceSheetId,
    selectSourceSheet,
    availableColumns,
    idColumn,
    nameColumn,
    levelColumn,
    setIdColumn,
    setNameColumn,
    setLevelColumn,
    statDefinitions,
    setStatDefinitions,
    selectedEntityId,
    selectedEntity,
    entities,
    filteredEntities,
    editingOverrides,
    levelRange,
    previewData,
    curvePreviewData,
    outputMode,
    sheetNamePattern,
    isGenerating,
    generationProgress,
    interpolationType,
    tagFilter,
    availableTags,
    selectEntity,
    setLevelRange,
    addOverride,
    removeOverride,
    updateOverride,
    setOutputMode,
    setSheetNamePattern,
    exportFieldNames,
    setExportFieldNames,
    setInterpolationType,
    setTagFilter,
    generateLevelTable,
    generateAllLevelTables,
  } = useEntityDefinition();

  const statNames = selectedEntity ? Object.keys(selectedEntity.baseStats) : [];

  return (
    <div className="flex flex-col h-full">
      <style>{hideSpinnerStyle}</style>

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden flex-1 scrollbar-slim">
        {/* ===== 도움말 ===== */}
        {showHelp && <HelpPanel />}

        {/* ===== 프로젝트/시트 선택 ===== */}
        <SheetSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          sheets={availableSheets}
          selectedSheetId={selectedSourceSheetId}
          onProjectSelect={selectProject}
          onSheetSelect={selectSourceSheet}
        />

        {/* 시트가 선택된 경우에만 스탯 정의 및 엔티티 섹션 표시 */}
        {selectedSourceSheetId && (
          <>
            {/* ===== 컬럼 매핑 ===== */}
            <ColumnMappingSelector
              availableColumns={availableColumns}
              idColumn={idColumn}
              nameColumn={nameColumn}
              levelColumn={levelColumn}
              onIdColumnChange={setIdColumn}
              onNameColumnChange={setNameColumn}
              onLevelColumnChange={setLevelColumn}
              exportFieldNames={exportFieldNames}
              onExportFieldNamesChange={setExportFieldNames}
            />

            {/* ===== 스탯 정의 ===== */}
            <SectionDivider icon={Sliders} title="스탯 설정" color="#f59e0b" />

            <StatDefinitionEditor
              stats={statDefinitions}
              availableColumns={availableColumns}
              onChange={setStatDefinitions}
            />

            {/* ===== 섹션 1: 엔티티 선택 ===== */}
            <SectionDivider icon={Users} title={t('sectionEntity')} color="#5a9cf5" />

            <TagFilter
              tags={availableTags}
              selectedTag={tagFilter}
              onSelect={setTagFilter}
            />

            <EntitySelector
              entities={filteredEntities}
              selectedEntityId={selectedEntityId}
              onSelect={selectEntity}
              isColumnMapped={!!(idColumn && nameColumn)}
            />
          </>
        )}

        {/* 엔티티가 선택된 경우에만 나머지 섹션 표시 */}
        {selectedEntity && (
          <>
            {/* ===== 섹션 2: 성장 곡선 ===== */}
            <SectionDivider icon={TrendingUp} title={t('sectionGrowth')} color="#22c55e" />

            <CurvePreview
              entity={selectedEntity}
              curveData={curvePreviewData}
              overrides={editingOverrides}
            />

            <LevelRangeSelector
              levelRange={levelRange}
              onRangeChange={setLevelRange}
              maxLimit={200}
            />

            {/* ===== 섹션 3: 오버라이드 ===== */}
            <SectionDivider icon={Settings} title={t('sectionOverride')} color="#f59e0b" />

            <InterpolationTypeSelector
              value={interpolationType}
              onChange={setInterpolationType}
            />

            <OverrideEditor
              entity={selectedEntity}
              overrides={editingOverrides}
              onAdd={addOverride}
              onRemove={removeOverride}
              onUpdate={updateOverride}
              maxLevel={levelRange.max}
            />

            {/* ===== 섹션 4: 미리보기 & 생성 ===== */}
            <SectionDivider icon={Table2} title={t('sectionGenerate')} color="#9179f2" />

            <PreviewTable
              previewData={previewData}
              statNames={statNames}
            />

            <GenerationOptions
              outputMode={outputMode}
              onOutputModeChange={setOutputMode}
              sheetNamePattern={sheetNamePattern}
              onSheetNamePatternChange={setSheetNamePattern}
              onGenerate={generateLevelTable}
              onGenerateAll={generateAllLevelTables}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              entityCount={entities.length}
              selectedEntityName={selectedEntity.name}
              rowCount={levelRange.max - levelRange.min + 1}
            />
          </>
        )}
      </div>
    </div>
  );
}
