import { State } from './chessground/state'
import bluetooth from './externalDevice/bluetooth'

type MoveCallback = (orig: Key, dest: Key, prom?: Role) => void
let callback: MoveCallback | undefined

export default {
  onCentralStateCreated(st: State) {
    bluetooth.protocol().onCentralStateCreated(st)
  },
  onCentralStateChanged() {
    bluetooth.protocol().onCentralStateChanged()
  },
  onMoveRejectedByCentral() {
    bluetooth.protocol().onMoveRejectedByCentral()
  },
  sendMoveToCentral(orig: Key, dest: Key, prom?: Role) {
    if (callback)
      callback(orig, dest, prom)
  },
  subscribeToPeripheralMoves(moveCallback: MoveCallback) {
    callback = moveCallback
  },
  unsubscribeFromPeripheralMoves() {
    callback = undefined
  }
}