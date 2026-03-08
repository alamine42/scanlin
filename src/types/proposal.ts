export type Category = 'security' | 'testing' | 'tech_debt' | 'performance' | 'documentation';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'pending' | 'approved' | 'rejected' | 'snoozed';

export interface LineNumbers {
  start: number;
  end: number;
}

export interface ProposedIssue {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  filePath: string;
  lineNumbers?: LineNumbers;
  codeSnippet?: string;
  suggestedFix?: string;
  rationale: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
  // Pre-existing issue tracking
  isPreExisting?: boolean;
  existingLinearIssueId?: string;
  existingLinearIssueUrl?: string;
}

export interface CreateProposalInput {
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  filePath: string;
  lineNumbers?: LineNumbers;
  codeSnippet?: string;
  suggestedFix?: string;
  rationale: string;
  isPreExisting?: boolean;
  existingLinearIssueId?: string;
  existingLinearIssueUrl?: string;
}

export interface UpdateProposalInput {
  id: string;
  status?: Status;
  title?: string;
  description?: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  severity: Severity;
  filePath: string;
  lineNumbers?: LineNumbers;
  codeSnippet?: string;
  suggestedFix?: string;
  rationale: string;
}
