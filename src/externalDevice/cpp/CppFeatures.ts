import { Support } from '../utils/Support'
import { Feature } from './CppConstants'
import { Features } from '../Features'

export class CppFeatures {
  lastMove = new Support(Feature.LastMove)
  check = new Support(Feature.Check)
  msg = new Support(Feature.Msg)
  side = new Support(Feature.Side)
  option = new Support(Feature.Option)
}

export class CppWrappedFeatures implements Features {
  private _features: CppFeatures

  constructor(features: CppFeatures) {
    this._features = features
  }

  get option() {
    return this._features.option.isSupported
  }
}