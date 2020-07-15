import {
  PathInto,
  ValueAtPath,
  FormShape,
  FormShapeInner,
  PathToArray,
  ValueInArray,
  PathElement,
} from "./types"

export function getIn<T extends FormShape, P extends PathInto<T>>(
  obj: T,
  path: P,
): ValueAtPath<T, P> {
  var outval: any = obj
  for (const k of path) {
    if (outval === undefined || outval === null) {
      return outval
    }
    if (outval instanceof Map) {
      outval = outval.get(k as any)
    } else {
      outval = outval[k as any]
    }
  }
  return outval
}

export function setIn<T extends FormShape, P extends PathInto<T>>(
  obj: T,
  path: P,
  value: ValueAtPath<T, P>,
): T {
  var pathM: any = path.slice()
  var outval = value as FormShapeInner
  while (pathM.length) {
    const key: any = pathM.pop()
    const old = getIn(obj, pathM) as FormShape
    if (old instanceof Map) {
      const species = old.constructor as MapConstructor | undefined
      if (!species)
        throw new Error(`Map ${old} has no constructor, got ${species}`)
      const parent = new species()
      for (const [k, v] of old) parent.set(k, v)
      parent.set(key, outval)
      outval = parent
    } else if (Array.isArray(old)) {
      outval = old.map((v, i) => (i === key ? outval : v))
    } else {
      outval = { ...old, [key]: outval }
    }
  }
  return outval as T
}

export function appendIn<T extends FormShape, P extends PathToArray<T>>(
  obj: T,
  path: P,
  value: ValueInArray<ValueAtPath<T, P>>,
): T {
  const old = getIn(obj, path) as any[]
  if (!Array.isArray(old)) throw new Error(`Expected array, got ${old}`)
  const newVal = [...old, value] as ValueAtPath<T, P>
  return setIn(obj, path, newVal)
}

export function pathElements<T extends FormShape>(
  obj: T,
): Iterable<PathElement<T>> {
  if (obj instanceof Map) {
    return obj.keys()
  }
  if (Array.isArray(obj)) {
    const length = obj.length
    return (function* gen() {
      for (let i = 0; i < length; i++) {
        yield i as PathElement<T>
      }
    })()
  }
  if (typeof obj !== "object" || obj === null) return []
  return Object.keys(obj) as PathElement<T>[]
}
