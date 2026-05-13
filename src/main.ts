import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as os from "os";
import * as pty from "node-pty";
import * as fs from "fs";

let mainWindow: BrowserWindow | null = null;
let shellProcess: pty.IPty | null = null;

const settingsPath = path.join(
  app.isPackaged 
    ? path.dirname(app.getPath("exe")) 
    : path.join(__dirname, ".."),
  "settings.json"
);

// ── SETTINGS ───────────────────────────────────────────────

const defaultSettings = {
  fontFamily: "'Fira'",
  fontSize: 13,
  lineHeight: 1,
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 5000,
  cursorSmoothCaretAnimation: true,
  theme: {
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    cursorAccent: "#000000",
    selectionBackground: "rgba(255,255,255,0.18)",
    black: "#000000",
    red: "#f48771",
    green: "#89d185",
    yellow: "#dcdcaa",
    blue: "#569cd6",
    magenta: "#c586c0",
    cyan: "#4ec9b0",
    white: "#d4d4d4",
    brightBlack: "#666666",
    brightRed: "#f48771",
    brightGreen: "#89d185",
    brightYellow: "#dcdcaa",
    brightBlue: "#569cd6",
    brightMagenta: "#c586c0",
    brightCyan: "#4ec9b0",
    brightWhite: "#ffffff",
  },
  showIntro: true,
  startupEnabled: true,
};

function loadSettings() {
  try {
    console.log(settingsPath)

    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf-8");
      return defaultSettings;
    }
    const raw = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return defaultSettings;
  }
}

function watchSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      fs.watch(settingsPath, () => {
        try {
          const raw = fs.readFileSync(settingsPath, "utf-8");
          const settings = JSON.parse(raw);
          mainWindow?.webContents.send("settings:changed", settings);
        } catch (err) {
          console.error("Settings error:", err);
        }
      });
    }
  } catch (err) {
    console.error("watchSettings error:", err);
  }
}

// ── WINDOW ───────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 500,
    minHeight: 300,
    frame: false,
    backgroundColor: "#000000",
    vibrancy: "under-window",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Terminal",
    icon: path.join(__dirname, "../resources/icon.ico"),
  });

   //mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
    shellProcess?.kill();
    shellProcess = null;
  });
}

// ── SHELL ───────────────────────────────────────────────

function spawnShell(cols = 80, rows = 24): void {
  const shell =
    process.platform === "win32"
      ? "powershell.exe"
      : process.env.SHELL || "/bin/zsh";

  const args =
    process.platform === "win32"
      ? ["-NoLogo"]
      : [];


  shellProcess = pty.spawn(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoExit",
      "-Command",
      `
        function prompt {
          $pwd = (Get-Location).Path -replace '\\\\','/'
          "φ $pwd > "
        }
        Clear-Host
      `
    ],
    {
      name: "xterm-256color",
      cols,
      rows,
      cwd: os.homedir(),
      env: process.env as { [key: string]: string },
    }
  );


  shellProcess.onData((data: string) => {
    mainWindow?.webContents.send("shell:output", data);
  });

  shellProcess.onExit(({ exitCode }) => {
    mainWindow?.webContents.send(
      "shell:output",
      `\r\n[Process exited with code ${exitCode}]\r\n`
    );

    shellProcess = null;
  });
}

// ── IPC SETTINGS ─────────────────────────────────────────

ipcMain.handle("settings:get", () => {
  return loadSettings();
});

ipcMain.handle("settings:save", (_event, data) => {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf-8");

  mainWindow?.webContents.send("settings:changed", data);
});

// ── SHELL IPC ───────────────────────────────────────────

ipcMain.on("shell:input", (_event, input: string) => {
  shellProcess?.write(input);
});

ipcMain.on(
  "shell:resize",
  (_event, { cols, rows }: { cols: number; rows: number }) => {
    shellProcess?.resize(cols, rows);
  }
);

ipcMain.handle("shell:cwd", () => os.homedir());

// ── WINDOW CONTROLS ──────────────────────────────────────

ipcMain.on("window:close", () => mainWindow?.close());
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});

// ── APP START ────────────────────────────────────────────

app.whenReady().then(() => {
  spawnShell();
  createWindow();
  watchSettings();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      spawnShell();
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});