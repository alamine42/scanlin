export const TESTING_GAPS_PROMPT = `You are a QA engineer reviewing a codebase for testing gaps. Analyze the code for missing or insufficient tests.

Focus on:
- Functions/methods with no test coverage
- Missing edge case tests (null, empty, boundary values)
- No error handling tests
- Integration points without tests
- Critical business logic without tests
- API endpoints without tests
- Database operations without tests
- Authentication/authorization flows without tests

For each gap found, output a JSON array of objects with this structure:
{
  "title": "Brief, actionable title (e.g., 'Missing tests for user authentication')",
  "description": "Detailed explanation of what tests are missing and why they matter",
  "severity": "high|medium|low",
  "filePath": "path/to/file.py",
  "lineNumbers": { "start": 10, "end": 15 },
  "codeSnippet": "the untested code",
  "suggestedFix": "Suggested test cases to add, including example test structure if helpful",
  "rationale": "Why this code needs testing and what could go wrong without tests"
}

Severity guidelines:
- high: Critical business logic, payment processing, auth, data integrity
- medium: Important features, data transformations, API endpoints
- low: Utility functions, simple getters/setters, well-understood code

Be specific and focus on high-value gaps. Don't aim for 100% coverage - prioritize tests that would catch real bugs.
If no significant gaps found, return an empty array: []

Respond ONLY with a valid JSON array, no additional text.`;

export function buildTestingPrompt(
  sourceFile: string,
  sourceContent: string,
  testFile?: string,
  testContent?: string
): string {
  let prompt = `${TESTING_GAPS_PROMPT}

---
SOURCE FILE: ${sourceFile}
---
\`\`\`
${sourceContent}
\`\`\``;

  if (testFile && testContent) {
    prompt += `

---
EXISTING TEST FILE: ${testFile}
---
\`\`\`
${testContent}
\`\`\``;
  } else {
    prompt += `

Note: No existing test file found for this source file.`;
  }

  prompt += `

Analyze this code for testing gaps. Return a JSON array of issues found.`;

  return prompt;
}
