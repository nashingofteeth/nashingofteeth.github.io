# nash.video

Custom static site generator for [nash.video](https://nash.video).

## Build

```bash
npm install
npm run build   # outputs to dist/
npm run watch   # auto-rebuild on src/templates/public/tools changes
npm start       # build + serve at localhost:8080
```

## Dependencies

### Build (CI + local)

- Node `>=18.11.0` (`engines` in `package.json`)
- npm: `marked ^11.2.0`, `gray-matter ^4.0.3`
  - dev: `concurrently ^9.2.1`, `http-server ^14.1.1` (for `npm start`/`watch`)

### Ingest (local only — `bin/add.js` / `npm run ingest`)

`npm run build` does not need these; only `bin/add.js` does.

- ImageMagick 7 — `magick` / `identify` (resize, `-auto-orient`, `-strip`)
- exiftool (`libimage-exiftool-perl`) — lossless whitelist strip for `originals/` (`-all=` / `-tagsFromFile @ -Make -Model …`)
- mediainfo — `getMediainfo()` / `getDateFromMediainfo()` / HEIF rotation fallback
- libheif — `heif-info` (HEIC `irot`/`imir` rotation)
- rclone — Backblaze B2 `backblaze:nash-potato/photos` (`copy`, `lsf`, `delete --b2-versions`)
