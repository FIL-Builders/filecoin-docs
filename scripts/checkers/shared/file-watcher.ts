import * as fs from 'node:fs';

export function createDebouncer<T>(
  callback: (items: T[]) => void,
  delayMs: number
): (item: T) => void {
  let timeout: NodeJS.Timeout | null = null;
  let pending: T[] = [];

  return (item: T) => {
    pending.push(item);
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback(pending);
      pending = [];
      timeout = null;
    }, delayMs);
  };
}

export interface WatchOptions {
  recursive?: boolean;
  filter?: (filename: string) => boolean;
  debounceMs?: number;
}

export function watchDirectory(
  dirPath: string,
  onChange: (files: string[]) => void,
  options: WatchOptions = {}
): fs.FSWatcher {
  const { recursive = true, filter, debounceMs = 500 } = options;

  const debouncedCallback = createDebouncer<string>(onChange, debounceMs);

  return fs.watch(dirPath, { recursive }, (_eventType, filename) => {
    if (filename) {
      if (!filter || filter(filename)) {
        debouncedCallback(filename);
      }
    }
  });
}

export function watchFile(
  filePath: string,
  onChange: () => void
): fs.FSWatcher {
  return fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      onChange();
    }
  });
}
