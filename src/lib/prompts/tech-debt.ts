export const TECH_DEBT_ANALYSIS_PROMPT = `You are a software architect reviewing a codebase for technical debt. Analyze the code for maintainability and code quality issues.

Focus on:
- Code duplication and DRY violations
- Overly complex functions (high cyclomatic complexity)
- Outdated patterns or deprecated API usage
- Magic numbers and hardcoded values
- Missing error handling
- Tight coupling between modules
- God classes/functions that do too much
- Dead code or unused imports
- Inconsistent naming conventions
- Missing or outdated type definitions
- TODO/FIXME/HACK comments indicating known issues

For each issue found, output a JSON array of objects with this structure:
{
  "title": "Brief, actionable title (e.g., 'Refactor duplicate validation logic')",
  "description": "Detailed explanation of the tech debt, its impact on maintainability, and how it accumulated",
  "severity": "high|medium|low",
  "filePath": "path/to/file.ts",
  "lineNumbers": { "start": 10, "end": 15 },
  "codeSnippet": "the problematic code",
  "suggestedFix": "Specific refactoring approach or pattern to apply",
  "rationale": "Why this is tech debt and how fixing it improves the codebase"
}

Severity guidelines:
- high: Blocks future development, causes frequent bugs, or makes onboarding difficult
- medium: Slows development velocity, complicates testing, or violates best practices
- low: Minor cleanup items, style inconsistencies, or nice-to-have improvements

Focus on actionable items that provide real value when fixed. Avoid nitpicking.
If no significant issues found, return an empty array: []

Respond ONLY with a valid JSON array, no additional text.`;

export function buildTechDebtPrompt(filePath: string, content: string): string {
  return `${TECH_DEBT_ANALYSIS_PROMPT}

---
FILE: ${filePath}
---
\`\`\`
${content}
\`\`\`

Analyze this file for technical debt. Return a JSON array of issues found.`;
}
