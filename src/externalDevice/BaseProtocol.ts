import { Protocol } from './Protocol'
import { State } from '../chessground/state'
import { GameStatus } from '../lichess/interfaces/game'
import { dummyProtocol } from './dummy/DummyProtocol'

export class BaseProtocol implements Protocol {
  private state?: BaseState

  transitionTo(state: BaseState) {
    this.state = state
    this.state.setContext(this)
    this.state.onEnter()
  }

  init(_st: State) {}
  features() { return dummyProtocol.features() }
  variants() { return dummyProtocol.variants() }
  options() { return dummyProtocol.options() }

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
  onCentralSetState() {
    this.state?.onCentralSetState()
  }
  onCentralOptionsReset() {
    this.state?.onCentralOptionsReset()
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

  onCentralSetState() {}
  onCentralOptionsReset() {}
}