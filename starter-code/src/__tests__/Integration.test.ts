/**
 * Integration tests - verify your end-to-end pipeline works
 * 
 * These tests process actual sample data files and verify the full flow:
 * 1. Parse opportunity JSON
 * 2. Generate billing actions
 * 3. Create review sheet
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpportunityParser } from '../parsers/OpportunityParser';
import { BillingEngine } from '../engines/BillingEngine';
import { OutputGenerator } from '../generators/OutputGenerator';
import { RecurlyClient } from '../clients/RecurlyClient';
import { describe, beforeEach, it, expect } from '@jest/globals';;

describe('Integration: End-to-End Pipeline', () => {
  let parser: OpportunityParser;
  let engine: BillingEngine;
  let generator: OutputGenerator;

  beforeEach(() => {
    parser = new OpportunityParser();
    const client = new RecurlyClient({
      apiKey: 'test',
      baseUrl: 'test',
      useMockData: true,
    });
    engine = new BillingEngine(client);
    generator = new OutputGenerator();
  });

  it('should process new-business-simple.json end-to-end', async () => {
    const filePath = path.join(__dirname, '../../../sample-data/new-business-simple.json');
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Step 1: Parse
    const parseResult = parser.parse(rawData);
    
    // Note: This file should parse cleanly (no intentional bugs)
    if (parseResult.errors.length > 0) {
      console.log('Parse errors:', parseResult.errors);
    }
    expect(parseResult.opportunity).toBeDefined();

    // Step 2: Generate actions
    const actions = await engine.generateActions(parseResult.opportunity!, null);
    expect(actions.length).toBeGreaterThan(0);

    // Step 3: Create review sheet
    const reviewSheet = generator.generateReviewSheet(parseResult.opportunity!, actions);
    
    expect(reviewSheet.opportunity_id).toBe('opp_simple_001');
    expect(reviewSheet.account_name).toBe('Simple Corp');
    expect(reviewSheet.billing_actions.length).toBeGreaterThan(0);
    expect(reviewSheet.generated_at).toBeDefined();
  });

  it('should detect validation errors in new-business-opportunity.json', async () => {
    const filePath = path.join(__dirname, '../../../sample-data/new-business-opportunity.json');
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const parseResult = parser.parse(rawData);

    // This file has intentional bugs - parser should catch them
    // Either: errors array should have items, OR opportunity parses but engine flags issues
    if (parseResult.errors.length === 0 && parseResult.opportunity) {
      const actions = await engine.generateActions(parseResult.opportunity, null);
      // If parser didn't catch errors, engine should flag for review
      expect(
        actions.some(a => a.requires_review === true) ||
        parseResult.errors.length > 0
      ).toBe(true);
    }
  });
});

