import { State } from './chessground/state'
import { GameStatus } from './lichess/interfaces/game'
import bluetooth from './externalDevice/bluetooth'

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
  sendMoveToCentral(orig: Key, dest: Key, prom?: Role) {
    onPeripheralMove?.(orig, dest, prom)
  },
  sendStateChangeToCentral() {
    onPeripheralStateChange?.()
  },
  sendOptionsUpdateToCentral() {
    bluetooth.updateSettings()
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
