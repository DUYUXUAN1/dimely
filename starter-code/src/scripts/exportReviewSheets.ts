import * as fs from 'fs';
import * as path from 'path';
import { Dimely } from '../index';

interface ExportRecord {
  input_file: string;
  output_file?: string;
  success: boolean;
  error?: string;
}

async function main() {
  const projectRoot = path.join(__dirname, '../../../');
  const sampleDataRoot = path.join(projectRoot, 'sample-data');
  const outputDir = path.join(projectRoot, 'starter-code/output/all-review-sheets');

  fs.mkdirSync(outputDir, { recursive: true });

  const files = collectJsonFiles(sampleDataRoot)
    .filter((filePath) => !path.basename(filePath).startsWith('.'))
    .sort();

  const dimely = new Dimely();
  const records: ExportRecord[] = [];

  for (const filePath of files) {
    const relativeInput = path.relative(projectRoot, filePath);
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const result = await dimely.processOpportunity(raw);

      if (!result.success || !result.review_sheet) {
        records.push({
          input_file: relativeInput,
          success: false,
          error: result.errors?.map((error) => `${error.field}: ${error.message}`).join('; ') || 'Unknown error',
        });
        continue;
      }

      const baseName = path.basename(filePath, '.json');
      const outputName = `${baseName}.review-sheet.json`;
      const outputPath = path.join(outputDir, outputName);
      fs.writeFileSync(outputPath, JSON.stringify(result.review_sheet, null, 2));

      records.push({
        input_file: relativeInput,
        output_file: path.relative(projectRoot, outputPath),
        success: true,
      });
    } catch (error) {
      records.push({
        input_file: relativeInput,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total_inputs: records.length,
        success_count: records.filter((record) => record.success).length,
        failure_count: records.filter((record) => !record.success).length,
        records,
      },
      null,
      2
    )
  );

  const failed = records.filter((record) => !record.success);
  if (failed.length > 0) {
    console.error(`Export finished with ${failed.length} failure(s). See: ${path.relative(projectRoot, indexPath)}`);
    process.exit(1);
  }

  console.log(`Exported ${records.length} review sheets to ${path.relative(projectRoot, outputDir)}`);
}

function collectJsonFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
