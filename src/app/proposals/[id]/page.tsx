import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProposalById } from '@/lib/db';
import { ProposalDetail } from '@/components/ProposalDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: PageProps) {
  const { id } = await params;
  const proposal = getProposalById(id);

  if (!proposal) {
    notFound();
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all proposals
      </Link>

      {/* Detail view */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <ProposalDetail proposal={proposal} />
      </div>
    </div>
  );
}
