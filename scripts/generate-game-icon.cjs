// Build the desktop icon from the retained pixel-art slush source.
// Run with: npm run icon:build
const fs = require('node:fs');
const path = require('node:path');
const { deflateSync, inflateSync } = require('node:zlib');

const project = path.resolve(__dirname, '..');
const sourcePath = path.join(project, 'build/game-icon-source.png');
const svgPath = path.join(project, 'public/art/icon/game-icon.svg');
const pngPath = path.join(project, 'public/art/icon/game-icon.png');
const icoPath = path.join(project, 'build/game-icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(png) {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Source is not a PNG.');
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let palette;
  let transparency;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('Unsupported interlaced PNG source.');
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  if (bitDepth !== 8) throw new Error(`Expected 8-bit PNG, received ${bitDepth}-bit.`);
  const channelCount = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[colorType];
  if (!channelCount) throw new Error(`Unsupported PNG color type: ${colorType}`);
  const rowLength = width * channelCount;
  const raw = inflateSync(Buffer.concat(compressed));
  const decoded = Buffer.alloc(height * rowLength);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const rowStart = y * rowLength;
    for (let x = 0; x < rowLength; x += 1) {
      const value = raw[rawOffset++];
      const left = x >= channelCount ? decoded[rowStart + x - channelCount] : 0;
      const up = y > 0 ? decoded[rowStart - rowLength + x] : 0;
      const upperLeft = y > 0 && x >= channelCount ? decoded[rowStart - rowLength + x - channelCount] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upperLeft)
                : null;
      if (predictor === null) throw new Error(`Unsupported PNG filter: ${filter}`);
      decoded[rowStart + x] = (value + predictor) & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const src = i * channelCount;
    const dst = i * 4;
    if (colorType === 6) {
      rgba[dst] = decoded[src];
      rgba[dst + 1] = decoded[src + 1];
      rgba[dst + 2] = decoded[src + 2];
      rgba[dst + 3] = decoded[src + 3];
    } else if (colorType === 2) {
      rgba[dst] = decoded[src];
      rgba[dst + 1] = decoded[src + 1];
      rgba[dst + 2] = decoded[src + 2];
      rgba[dst + 3] = 255;
    } else if (colorType === 0) {
      rgba[dst] = decoded[src];
      rgba[dst + 1] = decoded[src];
      rgba[dst + 2] = decoded[src];
      rgba[dst + 3] = 255;
    } else if (colorType === 4) {
      rgba[dst] = decoded[src];
      rgba[dst + 1] = decoded[src];
      rgba[dst + 2] = decoded[src];
      rgba[dst + 3] = decoded[src + 1];
    } else {
      const paletteIndex = decoded[src];
      rgba[dst] = palette[paletteIndex * 3];
      rgba[dst + 1] = palette[paletteIndex * 3 + 1];
      rgba[dst + 2] = palette[paletteIndex * 3 + 2];
      rgba[dst + 3] = transparency?.[paletteIndex] ?? 255;
    }
  }
  return { width, height, rgba };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let i = 0; i < 8; i += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([size, typeBuffer, data, checksum]);
}

function encodePng(width, height, rgba) {
  const rowLength = width * 4;
  const raw = Buffer.alloc((rowLength + 1) * height);
  for (let y = 0; y < height; y += 1) rgba.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function gameCanvas(source, size = 512) {
  const rgba = Buffer.alloc(size * size * 4);
  const inset = 30;
  const artSize = size - inset * 2;
  const radius = 72;
  const background = [16, 32, 51];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cornerX = x < radius ? radius : x >= size - radius ? size - radius - 1 : x;
      const cornerY = y < radius ? radius : y >= size - radius ? size - radius - 1 : y;
      const outsideRound = (x < radius || x >= size - radius) && (y < radius || y >= size - radius)
        && (x - cornerX) ** 2 + (y - cornerY) ** 2 > radius ** 2;
      const dst = (y * size + x) * 4;
      if (outsideRound) continue;

      let r = background[0];
      let g = background[1];
      let b = background[2];
      let a = 255;
      const localX = x - inset;
      const localY = y - inset;
      if (localX >= 0 && localX < artSize && localY >= 0 && localY < artSize) {
        const sourceX = Math.min(source.width - 1, Math.floor(localX * source.width / artSize));
        const sourceY = Math.min(source.height - 1, Math.floor(localY * source.height / artSize));
        const src = (sourceY * source.width + sourceX) * 4;
        const alpha = source.rgba[src + 3] / 255;
        r = Math.round(source.rgba[src] * alpha + r * (1 - alpha));
        g = Math.round(source.rgba[src + 1] * alpha + g * (1 - alpha));
        b = Math.round(source.rgba[src + 2] * alpha + b * (1 - alpha));
      }
      rgba[dst] = r;
      rgba[dst + 1] = g;
      rgba[dst + 2] = b;
      rgba[dst + 3] = a;
    }
  }
  return rgba;
}

function dibFrame(source, size) {
  const xor = Buffer.alloc(size * size * 4);
  const maskRow = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(maskRow * size);
  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(511, Math.floor((y + 0.5) * 512 / size));
    const targetY = size - 1 - y;
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(511, Math.floor((x + 0.5) * 512 / size));
      const src = (sourceY * 512 + sourceX) * 4;
      const dst = (targetY * size + x) * 4;
      xor[dst] = source[src + 2];
      xor[dst + 1] = source[src + 1];
      xor[dst + 2] = source[src];
      xor[dst + 3] = source[src + 3];
      if (source[src + 3] < 128) andMask[targetY * maskRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  const info = Buffer.alloc(40);
  info.writeUInt32LE(40, 0);
  info.writeInt32LE(size, 4);
  info.writeInt32LE(size * 2, 8);
  info.writeUInt16LE(1, 12);
  info.writeUInt16LE(32, 14);
  info.writeUInt32LE(0, 16);
  info.writeUInt32LE(xor.length, 20);
  return Buffer.concat([info, xor, andMask]);
}

function makeIco(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  const data = [];
  frames.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(bytes.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
    data.push(bytes);
  });
  return Buffer.concat([header, ...data]);
}

function makeSvg(sourcePng) {
  const sourceData = sourcePng.toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="72" fill="#102033"/>
  <image x="30" y="30" width="452" height="452" href="data:image/png;base64,${sourceData}" preserveAspectRatio="xMidYMid meet" image-rendering="pixelated"/>
</svg>`;
}

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing pixel-art source: ${sourcePath}`);
  const sourcePng = fs.readFileSync(sourcePath);
  const source = decodePng(sourcePng);
  const canvas = gameCanvas(source);
  fs.mkdirSync(path.dirname(svgPath), { recursive: true });
  fs.mkdirSync(path.dirname(icoPath), { recursive: true });
  fs.writeFileSync(svgPath, makeSvg(sourcePng));
  fs.writeFileSync(pngPath, encodePng(512, 512, canvas));
  const frames = sizes.map((size) => ({ size, bytes: dibFrame(canvas, size) }));
  fs.writeFileSync(icoPath, makeIco(frames));
  console.log(`Wrote ${pngPath} and ${icoPath} (${sizes.join(', ')} px ICO frames).`);
}

main();
