import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.TARGET_REPO;

  const debug = {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPrefix: token?.substring(0, 15) + '...',
    repo,
  };

  // Try to make a GitHub API call
  try {
    const octokit = new Octokit({ auth: token });
    const [owner, repoName] = (repo || '').split('/');

    const { data } = await octokit.repos.get({ owner, repo: repoName });

    return NextResponse.json({
      ...debug,
      repoFound: true,
      repoFullName: data.full_name,
    });
  } catch (error) {
    return NextResponse.json({
      ...debug,
      repoFound: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
