/**
 * 게임 엔진 Export (Unity/Unreal)
 * 시트 데이터를 게임 엔진에서 사용할 수 있는 형식으로 변환
 */

import type { Sheet, Column, Row, CellValue } from '@/types';

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
export function generateUnityScriptableObject(sheet: Sheet, className?: string): string {
  const name = className || toPascalCase(sheet.name) + 'Data';
  const itemName = name.replace(/Data$/, 'Item');

  // 타입 추론을 위한 샘플 행
  const sampleRow = sheet.rows[0];

  // 컬럼 정보 수집
  const fields = sheet.columns.map(col => ({
    name: toCamelCase(col.name),
    type: toCSharpType(col, sampleRow?.cells[col.id]),
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
export function generateUnityJson(sheet: Sheet): string {
  const sampleRow = sheet.rows[0];

  const items = sheet.rows.map(row => {
    const item: Record<string, unknown> = {};

    for (const col of sheet.columns) {
      const fieldName = toCamelCase(col.name);
      const type = toCSharpType(col, sampleRow?.cells[col.id]);
      const rawValue = row.cells[col.id];

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
export function generateUnrealDataTable(sheet: Sheet, structName?: string): string {
  const name = structName || `F${toPascalCase(sheet.name)}Row`;
  const sampleRow = sheet.rows[0];

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
    const fieldName = toPascalCase(col.name);
    const type = toUnrealType(col, sampleRow?.cells[col.id]);

    code += `    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Data")
    ${type} ${fieldName};

`;
  }

  code += `};

/*
 * CSV 데이터 (Content/Data 폴더에 저장):
 * 첫 행: Name,${sheet.columns.map(c => toPascalCase(c.name)).join(',')}
 */
`;

  return code;
}

/**
 * Unreal용 CSV 생성
 */
export function generateUnrealCsv(sheet: Sheet): string {
  // 헤더
  const headers = ['Name', ...sheet.columns.map(c => toPascalCase(c.name))];
  let csv = headers.join(',') + '\n';

  // 데이터 행
  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const rowName = `Row_${i + 1}`;

    const values = [rowName];
    for (const col of sheet.columns) {
      let value = row.cells[col.id];
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
export function generateGodotResource(sheet: Sheet, className?: string): string {
  const name = className || toPascalCase(sheet.name) + 'Data';

  let code = `# ${name}.gd
class_name ${name}
extends Resource

`;

  // 항목 클래스
  const sampleRow = sheet.rows[0];

  code += `class Item:
`;

  for (const col of sheet.columns) {
    const fieldName = toCamelCase(col.name).replace(/^_/, '');
    let type = 'String';

    const sample = sampleRow?.cells[col.id];
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
    const fieldName = toCamelCase(col.name).replace(/^_/, '');
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
  options: { className?: string } = {}
): { filename: string; content: string; type: string }[] {
  const { className } = options;
  const baseName = className || toPascalCase(sheet.name);

  switch (format) {
    case 'unity_scriptable':
      return [
        {
          filename: `${baseName}Data.cs`,
          content: generateUnityScriptableObject(sheet, className),
          type: 'text/plain',
        },
        {
          filename: `${baseName}Data.json`,
          content: generateUnityJson(sheet),
          type: 'application/json',
        },
      ];

    case 'unity_json':
      return [
        {
          filename: `${baseName}.json`,
          content: generateUnityJson(sheet),
          type: 'application/json',
        },
      ];

    case 'unreal_datatable':
      return [
        {
          filename: `F${baseName}Row.h`,
          content: generateUnrealDataTable(sheet, `F${baseName}Row`),
          type: 'text/plain',
        },
        {
          filename: `${baseName}.csv`,
          content: generateUnrealCsv(sheet),
          type: 'text/csv',
        },
      ];

    case 'unreal_struct':
      return [
        {
          filename: `F${baseName}Row.h`,
          content: generateUnrealDataTable(sheet, `F${baseName}Row`),
          type: 'text/plain',
        },
      ];

    case 'godot_resource':
      return [
        {
          filename: `${baseName}Data.gd`,
          content: generateGodotResource(sheet, className),
          type: 'text/plain',
        },
        {
          filename: `${baseName}.json`,
          content: generateUnityJson(sheet), // JSON 형식 공유
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
