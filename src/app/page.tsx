import { getAllProposals, getProposalStats, getFilesScanned } from '@/lib/db';
import { ProposalList } from '@/components/ProposalList';
import { ScanButton } from '@/components/ScanButton';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const proposals = getAllProposals();
  const stats = getProposalStats();
  const filesScanned = getFilesScanned();

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Proposed Issues</h1>
          <p className="mt-1 text-sm text-gray-400">
            AI-detected security vulnerabilities and testing gaps. Review and approve to create Linear issues.
          </p>
        </div>
        <ScanButton hasProposals={proposals.length > 0} />
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Files Scanned"
            value={filesScanned}
            color="text-blue-400"
            icon="📁"
          />
          <StatCard
            label="Total Issues"
            value={stats.total}
            color="text-white"
          />
          <StatCard
            label="Security"
            value={stats.byCategory.security}
            color="text-red-400"
            icon="🔒"
          />
          <StatCard
            label="Testing"
            value={stats.byCategory.testing}
            color="text-purple-400"
            icon="🧪"
          />
          <StatCard
            label="Critical"
            value={stats.bySeverity.critical}
            color="text-red-500"
          />
        </div>
      )}

      {/* Empty state */}
      {proposals.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">No proposed issues yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Run a scan to analyze your repository for security vulnerabilities and testing gaps.
            AI will identify potential issues that need your review.
          </p>
        </div>
      ) : (
        <ProposalList proposals={proposals} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
