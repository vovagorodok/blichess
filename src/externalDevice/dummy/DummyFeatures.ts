import { Features } from '../Features'

export class DummyFeatures implements Features {
  get setState() { return false }
  get option() { return false }
}