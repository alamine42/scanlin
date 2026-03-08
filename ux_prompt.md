# Linear Proposed Issues - UX Design Brief

## Product Overview

**Linear Proposed Issues** is a SaaS application that uses AI to automatically scan code repositories for issues and proposes them for human review before creating tickets in Linear (a project management tool). It bridges the gap between automated code analysis and human-curated issue tracking.

**Tagline:** AI-powered code analysis with human approval before creating Linear issues.

---

## Target Users

- **Software Engineering Teams** using Linear for project management
- **Tech Leads & Engineering Managers** who want visibility into code quality
- **DevOps/Platform Engineers** responsible for maintaining code health
- **Startups to Mid-size Companies** with 5-100 engineers

---

## Core User Flow

1. **Sign up/Login** → Authenticate via Clerk (email/social)
2. **Create/Join Workspace** → Team collaboration space
3. **Connect Integrations** → Link GitHub + Linear accounts via OAuth
4. **Add Repository** → Select which repos to scan
5. **Configure Scan** → Choose which categories to analyze
6. **Run Scan** → AI analyzes code files in real-time
7. **Review Proposals** → See AI-detected issues with details
8. **Take Action** → Approve (creates Linear issue), Reject, or Snooze
9. **Track Progress** → View approved/rejected/snoozed proposals

---

## Five Analysis Categories

| Category | Icon | Purpose |
|----------|------|---------|
| **Security** | 🔒 | Vulnerabilities, hardcoded secrets, injection risks |
| **Testing** | 🧪 | Missing test coverage, untested edge cases |
| **Tech Debt** | 🔧 | Code duplication, complexity, outdated patterns |
| **Performance** | ⚡ | N+1 queries, memory leaks, inefficiencies |
| **Documentation** | 📝 | Missing JSDoc, undocumented APIs, unclear logic |

---

## Key Screens to Design

### 1. Dashboard (Main View)
- **Category selector** - Toggle pills to choose scan categories
- **Scan button** - Primary CTA to initiate analysis
- **Stats grid** - Files scanned, issues by category, critical count
- **Real-time progress** - Live updates during scan (file count, issues found)
- **Proposal list** - Filterable/sortable list of detected issues

### 2. Proposal Card (List Item)
- Category badge + Severity badge (Critical/High/Medium/Low)
- Issue title + description preview
- File path with line numbers
- Quick actions: Approve, Reject, Snooze
- Expandable code snippet + suggested fix
- Multi-select checkbox for bulk actions

### 3. Proposal Detail (Full View)
- Complete issue description (markdown)
- Code snippet with syntax highlighting
- AI-suggested fix
- Rationale explanation
- File location link
- Action buttons (Approve → Linear, Reject, Snooze)
- "Already exists in Linear" warning state

### 4. Settings / Integrations
- GitHub connection status + connect/disconnect
- Linear connection status + connect/disconnect
- Default Linear team selector
- Workspace settings

### 5. Repositories Page
- List of connected repositories
- Add repository flow (search GitHub repos)
- Last scanned timestamp
- Per-repo scan trigger

### 6. Navigation
- **Desktop:** Horizontal header nav with workspace switcher
- **Mobile:** Bottom tab bar navigation
- User avatar/menu (Clerk UserButton)

---

## Current Design System

- **Theme:** Dark mode only (deep space aesthetic)
- **Primary Color:** Indigo (#6366f1)
- **Background:** Near-black (#050508)
- **Typography:** Inter font family
- **Border Radius:** Subtle rounded corners (8-12px)
- **Effects:** Subtle glassmorphism, soft glows on interactive elements

---

## Severity Color Mapping

| Severity | Color | Use Case |
|----------|-------|----------|
| Critical | Red | Security vulnerabilities, breaking issues |
| High | Orange | Important issues needing attention |
| Medium | Yellow | Moderate improvements |
| Low | Blue | Nice-to-have enhancements |

---

## Status States for Proposals

| Status | Description |
|--------|-------------|
| **Pending** | Awaiting human review (default) |
| **Approved** | Converted to Linear issue |
| **Rejected** | Dismissed (not an issue) |
| **Snoozed** | Deferred for later review |

---

## Design Considerations

1. **Information Density** - Engineers want to see many proposals at once; balance density with readability
2. **Scannability** - Color-coded severity/category badges for quick visual parsing
3. **Batch Operations** - Support bulk approve/reject for efficiency
4. **Real-time Feedback** - Scan progress should feel alive (streaming updates)
5. **Mobile Experience** - Usable on mobile for quick reviews, but desktop-primary
6. **Empty States** - Guide users through setup (connect GitHub → add repo → scan)
7. **Error States** - Clear messaging when integrations fail or scan errors occur

---

## Competitive/Inspiration References

- **Linear** - Clean, fast, keyboard-driven UI
- **GitHub Security Alerts** - Issue presentation
- **Stripe Dashboard** - Premium dark theme execution
- **Vercel** - Deployment progress UX
- **SonarQube** - Code quality dashboards

---

## Questions to Explore in Redesign

1. How might we make the category selection more engaging/visual?
2. Can proposal review feel more like a "triage" workflow (swipe gestures, keyboard shortcuts)?
3. How do we surface the most critical issues without overwhelming users?
4. What dashboard visualizations would help track code health over time?
5. How can we make the "already exists in Linear" duplicate detection more prominent?
6. Should there be a "focus mode" for reviewing one proposal at a time?

---

## Technical Context

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Auth:** Clerk
- **Database:** Supabase (PostgreSQL)
- **Integrations:** GitHub OAuth, Linear OAuth
- **AI:** Anthropic Claude for code analysis
- **Hosting:** Vercel

### Multi-tenant Architecture
- Users belong to **Workspaces** (team collaboration)
- Each workspace has its own GitHub/Linear connections
- Proposals are scoped to workspace + repository
