// Store-only zip and ustar gzip, enough to hand a platform a zip or a .tgz
// without a native zip binary. No dependencies beyond Node 18+.
import { crc32, gzipSync } from "node:zlib";

const dosTime = (date) => {
  const t = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const d = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { t, d };
};

export function zipStore(files, date = new Date()) {
  const { t, d } = dosTime(date);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const nameBuf = Buffer.from(name.replace(/\\/g, "/"));
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(t, 10);
    local.writeUInt16LE(d, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(t, 12);
    central.writeUInt16LE(d, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length, 8);
  end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

function octal(value, length) {
  const text = value.toString(8).padStart(length - 1, "0");
  const buf = Buffer.alloc(length);
  buf.write(text, 0, length - 1);
  return buf;
}

function tarHeader(name, size) {
  const buf = Buffer.alloc(512);
  const safe = name.replace(/\\/g, "/");
  buf.write(safe.slice(0, 100), 0);
  octal(0o644, 8).copy(buf, 100);
  octal(0, 8).copy(buf, 108);
  octal(0, 8).copy(buf, 116);
  octal(size, 12).copy(buf, 124);
  octal(0, 12).copy(buf, 136);
  buf.fill(0x20, 148, 156);
  buf.write("0", 156);
  buf.write("ustar", 257);
  buf.write("00", 263);
  let sum = 0;
  for (const byte of buf) sum += byte;
  const checksum = sum.toString(8).padStart(6, "0");
  buf.write(checksum, 148, 6);
  buf[154] = 0;
  buf[155] = 0x20;
  return buf;
}

export function tarGz(files) {
  const chunks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    chunks.push(tarHeader(name, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks));
}
