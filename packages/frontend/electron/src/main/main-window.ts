import assert from 'node:assert';

import { BrowserWindow, type CookiesSetDetails, nativeTheme } from 'electron';
import electronWindowState from 'electron-window-state';
import { join } from 'path';

import { isMacOS, isWindows } from '../shared/utils';
import { getExposedMeta } from './exposed';
import { ensureHelperProcess } from './helper-process';
import { logger } from './logger';
import { uiSubjects } from './ui';
import { parseCookie } from './utils';

const IS_DEV: boolean =
  process.env.NODE_ENV === 'development' && !process.env.CI;

const DEV_TOOL = process.env.DEV_TOOL === 'true';

export const mainWindowOrigin = process.env.DEV_SERVER_URL || 'file://.';

async function createWindow() {
  logger.info('create window');
  const mainWindowState = electronWindowState({
    defaultWidth: 1000,
    defaultHeight: 800,
  });

  const helperProcessManager = await ensureHelperProcess();
  const helperExposedMeta = await helperProcessManager.rpc?.getMeta();

  assert(helperExposedMeta, 'helperExposedMeta should be defined');

  const mainExposedMeta = getExposedMeta();

  const browserWindow = new BrowserWindow({
    titleBarStyle: isMacOS()
      ? 'hiddenInset'
      : isWindows()
        ? 'hidden'
        : 'default',
    trafficLightPosition: { x: 20, y: 16 },
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    minWidth: 640,
    minHeight: 480,
    visualEffectState: 'active',
    vibrancy: 'under-window',
    height: mainWindowState.height,
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      webgl: true,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      spellcheck: false, // FIXME: enable?
      preload: join(__dirname, './preload.js'),
      // serialize exposed meta that to be used in preload
      additionalArguments: [
        `--main-exposed-meta=` + JSON.stringify(mainExposedMeta),
        `--helper-exposed-meta=` + JSON.stringify(helperExposedMeta),
      ],
    },
  });

  nativeTheme.themeSource = 'light';

  mainWindowState.manage(browserWindow);

  let helperConnectionUnsub: (() => void) | undefined;

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    if (IS_DEV) {
      // do not gain focus in dev mode
      browserWindow.showInactive();
    } else {
      browserWindow.show();
    }
    helperConnectionUnsub = helperProcessManager.connectRenderer(
      browserWindow.webContents
    );

    logger.info('main window is ready to show');

    if (DEV_TOOL) {
      browserWindow.webContents.openDevTools({
        mode: 'detach',
      });
    }
  });

  browserWindow.on('close', e => {
    e.preventDefault();
    // close and destroy all windows
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed()) {
        w.destroy();
      }
    });
    helperConnectionUnsub?.();
    // TODO: gracefully close the app, for example, ask user to save unsaved changes
  });

  browserWindow.on('leave-full-screen', () => {
    // FIXME: workaround for theme bug in full screen mode
    const size = browserWindow.getSize();
    browserWindow.setSize(size[0] + 1, size[1] + 1);
    browserWindow.setSize(size[0], size[1]);
    uiSubjects.onMaximized.next(false);
  });

  browserWindow.on('maximize', () => {
    uiSubjects.onMaximized.next(true);
  });

  // full-screen == maximized in UI on windows
  browserWindow.on('enter-full-screen', () => {
    uiSubjects.onMaximized.next(true);
  });

  browserWindow.on('unmaximize', () => {
    uiSubjects.onMaximized.next(false);
  });

  /**
   * URL for main window.
   */
  const pageUrl = mainWindowOrigin; // see protocol.ts

  logger.info('loading page at', pageUrl);

  await browserWindow.loadURL(pageUrl);

  logger.info('main window is loaded at', pageUrl);

  return browserWindow;
}

// singleton
let browserWindow$: Promise<BrowserWindow> | undefined;

/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  if (!browserWindow$ || (await browserWindow$.then(w => w.isDestroyed()))) {
    browserWindow$ = createWindow();
  }
  const mainWindow = await browserWindow$;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    logger.info('restore main window');
  }
  return mainWindow;
}

export async function handleOpenUrlInHiddenWindow(url: string) {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      preload: join(__dirname, './preload.js'),
    },
    show: false,
  });
  win.on('close', e => {
    e.preventDefault();
    if (!win.isDestroyed()) {
      win.destroy();
    }
  });
  logger.info('loading page at', url);
  await win.loadURL(url);
  return win;
}

export async function setCookie(cookie: CookiesSetDetails): Promise<void>;
export async function setCookie(origin: string, cookie: string): Promise<void>;

export async function setCookie(
  arg0: CookiesSetDetails | string,
  arg1?: string
) {
  const window = await restoreOrCreateWindow();
  const details =
    typeof arg1 === 'string' && typeof arg0 === 'string'
      ? parseCookie(arg0, arg1)
      : arg0;

  logger.info('setting cookie to main window', details);

  if (typeof details !== 'object') {
    throw new Error('invalid cookie details');
  }

  await window.webContents.session.cookies.set(details);
}

export async function removeCookie(url: string, name: string): Promise<void> {
  const window = await restoreOrCreateWindow();
  await window.webContents.session.cookies.remove(url, name);
}

export async function getCookie(url?: string, name?: string) {
  const window = await restoreOrCreateWindow();
  const cookies = await window.webContents.session.cookies.get({
    url,
    name,
  });
  return cookies;
}
