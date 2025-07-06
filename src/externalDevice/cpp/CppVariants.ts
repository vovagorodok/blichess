import { Support } from '../utils/Support'
import { Variant } from './CppConstants'
import { Variants } from '../Variants'

export class CppVariants {
  standard = new Support(Variant.Standard)
  chess960 = new Support(Variant.Chess960)
  threeCheck = new Support(Variant.ThreeCheck)
  atomic = new Support(Variant.Atomic)
  kingOfTheHill = new Support(Variant.KingOfTheHill)
  antiChess = new Support(Variant.AntiChess)
  horde = new Support(Variant.Horde)
  racingKings = new Support(Variant.RacingKings)
  crazyHouse = new Support(Variant.CrazyHouse)
}

export class CppWrappedVariants implements Variants {
  private _variants: CppVariants

  constructor(variants: CppVariants) {
    this._variants = variants
  }

  get standard() {
    return this._variants.standard.isSupported
  }
  get chess960() {
    return this._variants.chess960.isSupported
  }
  get threeCheck() {
    return this._variants.threeCheck.isSupported
  }
  get atomic() {
    return this._variants.atomic.isSupported
  }
  get kingOfTheHill() {
    return this._variants.kingOfTheHill.isSupported
  }
  get antiChess() {
    return this._variants.antiChess.isSupported
  }
  get horde() {
    return this._variants.horde.isSupported
  }
  get racingKings() {
    return this._variants.racingKings.isSupported
  }
  get crazyHouse() {
    return this._variants.crazyHouse.isSupported
  }
}