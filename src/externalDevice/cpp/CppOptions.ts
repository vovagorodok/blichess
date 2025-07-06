import { Option } from "../Option"
import { CppBoolOption, CppEnumOption, CppStrOption, CppIntOption, CppFloatOption } from "./CppOption"
import { BoolOptionValue, OptionType } from "./CppConstants"
import { CppTypedOption } from "./CppOption"
import { Options } from "../Options"

export class CppOptions {
  private _map: Map<string, Option>

  constructor() {
    this._map = new Map<string, Option>()
  }

  get iterator(): Options {
    return this._map.values()
  }

  add(cmd: string): boolean {
    try {
      const split = cmd.split(' ')
      const name = split[0]
      const type = split[1]

      if (type === OptionType.Bool) {
      this._add(new CppBoolOption(
        name,
        split[2] === BoolOptionValue.True
      ))
      } else if (type === OptionType.Enum) {
        this._add(new CppEnumOption(
          name,
          split[2],
          split.slice(3)
        ))
      } else if (type === OptionType.Str) {
        this._add(new CppStrOption(
          name,
          split.slice(2).join(' ')
        ))
      } else if (type === OptionType.Int) {
        this._add(new CppIntOption(
          name,
          parseInt(split[2], 10),
          parseInt(split[3], 10),
          parseInt(split[4], 10),
          split.length > 5 ? parseInt(split[5], 10) : undefined
        ))
      } else if (type === OptionType.Float) {
        this._add(new CppFloatOption(
          name,
          parseFloat(split[2]),
          parseFloat(split[3]),
          parseFloat(split[4]),
          split.length > 5 ? parseFloat(split[5]) : undefined
        ))
      }
      return true
    } catch {
      return false
    }
  }

  set(cmd: string): boolean {
    try {
      const split = cmd.split(' ')
      const name = split[0]
      const value = split[1]
      const option = this._map.get(name)

      if (option instanceof CppBoolOption) {
        (option as CppBoolOption).peripheralValue = value === BoolOptionValue.True
      } else if (option instanceof CppEnumOption) {
        (option as CppEnumOption).peripheralValue = value
      } else if (option instanceof CppStrOption) {
        (option as CppStrOption).peripheralValue = split.slice(1).join(' ')
      } else if (option instanceof CppIntOption) {
        (option as CppIntOption).peripheralValue = parseInt(value, 10)
      } else if (option instanceof CppFloatOption) {
        (option as CppFloatOption).peripheralValue = parseFloat(value)
      }
      return true
    } catch {
      return false
    }
  }

  reset() {
    this._map.forEach(option => {
      (option as CppTypedOption<any>).reset()
    })
  }

  private _add(option: Option) {
    this._map.set(option.name, option)
  }
}
