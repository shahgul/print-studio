import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Project } from '@print-studio/domain';

type EventEnvelope = Readonly<{ payload: unknown }>;
type FocusEnvelope = Readonly<{ payload: boolean }>;

type SourceWatchDependencies = Readonly<{
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
  listen: (event: string, handler: (event: EventEnvelope) => void) => Promise<UnlistenFn>;
  onFocusChanged: (handler: (event: FocusEnvelope) => void) => Promise<UnlistenFn>;
}>;

export interface SourceWatchService {
  configure(paths: ReadonlyArray<string>): Promise<void>;
  onPotentialChange(handler: () => void): Promise<UnlistenFn>;
  onFocusChanged(handler: (focused: boolean) => void): Promise<UnlistenFn>;
}

const defaultDependencies: SourceWatchDependencies = {
  invoke: (command, args) => invoke(command, args),
  listen: (event, handler) => listen(event, (nativeEvent) => handler({ payload: nativeEvent.payload })),
  onFocusChanged: (handler) =>
    getCurrentWindow().onFocusChanged((event) => handler({ payload: event.payload })),
};

export function createTauriSourceWatchService(
  dependencies: SourceWatchDependencies = defaultDependencies,
): SourceWatchService {
  return {
    async configure(paths: ReadonlyArray<string>): Promise<void> {
      await dependencies.invoke('set_source_watch_paths', { paths: [...paths] });
    },

    onPotentialChange(handler: () => void): Promise<UnlistenFn> {
      return dependencies.listen('source-paths-changed', () => handler());
    },

    onFocusChanged(handler: (focused: boolean) => void): Promise<UnlistenFn> {
      return dependencies.onFocusChanged((event) => handler(event.payload));
    },
  };
}

type LiveSourceMonitorInput = Readonly<{
  project: Project;
  service: SourceWatchService;
  revalidate: () => Promise<Project>;
  onProject: (project: Project) => void;
  onError?: (error: unknown) => void;
  debounceMs?: number;
}>;

export async function createLiveSourceMonitor({
  project,
  service,
  revalidate,
  onProject,
  onError,
  debounceMs = 200,
}: LiveSourceMonitorInput): Promise<() => Promise<void>> {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let rerunRequested = false;

  const runRevalidation = async () => {
    if (stopped) {
      return;
    }

    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;
    try {
      const revalidated = await revalidate();
      if (!stopped) {
        onProject(revalidated);
      }
    } catch (error) {
      if (!stopped) {
        onError?.(error);
      }
    } finally {
      running = false;
      if (rerunRequested && !stopped) {
        rerunRequested = false;
        schedule();
      }
    }
  };

  const schedule = () => {
    if (stopped) {
      return;
    }

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      void runRevalidation();
    }, debounceMs);
  };

  await service.configure(project.sources.map((source) => source.filePath));

  const stopChanges = await service.onPotentialChange(schedule);
  const stopFocus = await service.onFocusChanged((focused) => {
    if (focused) {
      schedule();
    }
  });

  return async () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    stopChanges();
    stopFocus();
    await service.configure([]);
  };
}
