import {
  FormShapeInner,
  ALL,
  FormShape,
  PathInto,
  ValueAtPath,
  Path,
  PathElement,
  Get,
  PathsMatching,
  FormShapeAtomic,
} from "./types"
import { getIn, pathElements } from "./immutableHelpers"
import { IsNever } from "conditional-type-checks"

export type GetRootType<T extends FormShapeInner> = <P extends PathInto<T>>(
  p: P,
) => ValueAtPath<T, P>

export type Validator<T extends FormShapeInner, P extends PathInto<T, true>> = (
  value: ValueAtPath<T, P>,
  path: PathsMatching<T, P>,
  get: GetRootType<T>,
) => string | undefined
export type ValidatorMap<
  T extends FormShape,
  P extends PathInto<T, true>
> = readonly [P, Validator<T, P>]
export type Validators<T extends FormShapeInner> = T extends FormShape
  ? readonly (PathInto<T, true> extends infer P
      ? P extends PathInto<T, true>
        ? ValidatorMap<T, P>
        : never
      : never)[]
  : never

function* chain<T>(...args: Iterable<T>[]) {
  for (const arg of args) {
    yield* arg
  }
}

function* map<T, U>(iter: Iterable<T>, fn: (value: T) => U): Iterable<U> {
  for (const arg of iter) {
    yield fn(arg)
  }
}

function* filter<T>(iter: Iterable<T>, fn: (value: T) => boolean): Iterable<T> {
  for (const arg of iter) {
    if (fn(arg)) {
      yield arg
    }
  }
}

export class ValidatorTree<T extends FormShapeInner> {
  private children: Map<any, ValidatorTree<any>> | undefined = undefined
  private this_level: Validator<T, any>[] = []
  private all_children: ValidatorTree<any> | undefined = undefined

  addValidator<P extends PathInto<T, true>>(
    path: P,
    validator: Validator<T, P>,
  ): this {
    if (path.length === 0) {
      this.this_level.push(validator)
      return this
    }
    const [next, ...rest] = path as [any, ...any[]]
    if (next === ALL) {
      this.all_children = this.all_children ?? new ValidatorTree<any>()
      this.all_children.addValidator<any>(rest, validator)
      return this
    }
    this.children = this.children ?? new Map()
    if (!this.children.has(next))
      this.children.set(next, new ValidatorTree<any>())
    this.children.get(next)?.addValidator<any>(rest, validator)
    return this
  }

  revalidate<R extends FormShapeInner = T>(
    newValue: T,
    changedPath: PathInto<T>,
    oldResult: ValidationResult<T> | undefined,
    getRoot: GetRootType<R>,
    pathToThis: PathInto<R> = [],
  ): ValidationResult<T> {
    // run this_level validators
    var thisLevel = this.this_level
      .map(x => x(newValue, pathToThis as PathsMatching<T, any>, getRoot))
      .filter(x => x !== undefined) as string[]

    const [next, ...rest] = changedPath as any[]

    // if we're an ancestor of the entry that was modified, only run the child
    // that leads us toward the modified descendant
    if (next !== undefined) {
      const childValue = getIn(newValue as FormShape, [next])
      const oldChildResult: ValidationResult<any> = (oldResult as ValidationResult<
        any
      >)?.get(next) as ValidationResult<any>
      const childResult: ValidationResult<any> = mergeResult(
        this.all_children?.revalidate(
          childValue,
          rest as any,
          oldChildResult,
          getRoot,
          [...pathToThis, next] as PathInto<R>,
        ),
        this.children
          ?.get(next)
          ?.revalidate(childValue, rest as any, oldChildResult, getRoot, [
            ...pathToThis,
            next,
          ] as PathInto<R>) as ValidationResult<any>,
      )
      return replaceChild(
        oldResult,
        next,
        childResult,
        thisLevel,
      ) as ValidationResult<T>
    }

    // we are either on the entry that was modified, or are a child of it;
    // we need to revalidate our entire subtree
    const seenKeys = new Set<any>()
    const children: [any, ValidationResult<any>][] = []
    for (const key of pathElements(newValue as any)) {
      const childValue = getIn(newValue as FormShape, [key as any])
      seenKeys.add(key)
      const childResult: ValidationResult<any> = mergeResult(
        this.all_children?.revalidate(childValue, [], undefined, getRoot, [
          ...pathToThis,
          key,
        ] as PathInto<R>) as ValidationResult<any>,
        this.children
          ?.get(key)
          ?.revalidate(childValue, [], undefined, getRoot, [
            ...pathToThis,
            key,
          ] as PathInto<R>),
      )
      if (childResult !== undefined) children.push([key, childResult])
    }

    // If there are validators expecting a particular key, and that key is
    // absent, we run them with 'undefined'. We don't run the all-children ones
    // though, because then whether or not they get run on a given key depends
    // on what other validators are registered.
    const validatorEntries = this.children?.entries()
    if (validatorEntries) {
      for (const [key, validator] of validatorEntries) {
        if (seenKeys.has(key)) continue
        const childResult = validator.revalidate(
          undefined,
          [],
          undefined,
          getRoot,
          [...pathToThis, key] as PathInto<R>,
        )
        if (childResult !== undefined) children.push([key, childResult])
      }
    }

    return makeValidationResult(thisLevel, children) as ValidationResult<T>
  }
}

// https://stackoverflow.com/a/50375286/445398
type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never

export type ValidationResult<T extends FormShapeInner> =
  | (ReadonlyMap<any, any> & { errors: readonly string[] })
  | undefined

function makeValidationResult(
  errors: readonly string[],
  childErrors: readonly [any, any][],
  suppressUndefined: boolean = false,
): ValidationResult<any> {
  if (!errors.length && !childErrors.length && !suppressUndefined)
    return undefined
  return Object.assign(childErrors ? new Map(childErrors) : new Map(), {
    errors,
  })
}

function replaceChild<
  T extends FormShapeInner,
  K extends PathElement<T>,
  TK extends Get<T, K> & FormShapeInner
>(
  r: ValidationResult<T>,
  key: K,
  value: ValidationResult<TK>,
  selfErrors: string[],
): ValidationResult<T> {
  if (value === undefined) {
    return makeValidationResult(
      selfErrors,
      r
        ? Array.from(
            filter(
              (r as Exclude<ValidationResult<any>, undefined>).entries(),
              ([k, _]) => k !== key,
            ),
          )
        : [],
    ) as ValidationResult<T>
  }
  const newR = makeValidationResult(
    selfErrors,
    (r?.entries() ?? []) as [any, any][],
    true,
  ) as ValidationResult<T> & Map<K, ValidationResult<TK>>
  newR.set(key, value)
  return newR
}

function mergeResult<T extends FormShapeInner>(
  l: ValidationResult<T>,
  r: ValidationResult<T>,
): ValidationResult<T> {
  if (l === undefined) return r
  if (r === undefined) return l
  const out = makeValidationResult(
    [...l.errors, ...r.errors],
    [],
    true,
  ) as ValidationResult<T> & Map<any, any>
  for (const k of new Set(
    chain(l.keys() as Iterable<any>, r.keys() as Iterable<any>),
  )) {
    out.set(
      k,
      mergeResult(
        l.get(k) as ValidationResult<any>,
        r.get(k) as ValidationResult<any>,
      ),
    )
  }
  return out
}

export function getInValidationResult(
  result: ValidationResult<any>,
  path: Path,
): ValidationResult<any> {
  var out = result
  for (const key of path) {
    if (out === undefined) return undefined
    out = out.get(key) as ValidationResult<any>
  }
  return out
}
