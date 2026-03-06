# Linear Proposed Issues

A prototype demonstrating a **proactive AI agent** that scans GitHub repositories, identifies Security and Testing gaps, and surfaces them as **Proposed Issues** — suggestions that need human approval before becoming real Linear issues.

## The Concept

Instead of auto-creating issues (which leads to noise and distrust), this system:

1. **Scans** your repository for security vulnerabilities and testing gaps
2. **Proposes** issues with detailed context, code snippets, and suggested fixes
3. **Waits** for human review and approval
4. **Creates** Linear issues only for approved proposals

This creates a workflow where AI does the exhaustive analysis, but humans retain control over what enters their issue tracker.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** with Linear-inspired dark theme
- **Claude API** (via Anthropic SDK) for code analysis
- **GitHub API** (Octokit) for repository scanning
- **Linear SDK** for issue creation
- **SQLite** (via better-sqlite3) for local persistence

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env.local
```

Required variables:
- `GITHUB_TOKEN` - GitHub personal access token
- `ANTHROPIC_API_KEY` - Anthropic/Claude API key
- `LINEAR_API_KEY` - Linear API key
- `LINEAR_TEAM_ID` - Your Linear team ID
- `TARGET_REPO` - Repository to scan (format: `owner/repo`)

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 4. Scan a repository

Either click "Scan Repository" in the web UI, or use the CLI:

```bash
npm run scan
```

To clear existing proposals and rescan:

```bash
npm run scan:clear
```

## Project Structure

```
linear-proposed-issues/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── proposals/[id]/page.tsx  # Detail view
│   │   └── api/                     # API routes
│   ├── components/
│   │   ├── ProposalCard.tsx         # List item
│   │   ├── ProposalList.tsx         # Filterable list
│   │   ├── ProposalDetail.tsx       # Full detail view
│   │   └── ApprovalActions.tsx      # Approve/Reject/Snooze
│   ├── lib/
│   │   ├── github.ts                # GitHub API client
│   │   ├── analyzer.ts              # AI analysis orchestration
│   │   ├── linear.ts                # Linear API client
│   │   ├── db.ts                    # SQLite database
│   │   └── prompts/                 # AI prompts
│   └── types/
│       └── proposal.ts              # TypeScript types
├── scripts/
│   └── scan.ts                      # CLI scanner
├── docs/
│   └── product-brief.md             # Product thinking document
└── package.json
```

## Features

### Security Analysis
- Hardcoded secrets and API keys
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization flaws
- Input validation issues

### Testing Gap Analysis
- Functions with no test coverage
- Missing edge case tests
- No error handling tests
- Critical paths without tests

### Approval Workflow
- **Approve** - Creates a Linear issue with full context
- **Reject** - Dismisses the proposal
- **Snooze** - Temporarily hide (1, 7, or 30 days)

## Product Brief

See [docs/product-brief.md](docs/product-brief.md) for the full product thinking, including:
- Problem statement
- Why "Proposed Issues" vs auto-create
- UX decisions and tradeoffs
- What we'd test first
- How this fits Linear's philosophy

## Demo Flow

1. Open dashboard at localhost:3000
2. Click "Scan Repository" and wait for analysis
3. Review proposed issues in the list
4. Click into a proposal to see full details
5. Approve to create a Linear issue
6. Reject or snooze as appropriate

## License

MIT
