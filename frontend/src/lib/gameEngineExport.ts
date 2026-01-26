/**
 * 게임 엔진 Export (Unity/Unreal)
 * 시트 데이터를 게임 엔진에서 사용할 수 있는 형식으로 변환
 */

import type { Sheet, Column, CellValue, Project } from '@/types';
import { evaluateFormula } from '@/lib/formulaEngine';

/**
 * 시트의 모든 행에 대해 수식을 평가하여 계산된 값을 반환
 */
function computeSheetValues(sheet: Sheet, project?: Project): Record<string, CellValue>[] {
  const result: Record<string, CellValue>[] = [];

  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
    const row = sheet.rows[rowIndex];
    const computedRow: Record<string, CellValue> = { ...row.cells };

    for (const column of sheet.columns) {
      const rawValue = row.cells[column.id];

      // 셀 자체에 수식이 있는 경우
      if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
        const evalResult = evaluateFormula(rawValue, {
          sheets: project?.sheets || [],
          currentSheet: sheet,
          currentRow: computedRow,
          currentRowIndex: rowIndex,
          allRows: result,
        });
        computedRow[column.id] = evalResult.error ? null : evalResult.value;
        continue;
      }

      // 셀에 직접 값이 있으면 그 값 사용
      if (rawValue !== null && rawValue !== undefined) {
        computedRow[column.id] = rawValue;
        continue;
      }

      // 셀이 비어있고 컬럼이 formula 타입이면 컬럼 수식 사용
      if (column.type === 'formula' && column.formula) {
        const evalResult = evaluateFormula(column.formula, {
          sheets: project?.sheets || [],
          currentSheet: sheet,
          currentRow: computedRow,
          currentRowIndex: rowIndex,
          allRows: result,
        });
        computedRow[column.id] = evalResult.error ? null : evalResult.value;
        continue;
      }

      computedRow[column.id] = rawValue;
    }

    result.push(computedRow);
  }

  return result;
}

// Export 형식
export type ExportFormat =
  | 'unity_scriptable'    // Unity ScriptableObject
  | 'unity_json'          // Unity용 JSON
  | 'unreal_datatable'    // Unreal DataTable
  | 'unreal_struct'       // Unreal Struct
  | 'godot_resource';     // Godot Resource

// C# 타입 매핑
function toCSharpType(column: Column, sampleValue: CellValue): string {
  if (column.name.toLowerCase().includes('id')) return 'string';
  if (column.name.toLowerCase().includes('name') || column.name.toLowerCase().includes('이름')) return 'string';
  if (column.name.toLowerCase().includes('description') || column.name.includes('설명')) return 'string';

  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue)) return 'int';
    return 'float';
  }
  if (typeof sampleValue === 'boolean') return 'bool';
  return 'string';
}

// C++ 타입 매핑 (Unreal)
function toUnrealType(column: Column, sampleValue: CellValue): string {
  if (column.name.toLowerCase().includes('id')) return 'FString';
  if (column.name.toLowerCase().includes('name') || column.name.toLowerCase().includes('이름')) return 'FName';
  if (column.name.toLowerCase().includes('description') || column.name.includes('설명')) return 'FString';

  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue)) return 'int32';
    return 'float';
  }
  if (typeof sampleValue === 'boolean') return 'bool';
  return 'FString';
}

// 변수명 정리 (PascalCase)
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9가-힣]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// 변수명 정리 (camelCase)
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// 컬럼의 내보내기용 필드명 가져오기 (exportName이 있으면 사용, 없으면 name을 camelCase로 변환)
function getExportFieldName(column: Column, caseType: 'camel' | 'pascal' = 'camel'): string {
  if (column.exportName) {
    // exportName이 있으면 그대로 사용 (사용자가 이미 적절한 형식으로 입력했다고 가정)
    return column.exportName;
  }
  // exportName이 없으면 컬럼명을 변환
  return caseType === 'pascal' ? toPascalCase(column.name) : toCamelCase(column.name);
}

// 값 포맷팅 (C#)
function formatCSharpValue(value: CellValue, type: string): string {
  if (value === null || value === undefined) {
    switch (type) {
      case 'string': return '""';
      case 'int': return '0';
      case 'float': return '0f';
      case 'bool': return 'false';
      default: return '""';
    }
  }

  switch (type) {
    case 'string': return `"${String(value).replace(/"/g, '\\"')}"`;
    case 'int': return String(Math.round(Number(value)));
    case 'float': return `${Number(value)}f`;
    case 'bool': return String(Boolean(value)).toLowerCase();
    default: return `"${String(value)}"`;
  }
}

/**
 * Unity ScriptableObject 코드 생성
 */
export function generateUnityScriptableObject(sheet: Sheet, className?: string, project?: Project): string {
  // 입력값을 PascalCase로 변환 (첫 글자 대문자)
  const rawName = className || toPascalCase(sheet.name);
  const baseName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  // Data 접미사가 없으면 추가
  const name = baseName.endsWith('Data') ? baseName : baseName + 'Data';
  const itemName = baseName.endsWith('Data') ? baseName.replace(/Data$/, 'Item') : baseName + 'Item';

  // 수식 계산된 값 가져오기
  const computedRows = computeSheetValues(sheet, project);
  const sampleRow = computedRows[0];

  // 컬럼 정보 수집
  const fields = sheet.columns.map(col => ({
    name: getExportFieldName(col, 'camel'),
    type: toCSharpType(col, sampleRow?.[col.id]),
    originalName: col.name,
    colId: col.id,
  }));

  let code = `using UnityEngine;
using System;
using System.Collections.Generic;

[CreateAssetMenu(fileName = "${name}", menuName = "Data/${name}")]
public class ${name} : ScriptableObject
{
    public List<${itemName}> items = new List<${itemName}>();

    public ${itemName} GetById(string id)
    {
        return items.Find(item => item.id == id);
    }
}

[Serializable]
public class ${itemName}
{
`;

  // 필드 정의
  for (const field of fields) {
    code += `    public ${field.type} ${field.name}; // ${field.originalName}\n`;
  }

  code += `}

/*
 * 데이터 JSON (Resources 폴더에 저장):
 * ${name}.json
 */
`;

  return code;
}

/**
 * Unity용 JSON 생성
 */
export function generateUnityJson(sheet: Sheet, project?: Project): string {
  // 수식 계산된 값 가져오기
  const computedRows = computeSheetValues(sheet, project);
  const sampleRow = computedRows[0];

  const items = computedRows.map(computedRow => {
    const item: Record<string, unknown> = {};

    for (const col of sheet.columns) {
      const fieldName = getExportFieldName(col, 'camel');
      const type = toCSharpType(col, sampleRow?.[col.id]);
      const rawValue = computedRow[col.id];

      // 타입에 맞게 변환
      let convertedValue: number | boolean | string;
      if (type === 'int') {
        convertedValue = Math.round(Number(rawValue) || 0);
      } else if (type === 'float') {
        convertedValue = Number(rawValue) || 0;
      } else if (type === 'bool') {
        convertedValue = Boolean(rawValue);
      } else {
        convertedValue = String(rawValue ?? '');
      }

      item[fieldName] = convertedValue;
    }

    return item;
  });

  return JSON.stringify({ items }, null, 2);
}

/**
 * Unreal DataTable 헤더 생성
 */
export function generateUnrealDataTable(sheet: Sheet, structName?: string, project?: Project): string {
  const name = structName || `F${toPascalCase(sheet.name)}Row`;
  // 수식 계산된 값 가져오기
  const computedRows = computeSheetValues(sheet, project);
  const sampleRow = computedRows[0];

  let code = `#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "${name.substring(1)}.generated.h"

USTRUCT(BlueprintType)
struct ${name} : public FTableRowBase
{
    GENERATED_BODY()

public:
`;

  // 필드 정의
  for (const col of sheet.columns) {
    const fieldName = getExportFieldName(col, 'pascal');
    const type = toUnrealType(col, sampleRow?.[col.id]);

    code += `    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Data")
    ${type} ${fieldName};

`;
  }

  code += `};

/*
 * CSV 데이터 (Content/Data 폴더에 저장):
 * 첫 행: Name,${sheet.columns.map(c => getExportFieldName(c, 'pascal')).join(',')}
 */
`;

  return code;
}

/**
 * Unreal용 CSV 생성
 */
export function generateUnrealCsv(sheet: Sheet, project?: Project): string {
  // 수식 계산된 값 가져오기
  const computedRows = computeSheetValues(sheet, project);

  // 헤더
  const headers = ['Name', ...sheet.columns.map(c => getExportFieldName(c, 'pascal'))];
  let csv = headers.join(',') + '\n';

  // 데이터 행
  for (let i = 0; i < computedRows.length; i++) {
    const computedRow = computedRows[i];
    const rowName = `Row_${i + 1}`;

    const values = [rowName];
    for (const col of sheet.columns) {
      let value = computedRow[col.id];
      if (value === null || value === undefined) value = '';
      // CSV 이스케이프
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        values.push(`"${strValue.replace(/"/g, '""')}"`);
      } else {
        values.push(strValue);
      }
    }

    csv += values.join(',') + '\n';
  }

  return csv;
}

/**
 * Godot Resource 생성
 */
export function generateGodotResource(sheet: Sheet, className?: string, project?: Project): string {
  const rawName = className || toPascalCase(sheet.name);
  const baseName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const name = baseName.endsWith('Data') ? baseName : baseName + 'Data';

  let code = `# ${name}.gd
class_name ${name}
extends Resource

`;

  // 수식 계산된 값 가져오기
  const computedRows = computeSheetValues(sheet, project);
  const sampleRow = computedRows[0];

  code += `class Item:
`;

  for (const col of sheet.columns) {
    const fieldName = getExportFieldName(col, 'camel').replace(/^_/, '');
    let type = 'String';

    const sample = sampleRow?.[col.id];
    if (typeof sample === 'number') {
      type = Number.isInteger(sample) ? 'int' : 'float';
    } else if (typeof sample === 'boolean') {
      type = 'bool';
    }

    code += `\tvar ${fieldName}: ${type}\n`;
  }

  code += `
@export var items: Array[Item] = []

func get_by_id(id: String) -> Item:
\tfor item in items:
\t\tif item.id == id:
\t\t\treturn item
\treturn null

# JSON 로드
static func load_from_json(path: String) -> ${name}:
\tvar file = FileAccess.open(path, FileAccess.READ)
\tvar json = JSON.parse_string(file.get_as_text())
\tfile.close()
\t
\tvar data = ${name}.new()
\tfor item_data in json["items"]:
\t\tvar item = Item.new()
`;

  for (const col of sheet.columns) {
    const fieldName = getExportFieldName(col, 'camel').replace(/^_/, '');
    code += `\t\titem.${fieldName} = item_data["${fieldName}"]\n`;
  }

  code += `\t\tdata.items.append(item)
\treturn data
`;

  return code;
}

/**
 * 게임 엔진별 Export 실행
 */
export function exportForGameEngine(
  sheet: Sheet,
  format: ExportFormat,
  options: { className?: string; project?: Project } = {}
): { filename: string; content: string; type: string }[] {
  const { className, project } = options;
  // 우선순위: 옵션으로 전달된 className > 시트의 exportClassName > 시트명 변환
  const rawName = className || sheet.exportClassName || toPascalCase(sheet.name);
  // PascalCase로 변환 (첫 글자 대문자)
  const baseName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  switch (format) {
    case 'unity_scriptable':
      return [
        {
          filename: `${baseName}Data.cs`,
          content: generateUnityScriptableObject(sheet, className, project),
          type: 'text/plain',
        },
        {
          filename: `${baseName}Data.json`,
          content: generateUnityJson(sheet, project),
          type: 'application/json',
        },
      ];

    case 'unity_json':
      return [
        {
          filename: `${baseName}.json`,
          content: generateUnityJson(sheet, project),
          type: 'application/json',
        },
      ];

    case 'unreal_datatable':
      return [
        {
          filename: `F${baseName}Row.h`,
          content: generateUnrealDataTable(sheet, `F${baseName}Row`, project),
          type: 'text/plain',
        },
        {
          filename: `${baseName}.csv`,
          content: generateUnrealCsv(sheet, project),
          type: 'text/csv',
        },
      ];

    case 'unreal_struct':
      return [
        {
          filename: `F${baseName}Row.h`,
          content: generateUnrealDataTable(sheet, `F${baseName}Row`, project),
          type: 'text/plain',
        },
      ];

    case 'godot_resource':
      return [
        {
          filename: `${baseName}Data.gd`,
          content: generateGodotResource(sheet, className, project),
          type: 'text/plain',
        },
        {
          filename: `${baseName}.json`,
          content: generateUnityJson(sheet, project), // JSON 형식 공유
          type: 'application/json',
        },
      ];

    default:
      return [];
  }
}

/**
 * Export 형식 정보
 */
export const EXPORT_FORMATS: {
  id: ExportFormat;
  name: string;
  engine: string;
  description: string;
}[] = [
  {
    id: 'unity_scriptable',
    name: 'ScriptableObject',
    engine: 'Unity',
    description: 'ScriptableObject 클래스 + JSON 데이터',
  },
  {
    id: 'unity_json',
    name: 'JSON Only',
    engine: 'Unity',
    description: 'JsonUtility 호환 JSON 파일',
  },
  {
    id: 'unreal_datatable',
    name: 'DataTable',
    engine: 'Unreal',
    description: 'DataTable 구조체 + CSV 파일',
  },
  {
    id: 'unreal_struct',
    name: 'Struct Only',
    engine: 'Unreal',
    description: 'USTRUCT 헤더 파일만',
  },
  {
    id: 'godot_resource',
    name: 'Resource',
    engine: 'Godot',
    description: 'Resource 클래스 + JSON 데이터',
  },
];
