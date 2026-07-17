import { NextRequest, NextResponse } from 'next/server';
import {
  actionCatalog,
  dispatchSessionAction,
  getSession,
  resetSession,
  resolveSessionDay,
  sessionStatus,
} from '../../lib/playtest-server';
import { PlayerAction } from '../../lib/types';

export const dynamic = 'force-dynamic';

function unavailable() {
  return NextResponse.json({ error: 'The farm playtest API is only available in development.' }, { status: 404 });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return unavailable();
  const session = getSession(request.nextUrl.searchParams.get('session'));
  const includeState = request.nextUrl.searchParams.get('full') === '1';
  return NextResponse.json({ ...sessionStatus(session, includeState), actionCatalog });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return unavailable();
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON request body.' }, { status: 400 });
  }

  const sessionId = typeof body.session === 'string' ? body.session : null;
  const command = body.command;
  if (command === 'reset') {
    const seed = Number.isInteger(body.seed) ? Number(body.seed) : 42;
    const session = resetSession(sessionId, seed);
    return NextResponse.json(sessionStatus(session));
  }

  const session = getSession(sessionId);
  if (command === 'action') {
    if (!body.action || typeof body.action !== 'object')
      return NextResponse.json({ error: 'action must be an action object.' }, { status: 400 });
    const result = dispatchSessionAction(session, body.action as PlayerAction);
    return NextResponse.json({ result, status: sessionStatus(session) }, { status: result.ok ? 200 : 409 });
  }

  if (command === 'batch') {
    if (!Array.isArray(body.actions))
      return NextResponse.json({ error: 'actions must be an array.' }, { status: 400 });
    const results = [];
    for (const action of body.actions.slice(0, 500)) {
      if (!action || typeof action !== 'object') continue;
      const result = dispatchSessionAction(session, action as PlayerAction);
      results.push(result);
      if (!result.ok && body.stopOnError !== false) break;
    }
    return NextResponse.json({ results, status: sessionStatus(session) });
  }

  if (command === 'endDay') {
    const result = resolveSessionDay(session);
    return NextResponse.json({ result, status: sessionStatus(session) });
  }

  if (command === 'advanceDays') {
    const days = Math.max(1, Math.min(100, Number(body.days) || 1));
    const results = Array.from({ length: days }, () => resolveSessionDay(session));
    return NextResponse.json({ results, status: sessionStatus(session) });
  }

  return NextResponse.json({ error: 'Unknown command. Use reset, action, batch, endDay, or advanceDays.' }, { status: 400 });
}
