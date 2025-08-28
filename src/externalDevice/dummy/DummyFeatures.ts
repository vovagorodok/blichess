import { Features } from '../Features'

export class DummyFeatures implements Features {
  get getState() { return false }
  get setState() { return false }
  get option() { return false }
}