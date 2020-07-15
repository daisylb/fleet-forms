import { useState, useEffect, useRef } from "react"
import AsyncStorage from "@react-native-community/async-storage"
import {
  FormShape,
  FormShapeInner,
  PathInto,
  ValueAtPath,
  PathToArray,
  ValueInArray,
} from "./types"
import {
  ListenerTree,
  walkListeners,
  addListener,
  removeListener,
} from "./listenerTree"
import { setIn, appendIn, getIn } from "./immutableHelpers"
import {
  Validators,
  ValidatorTree,
  getInValidationResult,
  ValidationResult,
  GetRootType,
} from "./validation"

// type Touched<T> = T extends Map<infer K, infer V>
//   ? Map<K, Touched<V>>
//   : T extends [infer V1]
//   ? [Touched<V1>]
//   : T extends [infer V1, infer V2]
//   ? [Touched<V1>, Touched<V2>]
//   : T extends [infer V1, infer V2, infer V3]
//   ? [Touched<V1>, Touched<V2>, Touched<V3>]
//   : T extends [infer V1, infer V2, infer V3, infer V4]
//   ? [Touched<V1>, Touched<V2>, Touched<V3>, Touched<V4>]
//   : T extends Array<infer V>
//   ? Array<Touched<V>>
//   : T extends object
//   ? { [K in keyof T]: Touched<T[K]> }
//   : boolean

export type Form<T extends FormShape> = {
  update: <P extends PathInto<T>>(path: P, value: ValueAtPath<T, P>) => void
  append: <P extends PathToArray<T>>(
    path: P,
    value: ValueInArray<ValueAtPath<T, P>>,
  ) => void
  useField: <P extends PathInto<T>>(path: P) => FormFieldInfo<ValueAtPath<T, P>>
  registerListener: (path: PathInto<T>, listener: (t: T) => void) => () => void
  getSnapshot: () => T
  getValidationState: () => ValidationResult<T>
}

type FormFieldInfo<T extends FormShapeInner> = {
  value: T
  errors: ValidationResult<T>
}

function makeForm<T extends FormShape>(
  initialValue: T,
  validators: ValidatorTree<T>,
): Form<T> {
  var currentValue = initialValue
  const getRoot: GetRootType<T> = p => getIn(currentValue, p)
  var validatorTree = validators
  var validationState = validatorTree.revalidate(
    currentValue,
    [],
    undefined,
    getRoot,
  )
  const listenerTree = ListenerTree<(t: T) => void>()
  function update<P extends PathInto<T>>(path: P, value: ValueAtPath<T, P>) {
    currentValue = setIn(currentValue, path, value)
    validationState = validatorTree.revalidate<T>(
      currentValue,
      path,
      validationState,
      getRoot,
    )
    for (const l of walkListeners(listenerTree, path)) {
      l(currentValue)
    }
  }
  function append<P extends PathToArray<T>>(
    path: P,
    value: ValueInArray<ValueAtPath<T, P>>,
  ) {
    currentValue = appendIn(currentValue, path, value)
    const newIndex = (getIn(currentValue, path) as any[]).length - 1
    validationState = validatorTree.revalidate<T>(
      currentValue,
      [...(path as any[]), newIndex] as PathInto<T>,
      validationState,
      getRoot,
    )
    for (const l of walkListeners(listenerTree, path)) {
      l(currentValue)
    }
  }
  function useField<P extends PathInto<T>>(
    path: P,
  ): FormFieldInfo<ValueAtPath<T, P>> {
    const [value, setValue] = useState<FormFieldInfo<any>>({
      value: getIn(currentValue, path),
      errors: getInValidationResult(validationState, path),
    })
    useEffect(() => {
      const listener = () => {
        setValue({
          value: getIn(currentValue, path),
          errors: getInValidationResult(validationState, path),
        })
      }
      addListener(listenerTree, path, listener)
      return () => removeListener(listenerTree, path, listener)
    }, [])
    return value
  }
  function registerListener(path: PathInto<T>, listener: (t: T) => void) {
    addListener(listenerTree, path, listener)
    return () => removeListener(listenerTree, path, listener)
  }
  function getSnapshot(): T {
    return currentValue
  }
  function getValidationState() {
    return validationState
  }
  return {
    update,
    append,
    useField,
    registerListener,
    getSnapshot,
    getValidationState,
  }
}

export function useField<T extends FormShape, P extends PathInto<T>>(
  form: Form<T> | undefined,
  path: P,
): FormFieldInfo<ValueAtPath<T, P>> | undefined {
  const [value, setValue] = useState<FormFieldInfo<any> | undefined>(
    form === undefined
      ? undefined
      : {
          value: getIn(form.getSnapshot(), path),
          errors: getInValidationResult(form.getValidationState(), path),
        },
  )
  useEffect(() => {
    const listener = () => {
      setValue(
        form === undefined
          ? undefined
          : {
              value: getIn(form.getSnapshot(), path),
              errors: getInValidationResult(form.getValidationState(), path),
            },
      )
    }
    listener()
    return form === undefined
      ? undefined
      : form.registerListener(path, listener)
  }, [])
  return value
}

export function useForm<T extends FormShape>(
  initialValue: T,
  validators: ValidatorTree<T>,
): Form<T> {
  const ref = useRef<Form<T> | null>(null)
  if (ref.current === null) {
    ref.current = makeForm(initialValue, validators)
  }
  return ref.current
}

export type DefaultMap<K, V> = Map<K, V> & { get(key: K): V }
export type DefaultMapConstructor<K, V> = {
  new (...args: any): DefaultMap<K, V>
}

export function defaultMapFactory<K, V>(
  entryFactory: () => V,
  name?: string,
): DefaultMapConstructor<K, V> {
  const DefaultMap: DefaultMapConstructor<K, V> = class extends Map<K, V> {
    get(key: K): V {
      if (!super.has(key)) {
        super.set(key, entryFactory())
      }
      return super.get(key) as V
    }
  }
  if (typeof name === "string") {
    Object.defineProperty(DefaultMap, "name", { value: name })
  }
  return DefaultMap
}

type JsonValue =
  | string
  | number
  | { [k: string]: JsonValue | undefined }
  | JsonValue[]
  | boolean
  | null

export const LOADING = Symbol("LOADING")
type LOADING = typeof LOADING

export type SerializedForm<T extends FormShape> = Form<T> & {
  delete: () => Promise<void>
}

export function serialisedFormFactory<T extends FormShape>(
  load: (data: unknown) => T | Error,
  save: (data: T) => JsonValue,
  initialValue: T,
  validators: ValidatorTree<T>,
): (key: string) => SerializedForm<T> | LOADING {
  return function useSerializedForm(key: string): SerializedForm<T> | LOADING {
    const [form, setForm] = useState<SerializedForm<T> | LOADING>(LOADING)
    var deregisterListener: (() => void) | null = null
    useEffect(() => {
      ;(async () => {
        const data = await AsyncStorage.getItem(key)
        var form: Form<T>
        if (!data) {
          form = makeForm(initialValue, validators)
        } else {
          const deserializedData = load(JSON.parse(data))
          if (deserializedData instanceof Error) {
            console.warn(`Error deserializing saved data`, deserializedData)
            form = makeForm(initialValue, validators)
          } else {
            form = makeForm(deserializedData, validators)
          }
        }
        setForm({
          ...form,
          delete: async () => {
            await AsyncStorage.removeItem(key)
            setForm(LOADING)
          },
        })
        deregisterListener = form.registerListener(
          [],
          async t => await AsyncStorage.setItem(key, JSON.stringify(save(t))),
        )
      })()
      return () => {
        setForm(LOADING)
        deregisterListener && deregisterListener()
        deregisterListener = null
      }
    }, [key])
    return form
  }
}
