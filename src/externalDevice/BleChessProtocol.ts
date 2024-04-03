import { BaseProtocol, BaseState } from './BaseProtocol'
import { isUciWithPromotion, genFullFen, lastMoveToUci, getCommandParams, sendCommandToPeripheral, sendMoveToCentral, areFensSame } from './utils'
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

  onPeripheralCommand(cmd: string) {
    console.info(`BLE_CHESS: unexpected ${cmd}`); 
    Toast.show({ text: `${i18n('unexpected')}: ${cmd}` })
  }

  onCentralStateCreated(st: State) {
    this.setState(st)
  }
}

class ExpectMsg extends BleChessState {
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith('msg')) {
      sendCommandToPeripheral('ok')
      Toast.show({ text: getCommandParams(cmd) })
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Init extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter Init"); 
    this.transitionTo(new CheckFeatureMsg)
  }
}

class CheckFeatureMsg extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter CheckFeatureMsg"); 
    sendCommandToPeripheral('feature msg')
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.getFeatures().msg = true
      this.transitionTo(new CheckFeatureLastMove)
    }
    else if (cmd === 'nok') {
      this.transitionTo(new CheckFeatureLastMove)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class CheckFeatureLastMove extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter CheckFeatureLastMove"); 
    sendCommandToPeripheral('feature last_move')
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.getFeatures().lastMove = true
      this.transitionTo(new Idle)
    }
    else if (cmd === 'nok') {
      this.transitionTo(new Idle)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Idle extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter Idle"); 
  }
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith('msg')) {
      sendCommandToPeripheral('ok')
      Toast.show({ text: getCommandParams(cmd) })
    }
  }
}

class SynchronizeVariant extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizeVariant"); 
    // sendCommandToPeripheral(`variant ${this.getState().variant}`)
    sendCommandToPeripheral("variant standard") // TODO implement variant
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.transitionTo(new SynchronizeFen)
    }
    else if (cmd === 'nok') {
      this.transitionTo(new Idle)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class SynchronizeFen extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizeFen"); 
    sendCommandToPeripheral(`fen ${genFullFen(this.getState())}`)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.transitionTo(new SynchronizeLastMove)
    }
    else if (cmd === 'nok') {
      this.transitionTo(new Unsynchronized)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class SynchronizeLastMove extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizeLastMove"); 
    if (this.getFeatures().lastMove && this.getState().lastMove) {
      sendCommandToPeripheral(`last_move ${lastMoveToUci(this.getState())}`)
    }
    else this.transitionTo(new Synchronized)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.transitionTo(new Synchronized)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Unsynchronized extends ExpectMsg {
  onEnter() {
    console.info("BLE_CHESS: enter Unsynchronized");    
    Toast.show({ text: i18n('unsynchronized') })
  }
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
  onCentralStateChanged() {
    this.transitionTo(new SynchronizeFen)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith('fen')) {
      const peripheralFen = getCommandParams(cmd)
      const centralFen = genFullFen(this.getState())
      if (areFensSame(peripheralFen, centralFen)) {
        sendCommandToPeripheral('ok')
        this.transitionTo(new SynchronizeLastMove)
        Toast.show({ text: i18n('synchronized') })
      }
      else sendCommandToPeripheral('nok')
    }
    else super.onPeripheralCommand(cmd)
  }
}

class Synchronized extends ExpectMsg {
  onEnter() {
    console.info("BLE_CHESS: enter Synchronized");    
  }
  onCentralStateCreated(st: State) {
    this.setState(st)
    this.transitionTo(new SynchronizeVariant)
  }
  onCentralStateChanged() {
    sendCommandToPeripheral(`move ${lastMoveToUci(this.getState())}`)
    this.transitionTo(new SynchronizeCentralMove)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd.startsWith('move')) {
      const move = getCommandParams(cmd)
      this.transitionTo(isUciWithPromotion(move) ?
        new SynchronizePeripheralPromotedMove :
        new SynchronizePeripheralMove)
      sendMoveToCentral(move)
    }
    else if (cmd.startsWith('fen')) {
      const peripheralFen = getCommandParams(cmd)
      const centralFen = genFullFen(this.getState())
      if (areFensSame(peripheralFen, centralFen)) {
        sendCommandToPeripheral('ok')
      }
      else {
        sendCommandToPeripheral('nok')
        this.transitionTo(new Unsynchronized)
      }
    }
    else super.onPeripheralCommand(cmd)
  }
}

class SynchronizeCentralMove extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizeCentralMove");    
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.transitionTo(new Synchronized)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class SynchronizePeripheralMove extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizePeripheralMove");    
  }
  onCentralStateChanged() {
    sendCommandToPeripheral('ok')
    this.transitionTo(this.getState().lastPromotion ? new Promote : new Synchronized) // TODO 3 hanshake?
  }
  onMoveRejectedByCentral() {
    sendCommandToPeripheral('nok')
    this.transitionTo(new Synchronized)
    Toast.show({ text: i18n('rejected') })
  }
}

class Promote extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter Promote");   
    sendCommandToPeripheral(`promote ${lastMoveToUci(this.getState())}`)
  }
  onPeripheralCommand(cmd: string) {
    if (cmd === 'ok') {
      this.transitionTo(new Synchronized)
    }
    else super.onPeripheralCommand(cmd)
  }
}

class SynchronizePeripheralPromotedMove extends BleChessState {
  onEnter() {
    console.info("BLE_CHESS: enter SynchronizePeripheralPromotedMove");    
  }
  onCentralStateChanged() {
    sendCommandToPeripheral('ok')
    this.transitionTo(new Synchronized)
  }
  onMoveRejectedByCentral() {
    sendCommandToPeripheral('nok')
    this.transitionTo(new Synchronized)
    Toast.show({ text: i18n('rejected') })
  }
}