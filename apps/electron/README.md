# OpenClaw Electron Desktop Application

Cross-platform desktop application for OpenClaw, built with Electron.

## Features

- **Gateway Process Management**: Automatically starts and manages the OpenClaw Gateway subprocess
- **Bundled Tools**: Pre-installed Node.js, Python, Git, and FFmpeg (no external dependencies)
- **System Tray**: Minimize to tray with quick access menu
- **Web UI Integration**: Loads the Gateway Web UI (http://127.0.0.1:18789)
- **Auto-start**: Gateway automatically starts with the application

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Setup

```bash
# Install dependencies
pnpm install

# Build the Electron app (TypeScript)
pnpm build

# Run in development mode
pnpm dev
```

### Building for Distribution

```bash
# Build Windows installer
pnpm dist:win

# Build macOS app
pnpm dist:mac
```

Output files are placed in `dist-electron/`.

## Building from Root

From the project root directory:

```bash
# Development
pnpm electron:dev

# Build for distribution
pnpm electron:dist
pnpm electron:dist:win  # Windows only
pnpm electron:dist:mac  # macOS only
```

## Bundled Tools

The application includes portable versions of:

- **Node.js** 24.13.1 - JavaScript runtime (Current LTS)
- **Python** 3.12.8 - Programming language
- **Git** 2.48.1 - Version control
- **FFmpeg** 7.1 - Multimedia processing

These tools are extracted to `%APPDATA%\OpenClaw\tools\` on Windows.

### Downloading Tools

To download the bundled tools (for development):

```bash
# From project root
pnpm tools:download
```

This downloads tools to `apps/bundled-tools/`.

## Docker Build

To build Windows binaries using Docker:

```bash
# Build Docker image
docker build -f apps/electron/Dockerfile.build -t openclaw-electron-builder .

# Run build
docker run --rm -v "$PWD/output:/output" openclaw-electron-builder
```

## Project Structure

```
apps/electron/
├── src/                    # TypeScript source
│   ├── main.ts            # Main process entry
│   ├── preload.ts         # Preload script (IPC bridge)
│   ├── gateway.ts         # Gateway process manager
│   ├── browser.ts         # Window manager
│   ├── tray.ts            # System tray
│   └── tools/             # Tool management
│       ├── manager.ts     # Tool checker
│       └── index.ts
├── resources/             # Static resources
│   ├── splash.html       # Splash screen
│   └── icon.ico          # Application icon
├── build/                 # Build resources
│   └── installer.nsh     # NSIS customization
├── package.json           # Electron dependencies
├── tsconfig.json          # TypeScript config
└── electron-builder.yml   # electron-builder config
```

## Configuration

The application looks for the Gateway at `http://127.0.0.1:18789`.

To change the port, modify `GATEWAY_PORT` in `src/gateway.ts`.

## Troubleshooting

### Gateway fails to start

1. Check that port 18789 is available
2. Ensure Node.js is bundled (see `apps/bundled-tools/nodejs/`)
3. Check logs in the Console (DevTools)

### Tools missing

Run `pnpm tools:download` to download bundled tools.

### Build fails

- Ensure `pnpm install` has been run in `apps/electron/`
- Try deleting `node_modules` and reinstalling

## License

MIT
