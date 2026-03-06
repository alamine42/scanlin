import { analyzeRepositoryStreaming } from '@/lib/analyzer';

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST() {
  const targetRepo = process.env.TARGET_REPO;

  if (!targetRepo) {
    return new Response(
      JSON.stringify({ error: 'TARGET_REPO environment variable is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env.GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'GITHUB_TOKEN environment variable is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start the analysis in the background
  (async () => {
    try {
      await analyzeRepositoryStreaming(targetRepo, async (event) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        await writer.write(encoder.encode(data));
      });
    } catch (error) {
      const errorEvent = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Scan failed',
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
