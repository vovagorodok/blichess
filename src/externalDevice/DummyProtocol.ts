export class DummyProtocol {
  init() {}
  onPeripheralCommand() {}
  onCentralStateCreated() {}
  onCentralStateChanged() {}
  onCentralStateCanceled() {}
  onCentralStateEnded() {}
  onMoveRejectedByCentral() {}
}
export const dummyProtocol = new DummyProtocol