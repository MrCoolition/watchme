import { describe, expect, it } from "vitest";
import { createEditionArchive, editionArchiveFilename } from "../src/lib/edition-archive";
import { PRESETS } from "../src/lib/presets";

describe("collector edition archive", () => {
  it("writes standard ZIP records with correct offsets, file lengths and CRC-32", async () => {
    const bytes = new Uint8Array(await createEditionArchive([
      { name: "portrait.png", data: new TextEncoder().encode("123456789") },
      { name: "WATCHMÉ.json", data: new TextEncoder().encode('{"version":1}') },
    ]).arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint32(18, true)).toBe(9);
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    let cursor = view.getUint32(end + 16, true);
    for (const expected of ["portrait.png", "WATCHMÉ.json"]) {
      expect(view.getUint32(cursor, true)).toBe(0x02014b50);
      const nameLength = view.getUint16(cursor + 28, true);
      expect(new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))).toBe(expected);
      const localOffset = view.getUint32(cursor + 42, true);
      expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
      expect(view.getUint32(localOffset + 14, true)).toBe(view.getUint32(cursor + 16, true));
      cursor += 46 + nameLength;
    }
    expect(cursor).toBe(end);
  });

  it("copies input bytes so an archive cannot change after creation", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const zip = createEditionArchive([{ name: "a.png", data }]);
    data.fill(0);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    expect(Array.from(bytes.subarray(35, 38))).toEqual([1, 2, 3]);
  });

  it("rejects unsafe, duplicate and empty file sets and produces portable download names", () => {
    for (const name of ["", "../watch.png", "C:\\watch.png", "folder/watch.png", "..", "a\n.png"]) {
      expect(() => createEditionArchive([{ name, data: new Uint8Array() }])).toThrow();
    }
    expect(() => createEditionArchive([])).toThrow();
    expect(() => createEditionArchive([{ name: "a", data: new Uint8Array() }, { name: "a", data: new Uint8Array() }])).toThrow();
    expect(editionArchiveFilename("My Édition / one", PRESETS[0].design)).toMatch(/^watchme-my-edition-one-[a-f0-9]{8}-collector-edition\.zip$/);
  });
});
