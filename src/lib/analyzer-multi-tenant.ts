import Anthropic from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import { LinearClient } from '@linear/sdk';
import {
  getAnalyzableFiles,
  fetchFilesForAnalysis,
  categorizeFiles,
  findTestFileForSource,
  FileTreeItem,
} from './integrations/github';
import {
  findExistingIssue,
  getDefaultTeamId,
} from './integrations/linear';
import { buildSecurityPrompt } from './prompts/security';
import { buildTestingPrompt } from './prompts/testing';
import { createProposal, findSimilarProposal } from './services/proposals';
import { updateScanStatus } from './services/scans';
import { updateLastScanned } from './services/repositories';
import { AIAnalysisResult, Category, ProposedIssue } from '@/types/proposal';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisEvent {
  type: 'progress' | 'proposal' | 'complete' | 'error';
  phase?: 'fetching' | 'analyzing';
  current?: number;
  total?: number;
  currentFile?: string;
  proposal?: ProposedIssue;
  totalProposals?: number;
  error?: string;
}

type EventCallback = (event: AnalysisEvent) => void;

interface AnalysisContext {
  workspaceId: string;
  repositoryId: string;
  scanId: string;
  octokit: Octokit;
  linearClient: LinearClient | null;
  linearTeamId: string | null;
}

async function analyzeWithAI(
  prompt: string,
  category: Category
): Promise<AIAnalysisResult[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return [];
    }

    // Parse the JSON response
    const text = content.text.trim();

    // Handle potential markdown code blocks
    let jsonStr = text;
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    const results = JSON.parse(jsonStr) as AIAnalysisResult[];

    // Validate and clean results
    return results.filter(result => {
      return (
        result.title &&
        result.description &&
        result.severity &&
        result.filePath &&
        result.rationale
      );
    });
  } catch (error) {
    console.error(`AI analysis failed for ${category}:`, error);
    return [];
  }
}

export async function analyzeRepositoryStreaming(
  repoString: string,
  context: AnalysisContext,
  onEvent: EventCallback
): Promise<void> {
  const { workspaceId, repositoryId, scanId, octokit, linearClient, linearTeamId } = context;
  let totalProposals = 0;
  let filesScanned = 0;

  try {
    // Update scan status to running
    await updateScanStatus(scanId, 'running');

    // Phase 1: Fetch file tree
    onEvent({ type: 'progress', phase: 'fetching', current: 0, total: 0 });

    const analyzableFiles = await getAnalyzableFiles(octokit, repoString);
    const { sourceFiles, testFiles, configFiles } = categorizeFiles(analyzableFiles);

    // Prioritize files: security-sensitive first, then by size
    const prioritizedFiles = [
      ...configFiles,
      ...sourceFiles.sort((a, b) => (a.size || 0) - (b.size || 0)),
    ];

    // Limit files for demo (20 files = ~40 API calls)
    const filesToAnalyze = prioritizedFiles.slice(0, 20);
    const testFilesToFetch = testFiles.slice(0, 20);

    onEvent({
      type: 'progress',
      phase: 'fetching',
      current: 0,
      total: filesToAnalyze.length,
    });

    // Fetch file contents
    const sourceContents = await fetchFilesForAnalysis(
      octokit,
      repoString,
      filesToAnalyze.map(f => f.path)
    );

    const testContents = await fetchFilesForAnalysis(
      octokit,
      repoString,
      testFilesToFetch.map(f => f.path)
    );

    filesScanned = sourceContents.length;

    // Phase 2: Analyze files
    const totalAnalyses = sourceContents.length * 2;
    let completed = 0;

    for (const file of sourceContents) {
      // Security analysis
      onEvent({
        type: 'progress',
        phase: 'analyzing',
        current: completed,
        total: totalAnalyses,
        currentFile: file.path,
      });

      const securityPrompt = buildSecurityPrompt(file.path, file.content);
      const securityResults = await analyzeWithAI(securityPrompt, 'security');

      for (const result of securityResults) {
        // Check for existing proposal in database
        const existing = await findSimilarProposal(workspaceId, repositoryId, result.filePath, result.title);
        if (existing) continue;

        // Check if this issue already exists in Linear
        let existingLinearIssue = null;
        if (linearClient && linearTeamId) {
          existingLinearIssue = await findExistingIssue(
            linearClient,
            linearTeamId,
            result.title,
            result.filePath
          );
        }

        const proposal = await createProposal(workspaceId, repositoryId, scanId, {
          ...result,
          category: 'security',
          isPreExisting: !!existingLinearIssue,
          existingLinearIssueId: existingLinearIssue?.id,
          existingLinearIssueUrl: existingLinearIssue?.url,
        });

        if (proposal) {
          totalProposals++;
          onEvent({ type: 'proposal', proposal });
        }
      }

      completed++;

      // Testing analysis
      onEvent({
        type: 'progress',
        phase: 'analyzing',
        current: completed,
        total: totalAnalyses,
        currentFile: file.path,
      });

      const testFileItem = findTestFileForSource(
        file.path,
        testFiles as FileTreeItem[]
      );
      const testFile = testFileItem
        ? testContents.find(t => t.path === testFileItem.path)
        : undefined;

      const testingPrompt = buildTestingPrompt(
        file.path,
        file.content,
        testFile?.path,
        testFile?.content
      );
      const testingResults = await analyzeWithAI(testingPrompt, 'testing');

      for (const result of testingResults) {
        // Check for existing proposal in database
        const existing = await findSimilarProposal(workspaceId, repositoryId, result.filePath, result.title);
        if (existing) continue;

        // Check if this issue already exists in Linear
        let existingLinearIssue = null;
        if (linearClient && linearTeamId) {
          existingLinearIssue = await findExistingIssue(
            linearClient,
            linearTeamId,
            result.title,
            result.filePath
          );
        }

        const proposal = await createProposal(workspaceId, repositoryId, scanId, {
          ...result,
          category: 'testing',
          isPreExisting: !!existingLinearIssue,
          existingLinearIssueId: existingLinearIssue?.id,
          existingLinearIssueUrl: existingLinearIssue?.url,
        });

        if (proposal) {
          totalProposals++;
          onEvent({ type: 'proposal', proposal });
        }
      }

      completed++;

      // Small delay between files to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update scan status to completed
    await updateScanStatus(scanId, 'completed', filesScanned, totalProposals);

    // Update repository last scanned
    await updateLastScanned(workspaceId, repositoryId);

    onEvent({ type: 'complete', totalProposals });
  } catch (error) {
    // Update scan status to failed
    await updateScanStatus(
      scanId,
      'failed',
      filesScanned,
      totalProposals,
      error instanceof Error ? error.message : 'Analysis failed'
    );

    onEvent({
      type: 'error',
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
}
