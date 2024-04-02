import * as chessFormat from '../utils/chessFormat'
import { State } from '../chessground/state'
import fen from '../chessground/fen'
import bluetooth from './bluetooth'
import external from '../externalDevice'

export function isUserTurn(st: State): boolean {
    return st.otb || st.orientation === st.turnColor
}

export function fenTurnColor(st: State): string {
    return st.turnColor === 'white' ? 'w' : 'b'
}

export function genFullFen(st: State): string {
    return [fen.write(st.pieces), fenTurnColor(st)].join(' ')
}

export function lastMoveToUci(st: State): string {
    return chessFormat.moveToUci(
        st.lastMove![0],
        st.lastMove![1],
        st.lastPromotion ? st.lastPromotion : undefined)
}

export function sendCommandToPeripheral(cmd: string) {
    console.info(`BLE_CHESS: send_cmd: ${cmd}`); 
    bluetooth.sendCommandToPeripheral(cmd)
}

export function sendMoveToCentral(uci: string) {
    const move = chessFormat.uciToMove(uci)
    const prom = chessFormat.uciToProm(uci)
    external.sendMoveToCentral(move[0], move[1], prom)
}

export function getCommandParams(cmd: string): string {
    return cmd.substring(cmd.indexOf(' ') + 1)
}

export function isUciWithPromotion(uci: string) {
    return chessFormat.uciToProm(uci) !== undefined
}

export function isUpperCase(str: string) {
    return str.toUpperCase() === str
}

export function isLowerCase(str: string) {
    return str.toLowerCase() === str
}

export function areFenCharsSame(lchar: string, rchar: string): boolean {
    return (lchar === '?' || rchar === '?') ||
           (lchar === 'w' && rchar === 'w') ||
           (lchar === 'b' && rchar === 'b') ||
           (lchar === 'w' && isUpperCase(rchar)) ||
           (isUpperCase(lchar) && rchar === 'w') ||
           (lchar === 'b' && isLowerCase(rchar)) ||
           (isLowerCase(lchar) && rchar === 'b') ||
           (lchar === rchar)
}

export function areFensSame(lfen: string, rfen: string): boolean {
    const minLength = Math.min(lfen.length, rfen.length)
    for (var i = 0; i < minLength; i++) {
        if (!areFenCharsSame(lfen[i], rfen[i]))
            return false
    }
    return true
}

export function delay(milliseconds : number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}