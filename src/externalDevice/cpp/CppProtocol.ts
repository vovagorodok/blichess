import { BaseProtocol, BaseState } from '../BaseProtocol'
import { isCentralStateCreated, isPeripheralStateGettable, createFullFen, lastMoveToUci, getCommandParams, sendCommandToPeripheral, sendMoveToCentral, sendStateChangeToCentral, sendOptionsUpdateToCentral, applyPeripheralMoveRejected, applyPeripheralLastMove, applyVariantSupported, applyPeripheralSynchronized, applyPeripheralGettable, applyPeripheralSettable, applyPeripheralPieces, createValuesIterator } from '../utils/utils'
import { Command, EndReason, Side } from './CppConstants'
import { Support } from '../utils/Support'
import { CppFeatures, CppWrappedFeatures } from './CppFeatures'
import { CppVariants, CppWrappedVariants } from './CppVariants'
import { CppOptions } from './CppOptions'
import { State, makeDefaults } from '../../chessground/state'
import { GameStatus } from '../../lichess/interfaces/game'
import { Toast } from '@capacitor/toast'
import i18n from '../../i18n'

export class CppProtocol extends BaseProtocol {
  _roundState = makeDefaults()
  _features = new CppFeatures
  _wrappedFeatures = new CppWrappedFeatures(this._features)
  _variants = new CppVariants
  _wrappedVariants = new CppWrappedVariants(this._variants)
  _variantsMap = {
    standard: this._variants.standard,
    chess960: this._variants.chess960,
    antichess: this._variants.antiChess,
    kingOfTheHill: this._variants.kingOfTheHill,
    threeCheck: this._variants.threeCheck,
    atomic: this._variants.atomic,
    horde: this._variants.horde,
    racingKings: this._variants.racingKings,
    crazyhouse: this._variants.crazyHouse,
  }
  _endReasonsMap = {
    mate: EndReason.Checkmate,
    stalemate: EndReason.Draw,
    draw: EndReason.Draw,
    timeout: EndReason.Timeout,
    outoftime: EndReason.Timeout,
    resign: EndReason.Resign,
    aborted: EndReason.Abort,
    noStart: EndReason.Undefined,
    unknownFinish: EndReason.Undefined,
    cheat: EndReason.Undefined,
    variantEnd: EndReason.Undefined,
  }
  _options = new CppOptions

  init(st: State) {
    this._roundState = st
    this.transitionTo(new Init)
  }

  features() {
    return this._wrappedFeatures
  }
  variants() {
    return this._wrappedVariants
  }
  options() {
    return this._options.iterator
  }
}

abstract class BleChessState extends BaseState {
  setState(state: State) {
    this.context._roundState = state
  }
  getState(): State {
    return this.context._roundState
  }

  getFeatures(): CppFeatures {
    return this.context._features
  }

  getVariants(): CppVariants {
    return this.context._variants
  }

  getOptions(): CppOptions {
    return this.context._options
  }


  getVariant(variant: VariantKey): Support {
    return this.context._variantsMap[variant] || this.context._variants.standard
  }

  getEndReason(status?: GameStatus): EndReason | undefined {
    return status?.name && this.context._endReasonsMap[status.name]
  }

  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.Msg)) {
      Toast.show({ text: getCommandParams(cmd) })
    }
    else if (cmd.startsWith(Command.Err)) {
      Toast.show({ text: getCommandParams(cmd) })
    }
    else if (cmd.startsWith(Command.SetOption)) {
      if (!this.getOptions().set(getCommandParams(cmd))) {
        Toast.show({ text: `${i18n('unexpected')}: ${cmd}` })
      }
      sendOptionsUpdateToCentral()
    }
    else if (cmd.startsWith(Command.OptionsReset)) {
      this.getOptions().reset()
      sendOptionsUpdateToCentral()
    }
    else {
      Toast.show({ text: `${i18n('unexpected')}: ${this.constructor.name}: ${cmd}` })
    }
  }
  onCentralStateCreated(st: State) {
    this.setState(st)
  }
  onCentralOptionsReset() {
    this.getOptions().reset()
    sendCommandToPeripheral(Command.OptionsReset)
  }
}

class Init extends BleChessState {
  onEnter() {
    const checkVariants = new CheckSupportsIteration(
      createValuesIterator(this.getVariants()),
      Command.Variant,
      new CheckOptions)
    const checkFeatures = new CheckSupportsIteration(
      createValuesIterator(this.getFeatures()),
      Command.Feature,
      checkVariants)
    this.transitionTo(checkFeatures)
  }
}

class CheckSupportsIteration extends BleChessState {
  private iterator: any
  private current: any
  private command: Command
  private nextState: BaseState

  constructor(iterator: any, command: Command, nextState: BaseState) {
    super()
    this.iterator = iterator
    this.current = iterator.next()
    this.command = command
    this.nextState = nextState
  }
  onEnter() {
    this.handleCurrent()
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === Command.Ok) {
      this.current.value.isSupported = true
      this.current = this.iterator.next()
      this.handleCurrent()
    }
    else if (cmd === Command.Nok) {
      this.current.value.isSupported = false
      this.current = this.iterator.next()
      this.handleCurrent()
    }
    else super.onPeripheralCommand(cmd)
  }
  private handleCurrent() {
    if (this.current.done) {
      this.transitionTo(this.nextState)
    }
    else {
      sendCommandToPeripheral(`${this.command} ${this.current.value.name}`)
    }
  }
}

class CheckOptions extends BleChessState {
  onEnter() {
    if (!this.getFeatures().option.isSupported) {
      this.transitionTo(new Initialized)
      return
    }
    sendCommandToPeripheral(Command.OptionsBegin)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.OptionsEnd)) {
      this.transitionTo(new Initialized)
      sendOptionsUpdateToCentral()
    }
    else if (cmd.startsWith(Command.Option)) {
      if (!this.getOptions().add(getCommandParams(cmd))) {
        Toast.show({ text: `${i18n('unexpected')}: ${cmd}` })
      }
    }
    else if (cmd.startsWith(Command.SetOption)) {
      if (!this.getOptions().set(getCommandParams(cmd))) {
        Toast.show({ text: `${i18n('unexpected')}: ${cmd}` })
      }
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Initialized extends BleChessState {
  onEnter() {
    const isRoundOngoing = isCentralStateCreated(this.getState())
    this.transitionTo(isRoundOngoing ? new RoundBegin : new Idle)
  }
}

class Idle extends BleChessState {
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new RoundBegin)
  }
  onCentralGetState() {
    this.transitionTo(new GetState)
  }
}

class GetState extends Idle {
  onEnter() {
    sendCommandToPeripheral(`${Command.GetState}`)
    applyPeripheralGettable(this.getState(), false)
    sendStateChangeToCentral()
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.State)) {
      const state = this.getState()
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralGettable(state, isPeripheralStateGettable(state))
      sendStateChangeToCentral()
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Round extends Idle {
  onCentralStateShifted(shift: Shift) {
    const state = this.getState()
    const cmd = this.getFeatures().undoRedo.isSupported ?
      (shift === 'undo' ? Command.Undo : Command.Redo) :
      Command.Begin
    applyPeripheralMoveRejected(state, false)
    sendCommandToPeripheral(`${cmd} ${createFullFen(state)}`)
    if (this.getFeatures().lastMove.isSupported && state.lastMove) {
      sendCommandToPeripheral(`${Command.LastMove} ${lastMoveToUci(state)}`)
    }
    if (this.getFeatures().check.isSupported && state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
  }
  onCentralStateEnded(status?: GameStatus) {
    const reason = this.getEndReason(status)
    if (reason) {
      this.transitionTo(new Idle)
      sendCommandToPeripheral(`${Command.End} ${reason}`)
    }
  }
  onCentralSetState() {
    sendCommandToPeripheral(`${Command.SetState}`)
    applyPeripheralSettable(this.getState(), false)
    sendStateChangeToCentral()
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.State)) {
      const state = this.getState()
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
    }
    else if (cmd.startsWith(Command.Sync)) {
      const state = this.getState()
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralSynchronized(state, true)
      applyPeripheralSettable(state, false)
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
      Toast.show({ text: i18n('synchronized') })
    }
    else if (cmd.startsWith(Command.UnsyncSettable)) {
      const state = this.getState()
      const wasSynchronized = state.peripheral.isSynchronized
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralSynchronized(state, false)
      applyPeripheralSettable(state, true)
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
      if (wasSynchronized)
        Toast.show({ text: i18n('unsynchronized') })
    }
    else if (cmd.startsWith(Command.Unsync)) {
      const state = this.getState()
      const wasSynchronized = state.peripheral.isSynchronized
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralSynchronized(state, false)
      applyPeripheralSettable(state, false)
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
      if (wasSynchronized)
        Toast.show({ text: i18n('unsynchronized') })
    }
    else super.onPeripheralCommand(cmd)
  }
}

class RoundBegin extends Round {
  onEnter() {
    const state = this.getState()
    const variant = this.getVariant(state.variant)
    sendCommandToPeripheral(`${Command.SetVariant} ${variant.name}`)
    applyVariantSupported(state, variant.isSupported)
    if (!variant.isSupported) {
      this.transitionTo(new Idle)
      Toast.show({ text: i18n('variantUnsupported') })
      return
    }
    this.transitionTo(new RoundOngoing)

    if (this.getFeatures().side.isSupported) {
      const side = state.otb ?
        Side.Both : (state.orientation === 'white' ? Side.White : Side.Black)
      sendCommandToPeripheral(`${Command.Side} ${side}`)
    }
    sendCommandToPeripheral(`${Command.Begin} ${createFullFen(state)}`)
    if (this.getFeatures().lastMove.isSupported && state.lastMove) {
      sendCommandToPeripheral(`${Command.LastMove} ${lastMoveToUci(state)}`)
    }
    if (this.getFeatures().check.isSupported && state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
  }
}

class RoundOngoing extends Round {
  onCentralStateChanged() {
    const state = this.getState()
    sendCommandToPeripheral(`${Command.Move} ${lastMoveToUci(state)}`)
    if (this.getFeatures().check.isSupported && state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
    applyPeripheralMoveRejected(state, false)
    sendStateChangeToCentral()
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.Move)) {
      const state = this.getState()
      const move = getCommandParams(cmd)
      applyPeripheralMoveRejected(state, false)
      applyPeripheralLastMove(state, move)
      this.transitionTo(new CheckPeripheralMove)
      sendMoveToCentral(move)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class CheckPeripheralMove extends Round {
  onCentralStateChanged() {
    const state = this.getState()
    this.transitionTo(new RoundOngoing)
    if (state.lastPromotion && !state.peripheral.lastPromotion) {
      sendCommandToPeripheral(`${Command.Promote} ${lastMoveToUci(state)}`)
    }
    else {
      sendCommandToPeripheral(Command.Ok)
    }
    if (this.getFeatures().check.isSupported && state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
  }
  onMoveRejectedByCentral() {
    const state = this.getState()
    this.transitionTo(new RoundOngoing)
    sendCommandToPeripheral(Command.Nok)
    applyPeripheralMoveRejected(state, true)
    sendStateChangeToCentral()
    Toast.show({ text: i18n('rejected') })
  }
}
