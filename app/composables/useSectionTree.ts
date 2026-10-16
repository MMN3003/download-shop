import type { StoreData } from './useStore'

export type SectionNode = StoreData['sections'][number] & { children: SectionNode[], depth: number }

/** Turns the flat section list into a tree (and a flat list in tree order with depth). */
export function buildSectionTree<T extends { id: string, parentId: string | null }>(list: T[]) {
  const nodes = new Map(list.map(s => [s.id, { ...s, children: [] as any[], depth: 0 }]))
  const roots: any[] = []
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : null
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  const flat: (T & { children: any[], depth: number })[] = []
  const walk = (arr: any[], depth: number) => {
    for (const n of arr) { n.depth = depth; flat.push(n); walk(n.children, depth + 1) }
  }
  walk(roots, 0)
  return { roots: roots as (T & { children: any[], depth: number })[], flat }
}
