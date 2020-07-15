import { Path } from "./types"

const THIS_LEVEL = Symbol("THIS_LEVEL")

export type ListenerTree<F extends Function> = { [THIS_LEVEL]: Set<F> } & Map<
  any,
  ListenerTree<F>
>

export function ListenerTree<F extends Function>(): ListenerTree<F> {
  return Object.assign(new Map(), { [THIS_LEVEL]: new Set<F>() })
}

export function addListener<F extends Function>(
  tree: ListenerTree<F>,
  path: Path,
  listener: F,
) {
  if (!path.length) {
    tree[THIS_LEVEL].add(listener)
  } else {
    const [k, ...rest] = path as [any, ...any[]]
    if (!tree.has(k)) tree.set(k, ListenerTree())
    addListener(tree.get(k) as ListenerTree<F>, (rest as any) as Path, listener)
  }
}

export function removeListener<F extends Function>(
  tree: ListenerTree<F>,
  path: Path,
  listener: F,
) {
  if (!path.length) {
    tree[THIS_LEVEL].delete(listener)
  } else {
    const [k, ...rest] = path as [any, ...any[]]
    if (!tree.has(k)) return
    removeListener(
      tree.get(k) as ListenerTree<F>,
      (rest as any) as Path,
      listener,
    )
  }
}

export function* walkListeners<F extends Function>(
  tree: ListenerTree<F>,
  path: Path,
): Generator<F, void, undefined> {
  const [k, ...rest] = path
  if (typeof k !== "undefined" && tree.has(k)) {
    yield* walkListeners(tree.get(k) as ListenerTree<F>, rest)
  }
  yield* tree[THIS_LEVEL].values()
}
