import { OptionType, TypedOption, BoolOption, EnumOption, StrOption, NumOption, IntOption, FloatOption } from "../Option"
import { BoolOptionValue, Command } from "./CppConstants"
import { sendCommandToPeripheral } from "../utils/utils"
import { TimerWrapper } from "../utils/TimerWrapper"

export abstract class CppTypedOption<T> implements TypedOption<T> {
  _name: string
  _value: T
  _defaultValue: T
  _timer: TimerWrapper
  _isHandled: boolean

  constructor(name: string, defaultValue: T) {
    this._name = name
    this._value = defaultValue
    this._defaultValue = defaultValue
    this._timer = new TimerWrapper
    this._isHandled = false
  }

  get name() {
    return this._name
  }
  get value() {
    return this._value
  }
  set value(value: T) {
    this._value = value
    if (this._timer.isActive()) {
      this._isHandled = false
    } else {
      this._handleValue()
    }
  }
  set peripheralValue(value: T) {
    this._value = value
    this._timer.stop()
  }
  reset() {
    this._value = this._defaultValue
    this._timer.stop()
  }
  _handleValue() {
    this._isHandled = true
    this._timer.start(() => this._handleTimeout(), 100)
    sendCommandToPeripheral(`${Command.SetOption} ${this._name} ${this.valueString}`)
  }
  _handleTimeout() {
    if (!this._isHandled) {
      this._handleValue()
    }
  }
  abstract get valueString(): string
  abstract get type(): OptionType
}

export class CppBoolOption extends CppTypedOption<boolean> implements BoolOption {
  constructor(name: string, defaultValue: boolean) {
    super(name, defaultValue)
  }

  get valueString() {
    return this._value ? BoolOptionValue.True : BoolOptionValue.False
  }
  get type() {
    return OptionType.Bool
  }
}

export class CppEnumOption extends CppTypedOption<string> implements EnumOption {
  _values: string[]
  
  constructor(name: string, defaultValue: string, values: string[]) {
    super(name, defaultValue)
    this._values = values
  }

  get valueString() {
    return this._value
  }
  get type() {
    return OptionType.Enum
  }
  get values() {
    return this._values
  }
}

export class CppStrOption extends CppTypedOption<string> implements StrOption {
  constructor(name: string, defaultValue: string) {
    super(name, defaultValue)
  }

  get valueString() {
    return this._value
  }
  get type() {
    return OptionType.Str
  }
}

abstract class CppNumOption extends CppTypedOption<number> implements NumOption  {
  _min: number
  _max: number
  _step?: number

  constructor(name: string, defaultValue: number, min: number, max: number, step?: number) {
    super(name, defaultValue)
    this._min = min
    this._max = max
    this._step = step
  }

  get min() {
    return this._min
  }
  get max() {
    return this._max
  }
  get step() {
    return this._step
  }
}

export class CppIntOption extends CppNumOption implements IntOption {
  constructor(name: string, defaultValue: number, min: number, max: number, step?: number) {
    super(name, defaultValue, min, max, step)
  }

  get valueString() {
    return this._value.toString()
  }
  get type() {
    return OptionType.Int
  }
}

export class CppFloatOption extends CppNumOption implements FloatOption {
  constructor(name: string, defaultValue: number, min: number, max: number, step?: number) {
    super(name, defaultValue, min, max, step)
  }

  get valueString() {
    return this._value.toFixed(2)
  }
  get type() {
    return OptionType.Float
  }
}