import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.harishvweb.ultron',
  appName: 'Ultron',
  webDir: '.',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' }
};

export default config;
