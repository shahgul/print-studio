import { Project } from '@print-studio/domain';
import { describe, expect, it, vi } from 'vitest';

import {
  createLiveSourceMonitor,
  createTauriSourceWatchService,
  type SourceWatchService,
} from './source-watch';

describe('createTauriSourceWatchService', () => {
  it('configures the native watcher with referenced source paths', async () => {
    const calls: Array<{ command: string; args: unknown }> = [];
    const service = createTauriSourceWatchService({
      invoke: async (command, args) => {
        calls.push({ command, args });
        return undefined;
      },
      listen: async () => () => undefined,
      onFocusChanged: async () => () => undefined,
    });

    await service.configure(['D:\\photos\\a.jpg', 'D:\\jobs\\b.pdf']);

    expect(calls).toEqual([
      {
        command: 'set_source_watch_paths',
        args: { paths: ['D:\\photos\\a.jpg', 'D:\\jobs\\b.pdf'] },
      },
    ]);
  });

  it('translates native change and window-focus callbacks into monitor signals', async () => {
    let changeHandler: (() => void) | null = null;
    let focusHandler: ((focused: boolean) => void) | null = null;

    const service = createTauriSourceWatchService({
      invoke: async () => undefined,
      listen: async (_event, handler) => {
        changeHandler = () => handler({ payload: null });
        return () => undefined;
      },
      onFocusChanged: async (handler) => {
        focusHandler = (focused) => handler({ payload: focused });
        return () => undefined;
      },
    });

    const changes: string[] = [];
    const focuses: boolean[] = [];
    const stopChanges = await service.onPotentialChange(() => changes.push('changed'));
    const stopFocus = await service.onFocusChanged((focused) => focuses.push(focused));

    changeHandler?.();
    focusHandler?.(false);
    focusHandler?.(true);

    expect(changes).toEqual(['changed']);
    expect(focuses).toEqual([false, true]);

    stopChanges();
    stopFocus();
  });
});

describe('createLiveSourceMonitor', () => {
  it('debounces native change bursts and revalidates the current project once', async () => {
    vi.useFakeTimers();

    let changeHandler: (() => void) | null = null;
    const configured: string[][] = [];
    const service: SourceWatchService = {
      async configure(paths) {
        configured.push([...paths]);
      },
      async onPotentialChange(handler) {
        changeHandler = handler;
        return () => undefined;
      },
      async onFocusChanged() {
        return () => undefined;
      },
    };

    const project = Project.create({ id: 'project-1' });
    const revalidate = vi.fn(async () => project);
    const onProject = vi.fn();

    const stop = await createLiveSourceMonitor({
      project,
      service,
      debounceMs: 100,
      revalidate,
      onProject,
    });

    changeHandler?.();
    changeHandler?.();
    changeHandler?.();

    await vi.advanceTimersByTimeAsync(99);
    expect(revalidate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(onProject).toHaveBeenCalledWith(project);
    expect(configured[0]).toEqual([]);

    await stop();
    expect(configured.at(-1)).toEqual([]);

    vi.useRealTimers();
  });

  it('revalidates when the window regains focus but ignores focus loss', async () => {
    vi.useFakeTimers();

    let focusHandler: ((focused: boolean) => void) | null = null;
    const service: SourceWatchService = {
      async configure() {},
      async onPotentialChange() {
        return () => undefined;
      },
      async onFocusChanged(handler) {
        focusHandler = handler;
        return () => undefined;
      },
    };

    const project = Project.create({ id: 'project-1' });
    const revalidate = vi.fn(async () => project);

    const stop = await createLiveSourceMonitor({
      project,
      service,
      debounceMs: 50,
      revalidate,
      onProject: () => undefined,
    });

    focusHandler?.(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(revalidate).not.toHaveBeenCalled();

    focusHandler?.(true);
    await vi.advanceTimersByTimeAsync(50);
    expect(revalidate).toHaveBeenCalledTimes(1);

    await stop();
    vi.useRealTimers();
  });
});
