/// <reference types="@capacitor/splash-screen" />
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vovagorodok.blichess',
  appName: 'blichess',
  bundledWebRuntime: false,
  webDir: 'www',
  backgroundColor: '000000ff',
  appendUserAgent: 'Lichobile/8.0.0+ble1.0.4',
  plugins: {
    SplashScreen: {
      androidSplashResourceName: 'launch_splash',
      launchAutoHide: false,
      useDialog: false,
    },
    PushNotifications: {
      presentationOptions: ['sound', 'alert']
    }
  },
  ios: {
    scheme: 'lichess',
  }
}

export default config

