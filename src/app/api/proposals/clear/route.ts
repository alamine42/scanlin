import { NextResponse } from 'next/server';
import { clearAllProposals } from '@/lib/db';

export async function POST() {
  try {
    clearAllProposals();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear proposals:', error);
    return NextResponse.json(
      { error: 'Failed to clear proposals' },
      { status: 500 }
    );
  }
}
