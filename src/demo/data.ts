export type Status = 'todo' | 'in-progress' | 'done' | 'blocked'

export interface Project {
  id: string
  name: string
  owner: string
  status: Status
  budget: number
  updatedAt: Date
  /** Shown in the detail panel when present. */
  notes?: string
  children?: Array<Project>
}

const owners = ['Ada', 'Grace', 'Linus', 'Margaret', 'Ken', 'Barbara']
const statuses: Array<Status> = ['todo', 'in-progress', 'done', 'blocked']

// Deterministic pseudo-random so the demo is stable across reloads.
let seed = 42
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const pick = <T>(items: Array<T>) => items[Math.floor(rand() * items.length)]

function makeItem(id: string, name: string, depth: number): Project {
  const childCount = depth < 2 && rand() > 0.4 ? Math.ceil(rand() * 3) : 0
  return {
    id,
    name,
    owner: pick(owners),
    status: pick(statuses),
    budget: Math.round(rand() * 100_000),
    updatedAt: new Date(2026, Math.floor(rand() * 9), Math.ceil(rand() * 28)),
    notes:
      depth === 0 && rand() > 0.5
        ? `Notes for ${name}: scope, risks and next milestones.`
        : undefined,
    children: childCount
      ? Array.from({ length: childCount }, (_, i) =>
          makeItem(
            `${id}.${i + 1}`,
            `${depth === 0 ? 'Task' : 'Subtask'} ${id}.${i + 1}`,
            depth + 1,
          ),
        )
      : undefined,
  }
}

export const projects: Array<Project> = Array.from({ length: 40 }, (_, i) =>
  makeItem(String(i + 1), `Project ${i + 1}`, 0),
)
