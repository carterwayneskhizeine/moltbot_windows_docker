console.log('Renderer process initialized, waiting for gateway...');

// Listen for custom IPC messages if needed
window.electronAPI?.onGatewayReady((url: string) => {
  console.log('Gateway is ready, redirecting to:', url);
  window.location.href = url;
});
