export const SECURITY_ANALYSIS_PROMPT = `You are a security auditor reviewing a codebase. Analyze the following code for security issues.

Focus on:
- Hardcoded secrets, API keys, credentials
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization flaws
- Input validation issues
- Insecure dependencies
- Sensitive data exposure
- Path traversal vulnerabilities
- Command injection
- Insecure deserialization

For each issue found, output a JSON array of objects with this structure:
{
  "title": "Brief, actionable title (e.g., 'SQL Injection in user query')",
  "description": "Detailed explanation in markdown. Include what the vulnerability is, how it could be exploited, and the potential impact.",
  "severity": "critical|high|medium|low",
  "filePath": "path/to/file.py",
  "lineNumbers": { "start": 10, "end": 15 },
  "codeSnippet": "the problematic code exactly as it appears",
  "suggestedFix": "Specific code or approach to fix the issue",
  "rationale": "Why this is a security issue and what an attacker could do"
}

Severity guidelines:
- critical: Remote code execution, authentication bypass, exposed credentials
- high: SQL injection, XSS, sensitive data exposure
- medium: Missing input validation, improper error handling with info leak
- low: Security best practice violations, minor issues

Be specific and precise. Only flag real issues with clear security implications, not style preferences.
If no issues found, return an empty array: []

Respond ONLY with a valid JSON array, no additional text.`;

export function buildSecurityPrompt(filePath: string, content: string): string {
  return `${SECURITY_ANALYSIS_PROMPT}

---
FILE: ${filePath}
---
\`\`\`
${content}
\`\`\`

Analyze this file for security vulnerabilities. Return a JSON array of issues found.`;
}
