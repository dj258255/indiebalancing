import { v4 as uuidv4 } from 'uuid';
import type { Sheet, Column, Row } from '@/types';
import type { SheetTemplate } from './types';

// Create sheet from template
export function createSheetFromTemplate(template: SheetTemplate): Sheet {
  const now = Date.now();

  // Create columns with IDs
  const columns: Column[] = template.columns.map((col) => ({
    ...col,
    id: uuidv4(),
  }));

  // Create sample data (map column IDs)
  const rows: Row[] = (template.sampleRows || []).map((sampleRow) => {
    const cells: Record<string, string | number | null> = {};

    // Map col0, col1, col2... keys to actual column IDs
    Object.entries(sampleRow.cells).forEach(([key, value]) => {
      const index = parseInt(key.replace('col', ''));
      if (!isNaN(index) && columns[index]) {
        cells[columns[index].id] = value;
      }
    });

    return {
      id: uuidv4(),
      cells,
    };
  });

  return {
    id: uuidv4(),
    name: template.name,
    columns,
    rows,
    createdAt: now,
    updatedAt: now,
  };
}

// Search templates - uses sheetTemplates from data
export function searchTemplates(query: string): SheetTemplate[] {
  // Lazy import to avoid circular dependency
  const { sheetTemplates } = require('./data');
  const lowerQuery = query.toLowerCase();
  return sheetTemplates.filter(
    (t: SheetTemplate) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  );
}

// Get templates by category
export function getTemplatesByCategory(category: string): SheetTemplate[] {
  // Lazy import to avoid circular dependency
  const { sheetTemplates } = require('./data');
  return sheetTemplates.filter((t: SheetTemplate) => t.category === category);
}

// Get templates by genre
export function getTemplatesByGenre(genre: string): SheetTemplate[] {
  // Lazy import to avoid circular dependency
  const { sheetTemplates } = require('./data');
  return sheetTemplates.filter((t: SheetTemplate) => t.genre?.includes(genre));
}
