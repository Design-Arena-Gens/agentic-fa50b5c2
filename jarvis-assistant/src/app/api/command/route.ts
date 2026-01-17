import { NextResponse } from 'next/server';
import { runCommand } from '@/lib/command-registry';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { command } = await request.json();
    const result = await runCommand(String(command ?? ''));
    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[command api] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to process the command.',
      },
      { status: 500 },
    );
  }
}
