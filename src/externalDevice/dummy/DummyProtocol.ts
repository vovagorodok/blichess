import { Protocol } from '../Protocol'
import { DummyFeatures } from './DummyFeatures'
import { DummyVariants } from './DummyVariants'
import { dummyOptions } from './DummyOptions'

export class DummyProtocol implements Protocol {
  private _features = new DummyFeatures
  private _variants = new DummyVariants

  init() {}
  features() { return this._features }
  variants() { return this._variants }
  options() { return dummyOptions }

  onPeripheralCommand() {}
  onCentralStateCreated() {}
  onCentralStateChanged() {}
  onCentralStateCanceled() {}
  onCentralStateEnded() {}
  onMoveRejectedByCentral() {}

  onCentralOptionsReset() {}
}
export const dummyProtocol = new DummyProtocol