import { AssertTrue, IsExact, Assert, IsNever } from "conditional-type-checks"
import { Form } from "."

type Extends<T, U> = T extends U ? true : false

type Tuple =
  | []
  | [any]
  | [any, any]
  | [any, any, any]
  | [any, any, any, any]
  | [any, any, any, any, any]
  | [any, any, any, any, any, any]
  | [any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any, any, any, any, any]
  | [any, any, any, any, any, any, any, any, any, any, any, any, any, any, any]

//#region FormData

export type FormShape =
  | { readonly [K in string | number | symbol]: FormShapeInner }
  | ReadonlyMap<FormShapeInner, FormShapeInner>
  | ReadonlyArray<FormShapeInner>

export type FormShapeAtomic =
  | number
  | boolean
  | string
  | null
  | undefined
  | bigint
  | symbol

export type FormShapeInner = FormShape | FormShapeAtomic

type _ExampleFormShape = {
  readonly arrayOfStrings: ReadonlyArray<string>
  readonly mapOfNumbers: ReadonlyMap<number, number>
  readonly nestedObj: { a: string; b: number }
  readonly mappedObj: { [T in string]: number }
  readonly tuple: [string, number]
  readonly tupleWithNesting: [{ a: number }, { a: number; b: string }]
}

type _ExampleFormDataA = AssertTrue<Extends<_ExampleFormShape, FormShape>>

//#endregion

//#region Validation

export const ALL = Symbol("ALL")
export type ALL = typeof ALL

//#endregion

//#region Paths and Get

export type Path =
  | readonly []
  | readonly [any]
  | readonly [any, any]
  | readonly [any, any, any]
  | readonly [any, any, any, any]

export type PathElement<T extends FormShapeInner> = T extends FormShapeAtomic
  ? never
  : T extends ReadonlyMap<infer U, any>
  ? U
  : T extends Tuple
  ? Exclude<{ [K in keyof T]?: K }["length"], T["length"]>
  : T extends ReadonlyArray<any>
  ? number
  : keyof T

export type Get<T, K> = K extends ALL
  ? T extends ReadonlyMap<any, infer U>
    ? U
    : T extends ReadonlyArray<any>
    ? T[number]
    : T extends object
    ? T[keyof T]
    : never
  : T extends object
  ? T extends ReadonlyMap<K, infer U>
    ? U
    : T extends ReadonlyArray<any>
    ? K extends number
      ? T[K]
      : never
    : K extends keyof T
    ? T[K]
    : never
  : any

type _GetA1 = AssertTrue<IsExact<Get<{ a: string }, "a">, string>>
type _GetA2 = AssertTrue<IsExact<Get<{ readonly a: string }, "a">, string>>
type _GetA3 = AssertTrue<IsExact<Get<[string, number], 1>, number>>
type _GetA4 = AssertTrue<IsExact<Get<Map<number, boolean>, number>, boolean>>
type _GetAllA1 = AssertTrue<
  IsExact<Get<{ a: string; b: number }, ALL>, string | number>
>

export type PathInto<
  T extends FormShapeInner,
  AllowAll extends boolean = false
> = (T extends FormShape ? PathInto_<T, AllowAll> : never) | readonly []

type PathInto_<T extends FormShape, AllowAll extends boolean = false> =
  | readonly [PathElement<T> | (AllowAll extends true ? ALL : never)]
  | (PathElement<T> extends infer P1
      ? P1 extends any
        ? Get<T, P1> extends infer U
          ? U extends FormShape
            ?
                | readonly [
                    P1 | (AllowAll extends true ? ALL : never),
                    PathElement<U> | (AllowAll extends true ? ALL : never),
                  ]
                | (PathElement<U> extends infer P2
                    ? P2 extends any
                      ? Get<U, P2> extends infer V
                        ? V extends FormShape
                          ?
                              | readonly [
                                  P1 | (AllowAll extends true ? ALL : never),
                                  P2 | (AllowAll extends true ? ALL : never),
                                  (
                                    | PathElement<V>
                                    | (AllowAll extends true ? ALL : never)
                                  ),
                                ]
                              | (PathElement<V> extends infer P3
                                  ? P3 extends any
                                    ? Get<V, P3> extends infer W
                                      ? W extends FormShape
                                        ? readonly [
                                            (
                                              | P1
                                              | (AllowAll extends true
                                                  ? ALL
                                                  : never)
                                            ),
                                            (
                                              | P2
                                              | (AllowAll extends true
                                                  ? ALL
                                                  : never)
                                            ),
                                            (
                                              | P3
                                              | (AllowAll extends true
                                                  ? ALL
                                                  : never)
                                            ),
                                            (
                                              | PathElement<W>
                                              | (AllowAll extends true
                                                  ? ALL
                                                  : never)
                                            ),
                                          ]
                                        : never
                                      : never
                                    : never
                                  : never)
                          : never
                        : never
                      : never
                    : never)
            : never
          : never
        : never
      : never)

type _ExamplePath = PathInto<_ExampleFormShape>
type _ExamplePathE =
  | readonly []
  | readonly [
      | "arrayOfStrings"
      | "mapOfNumbers"
      | "nestedObj"
      | "mappedObj"
      | "tuple"
      | "tupleWithNesting",
    ]
  | readonly ["arrayOfStrings", number]
  | readonly ["mapOfNumbers", number]
  | readonly ["nestedObj", "a" | "b"]
  | readonly ["mappedObj", string]
  | readonly ["tuple", 0 | 1]
  | readonly ["tupleWithNesting", 0 | 1]
  | readonly ["tupleWithNesting", 0, "a"]
  | readonly ["tupleWithNesting", 1, "a" | "b"]
type _ExamplePathA = AssertTrue<IsExact<_ExamplePath, _ExamplePathE>>

type _ExamplePathAll = PathInto<_ExampleFormShape, true>
type _ExamplePathAllE =
  | readonly []
  | readonly [
      | "arrayOfStrings"
      | "mapOfNumbers"
      | "nestedObj"
      | "mappedObj"
      | "tuple"
      | "tupleWithNesting"
      | ALL,
    ]
  | readonly ["arrayOfStrings" | ALL, number | ALL]
  | readonly ["mapOfNumbers" | ALL, number | ALL]
  | readonly ["nestedObj" | ALL, "a" | "b" | ALL]
  | readonly ["mappedObj" | ALL, string | ALL]
  | readonly ["tuple" | ALL, 0 | 1 | ALL]
  | readonly ["tupleWithNesting" | ALL, 0 | 1 | ALL]
  | readonly ["tupleWithNesting" | ALL, 0 | ALL, "a" | ALL]
  | readonly ["tupleWithNesting" | ALL, 1 | ALL, "a" | "b" | ALL]
type _ExamplePathAllA = AssertTrue<IsExact<_ExamplePathAll, _ExamplePathAllE>>

export type PathsMatching<T extends FormShapeInner, P extends Path> = PathInto<
  T
> extends infer PC
  ? PC extends Path
    ? PC["length"] extends P["length"]
      ? {
          [K in keyof PC]: K extends keyof P
            ? P[K] extends ALL
              ? true
              : IsNever<PC[K] & P[K]> extends true
              ? false
              : true
            : false
        } extends readonly true[]
        ? {
            readonly [K in keyof PC]: K extends keyof P
              ? P[K] extends ALL
                ? PC[K]
                : PC[K] & P[K]
              : never
          }
        : never
      : never
    : never
  : never

type _ = PathsMatching<_ExampleFormShape, ["tupleWithNesting", ALL]>

type _ExamplePathMatchingA = AssertTrue<
  IsExact<
    PathsMatching<_ExampleFormShape, ["tupleWithNesting", ALL]>,
    readonly ["tupleWithNesting", 0 | 1]
  >
>
type _ExamplepathMatchingA2 = AssertTrue<
  IsExact<
    PathsMatching<_ExampleFormShape, ["tupleWithNesting", ALL, "a"]>,
    | readonly ["tupleWithNesting", 0, "a"]
    | readonly ["tupleWithNesting", 1, "a"]
  >
>

export type ValueAtPath<T extends FormShapeInner, P extends Path> = P extends []
  ? T
  : P extends readonly [infer K1]
  ? Get<T, K1>
  : P extends readonly [infer K1, infer K2]
  ? Get<Get<T, K1>, K2>
  : P extends readonly [infer K1, infer K2, infer K3]
  ? Get<Get<Get<T, K1>, K2>, K3>
  : P extends readonly [infer K1, infer K2, infer K3, infer K4]
  ? Get<Get<Get<Get<T, K1>, K2>, K3>, K4>
  : any

type _ExampleValueAtPathA1 = AssertTrue<
  IsExact<ValueAtPath<_ExampleFormShape, []>, _ExampleFormShape>
>
type _ExampleValueAtPathA2 = AssertTrue<
  IsExact<
    ValueAtPath<_ExampleFormShape, readonly ["arrayOfStrings"]>,
    readonly string[]
  >
>
type _ExampleValueAtPathA3 = AssertTrue<
  IsExact<ValueAtPath<_ExampleFormShape, ["tupleWithNesting", 1, "b"]>, string>
>

export type PathToArray<T extends FormShape> = PathInto<T>
// TODO: integrate this into PathInto<>
// export type PathToArray<T extends FormShape> = PathInto<T> extends infer P
//   ? P extends []
//     ? T extends any[]
//       ? []
//       : never
//     : P extends [infer K1]
//     ? K1 extends any
//       ? ValueAtPath<T, [K1]> extends any[]
//         ? [K1]
//         : never
//       : never
//     : P extends [infer K1, infer K2]
//     ? K2 extends any
//       ? ValueAtPath<T, [K1, K2]> extends any[]
//         ? [K1, K2]
//         : never
//       : never
//     : P extends [infer K1, infer K2, infer K3]
//     ? K3 extends any
//       ? ValueAtPath<T, [K1, K2, K3]> extends any[]
//         ? [K1, K2, K3]
//         : never
//       : never
//     : P extends [infer K1, infer K2, infer K3, infer K4]
//     ? K4 extends any
//       ? ValueAtPath<T, [K1, K2, K3, K4]> extends any[]
//         ? [K1, K2, K3, K4]
//         : never
//       : never
//     : never
//   : never

// type _ExamplePathToArray = PathToArray<_ExampleFormShape>

export type ValueInArray<T> = T extends (infer U)[] ? U : any

//#endregion
