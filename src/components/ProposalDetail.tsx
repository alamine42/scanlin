'use client';

import { ProposedIssue } from '@/types/proposal';
import { CategoryBadge } from './CategoryBadge';
import { SeverityIndicator } from './SeverityIndicator';
import { ApprovalActions } from './ApprovalActions';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ProposalDetailProps {
  proposal: ProposedIssue;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    env: 'bash',
  };
  return languageMap[ext] || 'text';
}

export function ProposalDetail({ proposal }: ProposalDetailProps) {
  const language = getLanguageFromPath(proposal.filePath);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <CategoryBadge category={proposal.category} />
          <SeverityIndicator severity={proposal.severity} />
        </div>

        <h1 className="text-2xl font-semibold text-white">{proposal.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="font-mono bg-gray-800 px-2 py-1 rounded">{proposal.filePath}</span>
          {proposal.lineNumbers && (
            <span className="text-gray-500">
              Lines {proposal.lineNumbers.start}-{proposal.lineNumbers.end}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="py-4 border-t border-b border-gray-800">
        {proposal.isPreExisting ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-blue-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Already tracked in Linear</span>
            </div>
            {proposal.existingLinearIssueUrl && (
              <a
                href={proposal.existingLinearIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View in Linear
              </a>
            )}
          </div>
        ) : (
          <ApprovalActions proposal={proposal} />
        )}
      </div>

      {/* Description */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-200">Description</h2>
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-gray-300 whitespace-pre-wrap">{proposal.description}</div>
        </div>
      </div>

      {/* Code Snippet */}
      {proposal.codeSnippet && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-200">Code</h2>
          <div className="rounded-lg overflow-hidden border border-gray-800">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                background: '#0d1117',
              }}
              showLineNumbers={true}
              startingLineNumber={proposal.lineNumbers?.start || 1}
            >
              {proposal.codeSnippet}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Rationale */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-200">Why This Matters</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm">{proposal.rationale}</p>
        </div>
      </div>

      {/* Suggested Fix */}
      {proposal.suggestedFix && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-200">Suggested Fix</h2>
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{proposal.suggestedFix}</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-6 border-t border-gray-800">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>Created: {new Date(proposal.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(proposal.updatedAt).toLocaleString()}</span>
          <span className="font-mono text-gray-600">ID: {proposal.id}</span>
        </div>
      </div>
    </div>
  );
}
