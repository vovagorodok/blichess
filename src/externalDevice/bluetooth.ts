import { BleClient, BleDevice, textToDataView, dataViewToText } from '@capacitor-community/bluetooth-le'
import settings from '../settings'
import redraw from '../utils/redraw'
import i18n from '../i18n'
import { State, makeDefaults } from '../chessground/state'
import { Toast } from '@capacitor/toast'
import { Protocol } from './Protocol'
import { CppProtocol } from './cpp/CppProtocol'
import { dummyProtocol } from './dummy/DummyProtocol'

interface ChessServiceUUIDs {
  readonly srv: string
  readonly txCh: string
  readonly rxCh: string
}
interface ChessService {
  readonly uuids: ChessServiceUUIDs
  protocol: any
}

const SUPPOTRED_CHESS_SERVICES: ChessService[] = [
  { uuids: { srv:  'f5351050-b2c9-11ec-a0c0-b3bc53b08d33',
             txCh: 'f53513ca-b2c9-11ec-a0c1-639b8957db99',
             rxCh: 'f535147e-b2c9-11ec-a0c2-8bbd706ec4e6' },
    protocol: CppProtocol }
]

interface BatteryServiceUUIDs {
  readonly srv: string
  readonly levelCh: string
}

interface BatteryService {
  readonly uuids: BatteryServiceUUIDs
  level?: number
}

const BATTERY_SERVICE: BatteryService = {
  uuids: { srv:     '0000180f-0000-1000-8000-00805f9b34fb',
           levelCh: '00002a19-0000-1000-8000-00805f9b34fb' },
  level: undefined
}

class BluetoothConnection {
  isConnected: boolean = false
  protocol: Protocol = dummyProtocol
  centralState: State = makeDefaults()
  lastMove: KeyPair | null = null
  batteryService: BatteryService = BATTERY_SERVICE
  private uuids?: ChessServiceUUIDs

  private getDeviceId(): string {
    return settings.general.bluetooth.deviceId()!
  }

  private async onDisconnect(_deviceId: string) {
    if (!this.isConnected)
      return
    this.isConnected = false
    this.protocol = dummyProtocol
    this.batteryService.level = undefined
    redraw()
    Toast.show({ text: i18n('disconnectedFromBluetoothDevice') })
    if (settings.general.bluetooth.useDevice())
      this.connect()
  }

  async requestDevice(): Promise<BleDevice> {
    return await BleClient.requestDevice({
      services: SUPPOTRED_CHESS_SERVICES.map(value => value.uuids.srv)
    })
  }

  private async setupChessService() {
    const connectedServices = await BleClient.getServices(this.getDeviceId())
    for (const supportedService of SUPPOTRED_CHESS_SERVICES)
      if (connectedServices.some(connectedService => supportedService.uuids.srv === connectedService.uuid)) {
          this.uuids = supportedService.uuids
          this.protocol = new supportedService.protocol
          return
      }
  }

  private async setupBatteryService() {
    const connectedServices = await BleClient.getServices(this.getDeviceId())
    const iSupported = connectedServices.some(connectedService => this.batteryService.uuids.srv === connectedService.uuid)
    if (iSupported) {
      const level = await BleClient.read(this.getDeviceId(), this.batteryService.uuids.srv, this.batteryService.uuids.levelCh)
      this.batteryService.level = level.getUint8(0)
      await this.registerBatteryCallback()
    }
  }

  async connect() {
    await BleClient.connect(this.getDeviceId(), deviceId => this.onDisconnect(deviceId))
    await this.setupChessService()
    await this.registerChessCallback()
    await this.setupBatteryService()
    this.protocol.init(this.centralState)
    this.isConnected = true
    redraw()
    Toast.show({ text: i18n('connectedToBluetoothDevice') })
  }

  async disconnect() {
    if (!this.isConnected)
      return
    await this.unregisterChessCallback()
    await this.unregisterBatteryCallback()
    await BleClient.disconnect(this.getDeviceId())
  }

  async sendCommandToPeripheral(cmd: string) {
    await BleClient.write(this.getDeviceId(), this.uuids!.srv, this.uuids!.txCh, textToDataView(cmd))
  }

  private async reciveData(data: DataView) {
    this.protocol.onPeripheralCommand(dataViewToText(data))
  }

  private async registerChessCallback() {
    await BleClient.startNotifications(this.getDeviceId(), this.uuids!.srv, this.uuids!.rxCh, (data) => this.reciveData(data))
  }

  private async unregisterChessCallback() {
    await BleClient.stopNotifications(this.getDeviceId(), this.uuids!.srv, this.uuids!.rxCh)
  }

  private async registerBatteryCallback() {
    await BleClient.startNotifications(this.getDeviceId(), this.batteryService.uuids.srv, this.batteryService.uuids.levelCh, (data) => {
      this.batteryService.level = data.getUint8(0)
      redraw()
    })
  }

  private async unregisterBatteryCallback() {
    if (this.batteryService.level !== undefined) {
      await BleClient.stopNotifications(this.getDeviceId(), this.batteryService.uuids.srv, this.batteryService.uuids.levelCh)
    }
  }
}

const bluetoothConnection = new BluetoothConnection

export default {
  protocol() {
    return bluetoothConnection.protocol
  },
  saveCentralState(st: State) {
    bluetoothConnection.centralState = st
    this.saveLastMove()
  },
  saveLastMove() {
    bluetoothConnection.lastMove = bluetoothConnection.centralState.lastMove
  },
  isRepeatedLastMove() {
    return bluetoothConnection.lastMove === bluetoothConnection.centralState.lastMove
  },
  sendCommandToPeripheral(cmd: string) {
    bluetoothConnection.sendCommandToPeripheral(cmd)
  },
  state() {
    return bluetoothConnection.centralState
  },
  features() {
    return bluetoothConnection.protocol.features()
  },
  variants() {
    return bluetoothConnection.protocol.variants()
  },
  options() {
    return bluetoothConnection.protocol.options()
  },
  isConnected() {
    return bluetoothConnection.isConnected
  },
  batteryLevel() {
    return bluetoothConnection.batteryService.level
  },
  init() {
    if (settings.general.bluetooth.useDevice()) {
      BleClient.initialize({ androidNeverForLocation: true })
      bluetoothConnection.connect()
    }
  },
  onSettingChange(useBluetooth: boolean) {
    if (useBluetooth) {
      BleClient.initialize({ androidNeverForLocation: true })
      bluetoothConnection.requestDevice()
      .then((device) => {
        settings.general.bluetooth.deviceId(device.deviceId)
        bluetoothConnection.connect()
      })
      .catch(() => {
        settings.general.bluetooth.useDevice(false)
        redraw()
      })
    }
    else {
      bluetoothConnection.disconnect()
    }
  },
  updateSettings() {
    redraw()
  }
}
