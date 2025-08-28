import { State } from './chessground/state'
import { GameStatus } from './lichess/interfaces/game'
import bluetooth from './externalDevice/bluetooth'
import redraw from './utils/redraw'

type MoveCallback = (orig: Key, dest: Key, prom?: Role) => void
type StateChangeCallback = () => void
let onPeripheralMove: MoveCallback | undefined
let onPeripheralStateChange: StateChangeCallback | undefined

export default {
  onCentralStateCreated(st: State) {
    bluetooth.protocol().onCentralStateCreated(st)
    bluetooth.saveCentralState(st)
  },
  onCentralStateChanged() {
    if (bluetooth.isRepeatedLastMove()) {
      return;
    }
    bluetooth.protocol().onCentralStateChanged()
    bluetooth.saveLastMove()
  },
  onCentralStateCanceled() {
    bluetooth.protocol().onCentralStateCanceled()
  },
  onCentralStateEnded(status?: GameStatus) {
    bluetooth.protocol().onCentralStateEnded(status)
  },
  onMoveRejectedByCentral() {
    bluetooth.protocol().onMoveRejectedByCentral()
  },
  onCentralGetState() {
    bluetooth.protocol().onCentralGetState()
  },
  onCentralSetState() {
    bluetooth.protocol().onCentralSetState()
  },
  sendMoveToCentral(orig: Key, dest: Key, prom?: Role) {
    onPeripheralMove?.(orig, dest, prom)
  },
  sendStateChangeToCentral() {
    onPeripheralStateChange?.()
    if (this.features().getState || this.features().setState)
      redraw()
  },
  sendOptionsUpdateToCentral() {
    bluetooth.updateSettings()
  },
  state() {
    return bluetooth.state()
  },
  features() {
    return bluetooth.features()
  },
  variants() {
    return bluetooth.variants()
  },
  options() {
    return bluetooth.options()
  },
  subscribe(moveCallback: MoveCallback, stateChangeCallback: StateChangeCallback) {
    onPeripheralMove = moveCallback
    onPeripheralStateChange = stateChangeCallback
  },
  unsubscribe() {
    onPeripheralMove = undefined
    onPeripheralStateChange = undefined
  }
}
