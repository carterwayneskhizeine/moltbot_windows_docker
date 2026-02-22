/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    onGatewayReady: (callback: (url: string) => void) => void;
    getProcessInfo: () => Promise<any>;
  };
}
