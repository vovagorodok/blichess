import { Features } from '../Features'

export class DummyFeatures implements Features {
  get option() { return false }
}