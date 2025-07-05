export class TimerWrapper {
  private _handle?: number

  start(callback: () => void, duration: number) {
    this.stop()
    this._handle = setTimeout(() => {
      this._handle = undefined
      callback()
    }, duration)
  }

  stop() {
    if (this._handle !== undefined) {
      clearTimeout(this._handle)
      this._handle = undefined
    }
  }

  isActive(): boolean {
    return this._handle !== undefined
  }
}