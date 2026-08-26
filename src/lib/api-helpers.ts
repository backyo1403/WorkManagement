/**
 * Server-side helpers shared by the API routes: JSON responses, and the
 * invariants that must hold no matter which route does the writing.
 *
 * The invariants (mirroring bach-office.html):
 *   · a task always sits in its project's work group
 *   · completion is derived, never taken from the client
 *   · finishing a task stamps completedAt; reopening clears it
 *   · every hashtag the user types is registered so it can be suggested later
 */

import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { normalizeTag } from './domain';
import { isGroupKey, type GroupKey, type TaskStatus } from './types';

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Không tìm thấy') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Turns a thrown error into a 500 without leaking a stack trace to the client. */
export function serverError(e: unknown) {
  console.error(e);
  const message = e instanceof Error ? e.message : 'Lỗi máy chủ';
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Reads a JSON body, returning `null` when it is absent or malformed. */
export async function readBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────── hashtags ───────────────────────────

/** Registers each tag (so it is suggested next time) and returns their ids. */
export async function resolveHashtagIds(tags: string[]): Promise<string[]> {
  const names = Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
  const ids: string[] = [];
  for (const name of names) {
    const row = await prisma.hashtag.upsert({ where: { name }, update: {}, create: { name } });
    ids.push(row.id);
  }
  return ids;
}

export async function setTaskHashtags(taskId: string, tags: string[]) {
  const ids = await resolveHashtagIds(tags);
  await prisma.taskHashtag.deleteMany({ where: { taskId } });
  for (const hashtagId of ids) await prisma.taskHashtag.create({ data: { taskId, hashtagId } });
}

export async function setProjectHashtags(projectId: string, tags: string[]) {
  const ids = await resolveHashtagIds(tags);
  await prisma.projectHashtag.deleteMany({ where: { projectId } });
  for (const hashtagId of ids) {
    await prisma.projectHashtag.create({ data: { projectId, hashtagId } });
  }
}

// ─────────────────────────── task invariants ───────────────────────────

/**
 * Resolves the group a task belongs to. A task attached to a project always
 * inherits that project's group; otherwise the requested group is used, falling
 * back to `work`.
 */
export async function resolveTaskGroup(
  projectId: string | null | undefined,
  requested: unknown,
  fallback: GroupKey = 'work',
): Promise<GroupKey> {
  if (projectId) {
    const p = await prisma.project.findUnique({
      where: { id: projectId },
      select: { groupKey: true },
    });
    if (p && isGroupKey(p.groupKey)) return p.groupKey;
  }
  return isGroupKey(requested) ? requested : fallback;
}

/** Moving a project between groups drags its tasks along. */
export async function cascadeProjectGroup(projectId: string, groupKey: GroupKey) {
  await prisma.task.updateMany({ where: { projectId }, data: { groupKey } });
}

/**
 * Recomputes `completion` from the stored subtasks and keeps `completedAt` in
 * step with the status. Call after any write that could affect either.
 */
export async function syncTaskCompletion(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true, completion: true, completedAt: true, subtasks: { select: { done: true } } },
  });
  if (!task) return;

  const status = task.status as TaskStatus;
  const subs = task.subtasks;
  const completion =
    status === 'DONE' ? 100 : subs.length ? Math.round((subs.filter((s) => s.done).length / subs.length) * 100) : 0;

  const completedAt =
    status === 'DONE' ? task.completedAt ?? new Date() : null;

  const needsUpdate =
    completion !== task.completion ||
    (completedAt?.getTime() ?? null) !== (task.completedAt?.getTime() ?? null);

  if (needsUpdate) {
    await prisma.task.update({ where: { id: taskId }, data: { completion, completedAt } });
  }
}

export async function logActivity(taskId: string, text: string) {
  await prisma.activityLog.create({ data: { taskId, text } });
}

// ─────────────────────────── notes ───────────────────────────

export async function setNoteHashtags(noteId: string, tags: string[]) {
  const ids = await resolveHashtagIds(tags);
  await prisma.noteHashtag.deleteMany({ where: { noteId } });
  for (const hashtagId of ids) await prisma.noteHashtag.create({ data: { noteId, hashtagId } });
}

/** How many snapshots to keep per note. Older ones are pruned on write. */
export const MAX_NOTE_VERSIONS = 20;

/**
 * Snapshots the note's current title/content before it is overwritten, then
 * trims the history back to MAX_NOTE_VERSIONS.
 *
 * Autosave fires every few hundred milliseconds, so a snapshot per write would
 * bury the useful history (and the database) in near-identical rows. Instead a
 * new version is only cut when the last one is older than this window.
 */
const VERSION_MIN_GAP_MS = 5 * 60 * 1000;

export async function snapshotNote(noteId: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { title: true, content: true },
  });
  if (!note) return;

  const last = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
  });

  // Nothing changed, or the previous snapshot is still recent — skip.
  if (last && last.title === note.title && last.content === note.content) return;
  if (last && Date.now() - last.createdAt.getTime() < VERSION_MIN_GAP_MS) return;

  await prisma.noteVersion.create({
    data: { noteId, title: note.title, content: note.content },
  });

  const stale = await prisma.noteVersion.findMany({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_NOTE_VERSIONS,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.noteVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
  }
}

// ─────────────────────────── notebook PIN ───────────────────────────

/**
 * Salted SHA-256 of a notebook PIN.
 *
 * This gates access in the UI — it is deliberately NOT encryption: the note
 * bodies sit next to it in the same database as plain text. Real confidentiality
 * needs the content encrypted with a key derived from the PIN, and that key
 * never stored. Documented as such in README.md.
 */
export function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export function newSalt(): string {
  return randomBytes(16).toString('hex');
}
