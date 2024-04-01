import { BaseProtocol, BaseState } from './BaseProtocol'
// import * as chessFormat from '../utils/chessFormat'
import { hasPromotion, genFullFen, lastMoveToUci, getCommandParams, sendMsgToDevice, sendMoveToBoard, areFensEqual } from './utils'
import { State, makeDefaults } from '../chessground/state'
import { Toast } from '@capacitor/toast'
import i18n from '../i18n'

export class BleChessProtocol extends BaseProtocol {
  roundState = makeDefaults()
  features = new BleChessFeatures

  init() {
    this.transitionTo(new Init)
  }
}

class BleChessFeatures {
  msg: boolean = false
  lastMove: boolean = false
}

abstract class BleChessState extends BaseState {
  setState(state: State) {
    this.context.roundState = state
  }
  getState(): State {
    return this.context.roundState
  }
  getFeatures(): BleChessFeatures {
    return this.context.features
  }

  onReceiveMsgFromDevice(msg: string) {
    this.transitionTo(new Init)
    Toast.show({ text: `unexpected: ${msg}` })
  }

  onBoardConfigured(st: State) {
    this.setState(st)
  }
}

class ExpectMsg extends BleChessState {
  onReceiveMsgFromDevice(msg: string) {
    if (msg.startsWith('msg')) {
      sendMsgToDevice('ok')
      Toast.show({ text: getCommandParams(msg) })
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class Init extends BleChessState {
  onEnter() {
    this.transitionTo(new CheckFeatureMsg)
  }
}

class CheckFeatureMsg extends BleChessState {
  onEnter() {
    sendMsgToDevice('feature msg')
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.getFeatures().msg = true
      this.transitionTo(new CheckFeatureLastMove)
    }
    else if (msg === 'nok') {
      this.transitionTo(new CheckFeatureLastMove)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class CheckFeatureLastMove extends BleChessState {
  onEnter() {
    sendMsgToDevice('feature last_move')
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.getFeatures().lastMove = true
      this.transitionTo(new Idle)
    }
    else if (msg === 'nok') {
      this.transitionTo(new Idle)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class Idle extends ExpectMsg {
  onBoardConfigured(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
}

class SynchronizeVariant extends BleChessState {
  onEnter() {
    // sendMsgToDevice(`variant ${this.getState().variant}`)
    sendMsgToDevice("variant standard") // TODO implement variant
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.transitionTo(new SynchronizeFen)
    }
    else if (msg === 'nok') {
      this.transitionTo(new Idle)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class SynchronizeFen extends BleChessState {
  onEnter() {
    sendMsgToDevice(`fen ${genFullFen(this.getState())}`)
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.transitionTo(new SynchronizeLastMove)
    }
    else if (msg === 'nok') {
      this.transitionTo(new Unsynchronizd)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class SynchronizeLastMove extends BleChessState {
  onEnter() {
    if (this.getFeatures().lastMove && this.getState().lastMove) {
      sendMsgToDevice(`last_move ${lastMoveToUci(this.getState())}`)
    }
    else this.transitionTo(new Synchronizd)
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.transitionTo(new Synchronizd)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class Unsynchronizd extends ExpectMsg {
  onEnter() {
    Toast.show({ text: `${i18n('unsynchronizd')}` })
  }
  onBoardConfigured(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
  onBoardStateChanged(_st: State) {
    this.transitionTo(new SynchronizeFen)
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg.startsWith('fen')) {
      const peripheralFen = getCommandParams(msg)
      const centralFen = genFullFen(this.getState())
      if (areFensEqual(peripheralFen, centralFen)) {
        sendMsgToDevice('ok')
        this.transitionTo(new SynchronizeLastMove)
        Toast.show({ text: `${i18n('synchronizd')}` })
      }
      else sendMsgToDevice('nok')
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class Synchronizd extends ExpectMsg {
  onBoardConfigured(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
  onBoardStateChanged(_st: State) {
    sendMsgToDevice(`move ${lastMoveToUci(this.getState())}`)
    this.transitionTo(new SynchronizeCentralMove)
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg.startsWith('move')) {
      const move = getCommandParams(msg)
      this.transitionTo(hasPromotion(move) ? new SynchronizePeripheralPromotedMove : new SynchronizePeripheralMove) // TODO
      sendMoveToBoard(move)
    }
    else if (msg.startsWith('fen')) {
      sendMsgToDevice('nok')
      this.transitionTo(new Unsynchronizd)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class SynchronizeCentralMove extends BleChessState {
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.transitionTo(new Synchronizd)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class SynchronizePeripheralMove extends BleChessState {
  onBoardStateChanged(st: State) {
    sendMsgToDevice('ok')
    this.transitionTo(st.lastPromotion ? new Promote : new Synchronizd) // TODO 3 hanshake?
  }
  onMoveRejectedFromBoard() {
    sendMsgToDevice('nok')
    this.transitionTo(new Synchronizd)
    Toast.show({ text: `${i18n('rejected')}` })
  }
}

class Promote extends BleChessState {
  onEnter() {
    sendMsgToDevice(`promote ${lastMoveToUci(this.getState())}`)
  }
  onReceiveMsgFromDevice(msg: string) {
    if (msg === 'ok') {
      this.transitionTo(new Synchronizd)
    }
    else super.onReceiveMsgFromDevice(msg)
  }
}

class SynchronizePeripheralPromotedMove extends BleChessState {
  onBoardStateChanged(_st: State) {
    sendMsgToDevice('ok')
    this.transitionTo(new Synchronizd)
  }
  onMoveRejectedFromBoard() {
    sendMsgToDevice('nok')
    this.transitionTo(new Synchronizd)
    Toast.show({ text: `${i18n('rejected')}` })
  }
}