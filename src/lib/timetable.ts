/**
 * Timetable geometry, shared by the Timetable view and the dashboard widget.
 *
 * Tasks and timed subtasks are flattened into one `Entry` shape so the layout
 * algorithm never has to care which it is placing.
 */

import type { Priority, TaskDTO } from './types';

export const TT_START_HOUR = 6;
export const TT_END_HOUR = 22;
export const TT_HOUR_H = 52;

export interface Entry {
  key: string;
  /** Which task the block opens — a subtask opens its parent. */
  openId: string;
  title: string;
  start: string;
  estimateHours: number;
  priority: Priority;
  projectId: string | null;
  done: boolean;
  completion: number;
  peopleIds: string[];
  isSubtask: boolean;
  task: TaskDTO | null;
}

export interface Placed extends Entry {
  startH: number;
  endH: number;
  lane: number;
  lanes: number;
}

/** Flattens tasks and their timed subtasks into timetable entries. */
export function timetableEntries(tasks: TaskDTO[]): Entry[] {
  const out: Entry[] = [];
  tasks.forEach((t) => {
    // Only items with an explicit clock time appear on the timetable.
    if (t.start) {
      out.push({
        key: t.id,
        openId: t.id,
        title: t.title,
        start: t.start,
        estimateHours: t.estimateHours,
        priority: t.priority,
        projectId: t.projectId,
        done: t.status === 'DONE',
        completion: t.status === 'DONE' ? 100 : t.completion,
        peopleIds: Array.from(new Set([t.assigneeId, ...t.executorIds].filter(Boolean) as string[])),
        isSubtask: false,
        task: t,
      });
    }
    t.subtasks.forEach((c) => {
      if (!c.start) return;
      out.push({
        key: `${t.id}|${c.id}`,
        openId: t.id,
        title: c.text || '(chưa đặt tên)',
        start: c.start,
        estimateHours: c.estimateHours || 0.5,
        priority: t.priority,
        projectId: t.projectId,
        done: c.done,
        completion: c.done ? 100 : 0,
        peopleIds: t.assigneeId ? [t.assigneeId] : [],
        isSubtask: true,
        task: null,
      });
    });
  });
  return out;
}

/**
 * Assigns overlapping blocks to side-by-side lanes so nothing is hidden.
 *
 * Items are grouped into clusters of mutually-overlapping blocks, and every
 * item in a cluster shares the cluster's lane count — otherwise neighbouring
 * blocks would end up different widths and the columns would not line up.
 */
export function layoutLanes(entries: Entry[]): Placed[] {
  const items: Placed[] = entries
    .map((e) => {
      const s = new Date(e.start);
      const startH = s.getHours() + s.getMinutes() / 60;
      return {
        ...e,
        startH,
        endH: startH + Math.max(0.5, e.estimateHours || 1),
        lane: 0,
        lanes: 1,
      };
    })
    .sort((a, b) => a.startH - b.startH || a.endH - b.endH);

  let cluster: Placed[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    cluster.forEach((it) => {
      let lane = laneEnds.findIndex((end) => it.startH >= end - 1e-6);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endH);
      } else {
        laneEnds[lane] = it.endH;
      }
      it.lane = lane;
    });
    cluster.forEach((it) => {
      it.lanes = laneEnds.length;
    });
    cluster = [];
  };

  items.forEach((it) => {
    if (it.startH >= clusterEnd - 1e-6) {
      flush();
      clusterEnd = it.endH;
    } else {
      clusterEnd = Math.max(clusterEnd, it.endH);
    }
    cluster.push(it);
  });
  flush();

  return items;
}
