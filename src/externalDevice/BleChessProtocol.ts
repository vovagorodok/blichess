import { BaseProtocol, BaseState } from './BaseProtocol'
import { isCentralStateCreated, createFullFen, lastMoveToUci, getCommandParams, sendCommandToPeripheral, sendMoveToCentral, sendStateChangeToCentral, applyPeripheralMoveRejected, applyPeripheralLastMove, applyPeripheralSynchronized, applyPeripheralPieces, createIterator } from './utils'
import { State, makeDefaults } from '../chessground/state'
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
    fromPosition: new Support('from_position'),
  }

  init(st: State) {
    this.roundState = st
    this.transitionTo(new Init)
  }
}

class Support {
  name: string
  isSupported: boolean

  constructor(name: string) {
    this.name = name
    this.isSupported = false
  }
}

enum FeatureName {
  Msg = 'msg',
  LastMove = 'last_move',
}

enum VariantName {
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
  Check = 'check',
  Msg = 'msg',
  LastMove = 'last_move',
}

class Features {
  msg = new Support(FeatureName.Msg)
  lastMove = new Support(FeatureName.LastMove)
}

class Variants {
  standard = new Support(VariantName.Standard)
  chess960 = new Support(VariantName.Chess960)
  threeCheck = new Support(VariantName.ThreeCheck)
  atomic = new Support(VariantName.Atomic)
  kingOfTheHill = new Support(VariantName.KingOfTheHill)
  antiChess = new Support(VariantName.AntiChess)
  horde = new Support(VariantName.Horde)
  racingKings = new Support(VariantName.RacingKings)
  crazyHouse = new Support(VariantName.CrazyHouse)
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
    return this.context.variantsMap[variant]
  }

  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith(Command.Msg)) {
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
    const checkVariants = new CheckIteration(createIterator(this.getVariants()), Command.Variant, new Initialized)
    const checkFeatures = new CheckIteration(createIterator(this.getFeatures()), Command.Feature, checkVariants)
    this.transitionTo(checkFeatures)
  }
}

class CheckIteration extends BleChessState {
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
    this.transitionTo(isRoundOngoing ? new Begin : new Idle)
  }
}

class Idle extends BleChessState {
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new Begin)
  }
}

class Round extends BleChessState {
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new Begin)
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

class Begin extends Round {
  onEnter() {
    const state = this.getState()
    const variant = this.getVariant(state.variant)
    sendCommandToPeripheral(`${Command.SetVariant} ${variant.name}`)
    if (!variant.isSupported) {
      this.transitionTo(new Idle)
      Toast.show({ text: i18n('variantUnsupported') })
      return
    }
    this.transitionTo(new Run)
    sendCommandToPeripheral(`${Command.Begin} ${createFullFen(state)}`)
    if (state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
    if (this.getFeatures().lastMove.isSupported && state.lastMove) {
      sendCommandToPeripheral(`${Command.LastMove} ${lastMoveToUci(state)}`)
    }
  }
}

class Run extends Round {
  onCentralStateChanged() {
    const state = this.getState()
    sendCommandToPeripheral(`${Command.Move} ${lastMoveToUci(state)}`)
    if (state.check) {
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

class CheckPeripheralMove extends BleChessState {
  onCentralStateChanged() {
    const state = this.getState()
    this.transitionTo(new Run)
    if (state.lastPromotion && !state.peripheral.lastPromotion) {
      sendCommandToPeripheral(`${Command.Promote} ${lastMoveToUci(state)}`)
    }
    else {
      sendCommandToPeripheral(Command.Ok)
    }
    if (state.check) {
      sendCommandToPeripheral(`${Command.Check} ${state.check}`)
    }
  }
  onMoveRejectedByCentral() {
    const state = this.getState()
    this.transitionTo(new Run)
    sendCommandToPeripheral(Command.Nok)
    applyPeripheralMoveRejected(state, true)
    sendStateChangeToCentral()
    Toast.show({ text: i18n('rejected') })
  }
}
