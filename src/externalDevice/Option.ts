export enum OptionType {
  Bool,
  Enum,
  Str,
  Int,
  Float,
}

export interface Option {
  readonly name: string
  readonly valueString: string
  readonly type: OptionType
}

export interface TypedOption<T> extends Option {
  value: T
}

export interface BoolOption extends TypedOption<boolean> {
}
export interface EnumOption extends TypedOption<string> {
  readonly values: string[]
}
export interface StrOption extends TypedOption<string> {
}
export interface NumOption extends TypedOption<number> {
  readonly min: number
  readonly max: number
  readonly step?: number
}
export interface IntOption extends NumOption {
}
export interface FloatOption extends NumOption {
}