(() => {
  const REQ_CHANNEL = 'CPEX_GH_BRIDGE_REQ';
  const RES_CHANNEL = 'CPEX_GH_BRIDGE_RES';
  const READY_CHANNEL = 'CPEX_GH_BRIDGE_READY';

  window.postMessage(
    { channel: READY_CHANNEL, version: '1.0.0' },
    window.location.origin
  );

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.channel !== REQ_CHANNEL || !msg.requestId) return;

    chrome.runtime.sendMessage(
      {
        bridge: true,
        action: msg.action,
        payload: msg.payload || {},
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              channel: RES_CHANNEL,
              requestId: msg.requestId,
              ok: false,
              status: 500,
              error: chrome.runtime.lastError.message || 'Extension runtime error',
            },
            window.location.origin
          );
          return;
        }

        window.postMessage(
          {
            channel: RES_CHANNEL,
            requestId: msg.requestId,
            ...(response || { ok: false, status: 500, error: 'Empty response' }),
          },
          window.location.origin
        );
      }
    );
  });
})();
