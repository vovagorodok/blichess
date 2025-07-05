import { Variants } from '../Variants'

export class DummyVariants implements Variants {
  get standard() { return false }
  get chess960() { return false }
  get threeCheck() { return false }
  get atomic() { return false }
  get kingOfTheHill() { return false }
  get antiChess() { return false }
  get horde() { return false }
  get racingKings() { return false }
  get crazyHouse() { return false }
}