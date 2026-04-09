import * as chessFormat from '../../utils/chessFormat'
import { State } from '../../chessground/state'
import fen from '../../chessground/fen'
import bluetooth from '../bluetooth'
import external from '../../externalDevice'

export function isCentralStateCreated(st: State): boolean {
  return st.pieces.size !== 0
}

export function isPeripheralStateGettable(st: State): boolean {
  const pieces = st.peripheral.pieces;
  for (const piece of pieces.values()) {
    if (piece.role === undefined || piece.color === undefined)
      return false;
  }
  return true;
}

export function isUserTurn(st: State): boolean {
  return st.otb || st.orientation === st.turnColor
}

export function createFenTurnColor(st: State): string {
  return st.turnColor === 'white' ? 'w' : 'b'
}

export function createFullFen(st: State): string {
  return [fen.convertPiecesToFen(st.pieces), createFenTurnColor(st)].join(' ')
}

export function applyPeripheralMoveRejected(st: State, isRejected: boolean) {
  st.peripheral.isMoveRejected = isRejected
}

export function applyPeripheralLastMove(st: State, uci: string) {
  const move = chessFormat.uciToMove(uci)
  const prom = chessFormat.uciToProm(uci)
  st.peripheral.lastMove = move
  st.peripheral.lastPromotion = prom || null
}

export function applyVariantSupported(st: State, isVariantSupported: boolean) {
  st.peripheral.isVariantSupported = isVariantSupported
}

export function applyPeripheralSynchronized(st: State, isSynchronized: boolean) {
  st.peripheral.isSynchronized = isSynchronized
}

export function applyPeripheralGettable(st: State, isGettable: boolean) {
  st.peripheral.isGettable = isGettable
}

export function applyPeripheralSettable(st: State, isSettable: boolean) {
  st.peripheral.isSettable = isSettable
}

export function applyPeripheralPieces(st: State, peripheralFen: string) {
  st.peripheral.pieces = fen.convertFenToPeripheralPieces(peripheralFen)
}

export function lastMoveToUci(st: State): string {
  const [orig, dest] = st.lastMove!
  const prom = st.lastPromotion || undefined
  const uci = chessFormat.moveToUci(orig, dest, prom)

  if (st.variant === 'chess960')
    return uci;

  const kingUci = chessFormat.altCastles[uci]
  if (kingUci === undefined)
    return uci

  const kingMove = chessFormat.uciToMove(kingUci)
  const kingDest = kingMove[1]
  return st.pieces.get(orig) === undefined &&
         st.pieces.get(dest) === undefined &&
         st.pieces.get(kingDest)?.role === 'king'
      ? kingUci
      : uci
}

export function sendCommandToPeripheral(cmd: string) {
  bluetooth.sendCommandToPeripheral(cmd)
}

export function sendMoveToCentral(uci: string) {
  const move = chessFormat.uciToMove(uci)
  const prom = chessFormat.uciToProm(uci)
  external.sendMoveToCentral(move[0], move[1], prom)
}

export function sendStateChangeToCentral() {
  external.sendStateChangeToCentral()
}

export function sendOptionsUpdateToCentral() {
  external.sendOptionsUpdateToCentral()
}

export function getCommandParams(cmd: string): string {
  return cmd.substring(cmd.indexOf(' ') + 1)
}

export function isUciWithPromotion(uci: string): boolean {
  return chessFormat.uciToProm(uci) !== undefined
}

export function delay(milliseconds : number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function* createValuesIterator<T extends object>(instance: T): Generator<T[keyof T]> {
  for (const key of Object.keys(instance) as (keyof T)[]) {
    yield instance[key];
  }
}