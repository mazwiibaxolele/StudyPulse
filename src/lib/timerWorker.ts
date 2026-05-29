let interval: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!interval) {
      // Send a tick immediately just in case, but usually we just start the interval
      interval = setInterval(() => {
        self.postMessage('tick');
      }, 1000);
    }
  } else if (e.data === 'stop') {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
};
