import * as fs from 'fs';
import * as path from 'path';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { Dimely } from '../index';

describe('Edge Cases: sample-data/edge-cases', () => {
  let dimely: Dimely;

  beforeEach(() => {
    dimely = new Dimely();
  });

  it('should process all edge case files successfully', async () => {
    const edgeCasesDir = path.join(__dirname, '../../../sample-data/edge-cases');
    const files = fs
      .readdirSync(edgeCasesDir)
      .filter((file) => file.endsWith('.json'))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(34);

    const failures: string[] = [];
    for (const file of files) {
      const filePath = path.join(edgeCasesDir, file);
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const result = await dimely.processOpportunity(payload);

      if (!result.success || !result.review_sheet) {
        failures.push(file);
      }
    }

    expect(failures).toEqual([]);
  });
});
