import { Features } from './Features'
import { Variants } from './Variants'
import { Options } from './Options'
import { State } from '../chessground/state'
import { GameStatus } from '../lichess/interfaces/game'

export interface Protocol {
  init(st: State): void
  features(): Features
  variants(): Variants
  options(): Options

  onPeripheralCommand(cmd: string): void
  onCentralStateCreated(st: State): void
  onCentralStateChanged(): void
  onCentralStateCanceled(): void
  onCentralStateEnded(status?: GameStatus): void
  onMoveRejectedByCentral(): void

  onCentralOptionsReset(): void
}