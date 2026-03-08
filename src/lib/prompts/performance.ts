export const PERFORMANCE_ANALYSIS_PROMPT = `You are a performance engineer reviewing code for optimization opportunities. Analyze the code for performance issues and inefficiencies.

Focus on:
- N+1 query patterns in database operations
- Unnecessary re-renders in React components
- Missing memoization for expensive computations
- Inefficient loops and algorithms (O(n^2) when O(n) possible)
- Memory leaks (event listeners not cleaned up, subscriptions not unsubscribed)
- Large bundle imports that could be code-split
- Blocking operations that should be async
- Missing caching for repeated expensive operations
- Unoptimized images or assets
- Excessive DOM manipulation
- Missing database indexes implied by query patterns
- Synchronous file operations in request handlers

For each issue found, output a JSON array of objects with this structure:
{
  "title": "Brief, actionable title (e.g., 'Add pagination to prevent loading all records')",
  "description": "Detailed explanation of the performance issue, expected impact, and how it affects user experience",
  "severity": "critical|high|medium|low",
  "filePath": "path/to/file.ts",
  "lineNumbers": { "start": 10, "end": 15 },
  "codeSnippet": "the inefficient code",
  "suggestedFix": "Specific optimization with code example if helpful",
  "rationale": "Why this impacts performance and estimated improvement"
}

Severity guidelines:
- critical: Causes timeouts, crashes, or makes features unusable at scale
- high: Noticeable lag (>500ms) or high memory usage affecting user experience
- medium: Sub-optimal patterns that will cause issues as data grows
- low: Minor optimizations, premature optimization candidates

Focus on real performance issues with measurable impact. Avoid micro-optimizations.
If no significant issues found, return an empty array: []

Respond ONLY with a valid JSON array, no additional text.`;

export function buildPerformancePrompt(filePath: string, content: string): string {
  return `${PERFORMANCE_ANALYSIS_PROMPT}

---
FILE: ${filePath}
---
\`\`\`
${content}
\`\`\`

Analyze this file for performance issues. Return a JSON array of issues found.`;
}
