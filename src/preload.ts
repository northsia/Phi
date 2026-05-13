import { contextBridge, ipcRenderer } from "electron";

type Settings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: string;
  cursorBlink: boolean;
  scrollback: number;
  cursorSmoothCaretAnimation: boolean;
  theme: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
};

contextBridge.exposeInMainWorld("electronAPI", {
  sendInput: (input: string) =>
    ipcRenderer.send("shell:input", input),

  resize: (cols: number, rows: number) =>
    ipcRenderer.send("shell:resize", { cols, rows }),

  onOutput: (callback: (data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: string) =>
      callback(data);

    ipcRenderer.on("shell:output", handler);

    return () =>
      ipcRenderer.removeListener("shell:output", handler);
  },

  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke("settings:get"),

  saveSettings: (data: Settings) =>
    ipcRenderer.invoke("settings:save", data),

  onSettingsChange: (callback: (data: Settings) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: Settings) =>
      callback(data);

    ipcRenderer.on("settings:changed", handler);

    return () =>
      ipcRenderer.removeListener("settings:changed", handler);
  },

  getCwd: (): Promise<string> =>
    ipcRenderer.invoke("shell:cwd"),

  windowClose: () =>
    ipcRenderer.send("window:close"),

  windowMinimize: () =>
    ipcRenderer.send("window:minimize"),

  windowMaximize: () =>
    ipcRenderer.send("window:maximize"),
});