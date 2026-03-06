#!/usr/bin/env npx tsx

import 'dotenv/config';
import { analyzeRepositoryStreaming } from '../src/lib/analyzer';
import { getProposalStats, clearAllProposals } from '../src/lib/db';
import { ProposedIssue } from '../src/types/proposal';

const args = process.argv.slice(2);
const shouldClear = args.includes('--clear');

async function main() {
  const targetRepo = process.env.TARGET_REPO;

  if (!targetRepo) {
    console.error('ERROR: TARGET_REPO environment variable is not set');
    console.error('Example: TARGET_REPO=owner/repo npx tsx scripts/scan.ts');
    process.exit(1);
  }

  if (!process.env.GITHUB_TOKEN) {
    console.error('ERROR: GITHUB_TOKEN environment variable is not set');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    process.exit(1);
  }

  if (shouldClear) {
    console.log('Clearing existing proposals...');
    clearAllProposals();
  }

  console.log(`\nScanning repository: ${targetRepo}\n`);
  console.log('This may take a few minutes...\n');

  const proposals: ProposedIssue[] = [];

  try {
    await analyzeRepositoryStreaming(targetRepo, (event) => {
      if (event.type === 'progress') {
        if (event.phase === 'fetching') {
          process.stdout.write(`\rFetching files...`);
        } else if (event.phase === 'analyzing') {
          process.stdout.write(
            `\rAnalyzing: ${event.current}/${event.total} - ${event.currentFile || ''}`.padEnd(80)
          );
        }
      } else if (event.type === 'proposal' && event.proposal) {
        proposals.push(event.proposal);
        console.log(`\n  Found: [${event.proposal.severity.toUpperCase()}] ${event.proposal.title}`);
      } else if (event.type === 'complete') {
        console.log('\n');
      } else if (event.type === 'error') {
        console.error(`\nError: ${event.error}`);
      }
    });

    console.log(`\n✓ Scan complete!\n`);
    console.log(`Found ${proposals.length} new proposed issues:\n`);

    // Group by category
    const security = proposals.filter(p => p.category === 'security');
    const testing = proposals.filter(p => p.category === 'testing');

    if (security.length > 0) {
      console.log(`🔒 Security Issues (${security.length}):`);
      for (const p of security) {
        console.log(`   [${p.severity.toUpperCase()}] ${p.title}`);
        console.log(`   └── ${p.filePath}`);
      }
      console.log();
    }

    if (testing.length > 0) {
      console.log(`🧪 Testing Gaps (${testing.length}):`);
      for (const p of testing) {
        console.log(`   [${p.severity.toUpperCase()}] ${p.title}`);
        console.log(`   └── ${p.filePath}`);
      }
      console.log();
    }

    // Show overall stats
    const stats = getProposalStats();
    console.log('Overall Statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Critical: ${stats.bySeverity.critical}`);
    console.log(`   High: ${stats.bySeverity.high}`);
    console.log(`   Medium: ${stats.bySeverity.medium}`);
    console.log(`   Low: ${stats.bySeverity.low}`);

  } catch (error) {
    console.error('\nScan failed:', error);
    process.exit(1);
  }
}

main();
