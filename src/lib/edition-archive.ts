import { editionFilename } from "./edition-card";
import type { WatchDesign } from "./types";

export interface EditionArchiveFile { name: string; data: Uint8Array; }

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC_TABLE.length; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  CRC_TABLE[index] = value >>> 0;
}
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function header(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

/** PNGs are already compressed. Store them in a standard UTF-8 ZIP without extra dependencies. */
export function createEditionArchive(files: readonly EditionArchiveFile[]): Blob {
  if (!files.length || files.length > 65535) throw new Error("Choose between one and 65,535 edition files.");
  const names = new Set<string>();
  const encoder = new TextEncoder();
  const body: ArrayBuffer[] = [];
  const directory: ArrayBuffer[] = [];
  let offset = 0;
  let directoryLength = 0;
  for (const file of files) {
    if (!file.name || /[\\/\p{C}]/u.test(file.name) || file.name === "." || file.name === ".." || /^[a-z]:/i.test(file.name)) throw new Error("Edition files must have a safe filename.");
    if (names.has(file.name)) throw new Error("Edition filenames must be unique.");
    names.add(file.name);
    const name = encoder.encode(file.name);
    const data = new Uint8Array(file.data);
    if (name.length > 65535 || data.length > 0xffffffff || offset + data.length + name.length + 30 > 0xffffffff) throw new Error("This edition is too large for a standard ZIP.");
    const crc = crc32(data);
    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true); // Version 2.0.
    local.view.setUint16(6, 0x0800, true); // UTF-8 filenames.
    local.view.setUint16(12, 0x0021, true); // 1980-01-01; deterministic metadata.
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, name.length, true);
    body.push(local.bytes.buffer, name.buffer, data.buffer);

    const central = header(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint16(14, 0x0021, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, data.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    directory.push(central.bytes.buffer, name.buffer);
    directoryLength += 46 + name.length;
    offset += 30 + name.length + data.length;
  }
  if (offset + directoryLength > 0xffffffff) throw new Error("This edition is too large for a standard ZIP.");
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, directoryLength, true);
  end.view.setUint32(16, offset, true);
  return new Blob([...body, ...directory, end.bytes.buffer], { type: "application/zip" });
}

export function editionArchiveFilename(name: string, design: WatchDesign): string {
  return editionFilename(name, design).replace(/\.png$/, "-collector-edition.zip");
}
