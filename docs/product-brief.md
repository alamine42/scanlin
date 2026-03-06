# Product Brief: Proposed Issues

## Problem Statement

Modern development teams face a growing challenge: maintaining code quality across security and testing dimensions at scale. As codebases grow and teams move faster, critical gaps emerge:

1. **Security vulnerabilities slip through** - Manual code reviews miss issues, especially in unfamiliar codebases or under time pressure
2. **Testing debt accumulates** - Critical paths go untested while teams focus on feature delivery
3. **Issue tracking becomes reactive** - Teams discover problems in production rather than during development

Existing solutions fall into two problematic extremes:
- **Automated tools** generate noise: overwhelming teams with false positives and low-value alerts
- **Manual reviews** don't scale: expensive, inconsistent, and bottleneck velocity

## The Insight: AI Needs Human Partnership

AI is excellent at pattern recognition and comprehensive analysis but poor at understanding context, priority, and team dynamics. Humans excel at judgment and prioritization but can't process entire codebases efficiently.

**The key insight:** AI should *propose*, humans should *approve*.

This creates a workflow where:
- AI does the exhaustive, boring work of scanning every file
- Humans apply judgment to filter signal from noise
- Only validated issues enter the issue tracker
- The approval process trains team intuition over time

## Why "Proposed Issues" (Not Auto-Create)

### Trust Through Transparency
Auto-creating issues erodes trust. When developers see AI-generated tickets in their backlog, the immediate reaction is skepticism and resentment. By requiring approval, we:
- Build confidence in the system gradually
- Let teams calibrate their acceptance threshold
- Avoid polluting backlogs with low-value items

### Learning Loop
Each approve/reject decision is implicit feedback:
- Rejected issues reveal what the AI misunderstands about this team's codebase
- Approved issues reinforce what matters
- Over time, the system can learn team preferences (future enhancement)

### Respect for Developer Autonomy
Developers are craftspeople. They should control what enters their work queue. Proposed Issues respects this by:
- Making suggestions, not demands
- Providing rationale so developers understand why
- Allowing dismissal without guilt

## UX Decisions and Tradeoffs

### Decision: Start with Security + Testing Only

**Rationale:** These categories have clear "right answers" that AI can identify with high confidence. Security vulnerabilities and missing tests are more objective than, say, "this code should be refactored."

**Tradeoff:** We're leaving value on the table (documentation gaps, performance issues) but gaining credibility by being precise rather than noisy.

### Decision: Severity-Based Ordering

**Rationale:** Critical issues should be impossible to miss. Visual hierarchy guides attention to what matters most.

**Tradeoff:** Lower-severity issues may accumulate and feel overwhelming. Future work could include auto-snoozing low-severity items.

### Decision: Inline Code Snippets

**Rationale:** Developers need context to make approval decisions. Showing the actual code snippet (not just file path) enables quick evaluation without context switching.

**Tradeoff:** Larger proposal cards, potentially slower page loads. We mitigate with syntax highlighting and collapsible sections.

### Decision: Snooze (Not Just Reject)

**Rationale:** Some issues are real but not actionable now. "Fix this in Q2" shouldn't mean losing track of it.

**Tradeoff:** Adds complexity to the status model. Worth it for real-world workflows.

### Decision: One-Click Linear Integration

**Rationale:** The value of this system is measured by issues that get *fixed*, not issues identified. Frictionless path to action is essential.

**Tradeoff:** Tight coupling to Linear. Future work could support other issue trackers.

## What We'd Test First

### Hypothesis 1: Approval Rate > 40%
If the approval rate is below 40%, the AI is too noisy. We'd focus on:
- Improving prompt specificity
- Adding severity thresholds
- Better deduplication

### Hypothesis 2: Time-to-Decision < 30 seconds
If developers spend more than 30 seconds per proposal, the information density is wrong. We'd:
- A/B test different card layouts
- Add quick-action keyboard shortcuts
- Test summary-first vs. detail-first views

### Hypothesis 3: Created Issues Get Resolved
Approved issues that never get fixed suggest a prioritization problem. We'd:
- Track issue resolution rates
- Compare proposed issues vs. manually created issues
- Investigate if AI-suggested issues are considered "less important"

## How This Fits Linear's Philosophy

### Momentum Over Perfection
Proposed Issues is about maintaining momentum. Rather than perfect upfront detection (which doesn't exist), it creates a lightweight triage workflow that integrates with how teams already work.

### Keyboard-First
The interface is designed for keyboard navigation. Tab through proposals, enter to expand, A to approve, R to reject. No mouse required for the happy path.

### Opinionated Defaults
We start with security and testing because they're universally valuable. We sort by severity because critical issues matter most. We default to "pending" view because that's where action happens.

### Integrated, Not Standalone
This isn't a separate security tool or test coverage analyzer. It's a proposal layer that feeds into Linear's existing issue workflow. The goal is to feel native, not bolted on.

## Future Directions

1. **Learning from feedback** - Use approve/reject signals to improve AI accuracy per-team
2. **Scheduled scans** - Run automatically on main branch changes
3. **IDE integration** - Show proposed issues inline in VS Code/JetBrains
4. **Custom categories** - Let teams define their own analysis rules
5. **Team analytics** - Dashboard showing approval rates, common issue types, resolution times

## Success Metrics

- **Adoption:** % of teams who run at least one scan per week
- **Signal quality:** Approval rate (target: 50-70%)
- **Impact:** % of approved issues that get resolved within 2 weeks
- **Efficiency:** Time from scan to approval decision
- **Trust:** Survey measure of "I trust the AI suggestions"

---

*This product exists because we believe the best AI products augment human judgment rather than replace it. Proposed Issues is a conversation between AI capability and human wisdom.*
