import { State } from '../chessground/state'
import { GameStatus } from '../lichess/interfaces/game'

export class BaseProtocol {
  private state?: BaseState

  transitionTo(state: BaseState) {
    this.state = state
    this.state.setContext(this)
    this.state.onEnter()
  }

  onPeripheralCommand(cmd: string) {
    this.state?.onPeripheralCommand(cmd)
  }
  onCentralStateCreated(st: State) {
    this.state?.onCentralStateCreated(st)
  }
  onCentralStateChanged() {
    this.state?.onCentralStateChanged()
  }
  onCentralStateCanceled() {
    this.state?.onCentralStateCanceled()
  }
  onCentralStateEnded(status?: GameStatus) {
    this.state?.onCentralStateEnded(status)
  }
  onMoveRejectedByCentral() {
    this.state?.onMoveRejectedByCentral()
  }
}
const dummyBaseProtocol = new BaseProtocol

export class BaseState {
  protected context: any = dummyBaseProtocol

  setContext(context: BaseProtocol) {
    this.context = context
  }
  transitionTo(state: BaseState) {
    this.context.transitionTo(state)
  }

  onEnter() {}
  onPeripheralCommand(_cmd: string) {}
  onCentralStateCreated(_st: State) {}
  onCentralStateChanged() {}
  onCentralStateCanceled() {}
  onCentralStateEnded(_status?: GameStatus) {}
  onMoveRejectedByCentral() {}
}