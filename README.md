# StreamReady Nodes

A free, open-source node-based video editor for streamers. Upload a clip, build a processing pipeline visually, render to file — no subscription, no cost.

Built by [StreamReady](https://streamreadypc.com) — free tools for streamers.

## What it does

- Upload any video clip (mp4, mov, mkv, avi, webm)
- Build a visual processing pipeline using drag-and-drop nodes
- Nodes: **Crop**, **Transform** (position + scale), **Blur**, **Mask**, **Combine**
- Preview any frame before rendering
- Render to MP4 via FFmpeg — full quality, no re-encoding overhead
- Save and load projects as JSON

## Download

Get the latest Windows installer from [Releases](../../releases).

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

## Run tests

```bash
npm test
```

## Build installer

```bash
npm run build
```

Outputs a Windows NSIS installer to `dist/`.

## Tech stack

- [Electron](https://electronjs.org) + [electron-vite](https://electron-vite.org)
- [React](https://react.dev) + [React Flow](https://reactflow.dev)
- [Zustand](https://github.com/pmndrs/zustand) for state
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — bundled FFmpeg binary
- [Tailwind CSS v4](https://tailwindcss.com)

## Contributing

PRs welcome. Open an issue first for large changes.

## License

MIT — see [LICENSE](LICENSE)
