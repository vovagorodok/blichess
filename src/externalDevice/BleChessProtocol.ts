import { BaseProtocol, BaseState } from './BaseProtocol'
import { isCentralStateCreated, createFullFen, lastMoveToUci, getCommandParams, sendCommandToPeripheral, sendMoveToCentral, sendStateChangeToCentral, applyPeripheralMoveRejected, applyPeripheralLastMove, applyVariantSupported, applyPeripheralSynchronized, applyPeripheralPieces, createValuesIterator } from './utils'
import { State, makeDefaults } from '../chessground/state'
import { GameStatus } from '../lichess/interfaces/game'
import { Toast } from '@capacitor/toast'
import i18n from '../i18n'

export class BleChessProtocol extends BaseProtocol {
  roundState = makeDefaults()
  features = new Features
  variants = new Variants
  variantsMap = {
    standard: this.variants.standard,
    chess960: this.variants.chess960,
    antichess: this.variants.antiChess,
    kingOfTheHill: this.variants.kingOfTheHill,
    threeCheck: this.variants.threeCheck,
    atomic: this.variants.atomic,
    horde: this.variants.horde,
    racingKings: this.variants.racingKings,
    crazyhouse: this.variants.crazyHouse,
  }
  endReasonsMap = {
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

  init(st: State) {
    this.roundState = st
    this.transitionTo(new Init)
  }
}

enum Feature {
  LastMove = 'last_move',
  Check = 'check',
  Msg = 'msg',
}

enum Variant {
  Standard = "standard",
  Chess960 = "chess_960",
  ThreeCheck = "3_check",
  Atomic = "atomic",
  KingOfTheHill = "king_of_the_hill",
  AntiChess = "anti_chess",
  Horde = "horde",
  RacingKings = "racing_kings",
  CrazyHouse = "crazy_house",
}

enum Command {
  Ok = 'ok',
  Nok = 'nok',
  Feature = 'feature',
  Variant = 'variant',
  SetVariant = 'set_variant',
  Begin = 'begin',
  State = 'state',
  Sync = 'sync',
  Unsync = 'unsync',
  End = 'end',
  Move = 'move',
  Promote = 'promote',
  Err = 'err',
  LastMove = 'last_move',
  Check = 'check',
  Msg = 'msg',
}

enum EndReason {
  Undefined = 'undefined',
  Checkmate = 'checkmate',
  Draw = 'draw',
  Timeout = 'timeout',
  Resign = 'resign',
  Abort = 'abort',
}

class Support {
  name: string
  isSupported: boolean

  constructor(name: string) {
    this.name = name
    this.isSupported = false
  }
}

class Features {
  lastMove = new Support(Feature.LastMove)
  check = new Support(Feature.Check)
  msg = new Support(Feature.Msg)
}

class Variants {
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

abstract class BleChessState extends BaseState {
  setState(state: State) {
    this.context.roundState = state
  }
  getState(): State {
    return this.context.roundState
  }
  getFeatures(): Features {
    return this.context.features
  }

  getVariants(): Variants {
    return this.context.variants
  }

  getVariant(variant: VariantKey): Support {
    return this.context.variantsMap[variant] || this.context.variants.standard
  }

  getEndReason(status?: GameStatus): EndReason | undefined {
    return status?.name && this.context.endReasonsMap[status.name]
  }

  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.Msg)) {
      Toast.show({ text: getCommandParams(cmd) })
    }
    else if (cmd.startsWith(Command.Err)) {
      Toast.show({ text: getCommandParams(cmd) })
    }
    else {
      Toast.show({ text: `${i18n('unexpected')}: ${this.constructor.name}: ${cmd}` })
    }
  }
  onCentralStateCreated(st: State) {
    this.setState(st)
  }
}

class Init extends BleChessState {
  onEnter() {
    const checkVariants = new CheckSupportsIteration(
      createValuesIterator(this.getVariants()),
      Command.Variant,
      new Initialized)
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
}

class Round extends Idle {
  onCentralStateEnded(status?: GameStatus) {
    const reason = this.getEndReason(status)
    if (reason) {
      sendCommandToPeripheral(`${Command.End} ${reason}`)
    }
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
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
      Toast.show({ text: i18n('synchronized') })
    }
    else if (cmd.startsWith(Command.Unsync)) {
      const state = this.getState()
      const peripheralFen = getCommandParams(cmd)
      applyPeripheralPieces(state, peripheralFen)
      applyPeripheralSynchronized(state, false)
      applyPeripheralMoveRejected(state, false)
      sendStateChangeToCentral()
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
