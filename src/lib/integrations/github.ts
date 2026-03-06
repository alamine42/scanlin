import { Octokit } from '@octokit/rest';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

export interface RepoFile {
  path: string;
  content: string;
  size: number;
  sha: string;
}

export interface FileTreeItem {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}

// File extensions to analyze
const ANALYZABLE_EXTENSIONS = [
  '.py', '.js', '.ts', '.tsx', '.jsx',
  '.go', '.java', '.rb', '.php',
  '.sql', '.env', '.yaml', '.yml', '.json',
];

// Directories to skip
const SKIP_DIRECTORIES = [
  'node_modules', '__pycache__', '.git', 'dist', 'build',
  'venv', '.venv', 'env', '.env', 'vendor', '.next',
  'coverage', '.pytest_cache', '.mypy_cache',
];

// Maximum file size to analyze (100KB)
const MAX_FILE_SIZE = 100 * 1024;

/**
 * Get a GitHub client for a workspace
 * This decrypts the stored OAuth token and creates an Octokit instance
 */
export async function getGitHubClient(workspaceId: string): Promise<Octokit | null> {
  const supabase = await createClient();

  const result = await supabase
    .from('github_connections')
    .select('access_token_encrypted')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .single();

  const connection = result.data as { access_token_encrypted: string } | null;

  if (result.error || !connection) {
    console.error('No GitHub connection found for workspace:', workspaceId);
    return null;
  }

  try {
    const accessToken = decrypt(connection.access_token_encrypted);
    return new Octokit({ auth: accessToken });
  } catch (error) {
    console.error('Failed to decrypt GitHub token:', error);
    return null;
  }
}

function parseRepoString(repoString: string): { owner: string; repo: string } {
  const parts = repoString.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid repo format: ${repoString}. Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}

export async function getRepoFileTree(octokit: Octokit, repoString: string): Promise<FileTreeItem[]> {
  const { owner, repo } = parseRepoString(repoString);

  // Get the default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // Get the tree recursively
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: 'true',
  });

  const files: FileTreeItem[] = [];

  for (const item of treeData.tree) {
    if (!item.path || !item.sha) continue;

    // Skip directories we don't want to analyze
    const pathParts = item.path.split('/');
    const shouldSkip = pathParts.some(part => SKIP_DIRECTORIES.includes(part));
    if (shouldSkip) continue;

    if (item.type === 'blob') {
      files.push({
        path: item.path,
        type: 'file',
        size: item.size,
        sha: item.sha,
      });
    }
  }

  return files;
}

export async function getFileContent(octokit: Octokit, repoString: string, filePath: string): Promise<string | null> {
  const { owner, repo } = parseRepoString(repoString);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    if ('content' in data && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch file ${filePath}:`, error);
    return null;
  }
}

export async function getAnalyzableFiles(octokit: Octokit, repoString: string): Promise<FileTreeItem[]> {
  const allFiles = await getRepoFileTree(octokit, repoString);

  return allFiles.filter(file => {
    // Check file extension
    const ext = '.' + file.path.split('.').pop()?.toLowerCase();
    if (!ANALYZABLE_EXTENSIONS.includes(ext)) return false;

    // Check file size
    if (file.size && file.size > MAX_FILE_SIZE) return false;

    return true;
  });
}

export async function fetchFilesForAnalysis(
  octokit: Octokit,
  repoString: string,
  filePaths: string[]
): Promise<RepoFile[]> {
  const files: RepoFile[] = [];

  // Fetch files in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (path) => {
        const content = await getFileContent(octokit, repoString, path);
        if (content === null) return null;

        return {
          path,
          content,
          size: content.length,
          sha: '', // We don't need SHA for analysis
        };
      })
    );

    files.push(...results.filter((f): f is RepoFile => f !== null));

    // Small delay between batches to be nice to GitHub API
    if (i + batchSize < filePaths.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return files;
}

export function categorizeFiles(files: FileTreeItem[]): {
  sourceFiles: FileTreeItem[];
  testFiles: FileTreeItem[];
  configFiles: FileTreeItem[];
} {
  const sourceFiles: FileTreeItem[] = [];
  const testFiles: FileTreeItem[] = [];
  const configFiles: FileTreeItem[] = [];

  const testPatterns = [
    /test[_-]?/i,
    /spec[_-]?/i,
    /_test\./,
    /\.test\./,
    /\.spec\./,
    /tests\//,
    /__tests__\//,
  ];

  const configPatterns = [
    /\.config\./,
    /config\//,
    /\.env/,
    /\.yaml$/,
    /\.yml$/,
    /package\.json$/,
    /tsconfig\.json$/,
    /pyproject\.toml$/,
    /requirements\.txt$/,
  ];

  for (const file of files) {
    const isTest = testPatterns.some(pattern => pattern.test(file.path));
    const isConfig = configPatterns.some(pattern => pattern.test(file.path));

    if (isTest) {
      testFiles.push(file);
    } else if (isConfig) {
      configFiles.push(file);
    } else {
      sourceFiles.push(file);
    }
  }

  return { sourceFiles, testFiles, configFiles };
}

export function findTestFileForSource(
  sourcePath: string,
  testFiles: FileTreeItem[]
): FileTreeItem | undefined {
  const sourceBase = sourcePath.replace(/\.[^.]+$/, '');
  const sourceDir = sourcePath.split('/').slice(0, -1).join('/');
  const sourceFileName = sourcePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';

  // Look for common test file patterns
  const testPatterns = [
    `${sourceBase}_test.`,
    `${sourceBase}.test.`,
    `${sourceBase}.spec.`,
    `test_${sourceFileName}.`,
    `tests/${sourceFileName}`,
    `__tests__/${sourceFileName}`,
    `${sourceDir}/tests/${sourceFileName}`,
  ];

  return testFiles.find(testFile => {
    return testPatterns.some(pattern =>
      testFile.path.toLowerCase().includes(pattern.toLowerCase())
    );
  });
}

/**
 * List repositories accessible with the workspace's GitHub connection
 */
export async function listRepositories(workspaceId: string): Promise<{
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
}[]> {
  const octokit = await getGitHubClient(workspaceId);
  if (!octokit) {
    return [];
  }

  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    return data.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      default_branch: repo.default_branch,
    }));
  } catch (error) {
    console.error('Failed to list repositories:', error);
    return [];
  }
}
