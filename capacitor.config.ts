/// <reference types="@capacitor/splash-screen" />
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vovagorodok.blichess',
  appName: 'Blichess',
  bundledWebRuntime: false,
  webDir: 'www',
  backgroundColor: '000000ff',
  appendUserAgent: 'Lichobile/8.0.0+ble2.5.0',
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
  },
  android: {
    adjustMarginsForEdgeToEdge: 'force',
  },
  server: {
    hostname: 'localhost',
    androidScheme: 'http'
  }
}

export default config

