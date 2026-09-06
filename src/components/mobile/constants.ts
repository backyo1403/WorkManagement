/**
 * Server-side values the phone UI only *displays*.
 *
 * `MAX_NOTE_VERSIONS` lives in `lib/api-helpers.ts`, which imports Prisma and
 * therefore cannot be pulled into a client component. Mirroring the number here
 * keeps the footer honest without dragging the server into the bundle; the
 * enforcement stays where it belongs, on the write path.
 */
export const MAX_NOTE_VERSIONS_LABEL = 20;
