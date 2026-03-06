#!/usr/bin/env npx tsx

import { createProposal, updateProposal, getProposalById } from '../src/lib/db';

const seedData = [
  // Critical security issues
  {
    title: 'Hardcoded API key in configuration',
    description: `The file contains a hardcoded API key that is committed to version control. This exposes sensitive credentials that could be used to access external services.

**Impact:** An attacker with access to the repository could use this key to make unauthorized API calls, potentially incurring costs or accessing sensitive data.`,
    category: 'security' as const,
    severity: 'critical' as const,
    filePath: 'src/config/api.ts',
    lineNumbers: { start: 12, end: 14 },
    codeSnippet: `const config = {
  apiKey: 'sk-live-abc123xyz789secret',
  endpoint: 'https://api.example.com'
};`,
    suggestedFix: `Use environment variables instead:

\`\`\`typescript
const config = {
  apiKey: process.env.API_KEY,
  endpoint: process.env.API_ENDPOINT
};
\`\`\`

Add the actual values to \`.env.local\` and ensure \`.env.local\` is in \`.gitignore\`.`,
    rationale: 'Hardcoded secrets in source code are a critical security risk. Anyone with repository access can extract and misuse these credentials. This is particularly dangerous if the repository is public or if an attacker gains access through a compromised developer account.',
  },
  {
    title: 'SQL injection vulnerability in user search',
    description: `The user search function directly concatenates user input into a SQL query without sanitization or parameterized queries.

This allows an attacker to inject malicious SQL code and potentially:
- Extract sensitive data from the database
- Modify or delete data
- Bypass authentication`,
    category: 'security' as const,
    severity: 'critical' as const,
    filePath: 'src/services/userService.py',
    lineNumbers: { start: 45, end: 48 },
    codeSnippet: `def search_users(query):
    sql = f"SELECT * FROM users WHERE name LIKE '%{query}%'"
    return db.execute(sql)`,
    suggestedFix: `Use parameterized queries:

\`\`\`python
def search_users(query):
    sql = "SELECT * FROM users WHERE name LIKE ?"
    return db.execute(sql, (f'%{query}%',))
\`\`\``,
    rationale: 'SQL injection is one of the most dangerous web vulnerabilities (OWASP Top 10). An attacker could input something like `\' OR 1=1 --` to bypass filters or `\'; DROP TABLE users; --` to destroy data.',
  },

  // High severity issues
  {
    title: 'Missing authentication on admin endpoint',
    description: `The \`/api/admin/users\` endpoint does not verify that the requesting user has admin privileges before returning sensitive user data.`,
    category: 'security' as const,
    severity: 'high' as const,
    filePath: 'src/app/api/admin/users/route.ts',
    lineNumbers: { start: 8, end: 15 },
    codeSnippet: `export async function GET(request: Request) {
  // TODO: Add auth check
  const users = await db.query('SELECT * FROM users');
  return Response.json(users);
}`,
    suggestedFix: `Add authentication middleware:

\`\`\`typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const users = await db.query('SELECT * FROM users');
  return Response.json(users);
}
\`\`\``,
    rationale: 'Unauthenticated admin endpoints expose sensitive data to anyone who discovers the URL. This could lead to data breaches and privacy violations.',
  },
  {
    title: 'XSS vulnerability in comment rendering',
    description: `User comments are rendered using \`dangerouslySetInnerHTML\` without sanitization, allowing attackers to inject malicious scripts.`,
    category: 'security' as const,
    severity: 'high' as const,
    filePath: 'src/components/CommentList.tsx',
    lineNumbers: { start: 23, end: 27 },
    codeSnippet: `function Comment({ content }: { content: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  );
}`,
    suggestedFix: `Use a sanitization library like DOMPurify:

\`\`\`typescript
import DOMPurify from 'dompurify';

function Comment({ content }: { content: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
  );
}
\`\`\`

Or better yet, use a markdown renderer that escapes HTML by default.`,
    rationale: 'XSS attacks allow attackers to execute arbitrary JavaScript in users\' browsers, potentially stealing session tokens, personal data, or performing actions on behalf of the user.',
  },

  // Medium severity issues
  {
    title: 'Sensitive data logged in production',
    description: `User passwords and tokens are being logged, which could expose credentials in log files or monitoring systems.`,
    category: 'security' as const,
    severity: 'medium' as const,
    filePath: 'src/services/auth.ts',
    lineNumbers: { start: 34, end: 36 },
    codeSnippet: `async function login(email: string, password: string) {
  console.log('Login attempt:', { email, password });
  // ... rest of login logic`,
    suggestedFix: `Remove sensitive data from logs:

\`\`\`typescript
async function login(email: string, password: string) {
  console.log('Login attempt:', { email });
  // ... rest of login logic
\`\`\``,
    rationale: 'Logging sensitive data violates security best practices and potentially regulations like GDPR. Log files are often accessible to more people than production databases.',
  },

  // Testing gaps - High
  {
    title: 'No tests for payment processing logic',
    description: `The \`processPayment\` function handles critical financial transactions but has no test coverage. This function calculates totals, applies discounts, and charges credit cards.`,
    category: 'testing' as const,
    severity: 'high' as const,
    filePath: 'src/services/payment.ts',
    lineNumbers: { start: 15, end: 45 },
    codeSnippet: `export async function processPayment(
  userId: string,
  amount: number,
  discountCode?: string
) {
  const discount = await getDiscount(discountCode);
  const finalAmount = amount - (amount * discount);
  const result = await stripe.charges.create({
    amount: Math.round(finalAmount * 100),
    currency: 'usd',
    customer: userId,
  });
  return result;
}`,
    suggestedFix: `Add comprehensive tests:

\`\`\`typescript
describe('processPayment', () => {
  it('applies discount correctly', async () => {
    // Test discount calculation
  });

  it('handles invalid discount codes', async () => {
    // Test error handling
  });

  it('rounds amounts correctly for Stripe', async () => {
    // Test edge cases like $10.999
  });

  it('handles Stripe API failures gracefully', async () => {
    // Test error recovery
  });
});
\`\`\``,
    rationale: 'Payment processing bugs can result in overcharging customers, lost revenue, or failed transactions. This is a critical business function that requires thorough testing.',
  },
  {
    title: 'Authentication flow lacks test coverage',
    description: `The login, logout, and session management functions have no tests. These are critical security paths that should be thoroughly verified.`,
    category: 'testing' as const,
    severity: 'high' as const,
    filePath: 'src/lib/auth.ts',
    lineNumbers: { start: 1, end: 80 },
    codeSnippet: `export async function login(credentials: Credentials) {
  const user = await findUser(credentials.email);
  if (!user) throw new Error('User not found');

  const valid = await verifyPassword(credentials.password, user.hash);
  if (!valid) throw new Error('Invalid password');

  return createSession(user);
}`,
    suggestedFix: `Add tests for all auth scenarios:

- Valid login with correct credentials
- Login with wrong password
- Login with non-existent user
- Session creation and validation
- Session expiration
- Logout and session cleanup
- Rate limiting on failed attempts`,
    rationale: 'Authentication bugs can lead to unauthorized access or denial of service. These critical security paths need automated verification.',
  },

  // Testing gaps - Medium
  {
    title: 'Missing edge case tests for date handling',
    description: `The date utility functions don't have tests for edge cases like timezone conversions, daylight saving time transitions, or leap years.`,
    category: 'testing' as const,
    severity: 'medium' as const,
    filePath: 'src/utils/dates.ts',
    lineNumbers: { start: 10, end: 25 },
    codeSnippet: `export function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
  }).format(date);
}`,
    suggestedFix: `Add edge case tests:

\`\`\`typescript
describe('formatDate', () => {
  it('handles DST transitions', () => {
    // Test dates around March/November changes
  });

  it('handles leap year dates', () => {
    const leapDay = new Date('2024-02-29');
    expect(formatDate(leapDay, 'UTC')).toBe('Feb 29, 2024');
  });

  it('handles different timezones correctly', () => {
    // Same instant, different display
  });
});
\`\`\``,
    rationale: 'Date handling bugs are notoriously hard to catch and often only appear in production during specific calendar events. Edge case testing prevents these issues.',
  },
  {
    title: 'API error responses not tested',
    description: `The API routes have tests for success cases but no tests verifying correct error responses (400, 401, 404, 500).`,
    category: 'testing' as const,
    severity: 'medium' as const,
    filePath: 'src/app/api/users/route.ts',
    lineNumbers: { start: 1, end: 50 },
    codeSnippet: `export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }
    // ... create user
  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}`,
    suggestedFix: `Add error case tests:

\`\`\`typescript
describe('POST /api/users', () => {
  it('returns 400 when email missing', async () => {
    const res = await POST({ json: () => ({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    // ...
  });

  it('returns 409 for duplicate email', async () => {
    // ...
  });
});
\`\`\``,
    rationale: 'Error handling is part of the API contract. Untested error paths can return incorrect status codes or leak sensitive information in error messages.',
  },

  // Low severity
  {
    title: 'Missing rate limiting on public API',
    description: `The public API endpoints don't have rate limiting, which could allow abuse or denial of service attacks.`,
    category: 'security' as const,
    severity: 'low' as const,
    filePath: 'src/app/api/public/route.ts',
    lineNumbers: { start: 1, end: 10 },
    codeSnippet: `export async function GET(request: Request) {
  const data = await fetchPublicData();
  return Response.json(data);
}`,
    suggestedFix: `Add rate limiting middleware using a library like \`@upstash/ratelimit\` or implement token bucket algorithm.`,
    rationale: 'While not immediately critical, lack of rate limiting can lead to resource exhaustion and degraded service for legitimate users.',
  },
];

async function seed() {
  console.log('Seeding database with test data...\n');

  for (const data of seedData) {
    const proposal = createProposal(data);
    console.log(`Created: [${proposal.severity.toUpperCase()}] ${proposal.title}`);
  }

  // Mark one as approved (simulate Linear integration)
  const proposals = seedData.map((_, i) => i);
  const approvedIndex = 4; // "Sensitive data logged" issue

  // Get the 5th proposal and mark as approved
  const allProposals = require('../src/lib/db').getAllProposals();
  if (allProposals.length >= 5) {
    const toApprove = allProposals[4];
    updateProposal({
      id: toApprove.id,
      status: 'approved',
      linearIssueId: 'LIN-1234',
      linearIssueUrl: 'https://linear.app/demo/issue/LIN-1234',
    });
    console.log(`\nMarked as approved: ${toApprove.title}`);
  }

  // Mark one as rejected
  if (allProposals.length >= 10) {
    const toReject = allProposals[9];
    updateProposal({
      id: toReject.id,
      status: 'rejected',
    });
    console.log(`Marked as rejected: ${toReject.title}`);
  }

  console.log('\n✓ Seed complete!');
  console.log(`  Total proposals: ${seedData.length}`);
  console.log('  Visit http://localhost:4400 to see the UI');
}

seed().catch(console.error);
