"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const path$7 = require("path");
const fs$a = require("fs");
const require$$0 = require("events");
const require$$1 = require("stream");
const require$$2 = require("string_decoder");
const require$$0$2 = require("assert");
const require$$1$1 = require("buffer");
const require$$0$1 = require("zlib");
const require$$7 = require("process");
const require$$0$3 = require("util");
const require$$12 = require("crypto");
const child_process = require("child_process");
const http = require("http");
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
const argmap = /* @__PURE__ */ new Map([
  ["C", "cwd"],
  ["f", "file"],
  ["z", "gzip"],
  ["P", "preservePaths"],
  ["U", "unlink"],
  ["strip-components", "strip"],
  ["stripComponents", "strip"],
  ["keep-newer", "newer"],
  ["keepNewer", "newer"],
  ["keep-newer-files", "newer"],
  ["keepNewerFiles", "newer"],
  ["k", "keep"],
  ["keep-existing", "keep"],
  ["keepExisting", "keep"],
  ["m", "noMtime"],
  ["no-mtime", "noMtime"],
  ["p", "preserveOwner"],
  ["L", "follow"],
  ["h", "follow"]
]);
var highLevelOpt = (opt) => opt ? Object.keys(opt).map((k) => [
  argmap.has(k) ? argmap.get(k) : k,
  opt[k]
]).reduce((set, kv) => (set[kv[0]] = kv[1], set), /* @__PURE__ */ Object.create(null)) : {};
var minipass$2 = {};
const proc$2 = typeof process === "object" && process ? process : {
  stdout: null,
  stderr: null
};
const EE$4 = require$$0;
const Stream$2 = require$$1;
const stringdecoder = require$$2;
const SD$2 = stringdecoder.StringDecoder;
const EOF$3 = Symbol("EOF");
const MAYBE_EMIT_END$2 = Symbol("maybeEmitEnd");
const EMITTED_END$2 = Symbol("emittedEnd");
const EMITTING_END$2 = Symbol("emittingEnd");
const EMITTED_ERROR$2 = Symbol("emittedError");
const CLOSED$2 = Symbol("closed");
const READ$3 = Symbol("read");
const FLUSH$2 = Symbol("flush");
const FLUSHCHUNK$2 = Symbol("flushChunk");
const ENCODING$2 = Symbol("encoding");
const DECODER$2 = Symbol("decoder");
const FLOWING$2 = Symbol("flowing");
const PAUSED$2 = Symbol("paused");
const RESUME$2 = Symbol("resume");
const BUFFER$1 = Symbol("buffer");
const PIPES = Symbol("pipes");
const BUFFERLENGTH$2 = Symbol("bufferLength");
const BUFFERPUSH$2 = Symbol("bufferPush");
const BUFFERSHIFT$2 = Symbol("bufferShift");
const OBJECTMODE$2 = Symbol("objectMode");
const DESTROYED$2 = Symbol("destroyed");
const ERROR = Symbol("error");
const EMITDATA$2 = Symbol("emitData");
const EMITEND$2 = Symbol("emitEnd");
const EMITEND2$2 = Symbol("emitEnd2");
const ASYNC$2 = Symbol("async");
const ABORT = Symbol("abort");
const ABORTED$1 = Symbol("aborted");
const SIGNAL = Symbol("signal");
const defer$2 = (fn) => Promise.resolve().then(fn);
const doIter$2 = commonjsGlobal._MP_NO_ITERATOR_SYMBOLS_ !== "1";
const ASYNCITERATOR$2 = doIter$2 && Symbol.asyncIterator || Symbol("asyncIterator not implemented");
const ITERATOR$2 = doIter$2 && Symbol.iterator || Symbol("iterator not implemented");
const isEndish$2 = (ev) => ev === "end" || ev === "finish" || ev === "prefinish";
const isArrayBuffer$2 = (b) => b instanceof ArrayBuffer || typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
const isArrayBufferView$2 = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
let Pipe$2 = class Pipe {
  constructor(src, dest, opts) {
    this.src = src;
    this.dest = dest;
    this.opts = opts;
    this.ondrain = () => src[RESUME$2]();
    dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // istanbul ignore next - only here for the prototype
  proxyErrors() {
  }
  end() {
    this.unpipe();
    if (this.opts.end) this.dest.end();
  }
};
let PipeProxyErrors$2 = class PipeProxyErrors extends Pipe$2 {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors);
    super.unpipe();
  }
  constructor(src, dest, opts) {
    super(src, dest, opts);
    this.proxyErrors = (er) => dest.emit("error", er);
    src.on("error", this.proxyErrors);
  }
};
let Minipass$4 = class Minipass extends Stream$2 {
  constructor(options) {
    super();
    this[FLOWING$2] = false;
    this[PAUSED$2] = false;
    this[PIPES] = [];
    this[BUFFER$1] = [];
    this[OBJECTMODE$2] = options && options.objectMode || false;
    if (this[OBJECTMODE$2]) this[ENCODING$2] = null;
    else this[ENCODING$2] = options && options.encoding || null;
    if (this[ENCODING$2] === "buffer") this[ENCODING$2] = null;
    this[ASYNC$2] = options && !!options.async || false;
    this[DECODER$2] = this[ENCODING$2] ? new SD$2(this[ENCODING$2]) : null;
    this[EOF$3] = false;
    this[EMITTED_END$2] = false;
    this[EMITTING_END$2] = false;
    this[CLOSED$2] = false;
    this[EMITTED_ERROR$2] = null;
    this.writable = true;
    this.readable = true;
    this[BUFFERLENGTH$2] = 0;
    this[DESTROYED$2] = false;
    if (options && options.debugExposeBuffer === true) {
      Object.defineProperty(this, "buffer", { get: () => this[BUFFER$1] });
    }
    if (options && options.debugExposePipes === true) {
      Object.defineProperty(this, "pipes", { get: () => this[PIPES] });
    }
    this[SIGNAL] = options && options.signal;
    this[ABORTED$1] = false;
    if (this[SIGNAL]) {
      this[SIGNAL].addEventListener("abort", () => this[ABORT]());
      if (this[SIGNAL].aborted) {
        this[ABORT]();
      }
    }
  }
  get bufferLength() {
    return this[BUFFERLENGTH$2];
  }
  get encoding() {
    return this[ENCODING$2];
  }
  set encoding(enc) {
    if (this[OBJECTMODE$2]) throw new Error("cannot set encoding in objectMode");
    if (this[ENCODING$2] && enc !== this[ENCODING$2] && (this[DECODER$2] && this[DECODER$2].lastNeed || this[BUFFERLENGTH$2]))
      throw new Error("cannot change encoding");
    if (this[ENCODING$2] !== enc) {
      this[DECODER$2] = enc ? new SD$2(enc) : null;
      if (this[BUFFER$1].length)
        this[BUFFER$1] = this[BUFFER$1].map((chunk) => this[DECODER$2].write(chunk));
    }
    this[ENCODING$2] = enc;
  }
  setEncoding(enc) {
    this.encoding = enc;
  }
  get objectMode() {
    return this[OBJECTMODE$2];
  }
  set objectMode(om) {
    this[OBJECTMODE$2] = this[OBJECTMODE$2] || !!om;
  }
  get ["async"]() {
    return this[ASYNC$2];
  }
  set ["async"](a) {
    this[ASYNC$2] = this[ASYNC$2] || !!a;
  }
  // drop everything and get out of the flow completely
  [ABORT]() {
    this[ABORTED$1] = true;
    this.emit("abort", this[SIGNAL].reason);
    this.destroy(this[SIGNAL].reason);
  }
  get aborted() {
    return this[ABORTED$1];
  }
  set aborted(_) {
  }
  write(chunk, encoding, cb) {
    if (this[ABORTED$1]) return false;
    if (this[EOF$3]) throw new Error("write after end");
    if (this[DESTROYED$2]) {
      this.emit(
        "error",
        Object.assign(
          new Error("Cannot call write after a stream was destroyed"),
          { code: "ERR_STREAM_DESTROYED" }
        )
      );
      return true;
    }
    if (typeof encoding === "function") cb = encoding, encoding = "utf8";
    if (!encoding) encoding = "utf8";
    const fn = this[ASYNC$2] ? defer$2 : (f) => f();
    if (!this[OBJECTMODE$2] && !Buffer.isBuffer(chunk)) {
      if (isArrayBufferView$2(chunk))
        chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      else if (isArrayBuffer$2(chunk)) chunk = Buffer.from(chunk);
      else if (typeof chunk !== "string")
        this.objectMode = true;
    }
    if (this[OBJECTMODE$2]) {
      if (this.flowing && this[BUFFERLENGTH$2] !== 0) this[FLUSH$2](true);
      if (this.flowing) this.emit("data", chunk);
      else this[BUFFERPUSH$2](chunk);
      if (this[BUFFERLENGTH$2] !== 0) this.emit("readable");
      if (cb) fn(cb);
      return this.flowing;
    }
    if (!chunk.length) {
      if (this[BUFFERLENGTH$2] !== 0) this.emit("readable");
      if (cb) fn(cb);
      return this.flowing;
    }
    if (typeof chunk === "string" && // unless it is a string already ready for us to use
    !(encoding === this[ENCODING$2] && !this[DECODER$2].lastNeed)) {
      chunk = Buffer.from(chunk, encoding);
    }
    if (Buffer.isBuffer(chunk) && this[ENCODING$2])
      chunk = this[DECODER$2].write(chunk);
    if (this.flowing && this[BUFFERLENGTH$2] !== 0) this[FLUSH$2](true);
    if (this.flowing) this.emit("data", chunk);
    else this[BUFFERPUSH$2](chunk);
    if (this[BUFFERLENGTH$2] !== 0) this.emit("readable");
    if (cb) fn(cb);
    return this.flowing;
  }
  read(n) {
    if (this[DESTROYED$2]) return null;
    if (this[BUFFERLENGTH$2] === 0 || n === 0 || n > this[BUFFERLENGTH$2]) {
      this[MAYBE_EMIT_END$2]();
      return null;
    }
    if (this[OBJECTMODE$2]) n = null;
    if (this[BUFFER$1].length > 1 && !this[OBJECTMODE$2]) {
      if (this.encoding) this[BUFFER$1] = [this[BUFFER$1].join("")];
      else this[BUFFER$1] = [Buffer.concat(this[BUFFER$1], this[BUFFERLENGTH$2])];
    }
    const ret = this[READ$3](n || null, this[BUFFER$1][0]);
    this[MAYBE_EMIT_END$2]();
    return ret;
  }
  [READ$3](n, chunk) {
    if (n === chunk.length || n === null) this[BUFFERSHIFT$2]();
    else {
      this[BUFFER$1][0] = chunk.slice(n);
      chunk = chunk.slice(0, n);
      this[BUFFERLENGTH$2] -= n;
    }
    this.emit("data", chunk);
    if (!this[BUFFER$1].length && !this[EOF$3]) this.emit("drain");
    return chunk;
  }
  end(chunk, encoding, cb) {
    if (typeof chunk === "function") cb = chunk, chunk = null;
    if (typeof encoding === "function") cb = encoding, encoding = "utf8";
    if (chunk) this.write(chunk, encoding);
    if (cb) this.once("end", cb);
    this[EOF$3] = true;
    this.writable = false;
    if (this.flowing || !this[PAUSED$2]) this[MAYBE_EMIT_END$2]();
    return this;
  }
  // don't let the internal resume be overwritten
  [RESUME$2]() {
    if (this[DESTROYED$2]) return;
    this[PAUSED$2] = false;
    this[FLOWING$2] = true;
    this.emit("resume");
    if (this[BUFFER$1].length) this[FLUSH$2]();
    else if (this[EOF$3]) this[MAYBE_EMIT_END$2]();
    else this.emit("drain");
  }
  resume() {
    return this[RESUME$2]();
  }
  pause() {
    this[FLOWING$2] = false;
    this[PAUSED$2] = true;
  }
  get destroyed() {
    return this[DESTROYED$2];
  }
  get flowing() {
    return this[FLOWING$2];
  }
  get paused() {
    return this[PAUSED$2];
  }
  [BUFFERPUSH$2](chunk) {
    if (this[OBJECTMODE$2]) this[BUFFERLENGTH$2] += 1;
    else this[BUFFERLENGTH$2] += chunk.length;
    this[BUFFER$1].push(chunk);
  }
  [BUFFERSHIFT$2]() {
    if (this[OBJECTMODE$2]) this[BUFFERLENGTH$2] -= 1;
    else this[BUFFERLENGTH$2] -= this[BUFFER$1][0].length;
    return this[BUFFER$1].shift();
  }
  [FLUSH$2](noDrain) {
    do {
    } while (this[FLUSHCHUNK$2](this[BUFFERSHIFT$2]()) && this[BUFFER$1].length);
    if (!noDrain && !this[BUFFER$1].length && !this[EOF$3]) this.emit("drain");
  }
  [FLUSHCHUNK$2](chunk) {
    this.emit("data", chunk);
    return this.flowing;
  }
  pipe(dest, opts) {
    if (this[DESTROYED$2]) return;
    const ended = this[EMITTED_END$2];
    opts = opts || {};
    if (dest === proc$2.stdout || dest === proc$2.stderr) opts.end = false;
    else opts.end = opts.end !== false;
    opts.proxyErrors = !!opts.proxyErrors;
    if (ended) {
      if (opts.end) dest.end();
    } else {
      this[PIPES].push(
        !opts.proxyErrors ? new Pipe$2(this, dest, opts) : new PipeProxyErrors$2(this, dest, opts)
      );
      if (this[ASYNC$2]) defer$2(() => this[RESUME$2]());
      else this[RESUME$2]();
    }
    return dest;
  }
  unpipe(dest) {
    const p = this[PIPES].find((p2) => p2.dest === dest);
    if (p) {
      this[PIPES].splice(this[PIPES].indexOf(p), 1);
      p.unpipe();
    }
  }
  addListener(ev, fn) {
    return this.on(ev, fn);
  }
  on(ev, fn) {
    const ret = super.on(ev, fn);
    if (ev === "data" && !this[PIPES].length && !this.flowing) this[RESUME$2]();
    else if (ev === "readable" && this[BUFFERLENGTH$2] !== 0)
      super.emit("readable");
    else if (isEndish$2(ev) && this[EMITTED_END$2]) {
      super.emit(ev);
      this.removeAllListeners(ev);
    } else if (ev === "error" && this[EMITTED_ERROR$2]) {
      if (this[ASYNC$2]) defer$2(() => fn.call(this, this[EMITTED_ERROR$2]));
      else fn.call(this, this[EMITTED_ERROR$2]);
    }
    return ret;
  }
  get emittedEnd() {
    return this[EMITTED_END$2];
  }
  [MAYBE_EMIT_END$2]() {
    if (!this[EMITTING_END$2] && !this[EMITTED_END$2] && !this[DESTROYED$2] && this[BUFFER$1].length === 0 && this[EOF$3]) {
      this[EMITTING_END$2] = true;
      this.emit("end");
      this.emit("prefinish");
      this.emit("finish");
      if (this[CLOSED$2]) this.emit("close");
      this[EMITTING_END$2] = false;
    }
  }
  emit(ev, data, ...extra) {
    if (ev !== "error" && ev !== "close" && ev !== DESTROYED$2 && this[DESTROYED$2])
      return;
    else if (ev === "data") {
      return !this[OBJECTMODE$2] && !data ? false : this[ASYNC$2] ? defer$2(() => this[EMITDATA$2](data)) : this[EMITDATA$2](data);
    } else if (ev === "end") {
      return this[EMITEND$2]();
    } else if (ev === "close") {
      this[CLOSED$2] = true;
      if (!this[EMITTED_END$2] && !this[DESTROYED$2]) return;
      const ret2 = super.emit("close");
      this.removeAllListeners("close");
      return ret2;
    } else if (ev === "error") {
      this[EMITTED_ERROR$2] = data;
      super.emit(ERROR, data);
      const ret2 = !this[SIGNAL] || this.listeners("error").length ? super.emit("error", data) : false;
      this[MAYBE_EMIT_END$2]();
      return ret2;
    } else if (ev === "resume") {
      const ret2 = super.emit("resume");
      this[MAYBE_EMIT_END$2]();
      return ret2;
    } else if (ev === "finish" || ev === "prefinish") {
      const ret2 = super.emit(ev);
      this.removeAllListeners(ev);
      return ret2;
    }
    const ret = super.emit(ev, data, ...extra);
    this[MAYBE_EMIT_END$2]();
    return ret;
  }
  [EMITDATA$2](data) {
    for (const p of this[PIPES]) {
      if (p.dest.write(data) === false) this.pause();
    }
    const ret = super.emit("data", data);
    this[MAYBE_EMIT_END$2]();
    return ret;
  }
  [EMITEND$2]() {
    if (this[EMITTED_END$2]) return;
    this[EMITTED_END$2] = true;
    this.readable = false;
    if (this[ASYNC$2]) defer$2(() => this[EMITEND2$2]());
    else this[EMITEND2$2]();
  }
  [EMITEND2$2]() {
    if (this[DECODER$2]) {
      const data = this[DECODER$2].end();
      if (data) {
        for (const p of this[PIPES]) {
          p.dest.write(data);
        }
        super.emit("data", data);
      }
    }
    for (const p of this[PIPES]) {
      p.end();
    }
    const ret = super.emit("end");
    this.removeAllListeners("end");
    return ret;
  }
  // const all = await stream.collect()
  collect() {
    const buf = [];
    if (!this[OBJECTMODE$2]) buf.dataLength = 0;
    const p = this.promise();
    this.on("data", (c) => {
      buf.push(c);
      if (!this[OBJECTMODE$2]) buf.dataLength += c.length;
    });
    return p.then(() => buf);
  }
  // const data = await stream.concat()
  concat() {
    return this[OBJECTMODE$2] ? Promise.reject(new Error("cannot concat in objectMode")) : this.collect().then(
      (buf) => this[OBJECTMODE$2] ? Promise.reject(new Error("cannot concat in objectMode")) : this[ENCODING$2] ? buf.join("") : Buffer.concat(buf, buf.dataLength)
    );
  }
  // stream.promise().then(() => done, er => emitted error)
  promise() {
    return new Promise((resolve2, reject) => {
      this.on(DESTROYED$2, () => reject(new Error("stream destroyed")));
      this.on("error", (er) => reject(er));
      this.on("end", () => resolve2());
    });
  }
  // for await (let chunk of stream)
  [ASYNCITERATOR$2]() {
    let stopped = false;
    const stop = () => {
      this.pause();
      stopped = true;
      return Promise.resolve({ done: true });
    };
    const next = () => {
      if (stopped) return stop();
      const res = this.read();
      if (res !== null) return Promise.resolve({ done: false, value: res });
      if (this[EOF$3]) return stop();
      let resolve2 = null;
      let reject = null;
      const onerr = (er) => {
        this.removeListener("data", ondata);
        this.removeListener("end", onend);
        this.removeListener(DESTROYED$2, ondestroy);
        stop();
        reject(er);
      };
      const ondata = (value) => {
        this.removeListener("error", onerr);
        this.removeListener("end", onend);
        this.removeListener(DESTROYED$2, ondestroy);
        this.pause();
        resolve2({ value, done: !!this[EOF$3] });
      };
      const onend = () => {
        this.removeListener("error", onerr);
        this.removeListener("data", ondata);
        this.removeListener(DESTROYED$2, ondestroy);
        stop();
        resolve2({ done: true });
      };
      const ondestroy = () => onerr(new Error("stream destroyed"));
      return new Promise((res2, rej) => {
        reject = rej;
        resolve2 = res2;
        this.once(DESTROYED$2, ondestroy);
        this.once("error", onerr);
        this.once("end", onend);
        this.once("data", ondata);
      });
    };
    return {
      next,
      throw: stop,
      return: stop,
      [ASYNCITERATOR$2]() {
        return this;
      }
    };
  }
  // for (let chunk of stream)
  [ITERATOR$2]() {
    let stopped = false;
    const stop = () => {
      this.pause();
      this.removeListener(ERROR, stop);
      this.removeListener(DESTROYED$2, stop);
      this.removeListener("end", stop);
      stopped = true;
      return { done: true };
    };
    const next = () => {
      if (stopped) return stop();
      const value = this.read();
      return value === null ? stop() : { value };
    };
    this.once("end", stop);
    this.once(ERROR, stop);
    this.once(DESTROYED$2, stop);
    return {
      next,
      throw: stop,
      return: stop,
      [ITERATOR$2]() {
        return this;
      }
    };
  }
  destroy(er) {
    if (this[DESTROYED$2]) {
      if (er) this.emit("error", er);
      else this.emit(DESTROYED$2);
      return this;
    }
    this[DESTROYED$2] = true;
    this[BUFFER$1].length = 0;
    this[BUFFERLENGTH$2] = 0;
    if (typeof this.close === "function" && !this[CLOSED$2]) this.close();
    if (er) this.emit("error", er);
    else this.emit(DESTROYED$2);
    return this;
  }
  static isStream(s) {
    return !!s && (s instanceof Minipass || s instanceof Stream$2 || s instanceof EE$4 && // readable
    (typeof s.pipe === "function" || // writable
    typeof s.write === "function" && typeof s.end === "function"));
  }
};
minipass$2.Minipass = Minipass$4;
var minizlib = {};
const realZlibConstants = require$$0$1.constants || /* istanbul ignore next */
{ ZLIB_VERNUM: 4736 };
var constants$1 = Object.freeze(Object.assign(/* @__PURE__ */ Object.create(null), {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_VERSION_ERROR: -6,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  DEFLATE: 1,
  INFLATE: 2,
  GZIP: 3,
  GUNZIP: 4,
  DEFLATERAW: 5,
  INFLATERAW: 6,
  UNZIP: 7,
  BROTLI_DECODE: 8,
  BROTLI_ENCODE: 9,
  Z_MIN_WINDOWBITS: 8,
  Z_MAX_WINDOWBITS: 15,
  Z_DEFAULT_WINDOWBITS: 15,
  Z_MIN_CHUNK: 64,
  Z_MAX_CHUNK: Infinity,
  Z_DEFAULT_CHUNK: 16384,
  Z_MIN_MEMLEVEL: 1,
  Z_MAX_MEMLEVEL: 9,
  Z_DEFAULT_MEMLEVEL: 8,
  Z_MIN_LEVEL: -1,
  Z_MAX_LEVEL: 9,
  Z_DEFAULT_LEVEL: -1,
  BROTLI_OPERATION_PROCESS: 0,
  BROTLI_OPERATION_FLUSH: 1,
  BROTLI_OPERATION_FINISH: 2,
  BROTLI_OPERATION_EMIT_METADATA: 3,
  BROTLI_MODE_GENERIC: 0,
  BROTLI_MODE_TEXT: 1,
  BROTLI_MODE_FONT: 2,
  BROTLI_DEFAULT_MODE: 0,
  BROTLI_MIN_QUALITY: 0,
  BROTLI_MAX_QUALITY: 11,
  BROTLI_DEFAULT_QUALITY: 11,
  BROTLI_MIN_WINDOW_BITS: 10,
  BROTLI_MAX_WINDOW_BITS: 24,
  BROTLI_LARGE_MAX_WINDOW_BITS: 30,
  BROTLI_DEFAULT_WINDOW: 22,
  BROTLI_MIN_INPUT_BLOCK_BITS: 16,
  BROTLI_MAX_INPUT_BLOCK_BITS: 24,
  BROTLI_PARAM_MODE: 0,
  BROTLI_PARAM_QUALITY: 1,
  BROTLI_PARAM_LGWIN: 2,
  BROTLI_PARAM_LGBLOCK: 3,
  BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING: 4,
  BROTLI_PARAM_SIZE_HINT: 5,
  BROTLI_PARAM_LARGE_WINDOW: 6,
  BROTLI_PARAM_NPOSTFIX: 7,
  BROTLI_PARAM_NDIRECT: 8,
  BROTLI_DECODER_RESULT_ERROR: 0,
  BROTLI_DECODER_RESULT_SUCCESS: 1,
  BROTLI_DECODER_RESULT_NEEDS_MORE_INPUT: 2,
  BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT: 3,
  BROTLI_DECODER_PARAM_DISABLE_RING_BUFFER_REALLOCATION: 0,
  BROTLI_DECODER_PARAM_LARGE_WINDOW: 1,
  BROTLI_DECODER_NO_ERROR: 0,
  BROTLI_DECODER_SUCCESS: 1,
  BROTLI_DECODER_NEEDS_MORE_INPUT: 2,
  BROTLI_DECODER_NEEDS_MORE_OUTPUT: 3,
  BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_NIBBLE: -1,
  BROTLI_DECODER_ERROR_FORMAT_RESERVED: -2,
  BROTLI_DECODER_ERROR_FORMAT_EXUBERANT_META_NIBBLE: -3,
  BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_ALPHABET: -4,
  BROTLI_DECODER_ERROR_FORMAT_SIMPLE_HUFFMAN_SAME: -5,
  BROTLI_DECODER_ERROR_FORMAT_CL_SPACE: -6,
  BROTLI_DECODER_ERROR_FORMAT_HUFFMAN_SPACE: -7,
  BROTLI_DECODER_ERROR_FORMAT_CONTEXT_MAP_REPEAT: -8,
  BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_1: -9,
  BROTLI_DECODER_ERROR_FORMAT_BLOCK_LENGTH_2: -10,
  BROTLI_DECODER_ERROR_FORMAT_TRANSFORM: -11,
  BROTLI_DECODER_ERROR_FORMAT_DICTIONARY: -12,
  BROTLI_DECODER_ERROR_FORMAT_WINDOW_BITS: -13,
  BROTLI_DECODER_ERROR_FORMAT_PADDING_1: -14,
  BROTLI_DECODER_ERROR_FORMAT_PADDING_2: -15,
  BROTLI_DECODER_ERROR_FORMAT_DISTANCE: -16,
  BROTLI_DECODER_ERROR_DICTIONARY_NOT_SET: -19,
  BROTLI_DECODER_ERROR_INVALID_ARGUMENTS: -20,
  BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MODES: -21,
  BROTLI_DECODER_ERROR_ALLOC_TREE_GROUPS: -22,
  BROTLI_DECODER_ERROR_ALLOC_CONTEXT_MAP: -25,
  BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_1: -26,
  BROTLI_DECODER_ERROR_ALLOC_RING_BUFFER_2: -27,
  BROTLI_DECODER_ERROR_ALLOC_BLOCK_TYPE_TREES: -30,
  BROTLI_DECODER_ERROR_UNREACHABLE: -31
}, realZlibConstants));
const proc$1 = typeof process === "object" && process ? process : {
  stdout: null,
  stderr: null
};
const EE$3 = require$$0;
const Stream$1 = require$$1;
const SD$1 = require$$2.StringDecoder;
const EOF$2 = Symbol("EOF");
const MAYBE_EMIT_END$1 = Symbol("maybeEmitEnd");
const EMITTED_END$1 = Symbol("emittedEnd");
const EMITTING_END$1 = Symbol("emittingEnd");
const EMITTED_ERROR$1 = Symbol("emittedError");
const CLOSED$1 = Symbol("closed");
const READ$2 = Symbol("read");
const FLUSH$1 = Symbol("flush");
const FLUSHCHUNK$1 = Symbol("flushChunk");
const ENCODING$1 = Symbol("encoding");
const DECODER$1 = Symbol("decoder");
const FLOWING$1 = Symbol("flowing");
const PAUSED$1 = Symbol("paused");
const RESUME$1 = Symbol("resume");
const BUFFERLENGTH$1 = Symbol("bufferLength");
const BUFFERPUSH$1 = Symbol("bufferPush");
const BUFFERSHIFT$1 = Symbol("bufferShift");
const OBJECTMODE$1 = Symbol("objectMode");
const DESTROYED$1 = Symbol("destroyed");
const EMITDATA$1 = Symbol("emitData");
const EMITEND$1 = Symbol("emitEnd");
const EMITEND2$1 = Symbol("emitEnd2");
const ASYNC$1 = Symbol("async");
const defer$1 = (fn) => Promise.resolve().then(fn);
const doIter$1 = commonjsGlobal._MP_NO_ITERATOR_SYMBOLS_ !== "1";
const ASYNCITERATOR$1 = doIter$1 && Symbol.asyncIterator || Symbol("asyncIterator not implemented");
const ITERATOR$1 = doIter$1 && Symbol.iterator || Symbol("iterator not implemented");
const isEndish$1 = (ev) => ev === "end" || ev === "finish" || ev === "prefinish";
const isArrayBuffer$1 = (b) => b instanceof ArrayBuffer || typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
const isArrayBufferView$1 = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
let Pipe$1 = class Pipe2 {
  constructor(src, dest, opts) {
    this.src = src;
    this.dest = dest;
    this.opts = opts;
    this.ondrain = () => src[RESUME$1]();
    dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // istanbul ignore next - only here for the prototype
  proxyErrors() {
  }
  end() {
    this.unpipe();
    if (this.opts.end)
      this.dest.end();
  }
};
let PipeProxyErrors$1 = class PipeProxyErrors2 extends Pipe$1 {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors);
    super.unpipe();
  }
  constructor(src, dest, opts) {
    super(src, dest, opts);
    this.proxyErrors = (er) => dest.emit("error", er);
    src.on("error", this.proxyErrors);
  }
};
var minipass$1 = class Minipass2 extends Stream$1 {
  constructor(options) {
    super();
    this[FLOWING$1] = false;
    this[PAUSED$1] = false;
    this.pipes = [];
    this.buffer = [];
    this[OBJECTMODE$1] = options && options.objectMode || false;
    if (this[OBJECTMODE$1])
      this[ENCODING$1] = null;
    else
      this[ENCODING$1] = options && options.encoding || null;
    if (this[ENCODING$1] === "buffer")
      this[ENCODING$1] = null;
    this[ASYNC$1] = options && !!options.async || false;
    this[DECODER$1] = this[ENCODING$1] ? new SD$1(this[ENCODING$1]) : null;
    this[EOF$2] = false;
    this[EMITTED_END$1] = false;
    this[EMITTING_END$1] = false;
    this[CLOSED$1] = false;
    this[EMITTED_ERROR$1] = null;
    this.writable = true;
    this.readable = true;
    this[BUFFERLENGTH$1] = 0;
    this[DESTROYED$1] = false;
  }
  get bufferLength() {
    return this[BUFFERLENGTH$1];
  }
  get encoding() {
    return this[ENCODING$1];
  }
  set encoding(enc) {
    if (this[OBJECTMODE$1])
      throw new Error("cannot set encoding in objectMode");
    if (this[ENCODING$1] && enc !== this[ENCODING$1] && (this[DECODER$1] && this[DECODER$1].lastNeed || this[BUFFERLENGTH$1]))
      throw new Error("cannot change encoding");
    if (this[ENCODING$1] !== enc) {
      this[DECODER$1] = enc ? new SD$1(enc) : null;
      if (this.buffer.length)
        this.buffer = this.buffer.map((chunk) => this[DECODER$1].write(chunk));
    }
    this[ENCODING$1] = enc;
  }
  setEncoding(enc) {
    this.encoding = enc;
  }
  get objectMode() {
    return this[OBJECTMODE$1];
  }
  set objectMode(om) {
    this[OBJECTMODE$1] = this[OBJECTMODE$1] || !!om;
  }
  get ["async"]() {
    return this[ASYNC$1];
  }
  set ["async"](a) {
    this[ASYNC$1] = this[ASYNC$1] || !!a;
  }
  write(chunk, encoding, cb) {
    if (this[EOF$2])
      throw new Error("write after end");
    if (this[DESTROYED$1]) {
      this.emit("error", Object.assign(
        new Error("Cannot call write after a stream was destroyed"),
        { code: "ERR_STREAM_DESTROYED" }
      ));
      return true;
    }
    if (typeof encoding === "function")
      cb = encoding, encoding = "utf8";
    if (!encoding)
      encoding = "utf8";
    const fn = this[ASYNC$1] ? defer$1 : (f) => f();
    if (!this[OBJECTMODE$1] && !Buffer.isBuffer(chunk)) {
      if (isArrayBufferView$1(chunk))
        chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      else if (isArrayBuffer$1(chunk))
        chunk = Buffer.from(chunk);
      else if (typeof chunk !== "string")
        this.objectMode = true;
    }
    if (this[OBJECTMODE$1]) {
      if (this.flowing && this[BUFFERLENGTH$1] !== 0)
        this[FLUSH$1](true);
      if (this.flowing)
        this.emit("data", chunk);
      else
        this[BUFFERPUSH$1](chunk);
      if (this[BUFFERLENGTH$1] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this.flowing;
    }
    if (!chunk.length) {
      if (this[BUFFERLENGTH$1] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this.flowing;
    }
    if (typeof chunk === "string" && // unless it is a string already ready for us to use
    !(encoding === this[ENCODING$1] && !this[DECODER$1].lastNeed)) {
      chunk = Buffer.from(chunk, encoding);
    }
    if (Buffer.isBuffer(chunk) && this[ENCODING$1])
      chunk = this[DECODER$1].write(chunk);
    if (this.flowing && this[BUFFERLENGTH$1] !== 0)
      this[FLUSH$1](true);
    if (this.flowing)
      this.emit("data", chunk);
    else
      this[BUFFERPUSH$1](chunk);
    if (this[BUFFERLENGTH$1] !== 0)
      this.emit("readable");
    if (cb)
      fn(cb);
    return this.flowing;
  }
  read(n) {
    if (this[DESTROYED$1])
      return null;
    if (this[BUFFERLENGTH$1] === 0 || n === 0 || n > this[BUFFERLENGTH$1]) {
      this[MAYBE_EMIT_END$1]();
      return null;
    }
    if (this[OBJECTMODE$1])
      n = null;
    if (this.buffer.length > 1 && !this[OBJECTMODE$1]) {
      if (this.encoding)
        this.buffer = [this.buffer.join("")];
      else
        this.buffer = [Buffer.concat(this.buffer, this[BUFFERLENGTH$1])];
    }
    const ret = this[READ$2](n || null, this.buffer[0]);
    this[MAYBE_EMIT_END$1]();
    return ret;
  }
  [READ$2](n, chunk) {
    if (n === chunk.length || n === null)
      this[BUFFERSHIFT$1]();
    else {
      this.buffer[0] = chunk.slice(n);
      chunk = chunk.slice(0, n);
      this[BUFFERLENGTH$1] -= n;
    }
    this.emit("data", chunk);
    if (!this.buffer.length && !this[EOF$2])
      this.emit("drain");
    return chunk;
  }
  end(chunk, encoding, cb) {
    if (typeof chunk === "function")
      cb = chunk, chunk = null;
    if (typeof encoding === "function")
      cb = encoding, encoding = "utf8";
    if (chunk)
      this.write(chunk, encoding);
    if (cb)
      this.once("end", cb);
    this[EOF$2] = true;
    this.writable = false;
    if (this.flowing || !this[PAUSED$1])
      this[MAYBE_EMIT_END$1]();
    return this;
  }
  // don't let the internal resume be overwritten
  [RESUME$1]() {
    if (this[DESTROYED$1])
      return;
    this[PAUSED$1] = false;
    this[FLOWING$1] = true;
    this.emit("resume");
    if (this.buffer.length)
      this[FLUSH$1]();
    else if (this[EOF$2])
      this[MAYBE_EMIT_END$1]();
    else
      this.emit("drain");
  }
  resume() {
    return this[RESUME$1]();
  }
  pause() {
    this[FLOWING$1] = false;
    this[PAUSED$1] = true;
  }
  get destroyed() {
    return this[DESTROYED$1];
  }
  get flowing() {
    return this[FLOWING$1];
  }
  get paused() {
    return this[PAUSED$1];
  }
  [BUFFERPUSH$1](chunk) {
    if (this[OBJECTMODE$1])
      this[BUFFERLENGTH$1] += 1;
    else
      this[BUFFERLENGTH$1] += chunk.length;
    this.buffer.push(chunk);
  }
  [BUFFERSHIFT$1]() {
    if (this.buffer.length) {
      if (this[OBJECTMODE$1])
        this[BUFFERLENGTH$1] -= 1;
      else
        this[BUFFERLENGTH$1] -= this.buffer[0].length;
    }
    return this.buffer.shift();
  }
  [FLUSH$1](noDrain) {
    do {
    } while (this[FLUSHCHUNK$1](this[BUFFERSHIFT$1]()));
    if (!noDrain && !this.buffer.length && !this[EOF$2])
      this.emit("drain");
  }
  [FLUSHCHUNK$1](chunk) {
    return chunk ? (this.emit("data", chunk), this.flowing) : false;
  }
  pipe(dest, opts) {
    if (this[DESTROYED$1])
      return;
    const ended = this[EMITTED_END$1];
    opts = opts || {};
    if (dest === proc$1.stdout || dest === proc$1.stderr)
      opts.end = false;
    else
      opts.end = opts.end !== false;
    opts.proxyErrors = !!opts.proxyErrors;
    if (ended) {
      if (opts.end)
        dest.end();
    } else {
      this.pipes.push(!opts.proxyErrors ? new Pipe$1(this, dest, opts) : new PipeProxyErrors$1(this, dest, opts));
      if (this[ASYNC$1])
        defer$1(() => this[RESUME$1]());
      else
        this[RESUME$1]();
    }
    return dest;
  }
  unpipe(dest) {
    const p = this.pipes.find((p2) => p2.dest === dest);
    if (p) {
      this.pipes.splice(this.pipes.indexOf(p), 1);
      p.unpipe();
    }
  }
  addListener(ev, fn) {
    return this.on(ev, fn);
  }
  on(ev, fn) {
    const ret = super.on(ev, fn);
    if (ev === "data" && !this.pipes.length && !this.flowing)
      this[RESUME$1]();
    else if (ev === "readable" && this[BUFFERLENGTH$1] !== 0)
      super.emit("readable");
    else if (isEndish$1(ev) && this[EMITTED_END$1]) {
      super.emit(ev);
      this.removeAllListeners(ev);
    } else if (ev === "error" && this[EMITTED_ERROR$1]) {
      if (this[ASYNC$1])
        defer$1(() => fn.call(this, this[EMITTED_ERROR$1]));
      else
        fn.call(this, this[EMITTED_ERROR$1]);
    }
    return ret;
  }
  get emittedEnd() {
    return this[EMITTED_END$1];
  }
  [MAYBE_EMIT_END$1]() {
    if (!this[EMITTING_END$1] && !this[EMITTED_END$1] && !this[DESTROYED$1] && this.buffer.length === 0 && this[EOF$2]) {
      this[EMITTING_END$1] = true;
      this.emit("end");
      this.emit("prefinish");
      this.emit("finish");
      if (this[CLOSED$1])
        this.emit("close");
      this[EMITTING_END$1] = false;
    }
  }
  emit(ev, data, ...extra) {
    if (ev !== "error" && ev !== "close" && ev !== DESTROYED$1 && this[DESTROYED$1])
      return;
    else if (ev === "data") {
      return !data ? false : this[ASYNC$1] ? defer$1(() => this[EMITDATA$1](data)) : this[EMITDATA$1](data);
    } else if (ev === "end") {
      return this[EMITEND$1]();
    } else if (ev === "close") {
      this[CLOSED$1] = true;
      if (!this[EMITTED_END$1] && !this[DESTROYED$1])
        return;
      const ret2 = super.emit("close");
      this.removeAllListeners("close");
      return ret2;
    } else if (ev === "error") {
      this[EMITTED_ERROR$1] = data;
      const ret2 = super.emit("error", data);
      this[MAYBE_EMIT_END$1]();
      return ret2;
    } else if (ev === "resume") {
      const ret2 = super.emit("resume");
      this[MAYBE_EMIT_END$1]();
      return ret2;
    } else if (ev === "finish" || ev === "prefinish") {
      const ret2 = super.emit(ev);
      this.removeAllListeners(ev);
      return ret2;
    }
    const ret = super.emit(ev, data, ...extra);
    this[MAYBE_EMIT_END$1]();
    return ret;
  }
  [EMITDATA$1](data) {
    for (const p of this.pipes) {
      if (p.dest.write(data) === false)
        this.pause();
    }
    const ret = super.emit("data", data);
    this[MAYBE_EMIT_END$1]();
    return ret;
  }
  [EMITEND$1]() {
    if (this[EMITTED_END$1])
      return;
    this[EMITTED_END$1] = true;
    this.readable = false;
    if (this[ASYNC$1])
      defer$1(() => this[EMITEND2$1]());
    else
      this[EMITEND2$1]();
  }
  [EMITEND2$1]() {
    if (this[DECODER$1]) {
      const data = this[DECODER$1].end();
      if (data) {
        for (const p of this.pipes) {
          p.dest.write(data);
        }
        super.emit("data", data);
      }
    }
    for (const p of this.pipes) {
      p.end();
    }
    const ret = super.emit("end");
    this.removeAllListeners("end");
    return ret;
  }
  // const all = await stream.collect()
  collect() {
    const buf = [];
    if (!this[OBJECTMODE$1])
      buf.dataLength = 0;
    const p = this.promise();
    this.on("data", (c) => {
      buf.push(c);
      if (!this[OBJECTMODE$1])
        buf.dataLength += c.length;
    });
    return p.then(() => buf);
  }
  // const data = await stream.concat()
  concat() {
    return this[OBJECTMODE$1] ? Promise.reject(new Error("cannot concat in objectMode")) : this.collect().then((buf) => this[OBJECTMODE$1] ? Promise.reject(new Error("cannot concat in objectMode")) : this[ENCODING$1] ? buf.join("") : Buffer.concat(buf, buf.dataLength));
  }
  // stream.promise().then(() => done, er => emitted error)
  promise() {
    return new Promise((resolve2, reject) => {
      this.on(DESTROYED$1, () => reject(new Error("stream destroyed")));
      this.on("error", (er) => reject(er));
      this.on("end", () => resolve2());
    });
  }
  // for await (let chunk of stream)
  [ASYNCITERATOR$1]() {
    const next = () => {
      const res = this.read();
      if (res !== null)
        return Promise.resolve({ done: false, value: res });
      if (this[EOF$2])
        return Promise.resolve({ done: true });
      let resolve2 = null;
      let reject = null;
      const onerr = (er) => {
        this.removeListener("data", ondata);
        this.removeListener("end", onend);
        reject(er);
      };
      const ondata = (value) => {
        this.removeListener("error", onerr);
        this.removeListener("end", onend);
        this.pause();
        resolve2({ value, done: !!this[EOF$2] });
      };
      const onend = () => {
        this.removeListener("error", onerr);
        this.removeListener("data", ondata);
        resolve2({ done: true });
      };
      const ondestroy = () => onerr(new Error("stream destroyed"));
      return new Promise((res2, rej) => {
        reject = rej;
        resolve2 = res2;
        this.once(DESTROYED$1, ondestroy);
        this.once("error", onerr);
        this.once("end", onend);
        this.once("data", ondata);
      });
    };
    return { next };
  }
  // for (let chunk of stream)
  [ITERATOR$1]() {
    const next = () => {
      const value = this.read();
      const done = value === null;
      return { value, done };
    };
    return { next };
  }
  destroy(er) {
    if (this[DESTROYED$1]) {
      if (er)
        this.emit("error", er);
      else
        this.emit(DESTROYED$1);
      return this;
    }
    this[DESTROYED$1] = true;
    this.buffer.length = 0;
    this[BUFFERLENGTH$1] = 0;
    if (typeof this.close === "function" && !this[CLOSED$1])
      this.close();
    if (er)
      this.emit("error", er);
    else
      this.emit(DESTROYED$1);
    return this;
  }
  static isStream(s) {
    return !!s && (s instanceof Minipass2 || s instanceof Stream$1 || s instanceof EE$3 && (typeof s.pipe === "function" || // readable
    typeof s.write === "function" && typeof s.end === "function"));
  }
};
const assert$2 = require$$0$2;
const Buffer$1 = require$$1$1.Buffer;
const realZlib = require$$0$1;
const constants = minizlib.constants = constants$1;
const Minipass$3 = minipass$1;
const OriginalBufferConcat = Buffer$1.concat;
const _superWrite = Symbol("_superWrite");
class ZlibError extends Error {
  constructor(err) {
    super("zlib: " + err.message);
    this.code = err.code;
    this.errno = err.errno;
    if (!this.code)
      this.code = "ZLIB_ERROR";
    this.message = "zlib: " + err.message;
    Error.captureStackTrace(this, this.constructor);
  }
  get name() {
    return "ZlibError";
  }
}
const _opts = Symbol("opts");
const _flushFlag = Symbol("flushFlag");
const _finishFlushFlag = Symbol("finishFlushFlag");
const _fullFlushFlag = Symbol("fullFlushFlag");
const _handle = Symbol("handle");
const _onError = Symbol("onError");
const _sawError = Symbol("sawError");
const _level = Symbol("level");
const _strategy = Symbol("strategy");
const _ended$1 = Symbol("ended");
class ZlibBase extends Minipass$3 {
  constructor(opts, mode) {
    if (!opts || typeof opts !== "object")
      throw new TypeError("invalid options for ZlibBase constructor");
    super(opts);
    this[_sawError] = false;
    this[_ended$1] = false;
    this[_opts] = opts;
    this[_flushFlag] = opts.flush;
    this[_finishFlushFlag] = opts.finishFlush;
    try {
      this[_handle] = new realZlib[mode](opts);
    } catch (er) {
      throw new ZlibError(er);
    }
    this[_onError] = (err) => {
      if (this[_sawError])
        return;
      this[_sawError] = true;
      this.close();
      this.emit("error", err);
    };
    this[_handle].on("error", (er) => this[_onError](new ZlibError(er)));
    this.once("end", () => this.close);
  }
  close() {
    if (this[_handle]) {
      this[_handle].close();
      this[_handle] = null;
      this.emit("close");
    }
  }
  reset() {
    if (!this[_sawError]) {
      assert$2(this[_handle], "zlib binding closed");
      return this[_handle].reset();
    }
  }
  flush(flushFlag) {
    if (this.ended)
      return;
    if (typeof flushFlag !== "number")
      flushFlag = this[_fullFlushFlag];
    this.write(Object.assign(Buffer$1.alloc(0), { [_flushFlag]: flushFlag }));
  }
  end(chunk, encoding, cb) {
    if (chunk)
      this.write(chunk, encoding);
    this.flush(this[_finishFlushFlag]);
    this[_ended$1] = true;
    return super.end(null, null, cb);
  }
  get ended() {
    return this[_ended$1];
  }
  write(chunk, encoding, cb) {
    if (typeof encoding === "function")
      cb = encoding, encoding = "utf8";
    if (typeof chunk === "string")
      chunk = Buffer$1.from(chunk, encoding);
    if (this[_sawError])
      return;
    assert$2(this[_handle], "zlib binding closed");
    const nativeHandle = this[_handle]._handle;
    const originalNativeClose = nativeHandle.close;
    nativeHandle.close = () => {
    };
    const originalClose = this[_handle].close;
    this[_handle].close = () => {
    };
    Buffer$1.concat = (args) => args;
    let result;
    try {
      const flushFlag = typeof chunk[_flushFlag] === "number" ? chunk[_flushFlag] : this[_flushFlag];
      result = this[_handle]._processChunk(chunk, flushFlag);
      Buffer$1.concat = OriginalBufferConcat;
    } catch (err) {
      Buffer$1.concat = OriginalBufferConcat;
      this[_onError](new ZlibError(err));
    } finally {
      if (this[_handle]) {
        this[_handle]._handle = nativeHandle;
        nativeHandle.close = originalNativeClose;
        this[_handle].close = originalClose;
        this[_handle].removeAllListeners("error");
      }
    }
    if (this[_handle])
      this[_handle].on("error", (er) => this[_onError](new ZlibError(er)));
    let writeReturn;
    if (result) {
      if (Array.isArray(result) && result.length > 0) {
        writeReturn = this[_superWrite](Buffer$1.from(result[0]));
        for (let i = 1; i < result.length; i++) {
          writeReturn = this[_superWrite](result[i]);
        }
      } else {
        writeReturn = this[_superWrite](Buffer$1.from(result));
      }
    }
    if (cb)
      cb();
    return writeReturn;
  }
  [_superWrite](data) {
    return super.write(data);
  }
}
class Zlib extends ZlibBase {
  constructor(opts, mode) {
    opts = opts || {};
    opts.flush = opts.flush || constants.Z_NO_FLUSH;
    opts.finishFlush = opts.finishFlush || constants.Z_FINISH;
    super(opts, mode);
    this[_fullFlushFlag] = constants.Z_FULL_FLUSH;
    this[_level] = opts.level;
    this[_strategy] = opts.strategy;
  }
  params(level, strategy) {
    if (this[_sawError])
      return;
    if (!this[_handle])
      throw new Error("cannot switch params when binding is closed");
    if (!this[_handle].params)
      throw new Error("not supported in this implementation");
    if (this[_level] !== level || this[_strategy] !== strategy) {
      this.flush(constants.Z_SYNC_FLUSH);
      assert$2(this[_handle], "zlib binding closed");
      const origFlush = this[_handle].flush;
      this[_handle].flush = (flushFlag, cb) => {
        this.flush(flushFlag);
        cb();
      };
      try {
        this[_handle].params(level, strategy);
      } finally {
        this[_handle].flush = origFlush;
      }
      if (this[_handle]) {
        this[_level] = level;
        this[_strategy] = strategy;
      }
    }
  }
}
class Deflate extends Zlib {
  constructor(opts) {
    super(opts, "Deflate");
  }
}
class Inflate extends Zlib {
  constructor(opts) {
    super(opts, "Inflate");
  }
}
const _portable = Symbol("_portable");
class Gzip extends Zlib {
  constructor(opts) {
    super(opts, "Gzip");
    this[_portable] = opts && !!opts.portable;
  }
  [_superWrite](data) {
    if (!this[_portable])
      return super[_superWrite](data);
    this[_portable] = false;
    data[9] = 255;
    return super[_superWrite](data);
  }
}
class Gunzip extends Zlib {
  constructor(opts) {
    super(opts, "Gunzip");
  }
}
class DeflateRaw extends Zlib {
  constructor(opts) {
    super(opts, "DeflateRaw");
  }
}
class InflateRaw extends Zlib {
  constructor(opts) {
    super(opts, "InflateRaw");
  }
}
class Unzip extends Zlib {
  constructor(opts) {
    super(opts, "Unzip");
  }
}
class Brotli extends ZlibBase {
  constructor(opts, mode) {
    opts = opts || {};
    opts.flush = opts.flush || constants.BROTLI_OPERATION_PROCESS;
    opts.finishFlush = opts.finishFlush || constants.BROTLI_OPERATION_FINISH;
    super(opts, mode);
    this[_fullFlushFlag] = constants.BROTLI_OPERATION_FLUSH;
  }
}
class BrotliCompress extends Brotli {
  constructor(opts) {
    super(opts, "BrotliCompress");
  }
}
class BrotliDecompress extends Brotli {
  constructor(opts) {
    super(opts, "BrotliDecompress");
  }
}
minizlib.Deflate = Deflate;
minizlib.Inflate = Inflate;
minizlib.Gzip = Gzip;
minizlib.Gunzip = Gunzip;
minizlib.DeflateRaw = DeflateRaw;
minizlib.InflateRaw = InflateRaw;
minizlib.Unzip = Unzip;
if (typeof realZlib.BrotliCompress === "function") {
  minizlib.BrotliCompress = BrotliCompress;
  minizlib.BrotliDecompress = BrotliDecompress;
} else {
  minizlib.BrotliCompress = minizlib.BrotliDecompress = class {
    constructor() {
      throw new Error("Brotli is not supported in this version of Node.js");
    }
  };
}
const platform$4 = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
var normalizeWindowsPath = platform$4 !== "win32" ? (p) => p : (p) => p && p.replace(/\\/g, "/");
const { Minipass: Minipass$2 } = minipass$2;
const normPath$4 = normalizeWindowsPath;
const SLURP$1 = Symbol("slurp");
var readEntry = class ReadEntry extends Minipass$2 {
  constructor(header2, ex, gex) {
    super();
    this.pause();
    this.extended = ex;
    this.globalExtended = gex;
    this.header = header2;
    this.startBlockSize = 512 * Math.ceil(header2.size / 512);
    this.blockRemain = this.startBlockSize;
    this.remain = header2.size;
    this.type = header2.type;
    this.meta = false;
    this.ignore = false;
    switch (this.type) {
      case "File":
      case "OldFile":
      case "Link":
      case "SymbolicLink":
      case "CharacterDevice":
      case "BlockDevice":
      case "Directory":
      case "FIFO":
      case "ContiguousFile":
      case "GNUDumpDir":
        break;
      case "NextFileHasLongLinkpath":
      case "NextFileHasLongPath":
      case "OldGnuLongPath":
      case "GlobalExtendedHeader":
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this.meta = true;
        break;
      default:
        this.ignore = true;
    }
    this.path = normPath$4(header2.path);
    this.mode = header2.mode;
    if (this.mode) {
      this.mode = this.mode & 4095;
    }
    this.uid = header2.uid;
    this.gid = header2.gid;
    this.uname = header2.uname;
    this.gname = header2.gname;
    this.size = header2.size;
    this.mtime = header2.mtime;
    this.atime = header2.atime;
    this.ctime = header2.ctime;
    this.linkpath = normPath$4(header2.linkpath);
    this.uname = header2.uname;
    this.gname = header2.gname;
    if (ex) {
      this[SLURP$1](ex);
    }
    if (gex) {
      this[SLURP$1](gex, true);
    }
  }
  write(data) {
    const writeLen = data.length;
    if (writeLen > this.blockRemain) {
      throw new Error("writing more to entry than is appropriate");
    }
    const r = this.remain;
    const br = this.blockRemain;
    this.remain = Math.max(0, r - writeLen);
    this.blockRemain = Math.max(0, br - writeLen);
    if (this.ignore) {
      return true;
    }
    if (r >= writeLen) {
      return super.write(data);
    }
    return super.write(data.slice(0, r));
  }
  [SLURP$1](ex, global2) {
    for (const k in ex) {
      if (ex[k] !== null && ex[k] !== void 0 && !(global2 && k === "path")) {
        this[k] = k === "path" || k === "linkpath" ? normPath$4(ex[k]) : ex[k];
      }
    }
  }
};
var types$1 = {};
(function(exports$1) {
  exports$1.name = /* @__PURE__ */ new Map([
    ["0", "File"],
    // same as File
    ["", "OldFile"],
    ["1", "Link"],
    ["2", "SymbolicLink"],
    // Devices and FIFOs aren't fully supported
    // they are parsed, but skipped when unpacking
    ["3", "CharacterDevice"],
    ["4", "BlockDevice"],
    ["5", "Directory"],
    ["6", "FIFO"],
    // same as File
    ["7", "ContiguousFile"],
    // pax headers
    ["g", "GlobalExtendedHeader"],
    ["x", "ExtendedHeader"],
    // vendor-specific stuff
    // skip
    ["A", "SolarisACL"],
    // like 5, but with data, which should be skipped
    ["D", "GNUDumpDir"],
    // metadata only, skip
    ["I", "Inode"],
    // data = link path of next file
    ["K", "NextFileHasLongLinkpath"],
    // data = path of next file
    ["L", "NextFileHasLongPath"],
    // skip
    ["M", "ContinuationFile"],
    // like L
    ["N", "OldGnuLongPath"],
    // skip
    ["S", "SparseFile"],
    // skip
    ["V", "TapeVolumeHeader"],
    // like x
    ["X", "OldExtendedHeader"]
  ]);
  exports$1.code = new Map(Array.from(exports$1.name).map((kv) => [kv[1], kv[0]]));
})(types$1);
const encode = (num, buf) => {
  if (!Number.isSafeInteger(num)) {
    throw Error("cannot encode number outside of javascript safe integer range");
  } else if (num < 0) {
    encodeNegative(num, buf);
  } else {
    encodePositive(num, buf);
  }
  return buf;
};
const encodePositive = (num, buf) => {
  buf[0] = 128;
  for (var i = buf.length; i > 1; i--) {
    buf[i - 1] = num & 255;
    num = Math.floor(num / 256);
  }
};
const encodeNegative = (num, buf) => {
  buf[0] = 255;
  var flipped = false;
  num = num * -1;
  for (var i = buf.length; i > 1; i--) {
    var byte = num & 255;
    num = Math.floor(num / 256);
    if (flipped) {
      buf[i - 1] = onesComp(byte);
    } else if (byte === 0) {
      buf[i - 1] = 0;
    } else {
      flipped = true;
      buf[i - 1] = twosComp(byte);
    }
  }
};
const parse$3 = (buf) => {
  const pre = buf[0];
  const value = pre === 128 ? pos(buf.slice(1, buf.length)) : pre === 255 ? twos(buf) : null;
  if (value === null) {
    throw Error("invalid base256 encoding");
  }
  if (!Number.isSafeInteger(value)) {
    throw Error("parsed number outside of javascript safe integer range");
  }
  return value;
};
const twos = (buf) => {
  var len = buf.length;
  var sum = 0;
  var flipped = false;
  for (var i = len - 1; i > -1; i--) {
    var byte = buf[i];
    var f;
    if (flipped) {
      f = onesComp(byte);
    } else if (byte === 0) {
      f = byte;
    } else {
      flipped = true;
      f = twosComp(byte);
    }
    if (f !== 0) {
      sum -= f * Math.pow(256, len - i - 1);
    }
  }
  return sum;
};
const pos = (buf) => {
  var len = buf.length;
  var sum = 0;
  for (var i = len - 1; i > -1; i--) {
    var byte = buf[i];
    if (byte !== 0) {
      sum += byte * Math.pow(256, len - i - 1);
    }
  }
  return sum;
};
const onesComp = (byte) => (255 ^ byte) & 255;
const twosComp = (byte) => (255 ^ byte) + 1 & 255;
var largeNumbers = {
  encode,
  parse: parse$3
};
const types = types$1;
const pathModule = path$7.posix;
const large = largeNumbers;
const SLURP = Symbol("slurp");
const TYPE = Symbol("type");
let Header$3 = class Header {
  constructor(data, off, ex, gex) {
    this.cksumValid = false;
    this.needPax = false;
    this.nullBlock = false;
    this.block = null;
    this.path = null;
    this.mode = null;
    this.uid = null;
    this.gid = null;
    this.size = null;
    this.mtime = null;
    this.cksum = null;
    this[TYPE] = "0";
    this.linkpath = null;
    this.uname = null;
    this.gname = null;
    this.devmaj = 0;
    this.devmin = 0;
    this.atime = null;
    this.ctime = null;
    if (Buffer.isBuffer(data)) {
      this.decode(data, off || 0, ex, gex);
    } else if (data) {
      this.set(data);
    }
  }
  decode(buf, off, ex, gex) {
    if (!off) {
      off = 0;
    }
    if (!buf || !(buf.length >= off + 512)) {
      throw new Error("need 512 bytes for header");
    }
    this.path = decString(buf, off, 100);
    this.mode = decNumber(buf, off + 100, 8);
    this.uid = decNumber(buf, off + 108, 8);
    this.gid = decNumber(buf, off + 116, 8);
    this.size = decNumber(buf, off + 124, 12);
    this.mtime = decDate(buf, off + 136, 12);
    this.cksum = decNumber(buf, off + 148, 12);
    this[SLURP](ex);
    this[SLURP](gex, true);
    this[TYPE] = decString(buf, off + 156, 1);
    if (this[TYPE] === "") {
      this[TYPE] = "0";
    }
    if (this[TYPE] === "0" && this.path.slice(-1) === "/") {
      this[TYPE] = "5";
    }
    if (this[TYPE] === "5") {
      this.size = 0;
    }
    this.linkpath = decString(buf, off + 157, 100);
    if (buf.slice(off + 257, off + 265).toString() === "ustar\x0000") {
      this.uname = decString(buf, off + 265, 32);
      this.gname = decString(buf, off + 297, 32);
      this.devmaj = decNumber(buf, off + 329, 8);
      this.devmin = decNumber(buf, off + 337, 8);
      if (buf[off + 475] !== 0) {
        const prefix = decString(buf, off + 345, 155);
        this.path = prefix + "/" + this.path;
      } else {
        const prefix = decString(buf, off + 345, 130);
        if (prefix) {
          this.path = prefix + "/" + this.path;
        }
        this.atime = decDate(buf, off + 476, 12);
        this.ctime = decDate(buf, off + 488, 12);
      }
    }
    let sum = 8 * 32;
    for (let i = off; i < off + 148; i++) {
      sum += buf[i];
    }
    for (let i = off + 156; i < off + 512; i++) {
      sum += buf[i];
    }
    this.cksumValid = sum === this.cksum;
    if (this.cksum === null && sum === 8 * 32) {
      this.nullBlock = true;
    }
  }
  [SLURP](ex, global2) {
    for (const k in ex) {
      if (ex[k] !== null && ex[k] !== void 0 && !(global2 && k === "path")) {
        this[k] = ex[k];
      }
    }
  }
  encode(buf, off) {
    if (!buf) {
      buf = this.block = Buffer.alloc(512);
      off = 0;
    }
    if (!off) {
      off = 0;
    }
    if (!(buf.length >= off + 512)) {
      throw new Error("need 512 bytes for header");
    }
    const prefixSize = this.ctime || this.atime ? 130 : 155;
    const split = splitPrefix(this.path || "", prefixSize);
    const path2 = split[0];
    const prefix = split[1];
    this.needPax = split[2];
    this.needPax = encString(buf, off, 100, path2) || this.needPax;
    this.needPax = encNumber(buf, off + 100, 8, this.mode) || this.needPax;
    this.needPax = encNumber(buf, off + 108, 8, this.uid) || this.needPax;
    this.needPax = encNumber(buf, off + 116, 8, this.gid) || this.needPax;
    this.needPax = encNumber(buf, off + 124, 12, this.size) || this.needPax;
    this.needPax = encDate(buf, off + 136, 12, this.mtime) || this.needPax;
    buf[off + 156] = this[TYPE].charCodeAt(0);
    this.needPax = encString(buf, off + 157, 100, this.linkpath) || this.needPax;
    buf.write("ustar\x0000", off + 257, 8);
    this.needPax = encString(buf, off + 265, 32, this.uname) || this.needPax;
    this.needPax = encString(buf, off + 297, 32, this.gname) || this.needPax;
    this.needPax = encNumber(buf, off + 329, 8, this.devmaj) || this.needPax;
    this.needPax = encNumber(buf, off + 337, 8, this.devmin) || this.needPax;
    this.needPax = encString(buf, off + 345, prefixSize, prefix) || this.needPax;
    if (buf[off + 475] !== 0) {
      this.needPax = encString(buf, off + 345, 155, prefix) || this.needPax;
    } else {
      this.needPax = encString(buf, off + 345, 130, prefix) || this.needPax;
      this.needPax = encDate(buf, off + 476, 12, this.atime) || this.needPax;
      this.needPax = encDate(buf, off + 488, 12, this.ctime) || this.needPax;
    }
    let sum = 8 * 32;
    for (let i = off; i < off + 148; i++) {
      sum += buf[i];
    }
    for (let i = off + 156; i < off + 512; i++) {
      sum += buf[i];
    }
    this.cksum = sum;
    encNumber(buf, off + 148, 8, this.cksum);
    this.cksumValid = true;
    return this.needPax;
  }
  set(data) {
    for (const i in data) {
      if (data[i] !== null && data[i] !== void 0) {
        this[i] = data[i];
      }
    }
  }
  get type() {
    return types.name.get(this[TYPE]) || this[TYPE];
  }
  get typeKey() {
    return this[TYPE];
  }
  set type(type) {
    if (types.code.has(type)) {
      this[TYPE] = types.code.get(type);
    } else {
      this[TYPE] = type;
    }
  }
};
const splitPrefix = (p, prefixSize) => {
  const pathSize = 100;
  let pp = p;
  let prefix = "";
  let ret;
  const root = pathModule.parse(p).root || ".";
  if (Buffer.byteLength(pp) < pathSize) {
    ret = [pp, prefix, false];
  } else {
    prefix = pathModule.dirname(pp);
    pp = pathModule.basename(pp);
    do {
      if (Buffer.byteLength(pp) <= pathSize && Buffer.byteLength(prefix) <= prefixSize) {
        ret = [pp, prefix, false];
      } else if (Buffer.byteLength(pp) > pathSize && Buffer.byteLength(prefix) <= prefixSize) {
        ret = [pp.slice(0, pathSize - 1), prefix, true];
      } else {
        pp = pathModule.join(pathModule.basename(prefix), pp);
        prefix = pathModule.dirname(prefix);
      }
    } while (prefix !== root && !ret);
    if (!ret) {
      ret = [p.slice(0, pathSize - 1), "", true];
    }
  }
  return ret;
};
const decString = (buf, off, size) => buf.slice(off, off + size).toString("utf8").replace(/\0.*/, "");
const decDate = (buf, off, size) => numToDate(decNumber(buf, off, size));
const numToDate = (num) => num === null ? null : new Date(num * 1e3);
const decNumber = (buf, off, size) => buf[off] & 128 ? large.parse(buf.slice(off, off + size)) : decSmallNumber(buf, off, size);
const nanNull = (value) => isNaN(value) ? null : value;
const decSmallNumber = (buf, off, size) => nanNull(parseInt(
  buf.slice(off, off + size).toString("utf8").replace(/\0.*$/, "").trim(),
  8
));
const MAXNUM = {
  12: 8589934591,
  8: 2097151
};
const encNumber = (buf, off, size, number) => number === null ? false : number > MAXNUM[size] || number < 0 ? (large.encode(number, buf.slice(off, off + size)), true) : (encSmallNumber(buf, off, size, number), false);
const encSmallNumber = (buf, off, size, number) => buf.write(octalString(number, size), off, size, "ascii");
const octalString = (number, size) => padOctal(Math.floor(number).toString(8), size);
const padOctal = (string, size) => (string.length === size - 1 ? string : new Array(size - string.length - 1).join("0") + string + " ") + "\0";
const encDate = (buf, off, size, date) => date === null ? false : encNumber(buf, off, size, date.getTime() / 1e3);
const NULLS = new Array(156).join("\0");
const encString = (buf, off, size, string) => string === null ? false : (buf.write(string + NULLS, off, size, "utf8"), string.length !== Buffer.byteLength(string) || string.length > size);
var header = Header$3;
const Header$2 = header;
const path$6 = path$7;
let Pax$2 = class Pax {
  constructor(obj, global2) {
    this.atime = obj.atime || null;
    this.charset = obj.charset || null;
    this.comment = obj.comment || null;
    this.ctime = obj.ctime || null;
    this.gid = obj.gid || null;
    this.gname = obj.gname || null;
    this.linkpath = obj.linkpath || null;
    this.mtime = obj.mtime || null;
    this.path = obj.path || null;
    this.size = obj.size || null;
    this.uid = obj.uid || null;
    this.uname = obj.uname || null;
    this.dev = obj.dev || null;
    this.ino = obj.ino || null;
    this.nlink = obj.nlink || null;
    this.global = global2 || false;
  }
  encode() {
    const body = this.encodeBody();
    if (body === "") {
      return null;
    }
    const bodyLen = Buffer.byteLength(body);
    const bufLen = 512 * Math.ceil(1 + bodyLen / 512);
    const buf = Buffer.allocUnsafe(bufLen);
    for (let i = 0; i < 512; i++) {
      buf[i] = 0;
    }
    new Header$2({
      // XXX split the path
      // then the path should be PaxHeader + basename, but less than 99,
      // prepend with the dirname
      path: ("PaxHeader/" + path$6.basename(this.path)).slice(0, 99),
      mode: this.mode || 420,
      uid: this.uid || null,
      gid: this.gid || null,
      size: bodyLen,
      mtime: this.mtime || null,
      type: this.global ? "GlobalExtendedHeader" : "ExtendedHeader",
      linkpath: "",
      uname: this.uname || "",
      gname: this.gname || "",
      devmaj: 0,
      devmin: 0,
      atime: this.atime || null,
      ctime: this.ctime || null
    }).encode(buf);
    buf.write(body, 512, bodyLen, "utf8");
    for (let i = bodyLen + 512; i < buf.length; i++) {
      buf[i] = 0;
    }
    return buf;
  }
  encodeBody() {
    return this.encodeField("path") + this.encodeField("ctime") + this.encodeField("atime") + this.encodeField("dev") + this.encodeField("ino") + this.encodeField("nlink") + this.encodeField("charset") + this.encodeField("comment") + this.encodeField("gid") + this.encodeField("gname") + this.encodeField("linkpath") + this.encodeField("mtime") + this.encodeField("size") + this.encodeField("uid") + this.encodeField("uname");
  }
  encodeField(field) {
    if (this[field] === null || this[field] === void 0) {
      return "";
    }
    const v = this[field] instanceof Date ? this[field].getTime() / 1e3 : this[field];
    const s = " " + (field === "dev" || field === "ino" || field === "nlink" ? "SCHILY." : "") + field + "=" + v + "\n";
    const byteLen = Buffer.byteLength(s);
    let digits = Math.floor(Math.log(byteLen) / Math.log(10)) + 1;
    if (byteLen + digits >= Math.pow(10, digits)) {
      digits += 1;
    }
    const len = digits + byteLen;
    return len + s;
  }
};
Pax$2.parse = (string, ex, g) => new Pax$2(merge(parseKV(string), ex), g);
const merge = (a, b) => b ? Object.keys(a).reduce((s, k) => (s[k] = a[k], s), b) : a;
const parseKV = (string) => string.replace(/\n$/, "").split("\n").reduce(parseKVLine, /* @__PURE__ */ Object.create(null));
const parseKVLine = (set, line) => {
  const n = parseInt(line, 10);
  if (n !== Buffer.byteLength(line) + 1) {
    return set;
  }
  line = line.slice((n + " ").length);
  const kv = line.split("=");
  const k = kv.shift().replace(/^SCHILY\.(dev|ino|nlink)/, "$1");
  if (!k) {
    return set;
  }
  const v = kv.join("=");
  set[k] = /^([A-Z]+\.)?([mac]|birth|creation)time$/.test(k) ? new Date(v * 1e3) : /^[0-9]+$/.test(v) ? +v : v;
  return set;
};
var pax = Pax$2;
var stripTrailingSlashes = (str) => {
  let i = str.length - 1;
  let slashesStart = -1;
  while (i > -1 && str.charAt(i) === "/") {
    slashesStart = i;
    i--;
  }
  return slashesStart === -1 ? str : str.slice(0, slashesStart);
};
var warnMixin = (Base) => class extends Base {
  warn(code, message, data = {}) {
    if (this.file) {
      data.file = this.file;
    }
    if (this.cwd) {
      data.cwd = this.cwd;
    }
    data.code = message instanceof Error && message.code || code;
    data.tarCode = code;
    if (!this.strict && data.recoverable !== false) {
      if (message instanceof Error) {
        data = Object.assign(message, data);
        message = message.message;
      }
      this.emit("warn", data.tarCode, message, data);
    } else if (message instanceof Error) {
      this.emit("error", Object.assign(message, data));
    } else {
      this.emit("error", Object.assign(new Error(`${code}: ${message}`), data));
    }
  }
};
const raw = [
  "|",
  "<",
  ">",
  "?",
  ":"
];
const win = raw.map((char) => String.fromCharCode(61440 + char.charCodeAt(0)));
const toWin = new Map(raw.map((char, i) => [char, win[i]]));
const toRaw = new Map(win.map((char, i) => [char, raw[i]]));
var winchars$1 = {
  encode: (s) => raw.reduce((s2, c) => s2.split(c).join(toWin.get(c)), s),
  decode: (s) => win.reduce((s2, c) => s2.split(c).join(toRaw.get(c)), s)
};
const { isAbsolute, parse: parse$2 } = path$7.win32;
var stripAbsolutePath$2 = (path2) => {
  let r = "";
  let parsed = parse$2(path2);
  while (isAbsolute(path2) || parsed.root) {
    const root = path2.charAt(0) === "/" && path2.slice(0, 4) !== "//?/" ? "/" : parsed.root;
    path2 = path2.slice(root.length);
    r += root;
    parsed = parse$2(path2);
  }
  return [r, path2];
};
var modeFix$1;
var hasRequiredModeFix;
function requireModeFix() {
  if (hasRequiredModeFix) return modeFix$1;
  hasRequiredModeFix = 1;
  modeFix$1 = (mode, isDir, portable) => {
    mode &= 4095;
    if (portable) {
      mode = (mode | 384) & -19;
    }
    if (isDir) {
      if (mode & 256) {
        mode |= 64;
      }
      if (mode & 32) {
        mode |= 8;
      }
      if (mode & 4) {
        mode |= 1;
      }
    }
    return mode;
  };
  return modeFix$1;
}
const { Minipass: Minipass$1 } = minipass$2;
const Pax$1 = pax;
const Header$1 = header;
const fs$9 = fs$a;
const path$5 = path$7;
const normPath$3 = normalizeWindowsPath;
const stripSlash$2 = stripTrailingSlashes;
const prefixPath = (path2, prefix) => {
  if (!prefix) {
    return normPath$3(path2);
  }
  path2 = normPath$3(path2).replace(/^\.(\/|$)/, "");
  return stripSlash$2(prefix) + "/" + path2;
};
const maxReadSize = 16 * 1024 * 1024;
const PROCESS$1 = Symbol("process");
const FILE$1 = Symbol("file");
const DIRECTORY$1 = Symbol("directory");
const SYMLINK$1 = Symbol("symlink");
const HARDLINK$1 = Symbol("hardlink");
const HEADER = Symbol("header");
const READ$1 = Symbol("read");
const LSTAT = Symbol("lstat");
const ONLSTAT = Symbol("onlstat");
const ONREAD = Symbol("onread");
const ONREADLINK = Symbol("onreadlink");
const OPENFILE = Symbol("openfile");
const ONOPENFILE = Symbol("onopenfile");
const CLOSE = Symbol("close");
const MODE = Symbol("mode");
const AWAITDRAIN = Symbol("awaitDrain");
const ONDRAIN$1 = Symbol("ondrain");
const PREFIX = Symbol("prefix");
const HAD_ERROR = Symbol("hadError");
const warner$2 = warnMixin;
const winchars = winchars$1;
const stripAbsolutePath$1 = stripAbsolutePath$2;
const modeFix = requireModeFix();
const WriteEntry$1 = warner$2(class WriteEntry2 extends Minipass$1 {
  constructor(p, opt) {
    opt = opt || {};
    super(opt);
    if (typeof p !== "string") {
      throw new TypeError("path is required");
    }
    this.path = normPath$3(p);
    this.portable = !!opt.portable;
    this.myuid = process.getuid && process.getuid() || 0;
    this.myuser = process.env.USER || "";
    this.maxReadSize = opt.maxReadSize || maxReadSize;
    this.linkCache = opt.linkCache || /* @__PURE__ */ new Map();
    this.statCache = opt.statCache || /* @__PURE__ */ new Map();
    this.preservePaths = !!opt.preservePaths;
    this.cwd = normPath$3(opt.cwd || process.cwd());
    this.strict = !!opt.strict;
    this.noPax = !!opt.noPax;
    this.noMtime = !!opt.noMtime;
    this.mtime = opt.mtime || null;
    this.prefix = opt.prefix ? normPath$3(opt.prefix) : null;
    this.fd = null;
    this.blockLen = null;
    this.blockRemain = null;
    this.buf = null;
    this.offset = null;
    this.length = null;
    this.pos = null;
    this.remain = null;
    if (typeof opt.onwarn === "function") {
      this.on("warn", opt.onwarn);
    }
    let pathWarn = false;
    if (!this.preservePaths) {
      const [root, stripped] = stripAbsolutePath$1(this.path);
      if (root) {
        this.path = stripped;
        pathWarn = root;
      }
    }
    this.win32 = !!opt.win32 || process.platform === "win32";
    if (this.win32) {
      this.path = winchars.decode(this.path.replace(/\\/g, "/"));
      p = p.replace(/\\/g, "/");
    }
    this.absolute = normPath$3(opt.absolute || path$5.resolve(this.cwd, p));
    if (this.path === "") {
      this.path = "./";
    }
    if (pathWarn) {
      this.warn("TAR_ENTRY_INFO", `stripping ${pathWarn} from absolute path`, {
        entry: this,
        path: pathWarn + this.path
      });
    }
    if (this.statCache.has(this.absolute)) {
      this[ONLSTAT](this.statCache.get(this.absolute));
    } else {
      this[LSTAT]();
    }
  }
  emit(ev, ...data) {
    if (ev === "error") {
      this[HAD_ERROR] = true;
    }
    return super.emit(ev, ...data);
  }
  [LSTAT]() {
    fs$9.lstat(this.absolute, (er, stat) => {
      if (er) {
        return this.emit("error", er);
      }
      this[ONLSTAT](stat);
    });
  }
  [ONLSTAT](stat) {
    this.statCache.set(this.absolute, stat);
    this.stat = stat;
    if (!stat.isFile()) {
      stat.size = 0;
    }
    this.type = getType(stat);
    this.emit("stat", stat);
    this[PROCESS$1]();
  }
  [PROCESS$1]() {
    switch (this.type) {
      case "File":
        return this[FILE$1]();
      case "Directory":
        return this[DIRECTORY$1]();
      case "SymbolicLink":
        return this[SYMLINK$1]();
      default:
        return this.end();
    }
  }
  [MODE](mode) {
    return modeFix(mode, this.type === "Directory", this.portable);
  }
  [PREFIX](path2) {
    return prefixPath(path2, this.prefix);
  }
  [HEADER]() {
    if (this.type === "Directory" && this.portable) {
      this.noMtime = true;
    }
    this.header = new Header$1({
      path: this[PREFIX](this.path),
      // only apply the prefix to hard links.
      linkpath: this.type === "Link" ? this[PREFIX](this.linkpath) : this.linkpath,
      // only the permissions and setuid/setgid/sticky bitflags
      // not the higher-order bits that specify file type
      mode: this[MODE](this.stat.mode),
      uid: this.portable ? null : this.stat.uid,
      gid: this.portable ? null : this.stat.gid,
      size: this.stat.size,
      mtime: this.noMtime ? null : this.mtime || this.stat.mtime,
      type: this.type,
      uname: this.portable ? null : this.stat.uid === this.myuid ? this.myuser : "",
      atime: this.portable ? null : this.stat.atime,
      ctime: this.portable ? null : this.stat.ctime
    });
    if (this.header.encode() && !this.noPax) {
      super.write(new Pax$1({
        atime: this.portable ? null : this.header.atime,
        ctime: this.portable ? null : this.header.ctime,
        gid: this.portable ? null : this.header.gid,
        mtime: this.noMtime ? null : this.mtime || this.header.mtime,
        path: this[PREFIX](this.path),
        linkpath: this.type === "Link" ? this[PREFIX](this.linkpath) : this.linkpath,
        size: this.header.size,
        uid: this.portable ? null : this.header.uid,
        uname: this.portable ? null : this.header.uname,
        dev: this.portable ? null : this.stat.dev,
        ino: this.portable ? null : this.stat.ino,
        nlink: this.portable ? null : this.stat.nlink
      }).encode());
    }
    super.write(this.header.block);
  }
  [DIRECTORY$1]() {
    if (this.path.slice(-1) !== "/") {
      this.path += "/";
    }
    this.stat.size = 0;
    this[HEADER]();
    this.end();
  }
  [SYMLINK$1]() {
    fs$9.readlink(this.absolute, (er, linkpath) => {
      if (er) {
        return this.emit("error", er);
      }
      this[ONREADLINK](linkpath);
    });
  }
  [ONREADLINK](linkpath) {
    this.linkpath = normPath$3(linkpath);
    this[HEADER]();
    this.end();
  }
  [HARDLINK$1](linkpath) {
    this.type = "Link";
    this.linkpath = normPath$3(path$5.relative(this.cwd, linkpath));
    this.stat.size = 0;
    this[HEADER]();
    this.end();
  }
  [FILE$1]() {
    if (this.stat.nlink > 1) {
      const linkKey = this.stat.dev + ":" + this.stat.ino;
      if (this.linkCache.has(linkKey)) {
        const linkpath = this.linkCache.get(linkKey);
        if (linkpath.indexOf(this.cwd) === 0) {
          return this[HARDLINK$1](linkpath);
        }
      }
      this.linkCache.set(linkKey, this.absolute);
    }
    this[HEADER]();
    if (this.stat.size === 0) {
      return this.end();
    }
    this[OPENFILE]();
  }
  [OPENFILE]() {
    fs$9.open(this.absolute, "r", (er, fd) => {
      if (er) {
        return this.emit("error", er);
      }
      this[ONOPENFILE](fd);
    });
  }
  [ONOPENFILE](fd) {
    this.fd = fd;
    if (this[HAD_ERROR]) {
      return this[CLOSE]();
    }
    this.blockLen = 512 * Math.ceil(this.stat.size / 512);
    this.blockRemain = this.blockLen;
    const bufLen = Math.min(this.blockLen, this.maxReadSize);
    this.buf = Buffer.allocUnsafe(bufLen);
    this.offset = 0;
    this.pos = 0;
    this.remain = this.stat.size;
    this.length = this.buf.length;
    this[READ$1]();
  }
  [READ$1]() {
    const { fd, buf, offset, length, pos: pos2 } = this;
    fs$9.read(fd, buf, offset, length, pos2, (er, bytesRead) => {
      if (er) {
        return this[CLOSE](() => this.emit("error", er));
      }
      this[ONREAD](bytesRead);
    });
  }
  [CLOSE](cb) {
    fs$9.close(this.fd, cb);
  }
  [ONREAD](bytesRead) {
    if (bytesRead <= 0 && this.remain > 0) {
      const er = new Error("encountered unexpected EOF");
      er.path = this.absolute;
      er.syscall = "read";
      er.code = "EOF";
      return this[CLOSE](() => this.emit("error", er));
    }
    if (bytesRead > this.remain) {
      const er = new Error("did not encounter expected EOF");
      er.path = this.absolute;
      er.syscall = "read";
      er.code = "EOF";
      return this[CLOSE](() => this.emit("error", er));
    }
    if (bytesRead === this.remain) {
      for (let i = bytesRead; i < this.length && bytesRead < this.blockRemain; i++) {
        this.buf[i + this.offset] = 0;
        bytesRead++;
        this.remain++;
      }
    }
    const writeBuf = this.offset === 0 && bytesRead === this.buf.length ? this.buf : this.buf.slice(this.offset, this.offset + bytesRead);
    const flushed = this.write(writeBuf);
    if (!flushed) {
      this[AWAITDRAIN](() => this[ONDRAIN$1]());
    } else {
      this[ONDRAIN$1]();
    }
  }
  [AWAITDRAIN](cb) {
    this.once("drain", cb);
  }
  write(writeBuf) {
    if (this.blockRemain < writeBuf.length) {
      const er = new Error("writing more data than expected");
      er.path = this.absolute;
      return this.emit("error", er);
    }
    this.remain -= writeBuf.length;
    this.blockRemain -= writeBuf.length;
    this.pos += writeBuf.length;
    this.offset += writeBuf.length;
    return super.write(writeBuf);
  }
  [ONDRAIN$1]() {
    if (!this.remain) {
      if (this.blockRemain) {
        super.write(Buffer.alloc(this.blockRemain));
      }
      return this[CLOSE]((er) => er ? this.emit("error", er) : this.end());
    }
    if (this.offset >= this.length) {
      this.buf = Buffer.allocUnsafe(Math.min(this.blockRemain, this.buf.length));
      this.offset = 0;
    }
    this.length = this.buf.length - this.offset;
    this[READ$1]();
  }
});
let WriteEntrySync$1 = class WriteEntrySync extends WriteEntry$1 {
  [LSTAT]() {
    this[ONLSTAT](fs$9.lstatSync(this.absolute));
  }
  [SYMLINK$1]() {
    this[ONREADLINK](fs$9.readlinkSync(this.absolute));
  }
  [OPENFILE]() {
    this[ONOPENFILE](fs$9.openSync(this.absolute, "r"));
  }
  [READ$1]() {
    let threw = true;
    try {
      const { fd, buf, offset, length, pos: pos2 } = this;
      const bytesRead = fs$9.readSync(fd, buf, offset, length, pos2);
      this[ONREAD](bytesRead);
      threw = false;
    } finally {
      if (threw) {
        try {
          this[CLOSE](() => {
          });
        } catch (er) {
        }
      }
    }
  }
  [AWAITDRAIN](cb) {
    cb();
  }
  [CLOSE](cb) {
    fs$9.closeSync(this.fd);
    cb();
  }
};
const WriteEntryTar$1 = warner$2(class WriteEntryTar2 extends Minipass$1 {
  constructor(readEntry2, opt) {
    opt = opt || {};
    super(opt);
    this.preservePaths = !!opt.preservePaths;
    this.portable = !!opt.portable;
    this.strict = !!opt.strict;
    this.noPax = !!opt.noPax;
    this.noMtime = !!opt.noMtime;
    this.readEntry = readEntry2;
    this.type = readEntry2.type;
    if (this.type === "Directory" && this.portable) {
      this.noMtime = true;
    }
    this.prefix = opt.prefix || null;
    this.path = normPath$3(readEntry2.path);
    this.mode = this[MODE](readEntry2.mode);
    this.uid = this.portable ? null : readEntry2.uid;
    this.gid = this.portable ? null : readEntry2.gid;
    this.uname = this.portable ? null : readEntry2.uname;
    this.gname = this.portable ? null : readEntry2.gname;
    this.size = readEntry2.size;
    this.mtime = this.noMtime ? null : opt.mtime || readEntry2.mtime;
    this.atime = this.portable ? null : readEntry2.atime;
    this.ctime = this.portable ? null : readEntry2.ctime;
    this.linkpath = normPath$3(readEntry2.linkpath);
    if (typeof opt.onwarn === "function") {
      this.on("warn", opt.onwarn);
    }
    let pathWarn = false;
    if (!this.preservePaths) {
      const [root, stripped] = stripAbsolutePath$1(this.path);
      if (root) {
        this.path = stripped;
        pathWarn = root;
      }
    }
    this.remain = readEntry2.size;
    this.blockRemain = readEntry2.startBlockSize;
    this.header = new Header$1({
      path: this[PREFIX](this.path),
      linkpath: this.type === "Link" ? this[PREFIX](this.linkpath) : this.linkpath,
      // only the permissions and setuid/setgid/sticky bitflags
      // not the higher-order bits that specify file type
      mode: this.mode,
      uid: this.portable ? null : this.uid,
      gid: this.portable ? null : this.gid,
      size: this.size,
      mtime: this.noMtime ? null : this.mtime,
      type: this.type,
      uname: this.portable ? null : this.uname,
      atime: this.portable ? null : this.atime,
      ctime: this.portable ? null : this.ctime
    });
    if (pathWarn) {
      this.warn("TAR_ENTRY_INFO", `stripping ${pathWarn} from absolute path`, {
        entry: this,
        path: pathWarn + this.path
      });
    }
    if (this.header.encode() && !this.noPax) {
      super.write(new Pax$1({
        atime: this.portable ? null : this.atime,
        ctime: this.portable ? null : this.ctime,
        gid: this.portable ? null : this.gid,
        mtime: this.noMtime ? null : this.mtime,
        path: this[PREFIX](this.path),
        linkpath: this.type === "Link" ? this[PREFIX](this.linkpath) : this.linkpath,
        size: this.size,
        uid: this.portable ? null : this.uid,
        uname: this.portable ? null : this.uname,
        dev: this.portable ? null : this.readEntry.dev,
        ino: this.portable ? null : this.readEntry.ino,
        nlink: this.portable ? null : this.readEntry.nlink
      }).encode());
    }
    super.write(this.header.block);
    readEntry2.pipe(this);
  }
  [PREFIX](path2) {
    return prefixPath(path2, this.prefix);
  }
  [MODE](mode) {
    return modeFix(mode, this.type === "Directory", this.portable);
  }
  write(data) {
    const writeLen = data.length;
    if (writeLen > this.blockRemain) {
      throw new Error("writing more to entry than is appropriate");
    }
    this.blockRemain -= writeLen;
    return super.write(data);
  }
  end() {
    if (this.blockRemain) {
      super.write(Buffer.alloc(this.blockRemain));
    }
    return super.end();
  }
});
WriteEntry$1.Sync = WriteEntrySync$1;
WriteEntry$1.Tar = WriteEntryTar$1;
const getType = (stat) => stat.isFile() ? "File" : stat.isDirectory() ? "Directory" : stat.isSymbolicLink() ? "SymbolicLink" : "Unsupported";
var writeEntry = WriteEntry$1;
var iterator;
var hasRequiredIterator;
function requireIterator() {
  if (hasRequiredIterator) return iterator;
  hasRequiredIterator = 1;
  iterator = function(Yallist2) {
    Yallist2.prototype[Symbol.iterator] = function* () {
      for (let walker = this.head; walker; walker = walker.next) {
        yield walker.value;
      }
    };
  };
  return iterator;
}
var yallist = Yallist$2;
Yallist$2.Node = Node;
Yallist$2.create = Yallist$2;
function Yallist$2(list) {
  var self2 = this;
  if (!(self2 instanceof Yallist$2)) {
    self2 = new Yallist$2();
  }
  self2.tail = null;
  self2.head = null;
  self2.length = 0;
  if (list && typeof list.forEach === "function") {
    list.forEach(function(item) {
      self2.push(item);
    });
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self2.push(arguments[i]);
    }
  }
  return self2;
}
Yallist$2.prototype.removeNode = function(node) {
  if (node.list !== this) {
    throw new Error("removing node which does not belong to this list");
  }
  var next = node.next;
  var prev = node.prev;
  if (next) {
    next.prev = prev;
  }
  if (prev) {
    prev.next = next;
  }
  if (node === this.head) {
    this.head = next;
  }
  if (node === this.tail) {
    this.tail = prev;
  }
  node.list.length--;
  node.next = null;
  node.prev = null;
  node.list = null;
  return next;
};
Yallist$2.prototype.unshiftNode = function(node) {
  if (node === this.head) {
    return;
  }
  if (node.list) {
    node.list.removeNode(node);
  }
  var head = this.head;
  node.list = this;
  node.next = head;
  if (head) {
    head.prev = node;
  }
  this.head = node;
  if (!this.tail) {
    this.tail = node;
  }
  this.length++;
};
Yallist$2.prototype.pushNode = function(node) {
  if (node === this.tail) {
    return;
  }
  if (node.list) {
    node.list.removeNode(node);
  }
  var tail = this.tail;
  node.list = this;
  node.prev = tail;
  if (tail) {
    tail.next = node;
  }
  this.tail = node;
  if (!this.head) {
    this.head = node;
  }
  this.length++;
};
Yallist$2.prototype.push = function() {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i]);
  }
  return this.length;
};
Yallist$2.prototype.unshift = function() {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i]);
  }
  return this.length;
};
Yallist$2.prototype.pop = function() {
  if (!this.tail) {
    return void 0;
  }
  var res = this.tail.value;
  this.tail = this.tail.prev;
  if (this.tail) {
    this.tail.next = null;
  } else {
    this.head = null;
  }
  this.length--;
  return res;
};
Yallist$2.prototype.shift = function() {
  if (!this.head) {
    return void 0;
  }
  var res = this.head.value;
  this.head = this.head.next;
  if (this.head) {
    this.head.prev = null;
  } else {
    this.tail = null;
  }
  this.length--;
  return res;
};
Yallist$2.prototype.forEach = function(fn, thisp) {
  thisp = thisp || this;
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this);
    walker = walker.next;
  }
};
Yallist$2.prototype.forEachReverse = function(fn, thisp) {
  thisp = thisp || this;
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this);
    walker = walker.prev;
  }
};
Yallist$2.prototype.get = function(n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    walker = walker.next;
  }
  if (i === n && walker !== null) {
    return walker.value;
  }
};
Yallist$2.prototype.getReverse = function(n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    walker = walker.prev;
  }
  if (i === n && walker !== null) {
    return walker.value;
  }
};
Yallist$2.prototype.map = function(fn, thisp) {
  thisp = thisp || this;
  var res = new Yallist$2();
  for (var walker = this.head; walker !== null; ) {
    res.push(fn.call(thisp, walker.value, this));
    walker = walker.next;
  }
  return res;
};
Yallist$2.prototype.mapReverse = function(fn, thisp) {
  thisp = thisp || this;
  var res = new Yallist$2();
  for (var walker = this.tail; walker !== null; ) {
    res.push(fn.call(thisp, walker.value, this));
    walker = walker.prev;
  }
  return res;
};
Yallist$2.prototype.reduce = function(fn, initial) {
  var acc;
  var walker = this.head;
  if (arguments.length > 1) {
    acc = initial;
  } else if (this.head) {
    walker = this.head.next;
    acc = this.head.value;
  } else {
    throw new TypeError("Reduce of empty list with no initial value");
  }
  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i);
    walker = walker.next;
  }
  return acc;
};
Yallist$2.prototype.reduceReverse = function(fn, initial) {
  var acc;
  var walker = this.tail;
  if (arguments.length > 1) {
    acc = initial;
  } else if (this.tail) {
    walker = this.tail.prev;
    acc = this.tail.value;
  } else {
    throw new TypeError("Reduce of empty list with no initial value");
  }
  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i);
    walker = walker.prev;
  }
  return acc;
};
Yallist$2.prototype.toArray = function() {
  var arr = new Array(this.length);
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value;
    walker = walker.next;
  }
  return arr;
};
Yallist$2.prototype.toArrayReverse = function() {
  var arr = new Array(this.length);
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value;
    walker = walker.prev;
  }
  return arr;
};
Yallist$2.prototype.slice = function(from, to) {
  to = to || this.length;
  if (to < 0) {
    to += this.length;
  }
  from = from || 0;
  if (from < 0) {
    from += this.length;
  }
  var ret = new Yallist$2();
  if (to < from || to < 0) {
    return ret;
  }
  if (from < 0) {
    from = 0;
  }
  if (to > this.length) {
    to = this.length;
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next;
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value);
  }
  return ret;
};
Yallist$2.prototype.sliceReverse = function(from, to) {
  to = to || this.length;
  if (to < 0) {
    to += this.length;
  }
  from = from || 0;
  if (from < 0) {
    from += this.length;
  }
  var ret = new Yallist$2();
  if (to < from || to < 0) {
    return ret;
  }
  if (from < 0) {
    from = 0;
  }
  if (to > this.length) {
    to = this.length;
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev;
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value);
  }
  return ret;
};
Yallist$2.prototype.splice = function(start, deleteCount, ...nodes) {
  if (start > this.length) {
    start = this.length - 1;
  }
  if (start < 0) {
    start = this.length + start;
  }
  for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
    walker = walker.next;
  }
  var ret = [];
  for (var i = 0; walker && i < deleteCount; i++) {
    ret.push(walker.value);
    walker = this.removeNode(walker);
  }
  if (walker === null) {
    walker = this.tail;
  }
  if (walker !== this.head && walker !== this.tail) {
    walker = walker.prev;
  }
  for (var i = 0; i < nodes.length; i++) {
    walker = insert(this, walker, nodes[i]);
  }
  return ret;
};
Yallist$2.prototype.reverse = function() {
  var head = this.head;
  var tail = this.tail;
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev;
    walker.prev = walker.next;
    walker.next = p;
  }
  this.head = tail;
  this.tail = head;
  return this;
};
function insert(self2, node, value) {
  var inserted = node === self2.head ? new Node(value, null, node, self2) : new Node(value, node, node.next, self2);
  if (inserted.next === null) {
    self2.tail = inserted;
  }
  if (inserted.prev === null) {
    self2.head = inserted;
  }
  self2.length++;
  return inserted;
}
function push(self2, item) {
  self2.tail = new Node(item, self2.tail, null, self2);
  if (!self2.head) {
    self2.head = self2.tail;
  }
  self2.length++;
}
function unshift(self2, item) {
  self2.head = new Node(item, null, self2.head, self2);
  if (!self2.tail) {
    self2.tail = self2.head;
  }
  self2.length++;
}
function Node(value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list);
  }
  this.list = list;
  this.value = value;
  if (prev) {
    prev.next = this;
    this.prev = prev;
  } else {
    this.prev = null;
  }
  if (next) {
    next.prev = this;
    this.next = next;
  } else {
    this.next = null;
  }
}
try {
  requireIterator()(Yallist$2);
} catch (er) {
}
class PackJob {
  constructor(path2, absolute) {
    this.path = path2 || "./";
    this.absolute = absolute;
    this.entry = null;
    this.stat = null;
    this.readdir = null;
    this.pending = false;
    this.ignore = false;
    this.piped = false;
  }
}
const { Minipass: Minipass3 } = minipass$2;
const zlib$1 = minizlib;
const ReadEntry2 = readEntry;
const WriteEntry = writeEntry;
const WriteEntrySync2 = WriteEntry.Sync;
const WriteEntryTar = WriteEntry.Tar;
const Yallist$1 = yallist;
const EOF$1 = Buffer.alloc(1024);
const ONSTAT = Symbol("onStat");
const ENDED$2 = Symbol("ended");
const QUEUE$1 = Symbol("queue");
const CURRENT = Symbol("current");
const PROCESS = Symbol("process");
const PROCESSING = Symbol("processing");
const PROCESSJOB = Symbol("processJob");
const JOBS = Symbol("jobs");
const JOBDONE = Symbol("jobDone");
const ADDFSENTRY = Symbol("addFSEntry");
const ADDTARENTRY = Symbol("addTarEntry");
const STAT = Symbol("stat");
const READDIR = Symbol("readdir");
const ONREADDIR = Symbol("onreaddir");
const PIPE = Symbol("pipe");
const ENTRY = Symbol("entry");
const ENTRYOPT = Symbol("entryOpt");
const WRITEENTRYCLASS = Symbol("writeEntryClass");
const WRITE = Symbol("write");
const ONDRAIN = Symbol("ondrain");
const fs$8 = fs$a;
const path$4 = path$7;
const warner$1 = warnMixin;
const normPath$2 = normalizeWindowsPath;
const Pack = warner$1(class Pack2 extends Minipass3 {
  constructor(opt) {
    super(opt);
    opt = opt || /* @__PURE__ */ Object.create(null);
    this.opt = opt;
    this.file = opt.file || "";
    this.cwd = opt.cwd || process.cwd();
    this.maxReadSize = opt.maxReadSize;
    this.preservePaths = !!opt.preservePaths;
    this.strict = !!opt.strict;
    this.noPax = !!opt.noPax;
    this.prefix = normPath$2(opt.prefix || "");
    this.linkCache = opt.linkCache || /* @__PURE__ */ new Map();
    this.statCache = opt.statCache || /* @__PURE__ */ new Map();
    this.readdirCache = opt.readdirCache || /* @__PURE__ */ new Map();
    this[WRITEENTRYCLASS] = WriteEntry;
    if (typeof opt.onwarn === "function") {
      this.on("warn", opt.onwarn);
    }
    this.portable = !!opt.portable;
    this.zip = null;
    if (opt.gzip || opt.brotli) {
      if (opt.gzip && opt.brotli) {
        throw new TypeError("gzip and brotli are mutually exclusive");
      }
      if (opt.gzip) {
        if (typeof opt.gzip !== "object") {
          opt.gzip = {};
        }
        if (this.portable) {
          opt.gzip.portable = true;
        }
        this.zip = new zlib$1.Gzip(opt.gzip);
      }
      if (opt.brotli) {
        if (typeof opt.brotli !== "object") {
          opt.brotli = {};
        }
        this.zip = new zlib$1.BrotliCompress(opt.brotli);
      }
      this.zip.on("data", (chunk) => super.write(chunk));
      this.zip.on("end", (_) => super.end());
      this.zip.on("drain", (_) => this[ONDRAIN]());
      this.on("resume", (_) => this.zip.resume());
    } else {
      this.on("drain", this[ONDRAIN]);
    }
    this.noDirRecurse = !!opt.noDirRecurse;
    this.follow = !!opt.follow;
    this.noMtime = !!opt.noMtime;
    this.mtime = opt.mtime || null;
    this.filter = typeof opt.filter === "function" ? opt.filter : (_) => true;
    this[QUEUE$1] = new Yallist$1();
    this[JOBS] = 0;
    this.jobs = +opt.jobs || 4;
    this[PROCESSING] = false;
    this[ENDED$2] = false;
  }
  [WRITE](chunk) {
    return super.write(chunk);
  }
  add(path2) {
    this.write(path2);
    return this;
  }
  end(path2) {
    if (path2) {
      this.write(path2);
    }
    this[ENDED$2] = true;
    this[PROCESS]();
    return this;
  }
  write(path2) {
    if (this[ENDED$2]) {
      throw new Error("write after end");
    }
    if (path2 instanceof ReadEntry2) {
      this[ADDTARENTRY](path2);
    } else {
      this[ADDFSENTRY](path2);
    }
    return this.flowing;
  }
  [ADDTARENTRY](p) {
    const absolute = normPath$2(path$4.resolve(this.cwd, p.path));
    if (!this.filter(p.path, p)) {
      p.resume();
    } else {
      const job = new PackJob(p.path, absolute, false);
      job.entry = new WriteEntryTar(p, this[ENTRYOPT](job));
      job.entry.on("end", (_) => this[JOBDONE](job));
      this[JOBS] += 1;
      this[QUEUE$1].push(job);
    }
    this[PROCESS]();
  }
  [ADDFSENTRY](p) {
    const absolute = normPath$2(path$4.resolve(this.cwd, p));
    this[QUEUE$1].push(new PackJob(p, absolute));
    this[PROCESS]();
  }
  [STAT](job) {
    job.pending = true;
    this[JOBS] += 1;
    const stat = this.follow ? "stat" : "lstat";
    fs$8[stat](job.absolute, (er, stat2) => {
      job.pending = false;
      this[JOBS] -= 1;
      if (er) {
        this.emit("error", er);
      } else {
        this[ONSTAT](job, stat2);
      }
    });
  }
  [ONSTAT](job, stat) {
    this.statCache.set(job.absolute, stat);
    job.stat = stat;
    if (!this.filter(job.path, stat)) {
      job.ignore = true;
    }
    this[PROCESS]();
  }
  [READDIR](job) {
    job.pending = true;
    this[JOBS] += 1;
    fs$8.readdir(job.absolute, (er, entries) => {
      job.pending = false;
      this[JOBS] -= 1;
      if (er) {
        return this.emit("error", er);
      }
      this[ONREADDIR](job, entries);
    });
  }
  [ONREADDIR](job, entries) {
    this.readdirCache.set(job.absolute, entries);
    job.readdir = entries;
    this[PROCESS]();
  }
  [PROCESS]() {
    if (this[PROCESSING]) {
      return;
    }
    this[PROCESSING] = true;
    for (let w = this[QUEUE$1].head; w !== null && this[JOBS] < this.jobs; w = w.next) {
      this[PROCESSJOB](w.value);
      if (w.value.ignore) {
        const p = w.next;
        this[QUEUE$1].removeNode(w);
        w.next = p;
      }
    }
    this[PROCESSING] = false;
    if (this[ENDED$2] && !this[QUEUE$1].length && this[JOBS] === 0) {
      if (this.zip) {
        this.zip.end(EOF$1);
      } else {
        super.write(EOF$1);
        super.end();
      }
    }
  }
  get [CURRENT]() {
    return this[QUEUE$1] && this[QUEUE$1].head && this[QUEUE$1].head.value;
  }
  [JOBDONE](job) {
    this[QUEUE$1].shift();
    this[JOBS] -= 1;
    this[PROCESS]();
  }
  [PROCESSJOB](job) {
    if (job.pending) {
      return;
    }
    if (job.entry) {
      if (job === this[CURRENT] && !job.piped) {
        this[PIPE](job);
      }
      return;
    }
    if (!job.stat) {
      if (this.statCache.has(job.absolute)) {
        this[ONSTAT](job, this.statCache.get(job.absolute));
      } else {
        this[STAT](job);
      }
    }
    if (!job.stat) {
      return;
    }
    if (job.ignore) {
      return;
    }
    if (!this.noDirRecurse && job.stat.isDirectory() && !job.readdir) {
      if (this.readdirCache.has(job.absolute)) {
        this[ONREADDIR](job, this.readdirCache.get(job.absolute));
      } else {
        this[READDIR](job);
      }
      if (!job.readdir) {
        return;
      }
    }
    job.entry = this[ENTRY](job);
    if (!job.entry) {
      job.ignore = true;
      return;
    }
    if (job === this[CURRENT] && !job.piped) {
      this[PIPE](job);
    }
  }
  [ENTRYOPT](job) {
    return {
      onwarn: (code, msg, data) => this.warn(code, msg, data),
      noPax: this.noPax,
      cwd: this.cwd,
      absolute: job.absolute,
      preservePaths: this.preservePaths,
      maxReadSize: this.maxReadSize,
      strict: this.strict,
      portable: this.portable,
      linkCache: this.linkCache,
      statCache: this.statCache,
      noMtime: this.noMtime,
      mtime: this.mtime,
      prefix: this.prefix
    };
  }
  [ENTRY](job) {
    this[JOBS] += 1;
    try {
      return new this[WRITEENTRYCLASS](job.path, this[ENTRYOPT](job)).on("end", () => this[JOBDONE](job)).on("error", (er) => this.emit("error", er));
    } catch (er) {
      this.emit("error", er);
    }
  }
  [ONDRAIN]() {
    if (this[CURRENT] && this[CURRENT].entry) {
      this[CURRENT].entry.resume();
    }
  }
  // like .pipe() but using super, because our write() is special
  [PIPE](job) {
    job.piped = true;
    if (job.readdir) {
      job.readdir.forEach((entry) => {
        const p = job.path;
        const base = p === "./" ? "" : p.replace(/\/*$/, "/");
        this[ADDFSENTRY](base + entry);
      });
    }
    const source = job.entry;
    const zip = this.zip;
    if (zip) {
      source.on("data", (chunk) => {
        if (!zip.write(chunk)) {
          source.pause();
        }
      });
    } else {
      source.on("data", (chunk) => {
        if (!super.write(chunk)) {
          source.pause();
        }
      });
    }
  }
  pause() {
    if (this.zip) {
      this.zip.pause();
    }
    return super.pause();
  }
});
class PackSync extends Pack {
  constructor(opt) {
    super(opt);
    this[WRITEENTRYCLASS] = WriteEntrySync2;
  }
  // pause/resume are no-ops in sync streams.
  pause() {
  }
  resume() {
  }
  [STAT](job) {
    const stat = this.follow ? "statSync" : "lstatSync";
    this[ONSTAT](job, fs$8[stat](job.absolute));
  }
  [READDIR](job, stat) {
    this[ONREADDIR](job, fs$8.readdirSync(job.absolute));
  }
  // gotta get it all in this tick
  [PIPE](job) {
    const source = job.entry;
    const zip = this.zip;
    if (job.readdir) {
      job.readdir.forEach((entry) => {
        const p = job.path;
        const base = p === "./" ? "" : p.replace(/\/*$/, "/");
        this[ADDFSENTRY](base + entry);
      });
    }
    if (zip) {
      source.on("data", (chunk) => {
        zip.write(chunk);
      });
    } else {
      source.on("data", (chunk) => {
        super[WRITE](chunk);
      });
    }
  }
}
Pack.Sync = PackSync;
var fsMinipass = {};
const proc = typeof process === "object" && process ? process : {
  stdout: null,
  stderr: null
};
const EE$2 = require$$0;
const Stream = require$$1;
const SD = require$$2.StringDecoder;
const EOF = Symbol("EOF");
const MAYBE_EMIT_END = Symbol("maybeEmitEnd");
const EMITTED_END = Symbol("emittedEnd");
const EMITTING_END = Symbol("emittingEnd");
const EMITTED_ERROR = Symbol("emittedError");
const CLOSED = Symbol("closed");
const READ = Symbol("read");
const FLUSH = Symbol("flush");
const FLUSHCHUNK = Symbol("flushChunk");
const ENCODING = Symbol("encoding");
const DECODER = Symbol("decoder");
const FLOWING = Symbol("flowing");
const PAUSED = Symbol("paused");
const RESUME = Symbol("resume");
const BUFFERLENGTH = Symbol("bufferLength");
const BUFFERPUSH = Symbol("bufferPush");
const BUFFERSHIFT = Symbol("bufferShift");
const OBJECTMODE = Symbol("objectMode");
const DESTROYED = Symbol("destroyed");
const EMITDATA = Symbol("emitData");
const EMITEND = Symbol("emitEnd");
const EMITEND2 = Symbol("emitEnd2");
const ASYNC = Symbol("async");
const defer = (fn) => Promise.resolve().then(fn);
const doIter = commonjsGlobal._MP_NO_ITERATOR_SYMBOLS_ !== "1";
const ASYNCITERATOR = doIter && Symbol.asyncIterator || Symbol("asyncIterator not implemented");
const ITERATOR = doIter && Symbol.iterator || Symbol("iterator not implemented");
const isEndish = (ev) => ev === "end" || ev === "finish" || ev === "prefinish";
const isArrayBuffer = (b) => b instanceof ArrayBuffer || typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
const isArrayBufferView = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
class Pipe3 {
  constructor(src, dest, opts) {
    this.src = src;
    this.dest = dest;
    this.opts = opts;
    this.ondrain = () => src[RESUME]();
    dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // istanbul ignore next - only here for the prototype
  proxyErrors() {
  }
  end() {
    this.unpipe();
    if (this.opts.end)
      this.dest.end();
  }
}
class PipeProxyErrors3 extends Pipe3 {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors);
    super.unpipe();
  }
  constructor(src, dest, opts) {
    super(src, dest, opts);
    this.proxyErrors = (er) => dest.emit("error", er);
    src.on("error", this.proxyErrors);
  }
}
var minipass = class Minipass4 extends Stream {
  constructor(options) {
    super();
    this[FLOWING] = false;
    this[PAUSED] = false;
    this.pipes = [];
    this.buffer = [];
    this[OBJECTMODE] = options && options.objectMode || false;
    if (this[OBJECTMODE])
      this[ENCODING] = null;
    else
      this[ENCODING] = options && options.encoding || null;
    if (this[ENCODING] === "buffer")
      this[ENCODING] = null;
    this[ASYNC] = options && !!options.async || false;
    this[DECODER] = this[ENCODING] ? new SD(this[ENCODING]) : null;
    this[EOF] = false;
    this[EMITTED_END] = false;
    this[EMITTING_END] = false;
    this[CLOSED] = false;
    this[EMITTED_ERROR] = null;
    this.writable = true;
    this.readable = true;
    this[BUFFERLENGTH] = 0;
    this[DESTROYED] = false;
  }
  get bufferLength() {
    return this[BUFFERLENGTH];
  }
  get encoding() {
    return this[ENCODING];
  }
  set encoding(enc) {
    if (this[OBJECTMODE])
      throw new Error("cannot set encoding in objectMode");
    if (this[ENCODING] && enc !== this[ENCODING] && (this[DECODER] && this[DECODER].lastNeed || this[BUFFERLENGTH]))
      throw new Error("cannot change encoding");
    if (this[ENCODING] !== enc) {
      this[DECODER] = enc ? new SD(enc) : null;
      if (this.buffer.length)
        this.buffer = this.buffer.map((chunk) => this[DECODER].write(chunk));
    }
    this[ENCODING] = enc;
  }
  setEncoding(enc) {
    this.encoding = enc;
  }
  get objectMode() {
    return this[OBJECTMODE];
  }
  set objectMode(om) {
    this[OBJECTMODE] = this[OBJECTMODE] || !!om;
  }
  get ["async"]() {
    return this[ASYNC];
  }
  set ["async"](a) {
    this[ASYNC] = this[ASYNC] || !!a;
  }
  write(chunk, encoding, cb) {
    if (this[EOF])
      throw new Error("write after end");
    if (this[DESTROYED]) {
      this.emit("error", Object.assign(
        new Error("Cannot call write after a stream was destroyed"),
        { code: "ERR_STREAM_DESTROYED" }
      ));
      return true;
    }
    if (typeof encoding === "function")
      cb = encoding, encoding = "utf8";
    if (!encoding)
      encoding = "utf8";
    const fn = this[ASYNC] ? defer : (f) => f();
    if (!this[OBJECTMODE] && !Buffer.isBuffer(chunk)) {
      if (isArrayBufferView(chunk))
        chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      else if (isArrayBuffer(chunk))
        chunk = Buffer.from(chunk);
      else if (typeof chunk !== "string")
        this.objectMode = true;
    }
    if (this[OBJECTMODE]) {
      if (this.flowing && this[BUFFERLENGTH] !== 0)
        this[FLUSH](true);
      if (this.flowing)
        this.emit("data", chunk);
      else
        this[BUFFERPUSH](chunk);
      if (this[BUFFERLENGTH] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this.flowing;
    }
    if (!chunk.length) {
      if (this[BUFFERLENGTH] !== 0)
        this.emit("readable");
      if (cb)
        fn(cb);
      return this.flowing;
    }
    if (typeof chunk === "string" && // unless it is a string already ready for us to use
    !(encoding === this[ENCODING] && !this[DECODER].lastNeed)) {
      chunk = Buffer.from(chunk, encoding);
    }
    if (Buffer.isBuffer(chunk) && this[ENCODING])
      chunk = this[DECODER].write(chunk);
    if (this.flowing && this[BUFFERLENGTH] !== 0)
      this[FLUSH](true);
    if (this.flowing)
      this.emit("data", chunk);
    else
      this[BUFFERPUSH](chunk);
    if (this[BUFFERLENGTH] !== 0)
      this.emit("readable");
    if (cb)
      fn(cb);
    return this.flowing;
  }
  read(n) {
    if (this[DESTROYED])
      return null;
    if (this[BUFFERLENGTH] === 0 || n === 0 || n > this[BUFFERLENGTH]) {
      this[MAYBE_EMIT_END]();
      return null;
    }
    if (this[OBJECTMODE])
      n = null;
    if (this.buffer.length > 1 && !this[OBJECTMODE]) {
      if (this.encoding)
        this.buffer = [this.buffer.join("")];
      else
        this.buffer = [Buffer.concat(this.buffer, this[BUFFERLENGTH])];
    }
    const ret = this[READ](n || null, this.buffer[0]);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [READ](n, chunk) {
    if (n === chunk.length || n === null)
      this[BUFFERSHIFT]();
    else {
      this.buffer[0] = chunk.slice(n);
      chunk = chunk.slice(0, n);
      this[BUFFERLENGTH] -= n;
    }
    this.emit("data", chunk);
    if (!this.buffer.length && !this[EOF])
      this.emit("drain");
    return chunk;
  }
  end(chunk, encoding, cb) {
    if (typeof chunk === "function")
      cb = chunk, chunk = null;
    if (typeof encoding === "function")
      cb = encoding, encoding = "utf8";
    if (chunk)
      this.write(chunk, encoding);
    if (cb)
      this.once("end", cb);
    this[EOF] = true;
    this.writable = false;
    if (this.flowing || !this[PAUSED])
      this[MAYBE_EMIT_END]();
    return this;
  }
  // don't let the internal resume be overwritten
  [RESUME]() {
    if (this[DESTROYED])
      return;
    this[PAUSED] = false;
    this[FLOWING] = true;
    this.emit("resume");
    if (this.buffer.length)
      this[FLUSH]();
    else if (this[EOF])
      this[MAYBE_EMIT_END]();
    else
      this.emit("drain");
  }
  resume() {
    return this[RESUME]();
  }
  pause() {
    this[FLOWING] = false;
    this[PAUSED] = true;
  }
  get destroyed() {
    return this[DESTROYED];
  }
  get flowing() {
    return this[FLOWING];
  }
  get paused() {
    return this[PAUSED];
  }
  [BUFFERPUSH](chunk) {
    if (this[OBJECTMODE])
      this[BUFFERLENGTH] += 1;
    else
      this[BUFFERLENGTH] += chunk.length;
    this.buffer.push(chunk);
  }
  [BUFFERSHIFT]() {
    if (this.buffer.length) {
      if (this[OBJECTMODE])
        this[BUFFERLENGTH] -= 1;
      else
        this[BUFFERLENGTH] -= this.buffer[0].length;
    }
    return this.buffer.shift();
  }
  [FLUSH](noDrain) {
    do {
    } while (this[FLUSHCHUNK](this[BUFFERSHIFT]()));
    if (!noDrain && !this.buffer.length && !this[EOF])
      this.emit("drain");
  }
  [FLUSHCHUNK](chunk) {
    return chunk ? (this.emit("data", chunk), this.flowing) : false;
  }
  pipe(dest, opts) {
    if (this[DESTROYED])
      return;
    const ended = this[EMITTED_END];
    opts = opts || {};
    if (dest === proc.stdout || dest === proc.stderr)
      opts.end = false;
    else
      opts.end = opts.end !== false;
    opts.proxyErrors = !!opts.proxyErrors;
    if (ended) {
      if (opts.end)
        dest.end();
    } else {
      this.pipes.push(!opts.proxyErrors ? new Pipe3(this, dest, opts) : new PipeProxyErrors3(this, dest, opts));
      if (this[ASYNC])
        defer(() => this[RESUME]());
      else
        this[RESUME]();
    }
    return dest;
  }
  unpipe(dest) {
    const p = this.pipes.find((p2) => p2.dest === dest);
    if (p) {
      this.pipes.splice(this.pipes.indexOf(p), 1);
      p.unpipe();
    }
  }
  addListener(ev, fn) {
    return this.on(ev, fn);
  }
  on(ev, fn) {
    const ret = super.on(ev, fn);
    if (ev === "data" && !this.pipes.length && !this.flowing)
      this[RESUME]();
    else if (ev === "readable" && this[BUFFERLENGTH] !== 0)
      super.emit("readable");
    else if (isEndish(ev) && this[EMITTED_END]) {
      super.emit(ev);
      this.removeAllListeners(ev);
    } else if (ev === "error" && this[EMITTED_ERROR]) {
      if (this[ASYNC])
        defer(() => fn.call(this, this[EMITTED_ERROR]));
      else
        fn.call(this, this[EMITTED_ERROR]);
    }
    return ret;
  }
  get emittedEnd() {
    return this[EMITTED_END];
  }
  [MAYBE_EMIT_END]() {
    if (!this[EMITTING_END] && !this[EMITTED_END] && !this[DESTROYED] && this.buffer.length === 0 && this[EOF]) {
      this[EMITTING_END] = true;
      this.emit("end");
      this.emit("prefinish");
      this.emit("finish");
      if (this[CLOSED])
        this.emit("close");
      this[EMITTING_END] = false;
    }
  }
  emit(ev, data, ...extra) {
    if (ev !== "error" && ev !== "close" && ev !== DESTROYED && this[DESTROYED])
      return;
    else if (ev === "data") {
      return !data ? false : this[ASYNC] ? defer(() => this[EMITDATA](data)) : this[EMITDATA](data);
    } else if (ev === "end") {
      return this[EMITEND]();
    } else if (ev === "close") {
      this[CLOSED] = true;
      if (!this[EMITTED_END] && !this[DESTROYED])
        return;
      const ret2 = super.emit("close");
      this.removeAllListeners("close");
      return ret2;
    } else if (ev === "error") {
      this[EMITTED_ERROR] = data;
      const ret2 = super.emit("error", data);
      this[MAYBE_EMIT_END]();
      return ret2;
    } else if (ev === "resume") {
      const ret2 = super.emit("resume");
      this[MAYBE_EMIT_END]();
      return ret2;
    } else if (ev === "finish" || ev === "prefinish") {
      const ret2 = super.emit(ev);
      this.removeAllListeners(ev);
      return ret2;
    }
    const ret = super.emit(ev, data, ...extra);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [EMITDATA](data) {
    for (const p of this.pipes) {
      if (p.dest.write(data) === false)
        this.pause();
    }
    const ret = super.emit("data", data);
    this[MAYBE_EMIT_END]();
    return ret;
  }
  [EMITEND]() {
    if (this[EMITTED_END])
      return;
    this[EMITTED_END] = true;
    this.readable = false;
    if (this[ASYNC])
      defer(() => this[EMITEND2]());
    else
      this[EMITEND2]();
  }
  [EMITEND2]() {
    if (this[DECODER]) {
      const data = this[DECODER].end();
      if (data) {
        for (const p of this.pipes) {
          p.dest.write(data);
        }
        super.emit("data", data);
      }
    }
    for (const p of this.pipes) {
      p.end();
    }
    const ret = super.emit("end");
    this.removeAllListeners("end");
    return ret;
  }
  // const all = await stream.collect()
  collect() {
    const buf = [];
    if (!this[OBJECTMODE])
      buf.dataLength = 0;
    const p = this.promise();
    this.on("data", (c) => {
      buf.push(c);
      if (!this[OBJECTMODE])
        buf.dataLength += c.length;
    });
    return p.then(() => buf);
  }
  // const data = await stream.concat()
  concat() {
    return this[OBJECTMODE] ? Promise.reject(new Error("cannot concat in objectMode")) : this.collect().then((buf) => this[OBJECTMODE] ? Promise.reject(new Error("cannot concat in objectMode")) : this[ENCODING] ? buf.join("") : Buffer.concat(buf, buf.dataLength));
  }
  // stream.promise().then(() => done, er => emitted error)
  promise() {
    return new Promise((resolve2, reject) => {
      this.on(DESTROYED, () => reject(new Error("stream destroyed")));
      this.on("error", (er) => reject(er));
      this.on("end", () => resolve2());
    });
  }
  // for await (let chunk of stream)
  [ASYNCITERATOR]() {
    const next = () => {
      const res = this.read();
      if (res !== null)
        return Promise.resolve({ done: false, value: res });
      if (this[EOF])
        return Promise.resolve({ done: true });
      let resolve2 = null;
      let reject = null;
      const onerr = (er) => {
        this.removeListener("data", ondata);
        this.removeListener("end", onend);
        reject(er);
      };
      const ondata = (value) => {
        this.removeListener("error", onerr);
        this.removeListener("end", onend);
        this.pause();
        resolve2({ value, done: !!this[EOF] });
      };
      const onend = () => {
        this.removeListener("error", onerr);
        this.removeListener("data", ondata);
        resolve2({ done: true });
      };
      const ondestroy = () => onerr(new Error("stream destroyed"));
      return new Promise((res2, rej) => {
        reject = rej;
        resolve2 = res2;
        this.once(DESTROYED, ondestroy);
        this.once("error", onerr);
        this.once("end", onend);
        this.once("data", ondata);
      });
    };
    return { next };
  }
  // for (let chunk of stream)
  [ITERATOR]() {
    const next = () => {
      const value = this.read();
      const done = value === null;
      return { value, done };
    };
    return { next };
  }
  destroy(er) {
    if (this[DESTROYED]) {
      if (er)
        this.emit("error", er);
      else
        this.emit(DESTROYED);
      return this;
    }
    this[DESTROYED] = true;
    this.buffer.length = 0;
    this[BUFFERLENGTH] = 0;
    if (typeof this.close === "function" && !this[CLOSED])
      this.close();
    if (er)
      this.emit("error", er);
    else
      this.emit(DESTROYED);
    return this;
  }
  static isStream(s) {
    return !!s && (s instanceof Minipass4 || s instanceof Stream || s instanceof EE$2 && (typeof s.pipe === "function" || // readable
    typeof s.write === "function" && typeof s.end === "function"));
  }
};
const MiniPass = minipass;
const EE$1 = require$$0.EventEmitter;
const fs$7 = fs$a;
let writev = fs$7.writev;
if (!writev) {
  const binding = process.binding("fs");
  const FSReqWrap = binding.FSReqWrap || binding.FSReqCallback;
  writev = (fd, iovec, pos2, cb) => {
    const done = (er, bw) => cb(er, bw, iovec);
    const req = new FSReqWrap();
    req.oncomplete = done;
    binding.writeBuffers(fd, iovec, pos2, req);
  };
}
const _autoClose = Symbol("_autoClose");
const _close = Symbol("_close");
const _ended = Symbol("_ended");
const _fd = Symbol("_fd");
const _finished = Symbol("_finished");
const _flags = Symbol("_flags");
const _flush = Symbol("_flush");
const _handleChunk = Symbol("_handleChunk");
const _makeBuf = Symbol("_makeBuf");
const _mode = Symbol("_mode");
const _needDrain = Symbol("_needDrain");
const _onerror = Symbol("_onerror");
const _onopen = Symbol("_onopen");
const _onread = Symbol("_onread");
const _onwrite = Symbol("_onwrite");
const _open = Symbol("_open");
const _path = Symbol("_path");
const _pos = Symbol("_pos");
const _queue = Symbol("_queue");
const _read = Symbol("_read");
const _readSize = Symbol("_readSize");
const _reading = Symbol("_reading");
const _remain = Symbol("_remain");
const _size = Symbol("_size");
const _write = Symbol("_write");
const _writing = Symbol("_writing");
const _defaultFlag = Symbol("_defaultFlag");
const _errored = Symbol("_errored");
class ReadStream extends MiniPass {
  constructor(path2, opt) {
    opt = opt || {};
    super(opt);
    this.readable = true;
    this.writable = false;
    if (typeof path2 !== "string")
      throw new TypeError("path must be a string");
    this[_errored] = false;
    this[_fd] = typeof opt.fd === "number" ? opt.fd : null;
    this[_path] = path2;
    this[_readSize] = opt.readSize || 16 * 1024 * 1024;
    this[_reading] = false;
    this[_size] = typeof opt.size === "number" ? opt.size : Infinity;
    this[_remain] = this[_size];
    this[_autoClose] = typeof opt.autoClose === "boolean" ? opt.autoClose : true;
    if (typeof this[_fd] === "number")
      this[_read]();
    else
      this[_open]();
  }
  get fd() {
    return this[_fd];
  }
  get path() {
    return this[_path];
  }
  write() {
    throw new TypeError("this is a readable stream");
  }
  end() {
    throw new TypeError("this is a readable stream");
  }
  [_open]() {
    fs$7.open(this[_path], "r", (er, fd) => this[_onopen](er, fd));
  }
  [_onopen](er, fd) {
    if (er)
      this[_onerror](er);
    else {
      this[_fd] = fd;
      this.emit("open", fd);
      this[_read]();
    }
  }
  [_makeBuf]() {
    return Buffer.allocUnsafe(Math.min(this[_readSize], this[_remain]));
  }
  [_read]() {
    if (!this[_reading]) {
      this[_reading] = true;
      const buf = this[_makeBuf]();
      if (buf.length === 0)
        return process.nextTick(() => this[_onread](null, 0, buf));
      fs$7.read(this[_fd], buf, 0, buf.length, null, (er, br, buf2) => this[_onread](er, br, buf2));
    }
  }
  [_onread](er, br, buf) {
    this[_reading] = false;
    if (er)
      this[_onerror](er);
    else if (this[_handleChunk](br, buf))
      this[_read]();
  }
  [_close]() {
    if (this[_autoClose] && typeof this[_fd] === "number") {
      const fd = this[_fd];
      this[_fd] = null;
      fs$7.close(fd, (er) => er ? this.emit("error", er) : this.emit("close"));
    }
  }
  [_onerror](er) {
    this[_reading] = true;
    this[_close]();
    this.emit("error", er);
  }
  [_handleChunk](br, buf) {
    let ret = false;
    this[_remain] -= br;
    if (br > 0)
      ret = super.write(br < buf.length ? buf.slice(0, br) : buf);
    if (br === 0 || this[_remain] <= 0) {
      ret = false;
      this[_close]();
      super.end();
    }
    return ret;
  }
  emit(ev, data) {
    switch (ev) {
      case "prefinish":
      case "finish":
        break;
      case "drain":
        if (typeof this[_fd] === "number")
          this[_read]();
        break;
      case "error":
        if (this[_errored])
          return;
        this[_errored] = true;
        return super.emit(ev, data);
      default:
        return super.emit(ev, data);
    }
  }
}
class ReadStreamSync extends ReadStream {
  [_open]() {
    let threw = true;
    try {
      this[_onopen](null, fs$7.openSync(this[_path], "r"));
      threw = false;
    } finally {
      if (threw)
        this[_close]();
    }
  }
  [_read]() {
    let threw = true;
    try {
      if (!this[_reading]) {
        this[_reading] = true;
        do {
          const buf = this[_makeBuf]();
          const br = buf.length === 0 ? 0 : fs$7.readSync(this[_fd], buf, 0, buf.length, null);
          if (!this[_handleChunk](br, buf))
            break;
        } while (true);
        this[_reading] = false;
      }
      threw = false;
    } finally {
      if (threw)
        this[_close]();
    }
  }
  [_close]() {
    if (this[_autoClose] && typeof this[_fd] === "number") {
      const fd = this[_fd];
      this[_fd] = null;
      fs$7.closeSync(fd);
      this.emit("close");
    }
  }
}
class WriteStream extends EE$1 {
  constructor(path2, opt) {
    opt = opt || {};
    super(opt);
    this.readable = false;
    this.writable = true;
    this[_errored] = false;
    this[_writing] = false;
    this[_ended] = false;
    this[_needDrain] = false;
    this[_queue] = [];
    this[_path] = path2;
    this[_fd] = typeof opt.fd === "number" ? opt.fd : null;
    this[_mode] = opt.mode === void 0 ? 438 : opt.mode;
    this[_pos] = typeof opt.start === "number" ? opt.start : null;
    this[_autoClose] = typeof opt.autoClose === "boolean" ? opt.autoClose : true;
    const defaultFlag = this[_pos] !== null ? "r+" : "w";
    this[_defaultFlag] = opt.flags === void 0;
    this[_flags] = this[_defaultFlag] ? defaultFlag : opt.flags;
    if (this[_fd] === null)
      this[_open]();
  }
  emit(ev, data) {
    if (ev === "error") {
      if (this[_errored])
        return;
      this[_errored] = true;
    }
    return super.emit(ev, data);
  }
  get fd() {
    return this[_fd];
  }
  get path() {
    return this[_path];
  }
  [_onerror](er) {
    this[_close]();
    this[_writing] = true;
    this.emit("error", er);
  }
  [_open]() {
    fs$7.open(
      this[_path],
      this[_flags],
      this[_mode],
      (er, fd) => this[_onopen](er, fd)
    );
  }
  [_onopen](er, fd) {
    if (this[_defaultFlag] && this[_flags] === "r+" && er && er.code === "ENOENT") {
      this[_flags] = "w";
      this[_open]();
    } else if (er)
      this[_onerror](er);
    else {
      this[_fd] = fd;
      this.emit("open", fd);
      this[_flush]();
    }
  }
  end(buf, enc) {
    if (buf)
      this.write(buf, enc);
    this[_ended] = true;
    if (!this[_writing] && !this[_queue].length && typeof this[_fd] === "number")
      this[_onwrite](null, 0);
    return this;
  }
  write(buf, enc) {
    if (typeof buf === "string")
      buf = Buffer.from(buf, enc);
    if (this[_ended]) {
      this.emit("error", new Error("write() after end()"));
      return false;
    }
    if (this[_fd] === null || this[_writing] || this[_queue].length) {
      this[_queue].push(buf);
      this[_needDrain] = true;
      return false;
    }
    this[_writing] = true;
    this[_write](buf);
    return true;
  }
  [_write](buf) {
    fs$7.write(this[_fd], buf, 0, buf.length, this[_pos], (er, bw) => this[_onwrite](er, bw));
  }
  [_onwrite](er, bw) {
    if (er)
      this[_onerror](er);
    else {
      if (this[_pos] !== null)
        this[_pos] += bw;
      if (this[_queue].length)
        this[_flush]();
      else {
        this[_writing] = false;
        if (this[_ended] && !this[_finished]) {
          this[_finished] = true;
          this[_close]();
          this.emit("finish");
        } else if (this[_needDrain]) {
          this[_needDrain] = false;
          this.emit("drain");
        }
      }
    }
  }
  [_flush]() {
    if (this[_queue].length === 0) {
      if (this[_ended])
        this[_onwrite](null, 0);
    } else if (this[_queue].length === 1)
      this[_write](this[_queue].pop());
    else {
      const iovec = this[_queue];
      this[_queue] = [];
      writev(
        this[_fd],
        iovec,
        this[_pos],
        (er, bw) => this[_onwrite](er, bw)
      );
    }
  }
  [_close]() {
    if (this[_autoClose] && typeof this[_fd] === "number") {
      const fd = this[_fd];
      this[_fd] = null;
      fs$7.close(fd, (er) => er ? this.emit("error", er) : this.emit("close"));
    }
  }
}
class WriteStreamSync extends WriteStream {
  [_open]() {
    let fd;
    if (this[_defaultFlag] && this[_flags] === "r+") {
      try {
        fd = fs$7.openSync(this[_path], this[_flags], this[_mode]);
      } catch (er) {
        if (er.code === "ENOENT") {
          this[_flags] = "w";
          return this[_open]();
        } else
          throw er;
      }
    } else
      fd = fs$7.openSync(this[_path], this[_flags], this[_mode]);
    this[_onopen](null, fd);
  }
  [_close]() {
    if (this[_autoClose] && typeof this[_fd] === "number") {
      const fd = this[_fd];
      this[_fd] = null;
      fs$7.closeSync(fd);
      this.emit("close");
    }
  }
  [_write](buf) {
    let threw = true;
    try {
      this[_onwrite](
        null,
        fs$7.writeSync(this[_fd], buf, 0, buf.length, this[_pos])
      );
      threw = false;
    } finally {
      if (threw)
        try {
          this[_close]();
        } catch (_) {
        }
    }
  }
}
fsMinipass.ReadStream = ReadStream;
fsMinipass.ReadStreamSync = ReadStreamSync;
fsMinipass.WriteStream = WriteStream;
fsMinipass.WriteStreamSync = WriteStreamSync;
const warner = warnMixin;
const Header2 = header;
const EE = require$$0;
const Yallist = yallist;
const maxMetaEntrySize = 1024 * 1024;
const Entry = readEntry;
const Pax2 = pax;
const zlib = minizlib;
const { nextTick } = require$$7;
const gzipHeader = Buffer.from([31, 139]);
const STATE = Symbol("state");
const WRITEENTRY = Symbol("writeEntry");
const READENTRY = Symbol("readEntry");
const NEXTENTRY = Symbol("nextEntry");
const PROCESSENTRY = Symbol("processEntry");
const EX = Symbol("extendedHeader");
const GEX = Symbol("globalExtendedHeader");
const META = Symbol("meta");
const EMITMETA = Symbol("emitMeta");
const BUFFER = Symbol("buffer");
const QUEUE = Symbol("queue");
const ENDED$1 = Symbol("ended");
const EMITTEDEND = Symbol("emittedEnd");
const EMIT = Symbol("emit");
const UNZIP = Symbol("unzip");
const CONSUMECHUNK = Symbol("consumeChunk");
const CONSUMECHUNKSUB = Symbol("consumeChunkSub");
const CONSUMEBODY = Symbol("consumeBody");
const CONSUMEMETA = Symbol("consumeMeta");
const CONSUMEHEADER = Symbol("consumeHeader");
const CONSUMING = Symbol("consuming");
const BUFFERCONCAT = Symbol("bufferConcat");
const MAYBEEND = Symbol("maybeEnd");
const WRITING = Symbol("writing");
const ABORTED = Symbol("aborted");
const DONE = Symbol("onDone");
const SAW_VALID_ENTRY = Symbol("sawValidEntry");
const SAW_NULL_BLOCK = Symbol("sawNullBlock");
const SAW_EOF = Symbol("sawEOF");
const CLOSESTREAM = Symbol("closeStream");
const noop = (_) => true;
var parse$1 = warner(class Parser extends EE {
  constructor(opt) {
    opt = opt || {};
    super(opt);
    this.file = opt.file || "";
    this[SAW_VALID_ENTRY] = null;
    this.on(DONE, (_) => {
      if (this[STATE] === "begin" || this[SAW_VALID_ENTRY] === false) {
        this.warn("TAR_BAD_ARCHIVE", "Unrecognized archive format");
      }
    });
    if (opt.ondone) {
      this.on(DONE, opt.ondone);
    } else {
      this.on(DONE, (_) => {
        this.emit("prefinish");
        this.emit("finish");
        this.emit("end");
      });
    }
    this.strict = !!opt.strict;
    this.maxMetaEntrySize = opt.maxMetaEntrySize || maxMetaEntrySize;
    this.filter = typeof opt.filter === "function" ? opt.filter : noop;
    const isTBR = opt.file && (opt.file.endsWith(".tar.br") || opt.file.endsWith(".tbr"));
    this.brotli = !opt.gzip && opt.brotli !== void 0 ? opt.brotli : isTBR ? void 0 : false;
    this.writable = true;
    this.readable = false;
    this[QUEUE] = new Yallist();
    this[BUFFER] = null;
    this[READENTRY] = null;
    this[WRITEENTRY] = null;
    this[STATE] = "begin";
    this[META] = "";
    this[EX] = null;
    this[GEX] = null;
    this[ENDED$1] = false;
    this[UNZIP] = null;
    this[ABORTED] = false;
    this[SAW_NULL_BLOCK] = false;
    this[SAW_EOF] = false;
    this.on("end", () => this[CLOSESTREAM]());
    if (typeof opt.onwarn === "function") {
      this.on("warn", opt.onwarn);
    }
    if (typeof opt.onentry === "function") {
      this.on("entry", opt.onentry);
    }
  }
  [CONSUMEHEADER](chunk, position) {
    if (this[SAW_VALID_ENTRY] === null) {
      this[SAW_VALID_ENTRY] = false;
    }
    let header2;
    try {
      header2 = new Header2(chunk, position, this[EX], this[GEX]);
    } catch (er) {
      return this.warn("TAR_ENTRY_INVALID", er);
    }
    if (header2.nullBlock) {
      if (this[SAW_NULL_BLOCK]) {
        this[SAW_EOF] = true;
        if (this[STATE] === "begin") {
          this[STATE] = "header";
        }
        this[EMIT]("eof");
      } else {
        this[SAW_NULL_BLOCK] = true;
        this[EMIT]("nullBlock");
      }
    } else {
      this[SAW_NULL_BLOCK] = false;
      if (!header2.cksumValid) {
        this.warn("TAR_ENTRY_INVALID", "checksum failure", { header: header2 });
      } else if (!header2.path) {
        this.warn("TAR_ENTRY_INVALID", "path is required", { header: header2 });
      } else {
        const type = header2.type;
        if (/^(Symbolic)?Link$/.test(type) && !header2.linkpath) {
          this.warn("TAR_ENTRY_INVALID", "linkpath required", { header: header2 });
        } else if (!/^(Symbolic)?Link$/.test(type) && header2.linkpath) {
          this.warn("TAR_ENTRY_INVALID", "linkpath forbidden", { header: header2 });
        } else {
          const entry = this[WRITEENTRY] = new Entry(header2, this[EX], this[GEX]);
          if (!this[SAW_VALID_ENTRY]) {
            if (entry.remain) {
              const onend = () => {
                if (!entry.invalid) {
                  this[SAW_VALID_ENTRY] = true;
                }
              };
              entry.on("end", onend);
            } else {
              this[SAW_VALID_ENTRY] = true;
            }
          }
          if (entry.meta) {
            if (entry.size > this.maxMetaEntrySize) {
              entry.ignore = true;
              this[EMIT]("ignoredEntry", entry);
              this[STATE] = "ignore";
              entry.resume();
            } else if (entry.size > 0) {
              this[META] = "";
              entry.on("data", (c) => this[META] += c);
              this[STATE] = "meta";
            }
          } else {
            this[EX] = null;
            entry.ignore = entry.ignore || !this.filter(entry.path, entry);
            if (entry.ignore) {
              this[EMIT]("ignoredEntry", entry);
              this[STATE] = entry.remain ? "ignore" : "header";
              entry.resume();
            } else {
              if (entry.remain) {
                this[STATE] = "body";
              } else {
                this[STATE] = "header";
                entry.end();
              }
              if (!this[READENTRY]) {
                this[QUEUE].push(entry);
                this[NEXTENTRY]();
              } else {
                this[QUEUE].push(entry);
              }
            }
          }
        }
      }
    }
  }
  [CLOSESTREAM]() {
    nextTick(() => this.emit("close"));
  }
  [PROCESSENTRY](entry) {
    let go = true;
    if (!entry) {
      this[READENTRY] = null;
      go = false;
    } else if (Array.isArray(entry)) {
      this.emit.apply(this, entry);
    } else {
      this[READENTRY] = entry;
      this.emit("entry", entry);
      if (!entry.emittedEnd) {
        entry.on("end", (_) => this[NEXTENTRY]());
        go = false;
      }
    }
    return go;
  }
  [NEXTENTRY]() {
    do {
    } while (this[PROCESSENTRY](this[QUEUE].shift()));
    if (!this[QUEUE].length) {
      const re = this[READENTRY];
      const drainNow = !re || re.flowing || re.size === re.remain;
      if (drainNow) {
        if (!this[WRITING]) {
          this.emit("drain");
        }
      } else {
        re.once("drain", (_) => this.emit("drain"));
      }
    }
  }
  [CONSUMEBODY](chunk, position) {
    const entry = this[WRITEENTRY];
    const br = entry.blockRemain;
    const c = br >= chunk.length && position === 0 ? chunk : chunk.slice(position, position + br);
    entry.write(c);
    if (!entry.blockRemain) {
      this[STATE] = "header";
      this[WRITEENTRY] = null;
      entry.end();
    }
    return c.length;
  }
  [CONSUMEMETA](chunk, position) {
    const entry = this[WRITEENTRY];
    const ret = this[CONSUMEBODY](chunk, position);
    if (!this[WRITEENTRY]) {
      this[EMITMETA](entry);
    }
    return ret;
  }
  [EMIT](ev, data, extra) {
    if (!this[QUEUE].length && !this[READENTRY]) {
      this.emit(ev, data, extra);
    } else {
      this[QUEUE].push([ev, data, extra]);
    }
  }
  [EMITMETA](entry) {
    this[EMIT]("meta", this[META]);
    switch (entry.type) {
      case "ExtendedHeader":
      case "OldExtendedHeader":
        this[EX] = Pax2.parse(this[META], this[EX], false);
        break;
      case "GlobalExtendedHeader":
        this[GEX] = Pax2.parse(this[META], this[GEX], true);
        break;
      case "NextFileHasLongPath":
      case "OldGnuLongPath":
        this[EX] = this[EX] || /* @__PURE__ */ Object.create(null);
        this[EX].path = this[META].replace(/\0.*/, "");
        break;
      case "NextFileHasLongLinkpath":
        this[EX] = this[EX] || /* @__PURE__ */ Object.create(null);
        this[EX].linkpath = this[META].replace(/\0.*/, "");
        break;
      default:
        throw new Error("unknown meta: " + entry.type);
    }
  }
  abort(error) {
    this[ABORTED] = true;
    this.emit("abort", error);
    this.warn("TAR_ABORT", error, { recoverable: false });
  }
  write(chunk) {
    if (this[ABORTED]) {
      return;
    }
    const needSniff = this[UNZIP] === null || this.brotli === void 0 && this[UNZIP] === false;
    if (needSniff && chunk) {
      if (this[BUFFER]) {
        chunk = Buffer.concat([this[BUFFER], chunk]);
        this[BUFFER] = null;
      }
      if (chunk.length < gzipHeader.length) {
        this[BUFFER] = chunk;
        return true;
      }
      for (let i = 0; this[UNZIP] === null && i < gzipHeader.length; i++) {
        if (chunk[i] !== gzipHeader[i]) {
          this[UNZIP] = false;
        }
      }
      const maybeBrotli = this.brotli === void 0;
      if (this[UNZIP] === false && maybeBrotli) {
        if (chunk.length < 512) {
          if (this[ENDED$1]) {
            this.brotli = true;
          } else {
            this[BUFFER] = chunk;
            return true;
          }
        } else {
          try {
            new Header2(chunk.slice(0, 512));
            this.brotli = false;
          } catch (_) {
            this.brotli = true;
          }
        }
      }
      if (this[UNZIP] === null || this[UNZIP] === false && this.brotli) {
        const ended = this[ENDED$1];
        this[ENDED$1] = false;
        this[UNZIP] = this[UNZIP] === null ? new zlib.Unzip() : new zlib.BrotliDecompress();
        this[UNZIP].on("data", (chunk2) => this[CONSUMECHUNK](chunk2));
        this[UNZIP].on("error", (er) => this.abort(er));
        this[UNZIP].on("end", (_) => {
          this[ENDED$1] = true;
          this[CONSUMECHUNK]();
        });
        this[WRITING] = true;
        const ret2 = this[UNZIP][ended ? "end" : "write"](chunk);
        this[WRITING] = false;
        return ret2;
      }
    }
    this[WRITING] = true;
    if (this[UNZIP]) {
      this[UNZIP].write(chunk);
    } else {
      this[CONSUMECHUNK](chunk);
    }
    this[WRITING] = false;
    const ret = this[QUEUE].length ? false : this[READENTRY] ? this[READENTRY].flowing : true;
    if (!ret && !this[QUEUE].length) {
      this[READENTRY].once("drain", (_) => this.emit("drain"));
    }
    return ret;
  }
  [BUFFERCONCAT](c) {
    if (c && !this[ABORTED]) {
      this[BUFFER] = this[BUFFER] ? Buffer.concat([this[BUFFER], c]) : c;
    }
  }
  [MAYBEEND]() {
    if (this[ENDED$1] && !this[EMITTEDEND] && !this[ABORTED] && !this[CONSUMING]) {
      this[EMITTEDEND] = true;
      const entry = this[WRITEENTRY];
      if (entry && entry.blockRemain) {
        const have = this[BUFFER] ? this[BUFFER].length : 0;
        this.warn("TAR_BAD_ARCHIVE", `Truncated input (needed ${entry.blockRemain} more bytes, only ${have} available)`, { entry });
        if (this[BUFFER]) {
          entry.write(this[BUFFER]);
        }
        entry.end();
      }
      this[EMIT](DONE);
    }
  }
  [CONSUMECHUNK](chunk) {
    if (this[CONSUMING]) {
      this[BUFFERCONCAT](chunk);
    } else if (!chunk && !this[BUFFER]) {
      this[MAYBEEND]();
    } else {
      this[CONSUMING] = true;
      if (this[BUFFER]) {
        this[BUFFERCONCAT](chunk);
        const c = this[BUFFER];
        this[BUFFER] = null;
        this[CONSUMECHUNKSUB](c);
      } else {
        this[CONSUMECHUNKSUB](chunk);
      }
      while (this[BUFFER] && this[BUFFER].length >= 512 && !this[ABORTED] && !this[SAW_EOF]) {
        const c = this[BUFFER];
        this[BUFFER] = null;
        this[CONSUMECHUNKSUB](c);
      }
      this[CONSUMING] = false;
    }
    if (!this[BUFFER] || this[ENDED$1]) {
      this[MAYBEEND]();
    }
  }
  [CONSUMECHUNKSUB](chunk) {
    let position = 0;
    const length = chunk.length;
    while (position + 512 <= length && !this[ABORTED] && !this[SAW_EOF]) {
      switch (this[STATE]) {
        case "begin":
        case "header":
          this[CONSUMEHEADER](chunk, position);
          position += 512;
          break;
        case "ignore":
        case "body":
          position += this[CONSUMEBODY](chunk, position);
          break;
        case "meta":
          position += this[CONSUMEMETA](chunk, position);
          break;
        default:
          throw new Error("invalid state: " + this[STATE]);
      }
    }
    if (position < length) {
      if (this[BUFFER]) {
        this[BUFFER] = Buffer.concat([chunk.slice(position), this[BUFFER]]);
      } else {
        this[BUFFER] = chunk.slice(position);
      }
    }
  }
  end(chunk) {
    if (!this[ABORTED]) {
      if (this[UNZIP]) {
        this[UNZIP].end(chunk);
      } else {
        this[ENDED$1] = true;
        if (this.brotli === void 0) chunk = chunk || Buffer.alloc(0);
        this.write(chunk);
      }
    }
  }
});
var mkdir$1 = { exports: {} };
const { promisify } = require$$0$3;
const fs$6 = fs$a;
const optsArg$1 = (opts) => {
  if (!opts)
    opts = { mode: 511, fs: fs$6 };
  else if (typeof opts === "object")
    opts = { mode: 511, fs: fs$6, ...opts };
  else if (typeof opts === "number")
    opts = { mode: opts, fs: fs$6 };
  else if (typeof opts === "string")
    opts = { mode: parseInt(opts, 8), fs: fs$6 };
  else
    throw new TypeError("invalid options argument");
  opts.mkdir = opts.mkdir || opts.fs.mkdir || fs$6.mkdir;
  opts.mkdirAsync = promisify(opts.mkdir);
  opts.stat = opts.stat || opts.fs.stat || fs$6.stat;
  opts.statAsync = promisify(opts.stat);
  opts.statSync = opts.statSync || opts.fs.statSync || fs$6.statSync;
  opts.mkdirSync = opts.mkdirSync || opts.fs.mkdirSync || fs$6.mkdirSync;
  return opts;
};
var optsArg_1 = optsArg$1;
const platform$3 = process.env.__TESTING_MKDIRP_PLATFORM__ || process.platform;
const { resolve, parse } = path$7;
const pathArg$1 = (path2) => {
  if (/\0/.test(path2)) {
    throw Object.assign(
      new TypeError("path must be a string without null bytes"),
      {
        path: path2,
        code: "ERR_INVALID_ARG_VALUE"
      }
    );
  }
  path2 = resolve(path2);
  if (platform$3 === "win32") {
    const badWinChars = /[*|"<>?:]/;
    const { root } = parse(path2);
    if (badWinChars.test(path2.substr(root.length))) {
      throw Object.assign(new Error("Illegal characters in path."), {
        path: path2,
        code: "EINVAL"
      });
    }
  }
  return path2;
};
var pathArg_1 = pathArg$1;
const { dirname: dirname$2 } = path$7;
const findMade$1 = (opts, parent, path2 = void 0) => {
  if (path2 === parent)
    return Promise.resolve();
  return opts.statAsync(parent).then(
    (st) => st.isDirectory() ? path2 : void 0,
    // will fail later
    (er) => er.code === "ENOENT" ? findMade$1(opts, dirname$2(parent), parent) : void 0
  );
};
const findMadeSync$1 = (opts, parent, path2 = void 0) => {
  if (path2 === parent)
    return void 0;
  try {
    return opts.statSync(parent).isDirectory() ? path2 : void 0;
  } catch (er) {
    return er.code === "ENOENT" ? findMadeSync$1(opts, dirname$2(parent), parent) : void 0;
  }
};
var findMade_1 = { findMade: findMade$1, findMadeSync: findMadeSync$1 };
const { dirname: dirname$1 } = path$7;
const mkdirpManual$2 = (path2, opts, made) => {
  opts.recursive = false;
  const parent = dirname$1(path2);
  if (parent === path2) {
    return opts.mkdirAsync(path2, opts).catch((er) => {
      if (er.code !== "EISDIR")
        throw er;
    });
  }
  return opts.mkdirAsync(path2, opts).then(() => made || path2, (er) => {
    if (er.code === "ENOENT")
      return mkdirpManual$2(parent, opts).then((made2) => mkdirpManual$2(path2, opts, made2));
    if (er.code !== "EEXIST" && er.code !== "EROFS")
      throw er;
    return opts.statAsync(path2).then((st) => {
      if (st.isDirectory())
        return made;
      else
        throw er;
    }, () => {
      throw er;
    });
  });
};
const mkdirpManualSync$2 = (path2, opts, made) => {
  const parent = dirname$1(path2);
  opts.recursive = false;
  if (parent === path2) {
    try {
      return opts.mkdirSync(path2, opts);
    } catch (er) {
      if (er.code !== "EISDIR")
        throw er;
      else
        return;
    }
  }
  try {
    opts.mkdirSync(path2, opts);
    return made || path2;
  } catch (er) {
    if (er.code === "ENOENT")
      return mkdirpManualSync$2(path2, opts, mkdirpManualSync$2(parent, opts, made));
    if (er.code !== "EEXIST" && er.code !== "EROFS")
      throw er;
    try {
      if (!opts.statSync(path2).isDirectory())
        throw er;
    } catch (_) {
      throw er;
    }
  }
};
var mkdirpManual_1 = { mkdirpManual: mkdirpManual$2, mkdirpManualSync: mkdirpManualSync$2 };
const { dirname } = path$7;
const { findMade, findMadeSync } = findMade_1;
const { mkdirpManual: mkdirpManual$1, mkdirpManualSync: mkdirpManualSync$1 } = mkdirpManual_1;
const mkdirpNative$1 = (path2, opts) => {
  opts.recursive = true;
  const parent = dirname(path2);
  if (parent === path2)
    return opts.mkdirAsync(path2, opts);
  return findMade(opts, path2).then((made) => opts.mkdirAsync(path2, opts).then(() => made).catch((er) => {
    if (er.code === "ENOENT")
      return mkdirpManual$1(path2, opts);
    else
      throw er;
  }));
};
const mkdirpNativeSync$1 = (path2, opts) => {
  opts.recursive = true;
  const parent = dirname(path2);
  if (parent === path2)
    return opts.mkdirSync(path2, opts);
  const made = findMadeSync(opts, path2);
  try {
    opts.mkdirSync(path2, opts);
    return made;
  } catch (er) {
    if (er.code === "ENOENT")
      return mkdirpManualSync$1(path2, opts);
    else
      throw er;
  }
};
var mkdirpNative_1 = { mkdirpNative: mkdirpNative$1, mkdirpNativeSync: mkdirpNativeSync$1 };
const fs$5 = fs$a;
const version = process.env.__TESTING_MKDIRP_NODE_VERSION__ || process.version;
const versArr = version.replace(/^v/, "").split(".");
const hasNative = +versArr[0] > 10 || +versArr[0] === 10 && +versArr[1] >= 12;
const useNative$1 = !hasNative ? () => false : (opts) => opts.mkdir === fs$5.mkdir;
const useNativeSync$1 = !hasNative ? () => false : (opts) => opts.mkdirSync === fs$5.mkdirSync;
var useNative_1 = { useNative: useNative$1, useNativeSync: useNativeSync$1 };
const optsArg = optsArg_1;
const pathArg = pathArg_1;
const { mkdirpNative, mkdirpNativeSync } = mkdirpNative_1;
const { mkdirpManual, mkdirpManualSync } = mkdirpManual_1;
const { useNative, useNativeSync } = useNative_1;
const mkdirp$1 = (path2, opts) => {
  path2 = pathArg(path2);
  opts = optsArg(opts);
  return useNative(opts) ? mkdirpNative(path2, opts) : mkdirpManual(path2, opts);
};
const mkdirpSync = (path2, opts) => {
  path2 = pathArg(path2);
  opts = optsArg(opts);
  return useNativeSync(opts) ? mkdirpNativeSync(path2, opts) : mkdirpManualSync(path2, opts);
};
mkdirp$1.sync = mkdirpSync;
mkdirp$1.native = (path2, opts) => mkdirpNative(pathArg(path2), optsArg(opts));
mkdirp$1.manual = (path2, opts) => mkdirpManual(pathArg(path2), optsArg(opts));
mkdirp$1.nativeSync = (path2, opts) => mkdirpNativeSync(pathArg(path2), optsArg(opts));
mkdirp$1.manualSync = (path2, opts) => mkdirpManualSync(pathArg(path2), optsArg(opts));
var mkdirp_1 = mkdirp$1;
const fs$4 = fs$a;
const path$3 = path$7;
const LCHOWN = fs$4.lchown ? "lchown" : "chown";
const LCHOWNSYNC = fs$4.lchownSync ? "lchownSync" : "chownSync";
const needEISDIRHandled = fs$4.lchown && !process.version.match(/v1[1-9]+\./) && !process.version.match(/v10\.[6-9]/);
const lchownSync = (path2, uid, gid) => {
  try {
    return fs$4[LCHOWNSYNC](path2, uid, gid);
  } catch (er) {
    if (er.code !== "ENOENT")
      throw er;
  }
};
const chownSync = (path2, uid, gid) => {
  try {
    return fs$4.chownSync(path2, uid, gid);
  } catch (er) {
    if (er.code !== "ENOENT")
      throw er;
  }
};
const handleEISDIR = needEISDIRHandled ? (path2, uid, gid, cb) => (er) => {
  if (!er || er.code !== "EISDIR")
    cb(er);
  else
    fs$4.chown(path2, uid, gid, cb);
} : (_, __, ___, cb) => cb;
const handleEISDirSync = needEISDIRHandled ? (path2, uid, gid) => {
  try {
    return lchownSync(path2, uid, gid);
  } catch (er) {
    if (er.code !== "EISDIR")
      throw er;
    chownSync(path2, uid, gid);
  }
} : (path2, uid, gid) => lchownSync(path2, uid, gid);
const nodeVersion = process.version;
let readdir = (path2, options, cb) => fs$4.readdir(path2, options, cb);
let readdirSync = (path2, options) => fs$4.readdirSync(path2, options);
if (/^v4\./.test(nodeVersion))
  readdir = (path2, options, cb) => fs$4.readdir(path2, cb);
const chown = (cpath, uid, gid, cb) => {
  fs$4[LCHOWN](cpath, uid, gid, handleEISDIR(cpath, uid, gid, (er) => {
    cb(er && er.code !== "ENOENT" ? er : null);
  }));
};
const chownrKid = (p, child, uid, gid, cb) => {
  if (typeof child === "string")
    return fs$4.lstat(path$3.resolve(p, child), (er, stats) => {
      if (er)
        return cb(er.code !== "ENOENT" ? er : null);
      stats.name = child;
      chownrKid(p, stats, uid, gid, cb);
    });
  if (child.isDirectory()) {
    chownr$1(path$3.resolve(p, child.name), uid, gid, (er) => {
      if (er)
        return cb(er);
      const cpath = path$3.resolve(p, child.name);
      chown(cpath, uid, gid, cb);
    });
  } else {
    const cpath = path$3.resolve(p, child.name);
    chown(cpath, uid, gid, cb);
  }
};
const chownr$1 = (p, uid, gid, cb) => {
  readdir(p, { withFileTypes: true }, (er, children) => {
    if (er) {
      if (er.code === "ENOENT")
        return cb();
      else if (er.code !== "ENOTDIR" && er.code !== "ENOTSUP")
        return cb(er);
    }
    if (er || !children.length)
      return chown(p, uid, gid, cb);
    let len = children.length;
    let errState = null;
    const then = (er2) => {
      if (errState)
        return;
      if (er2)
        return cb(errState = er2);
      if (--len === 0)
        return chown(p, uid, gid, cb);
    };
    children.forEach((child) => chownrKid(p, child, uid, gid, then));
  });
};
const chownrKidSync = (p, child, uid, gid) => {
  if (typeof child === "string") {
    try {
      const stats = fs$4.lstatSync(path$3.resolve(p, child));
      stats.name = child;
      child = stats;
    } catch (er) {
      if (er.code === "ENOENT")
        return;
      else
        throw er;
    }
  }
  if (child.isDirectory())
    chownrSync(path$3.resolve(p, child.name), uid, gid);
  handleEISDirSync(path$3.resolve(p, child.name), uid, gid);
};
const chownrSync = (p, uid, gid) => {
  let children;
  try {
    children = readdirSync(p, { withFileTypes: true });
  } catch (er) {
    if (er.code === "ENOENT")
      return;
    else if (er.code === "ENOTDIR" || er.code === "ENOTSUP")
      return handleEISDirSync(p, uid, gid);
    else
      throw er;
  }
  if (children && children.length)
    children.forEach((child) => chownrKidSync(p, child, uid, gid));
  return handleEISDirSync(p, uid, gid);
};
var chownr_1 = chownr$1;
chownr$1.sync = chownrSync;
const mkdirp = mkdirp_1;
const fs$3 = fs$a;
const path$2 = path$7;
const chownr = chownr_1;
const normPath$1 = normalizeWindowsPath;
class SymlinkError extends Error {
  constructor(symlink, path2) {
    super("Cannot extract through symbolic link");
    this.path = path2;
    this.symlink = symlink;
  }
  get name() {
    return "SylinkError";
  }
}
class CwdError extends Error {
  constructor(path2, code) {
    super(code + ": Cannot cd into '" + path2 + "'");
    this.path = path2;
    this.code = code;
  }
  get name() {
    return "CwdError";
  }
}
const cGet = (cache, key) => cache.get(normPath$1(key));
const cSet = (cache, key, val) => cache.set(normPath$1(key), val);
const checkCwd = (dir, cb) => {
  fs$3.stat(dir, (er, st) => {
    if (er || !st.isDirectory()) {
      er = new CwdError(dir, er && er.code || "ENOTDIR");
    }
    cb(er);
  });
};
mkdir$1.exports = (dir, opt, cb) => {
  dir = normPath$1(dir);
  const umask = opt.umask;
  const mode = opt.mode | 448;
  const needChmod = (mode & umask) !== 0;
  const uid = opt.uid;
  const gid = opt.gid;
  const doChown = typeof uid === "number" && typeof gid === "number" && (uid !== opt.processUid || gid !== opt.processGid);
  const preserve = opt.preserve;
  const unlink = opt.unlink;
  const cache = opt.cache;
  const cwd = normPath$1(opt.cwd);
  const done = (er, created) => {
    if (er) {
      cb(er);
    } else {
      cSet(cache, dir, true);
      if (created && doChown) {
        chownr(created, uid, gid, (er2) => done(er2));
      } else if (needChmod) {
        fs$3.chmod(dir, mode, cb);
      } else {
        cb();
      }
    }
  };
  if (cache && cGet(cache, dir) === true) {
    return done();
  }
  if (dir === cwd) {
    return checkCwd(dir, done);
  }
  if (preserve) {
    return mkdirp(dir, { mode }).then((made) => done(null, made), done);
  }
  const sub = normPath$1(path$2.relative(cwd, dir));
  const parts = sub.split("/");
  mkdir_(cwd, parts, mode, cache, unlink, cwd, null, done);
};
const mkdir_ = (base, parts, mode, cache, unlink, cwd, created, cb) => {
  if (!parts.length) {
    return cb(null, created);
  }
  const p = parts.shift();
  const part = normPath$1(path$2.resolve(base + "/" + p));
  if (cGet(cache, part)) {
    return mkdir_(part, parts, mode, cache, unlink, cwd, created, cb);
  }
  fs$3.mkdir(part, mode, onmkdir(part, parts, mode, cache, unlink, cwd, created, cb));
};
const onmkdir = (part, parts, mode, cache, unlink, cwd, created, cb) => (er) => {
  if (er) {
    fs$3.lstat(part, (statEr, st) => {
      if (statEr) {
        statEr.path = statEr.path && normPath$1(statEr.path);
        cb(statEr);
      } else if (st.isDirectory()) {
        mkdir_(part, parts, mode, cache, unlink, cwd, created, cb);
      } else if (unlink) {
        fs$3.unlink(part, (er2) => {
          if (er2) {
            return cb(er2);
          }
          fs$3.mkdir(part, mode, onmkdir(part, parts, mode, cache, unlink, cwd, created, cb));
        });
      } else if (st.isSymbolicLink()) {
        return cb(new SymlinkError(part, part + "/" + parts.join("/")));
      } else {
        cb(er);
      }
    });
  } else {
    created = created || part;
    mkdir_(part, parts, mode, cache, unlink, cwd, created, cb);
  }
};
const checkCwdSync = (dir) => {
  let ok = false;
  let code = "ENOTDIR";
  try {
    ok = fs$3.statSync(dir).isDirectory();
  } catch (er) {
    code = er.code;
  } finally {
    if (!ok) {
      throw new CwdError(dir, code);
    }
  }
};
mkdir$1.exports.sync = (dir, opt) => {
  dir = normPath$1(dir);
  const umask = opt.umask;
  const mode = opt.mode | 448;
  const needChmod = (mode & umask) !== 0;
  const uid = opt.uid;
  const gid = opt.gid;
  const doChown = typeof uid === "number" && typeof gid === "number" && (uid !== opt.processUid || gid !== opt.processGid);
  const preserve = opt.preserve;
  const unlink = opt.unlink;
  const cache = opt.cache;
  const cwd = normPath$1(opt.cwd);
  const done = (created2) => {
    cSet(cache, dir, true);
    if (created2 && doChown) {
      chownr.sync(created2, uid, gid);
    }
    if (needChmod) {
      fs$3.chmodSync(dir, mode);
    }
  };
  if (cache && cGet(cache, dir) === true) {
    return done();
  }
  if (dir === cwd) {
    checkCwdSync(cwd);
    return done();
  }
  if (preserve) {
    return done(mkdirp.sync(dir, mode));
  }
  const sub = normPath$1(path$2.relative(cwd, dir));
  const parts = sub.split("/");
  let created = null;
  for (let p = parts.shift(), part = cwd; p && (part += "/" + p); p = parts.shift()) {
    part = normPath$1(path$2.resolve(part));
    if (cGet(cache, part)) {
      continue;
    }
    try {
      fs$3.mkdirSync(part, mode);
      created = created || part;
      cSet(cache, part, true);
    } catch (er) {
      const st = fs$3.lstatSync(part);
      if (st.isDirectory()) {
        cSet(cache, part, true);
        continue;
      } else if (unlink) {
        fs$3.unlinkSync(part);
        fs$3.mkdirSync(part, mode);
        created = created || part;
        cSet(cache, part, true);
        continue;
      } else if (st.isSymbolicLink()) {
        return new SymlinkError(part, part + "/" + parts.join("/"));
      }
    }
  }
  return done(created);
};
var mkdirExports = mkdir$1.exports;
const normalizeCache = /* @__PURE__ */ Object.create(null);
const { hasOwnProperty } = Object.prototype;
var normalizeUnicode = (s) => {
  if (!hasOwnProperty.call(normalizeCache, s)) {
    normalizeCache[s] = s.normalize("NFD");
  }
  return normalizeCache[s];
};
const assert$1 = require$$0$2;
const normalize$1 = normalizeUnicode;
const stripSlashes = stripTrailingSlashes;
const { join } = path$7;
const platform$2 = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
const isWindows$2 = platform$2 === "win32";
var pathReservations$1 = () => {
  const queues = /* @__PURE__ */ new Map();
  const reservations = /* @__PURE__ */ new Map();
  const getDirs = (path2) => {
    const dirs = path2.split("/").slice(0, -1).reduce((set, path22) => {
      if (set.length) {
        path22 = join(set[set.length - 1], path22);
      }
      set.push(path22 || "/");
      return set;
    }, []);
    return dirs;
  };
  const running = /* @__PURE__ */ new Set();
  const getQueues = (fn) => {
    const res = reservations.get(fn);
    if (!res) {
      throw new Error("function does not have any path reservations");
    }
    return {
      paths: res.paths.map((path2) => queues.get(path2)),
      dirs: [...res.dirs].map((path2) => queues.get(path2))
    };
  };
  const check = (fn) => {
    const { paths, dirs } = getQueues(fn);
    return paths.every((q) => q[0] === fn) && dirs.every((q) => q[0] instanceof Set && q[0].has(fn));
  };
  const run = (fn) => {
    if (running.has(fn) || !check(fn)) {
      return false;
    }
    running.add(fn);
    fn(() => clear(fn));
    return true;
  };
  const clear = (fn) => {
    if (!running.has(fn)) {
      return false;
    }
    const { paths, dirs } = reservations.get(fn);
    const next = /* @__PURE__ */ new Set();
    paths.forEach((path2) => {
      const q = queues.get(path2);
      assert$1.equal(q[0], fn);
      if (q.length === 1) {
        queues.delete(path2);
      } else {
        q.shift();
        if (typeof q[0] === "function") {
          next.add(q[0]);
        } else {
          q[0].forEach((fn2) => next.add(fn2));
        }
      }
    });
    dirs.forEach((dir) => {
      const q = queues.get(dir);
      assert$1(q[0] instanceof Set);
      if (q[0].size === 1 && q.length === 1) {
        queues.delete(dir);
      } else if (q[0].size === 1) {
        q.shift();
        next.add(q[0]);
      } else {
        q[0].delete(fn);
      }
    });
    running.delete(fn);
    next.forEach((fn2) => run(fn2));
    return true;
  };
  const reserve = (paths, fn) => {
    paths = isWindows$2 ? ["win32 parallelization disabled"] : paths.map((p) => {
      return stripSlashes(join(normalize$1(p))).toLowerCase();
    });
    const dirs = new Set(
      paths.map((path2) => getDirs(path2)).reduce((a, b) => a.concat(b))
    );
    reservations.set(fn, { dirs, paths });
    paths.forEach((path2) => {
      const q = queues.get(path2);
      if (!q) {
        queues.set(path2, [fn]);
      } else {
        q.push(fn);
      }
    });
    dirs.forEach((dir) => {
      const q = queues.get(dir);
      if (!q) {
        queues.set(dir, [/* @__PURE__ */ new Set([fn])]);
      } else if (q[q.length - 1] instanceof Set) {
        q[q.length - 1].add(fn);
      } else {
        q.push(/* @__PURE__ */ new Set([fn]));
      }
    });
    return run(fn);
  };
  return { check, reserve };
};
const platform$1 = process.env.__FAKE_PLATFORM__ || process.platform;
const isWindows$1 = platform$1 === "win32";
const fs$2 = commonjsGlobal.__FAKE_TESTING_FS__ || fs$a;
const { O_CREAT, O_TRUNC, O_WRONLY, UV_FS_O_FILEMAP = 0 } = fs$2.constants;
const fMapEnabled = isWindows$1 && !!UV_FS_O_FILEMAP;
const fMapLimit = 512 * 1024;
const fMapFlag = UV_FS_O_FILEMAP | O_TRUNC | O_CREAT | O_WRONLY;
var getWriteFlag = !fMapEnabled ? () => "w" : (size) => size < fMapLimit ? fMapFlag : "w";
const assert = require$$0$2;
const Parser2 = parse$1;
const fs$1 = fs$a;
const fsm$1 = fsMinipass;
const path$1 = path$7;
const mkdir = mkdirExports;
const wc = winchars$1;
const pathReservations = pathReservations$1;
const stripAbsolutePath = stripAbsolutePath$2;
const normPath = normalizeWindowsPath;
const stripSlash$1 = stripTrailingSlashes;
const normalize = normalizeUnicode;
const ONENTRY = Symbol("onEntry");
const CHECKFS = Symbol("checkFs");
const CHECKFS2 = Symbol("checkFs2");
const PRUNECACHE = Symbol("pruneCache");
const ISREUSABLE = Symbol("isReusable");
const MAKEFS = Symbol("makeFs");
const FILE = Symbol("file");
const DIRECTORY = Symbol("directory");
const LINK = Symbol("link");
const SYMLINK = Symbol("symlink");
const HARDLINK = Symbol("hardlink");
const UNSUPPORTED = Symbol("unsupported");
const CHECKPATH = Symbol("checkPath");
const MKDIR = Symbol("mkdir");
const ONERROR = Symbol("onError");
const PENDING = Symbol("pending");
const PEND = Symbol("pend");
const UNPEND = Symbol("unpend");
const ENDED = Symbol("ended");
const MAYBECLOSE = Symbol("maybeClose");
const SKIP = Symbol("skip");
const DOCHOWN = Symbol("doChown");
const UID = Symbol("uid");
const GID = Symbol("gid");
const CHECKED_CWD = Symbol("checkedCwd");
const crypto = require$$12;
const getFlag = getWriteFlag;
const platform = process.env.TESTING_TAR_FAKE_PLATFORM || process.platform;
const isWindows = platform === "win32";
const DEFAULT_MAX_DEPTH = 1024;
const unlinkFile = (path2, cb) => {
  if (!isWindows) {
    return fs$1.unlink(path2, cb);
  }
  const name = path2 + ".DELETE." + crypto.randomBytes(16).toString("hex");
  fs$1.rename(path2, name, (er) => {
    if (er) {
      return cb(er);
    }
    fs$1.unlink(name, cb);
  });
};
const unlinkFileSync = (path2) => {
  if (!isWindows) {
    return fs$1.unlinkSync(path2);
  }
  const name = path2 + ".DELETE." + crypto.randomBytes(16).toString("hex");
  fs$1.renameSync(path2, name);
  fs$1.unlinkSync(name);
};
const uint32 = (a, b, c) => a === a >>> 0 ? a : b === b >>> 0 ? b : c;
const cacheKeyNormalize = (path2) => stripSlash$1(normPath(normalize(path2))).toLowerCase();
const pruneCache = (cache, abs) => {
  abs = cacheKeyNormalize(abs);
  for (const path2 of cache.keys()) {
    const pnorm = cacheKeyNormalize(path2);
    if (pnorm === abs || pnorm.indexOf(abs + "/") === 0) {
      cache.delete(path2);
    }
  }
};
const dropCache = (cache) => {
  for (const key of cache.keys()) {
    cache.delete(key);
  }
};
let Unpack$1 = class Unpack extends Parser2 {
  constructor(opt) {
    if (!opt) {
      opt = {};
    }
    opt.ondone = (_) => {
      this[ENDED] = true;
      this[MAYBECLOSE]();
    };
    super(opt);
    this[CHECKED_CWD] = false;
    this.reservations = pathReservations();
    this.transform = typeof opt.transform === "function" ? opt.transform : null;
    this.writable = true;
    this.readable = false;
    this[PENDING] = 0;
    this[ENDED] = false;
    this.dirCache = opt.dirCache || /* @__PURE__ */ new Map();
    if (typeof opt.uid === "number" || typeof opt.gid === "number") {
      if (typeof opt.uid !== "number" || typeof opt.gid !== "number") {
        throw new TypeError("cannot set owner without number uid and gid");
      }
      if (opt.preserveOwner) {
        throw new TypeError(
          "cannot preserve owner in archive and also set owner explicitly"
        );
      }
      this.uid = opt.uid;
      this.gid = opt.gid;
      this.setOwner = true;
    } else {
      this.uid = null;
      this.gid = null;
      this.setOwner = false;
    }
    if (opt.preserveOwner === void 0 && typeof opt.uid !== "number") {
      this.preserveOwner = process.getuid && process.getuid() === 0;
    } else {
      this.preserveOwner = !!opt.preserveOwner;
    }
    this.processUid = (this.preserveOwner || this.setOwner) && process.getuid ? process.getuid() : null;
    this.processGid = (this.preserveOwner || this.setOwner) && process.getgid ? process.getgid() : null;
    this.maxDepth = typeof opt.maxDepth === "number" ? opt.maxDepth : DEFAULT_MAX_DEPTH;
    this.forceChown = opt.forceChown === true;
    this.win32 = !!opt.win32 || isWindows;
    this.newer = !!opt.newer;
    this.keep = !!opt.keep;
    this.noMtime = !!opt.noMtime;
    this.preservePaths = !!opt.preservePaths;
    this.unlink = !!opt.unlink;
    this.cwd = normPath(path$1.resolve(opt.cwd || process.cwd()));
    this.strip = +opt.strip || 0;
    this.processUmask = opt.noChmod ? 0 : process.umask();
    this.umask = typeof opt.umask === "number" ? opt.umask : this.processUmask;
    this.dmode = opt.dmode || 511 & ~this.umask;
    this.fmode = opt.fmode || 438 & ~this.umask;
    this.on("entry", (entry) => this[ONENTRY](entry));
  }
  // a bad or damaged archive is a warning for Parser, but an error
  // when extracting.  Mark those errors as unrecoverable, because
  // the Unpack contract cannot be met.
  warn(code, msg, data = {}) {
    if (code === "TAR_BAD_ARCHIVE" || code === "TAR_ABORT") {
      data.recoverable = false;
    }
    return super.warn(code, msg, data);
  }
  [MAYBECLOSE]() {
    if (this[ENDED] && this[PENDING] === 0) {
      this.emit("prefinish");
      this.emit("finish");
      this.emit("end");
    }
  }
  [CHECKPATH](entry) {
    const p = normPath(entry.path);
    const parts = p.split("/");
    if (this.strip) {
      if (parts.length < this.strip) {
        return false;
      }
      if (entry.type === "Link") {
        const linkparts = normPath(entry.linkpath).split("/");
        if (linkparts.length >= this.strip) {
          entry.linkpath = linkparts.slice(this.strip).join("/");
        } else {
          return false;
        }
      }
      parts.splice(0, this.strip);
      entry.path = parts.join("/");
    }
    if (isFinite(this.maxDepth) && parts.length > this.maxDepth) {
      this.warn("TAR_ENTRY_ERROR", "path excessively deep", {
        entry,
        path: p,
        depth: parts.length,
        maxDepth: this.maxDepth
      });
      return false;
    }
    if (!this.preservePaths) {
      if (parts.includes("..") || isWindows && /^[a-z]:\.\.$/i.test(parts[0])) {
        this.warn("TAR_ENTRY_ERROR", `path contains '..'`, {
          entry,
          path: p
        });
        return false;
      }
      const [root, stripped] = stripAbsolutePath(p);
      if (root) {
        entry.path = stripped;
        this.warn("TAR_ENTRY_INFO", `stripping ${root} from absolute path`, {
          entry,
          path: p
        });
      }
    }
    if (path$1.isAbsolute(entry.path)) {
      entry.absolute = normPath(path$1.resolve(entry.path));
    } else {
      entry.absolute = normPath(path$1.resolve(this.cwd, entry.path));
    }
    if (!this.preservePaths && entry.absolute.indexOf(this.cwd + "/") !== 0 && entry.absolute !== this.cwd) {
      this.warn("TAR_ENTRY_ERROR", "path escaped extraction target", {
        entry,
        path: normPath(entry.path),
        resolvedPath: entry.absolute,
        cwd: this.cwd
      });
      return false;
    }
    if (entry.absolute === this.cwd && entry.type !== "Directory" && entry.type !== "GNUDumpDir") {
      return false;
    }
    if (this.win32) {
      const { root: aRoot } = path$1.win32.parse(entry.absolute);
      entry.absolute = aRoot + wc.encode(entry.absolute.slice(aRoot.length));
      const { root: pRoot } = path$1.win32.parse(entry.path);
      entry.path = pRoot + wc.encode(entry.path.slice(pRoot.length));
    }
    return true;
  }
  [ONENTRY](entry) {
    if (!this[CHECKPATH](entry)) {
      return entry.resume();
    }
    assert.equal(typeof entry.absolute, "string");
    switch (entry.type) {
      case "Directory":
      case "GNUDumpDir":
        if (entry.mode) {
          entry.mode = entry.mode | 448;
        }
      case "File":
      case "OldFile":
      case "ContiguousFile":
      case "Link":
      case "SymbolicLink":
        return this[CHECKFS](entry);
      case "CharacterDevice":
      case "BlockDevice":
      case "FIFO":
      default:
        return this[UNSUPPORTED](entry);
    }
  }
  [ONERROR](er, entry) {
    if (er.name === "CwdError") {
      this.emit("error", er);
    } else {
      this.warn("TAR_ENTRY_ERROR", er, { entry });
      this[UNPEND]();
      entry.resume();
    }
  }
  [MKDIR](dir, mode, cb) {
    mkdir(normPath(dir), {
      uid: this.uid,
      gid: this.gid,
      processUid: this.processUid,
      processGid: this.processGid,
      umask: this.processUmask,
      preserve: this.preservePaths,
      unlink: this.unlink,
      cache: this.dirCache,
      cwd: this.cwd,
      mode,
      noChmod: this.noChmod
    }, cb);
  }
  [DOCHOWN](entry) {
    return this.forceChown || this.preserveOwner && (typeof entry.uid === "number" && entry.uid !== this.processUid || typeof entry.gid === "number" && entry.gid !== this.processGid) || (typeof this.uid === "number" && this.uid !== this.processUid || typeof this.gid === "number" && this.gid !== this.processGid);
  }
  [UID](entry) {
    return uint32(this.uid, entry.uid, this.processUid);
  }
  [GID](entry) {
    return uint32(this.gid, entry.gid, this.processGid);
  }
  [FILE](entry, fullyDone) {
    const mode = entry.mode & 4095 || this.fmode;
    const stream = new fsm$1.WriteStream(entry.absolute, {
      flags: getFlag(entry.size),
      mode,
      autoClose: false
    });
    stream.on("error", (er) => {
      if (stream.fd) {
        fs$1.close(stream.fd, () => {
        });
      }
      stream.write = () => true;
      this[ONERROR](er, entry);
      fullyDone();
    });
    let actions = 1;
    const done = (er) => {
      if (er) {
        if (stream.fd) {
          fs$1.close(stream.fd, () => {
          });
        }
        this[ONERROR](er, entry);
        fullyDone();
        return;
      }
      if (--actions === 0) {
        fs$1.close(stream.fd, (er2) => {
          if (er2) {
            this[ONERROR](er2, entry);
          } else {
            this[UNPEND]();
          }
          fullyDone();
        });
      }
    };
    stream.on("finish", (_) => {
      const abs = entry.absolute;
      const fd = stream.fd;
      if (entry.mtime && !this.noMtime) {
        actions++;
        const atime = entry.atime || /* @__PURE__ */ new Date();
        const mtime = entry.mtime;
        fs$1.futimes(fd, atime, mtime, (er) => er ? fs$1.utimes(abs, atime, mtime, (er2) => done(er2 && er)) : done());
      }
      if (this[DOCHOWN](entry)) {
        actions++;
        const uid = this[UID](entry);
        const gid = this[GID](entry);
        fs$1.fchown(fd, uid, gid, (er) => er ? fs$1.chown(abs, uid, gid, (er2) => done(er2 && er)) : done());
      }
      done();
    });
    const tx = this.transform ? this.transform(entry) || entry : entry;
    if (tx !== entry) {
      tx.on("error", (er) => {
        this[ONERROR](er, entry);
        fullyDone();
      });
      entry.pipe(tx);
    }
    tx.pipe(stream);
  }
  [DIRECTORY](entry, fullyDone) {
    const mode = entry.mode & 4095 || this.dmode;
    this[MKDIR](entry.absolute, mode, (er) => {
      if (er) {
        this[ONERROR](er, entry);
        fullyDone();
        return;
      }
      let actions = 1;
      const done = (_) => {
        if (--actions === 0) {
          fullyDone();
          this[UNPEND]();
          entry.resume();
        }
      };
      if (entry.mtime && !this.noMtime) {
        actions++;
        fs$1.utimes(entry.absolute, entry.atime || /* @__PURE__ */ new Date(), entry.mtime, done);
      }
      if (this[DOCHOWN](entry)) {
        actions++;
        fs$1.chown(entry.absolute, this[UID](entry), this[GID](entry), done);
      }
      done();
    });
  }
  [UNSUPPORTED](entry) {
    entry.unsupported = true;
    this.warn(
      "TAR_ENTRY_UNSUPPORTED",
      `unsupported entry type: ${entry.type}`,
      { entry }
    );
    entry.resume();
  }
  [SYMLINK](entry, done) {
    this[LINK](entry, entry.linkpath, "symlink", done);
  }
  [HARDLINK](entry, done) {
    const linkpath = normPath(path$1.resolve(this.cwd, entry.linkpath));
    this[LINK](entry, linkpath, "link", done);
  }
  [PEND]() {
    this[PENDING]++;
  }
  [UNPEND]() {
    this[PENDING]--;
    this[MAYBECLOSE]();
  }
  [SKIP](entry) {
    this[UNPEND]();
    entry.resume();
  }
  // Check if we can reuse an existing filesystem entry safely and
  // overwrite it, rather than unlinking and recreating
  // Windows doesn't report a useful nlink, so we just never reuse entries
  [ISREUSABLE](entry, st) {
    return entry.type === "File" && !this.unlink && st.isFile() && st.nlink <= 1 && !isWindows;
  }
  // check if a thing is there, and if so, try to clobber it
  [CHECKFS](entry) {
    this[PEND]();
    const paths = [entry.path];
    if (entry.linkpath) {
      paths.push(entry.linkpath);
    }
    this.reservations.reserve(paths, (done) => this[CHECKFS2](entry, done));
  }
  [PRUNECACHE](entry) {
    if (entry.type === "SymbolicLink") {
      dropCache(this.dirCache);
    } else if (entry.type !== "Directory") {
      pruneCache(this.dirCache, entry.absolute);
    }
  }
  [CHECKFS2](entry, fullyDone) {
    this[PRUNECACHE](entry);
    const done = (er) => {
      this[PRUNECACHE](entry);
      fullyDone(er);
    };
    const checkCwd2 = () => {
      this[MKDIR](this.cwd, this.dmode, (er) => {
        if (er) {
          this[ONERROR](er, entry);
          done();
          return;
        }
        this[CHECKED_CWD] = true;
        start();
      });
    };
    const start = () => {
      if (entry.absolute !== this.cwd) {
        const parent = normPath(path$1.dirname(entry.absolute));
        if (parent !== this.cwd) {
          return this[MKDIR](parent, this.dmode, (er) => {
            if (er) {
              this[ONERROR](er, entry);
              done();
              return;
            }
            afterMakeParent();
          });
        }
      }
      afterMakeParent();
    };
    const afterMakeParent = () => {
      fs$1.lstat(entry.absolute, (lstatEr, st) => {
        if (st && (this.keep || this.newer && st.mtime > entry.mtime)) {
          this[SKIP](entry);
          done();
          return;
        }
        if (lstatEr || this[ISREUSABLE](entry, st)) {
          return this[MAKEFS](null, entry, done);
        }
        if (st.isDirectory()) {
          if (entry.type === "Directory") {
            const needChmod = !this.noChmod && entry.mode && (st.mode & 4095) !== entry.mode;
            const afterChmod = (er) => this[MAKEFS](er, entry, done);
            if (!needChmod) {
              return afterChmod();
            }
            return fs$1.chmod(entry.absolute, entry.mode, afterChmod);
          }
          if (entry.absolute !== this.cwd) {
            return fs$1.rmdir(entry.absolute, (er) => this[MAKEFS](er, entry, done));
          }
        }
        if (entry.absolute === this.cwd) {
          return this[MAKEFS](null, entry, done);
        }
        unlinkFile(entry.absolute, (er) => this[MAKEFS](er, entry, done));
      });
    };
    if (this[CHECKED_CWD]) {
      start();
    } else {
      checkCwd2();
    }
  }
  [MAKEFS](er, entry, done) {
    if (er) {
      this[ONERROR](er, entry);
      done();
      return;
    }
    switch (entry.type) {
      case "File":
      case "OldFile":
      case "ContiguousFile":
        return this[FILE](entry, done);
      case "Link":
        return this[HARDLINK](entry, done);
      case "SymbolicLink":
        return this[SYMLINK](entry, done);
      case "Directory":
      case "GNUDumpDir":
        return this[DIRECTORY](entry, done);
    }
  }
  [LINK](entry, linkpath, link, done) {
    fs$1[link](linkpath, entry.absolute, (er) => {
      if (er) {
        this[ONERROR](er, entry);
      } else {
        this[UNPEND]();
        entry.resume();
      }
      done();
    });
  }
};
const callSync = (fn) => {
  try {
    return [null, fn()];
  } catch (er) {
    return [er, null];
  }
};
class UnpackSync extends Unpack$1 {
  [MAKEFS](er, entry) {
    return super[MAKEFS](er, entry, () => {
    });
  }
  [CHECKFS](entry) {
    this[PRUNECACHE](entry);
    if (!this[CHECKED_CWD]) {
      const er2 = this[MKDIR](this.cwd, this.dmode);
      if (er2) {
        return this[ONERROR](er2, entry);
      }
      this[CHECKED_CWD] = true;
    }
    if (entry.absolute !== this.cwd) {
      const parent = normPath(path$1.dirname(entry.absolute));
      if (parent !== this.cwd) {
        const mkParent = this[MKDIR](parent, this.dmode);
        if (mkParent) {
          return this[ONERROR](mkParent, entry);
        }
      }
    }
    const [lstatEr, st] = callSync(() => fs$1.lstatSync(entry.absolute));
    if (st && (this.keep || this.newer && st.mtime > entry.mtime)) {
      return this[SKIP](entry);
    }
    if (lstatEr || this[ISREUSABLE](entry, st)) {
      return this[MAKEFS](null, entry);
    }
    if (st.isDirectory()) {
      if (entry.type === "Directory") {
        const needChmod = !this.noChmod && entry.mode && (st.mode & 4095) !== entry.mode;
        const [er3] = needChmod ? callSync(() => {
          fs$1.chmodSync(entry.absolute, entry.mode);
        }) : [];
        return this[MAKEFS](er3, entry);
      }
      const [er2] = callSync(() => fs$1.rmdirSync(entry.absolute));
      this[MAKEFS](er2, entry);
    }
    const [er] = entry.absolute === this.cwd ? [] : callSync(() => unlinkFileSync(entry.absolute));
    this[MAKEFS](er, entry);
  }
  [FILE](entry, done) {
    const mode = entry.mode & 4095 || this.fmode;
    const oner = (er) => {
      let closeError;
      try {
        fs$1.closeSync(fd);
      } catch (e) {
        closeError = e;
      }
      if (er || closeError) {
        this[ONERROR](er || closeError, entry);
      }
      done();
    };
    let fd;
    try {
      fd = fs$1.openSync(entry.absolute, getFlag(entry.size), mode);
    } catch (er) {
      return oner(er);
    }
    const tx = this.transform ? this.transform(entry) || entry : entry;
    if (tx !== entry) {
      tx.on("error", (er) => this[ONERROR](er, entry));
      entry.pipe(tx);
    }
    tx.on("data", (chunk) => {
      try {
        fs$1.writeSync(fd, chunk, 0, chunk.length);
      } catch (er) {
        oner(er);
      }
    });
    tx.on("end", (_) => {
      let er = null;
      if (entry.mtime && !this.noMtime) {
        const atime = entry.atime || /* @__PURE__ */ new Date();
        const mtime = entry.mtime;
        try {
          fs$1.futimesSync(fd, atime, mtime);
        } catch (futimeser) {
          try {
            fs$1.utimesSync(entry.absolute, atime, mtime);
          } catch (utimeser) {
            er = futimeser;
          }
        }
      }
      if (this[DOCHOWN](entry)) {
        const uid = this[UID](entry);
        const gid = this[GID](entry);
        try {
          fs$1.fchownSync(fd, uid, gid);
        } catch (fchowner) {
          try {
            fs$1.chownSync(entry.absolute, uid, gid);
          } catch (chowner) {
            er = er || fchowner;
          }
        }
      }
      oner(er);
    });
  }
  [DIRECTORY](entry, done) {
    const mode = entry.mode & 4095 || this.dmode;
    const er = this[MKDIR](entry.absolute, mode);
    if (er) {
      this[ONERROR](er, entry);
      done();
      return;
    }
    if (entry.mtime && !this.noMtime) {
      try {
        fs$1.utimesSync(entry.absolute, entry.atime || /* @__PURE__ */ new Date(), entry.mtime);
      } catch (er2) {
      }
    }
    if (this[DOCHOWN](entry)) {
      try {
        fs$1.chownSync(entry.absolute, this[UID](entry), this[GID](entry));
      } catch (er2) {
      }
    }
    done();
    entry.resume();
  }
  [MKDIR](dir, mode) {
    try {
      return mkdir.sync(normPath(dir), {
        uid: this.uid,
        gid: this.gid,
        processUid: this.processUid,
        processGid: this.processGid,
        umask: this.processUmask,
        preserve: this.preservePaths,
        unlink: this.unlink,
        cache: this.dirCache,
        cwd: this.cwd,
        mode
      });
    } catch (er) {
      return er;
    }
  }
  [LINK](entry, linkpath, link, done) {
    try {
      fs$1[link + "Sync"](linkpath, entry.absolute);
      done();
      entry.resume();
    } catch (er) {
      return this[ONERROR](er, entry);
    }
  }
}
Unpack$1.Sync = UnpackSync;
var unpack = Unpack$1;
const hlo = highLevelOpt;
const Unpack2 = unpack;
const fs = fs$a;
const fsm = fsMinipass;
const path = path$7;
const stripSlash = stripTrailingSlashes;
var extract_1 = (opt_, files, cb) => {
  if (typeof opt_ === "function") {
    cb = opt_, files = null, opt_ = {};
  } else if (Array.isArray(opt_)) {
    files = opt_, opt_ = {};
  }
  if (typeof files === "function") {
    cb = files, files = null;
  }
  if (!files) {
    files = [];
  } else {
    files = Array.from(files);
  }
  const opt = hlo(opt_);
  if (opt.sync && typeof cb === "function") {
    throw new TypeError("callback not supported for sync tar functions");
  }
  if (!opt.file && typeof cb === "function") {
    throw new TypeError("callback only supported with file option");
  }
  if (files.length) {
    filesFilter(opt, files);
  }
  return opt.file && opt.sync ? extractFileSync(opt) : opt.file ? extractFile(opt, cb) : opt.sync ? extractSync(opt) : extract(opt);
};
const filesFilter = (opt, files) => {
  const map = new Map(files.map((f) => [stripSlash(f), true]));
  const filter = opt.filter;
  const mapHas = (file, r) => {
    const root = r || path.parse(file).root || ".";
    const ret = file === root ? false : map.has(file) ? map.get(file) : mapHas(path.dirname(file), root);
    map.set(file, ret);
    return ret;
  };
  opt.filter = filter ? (file, entry) => filter(file, entry) && mapHas(stripSlash(file)) : (file) => mapHas(stripSlash(file));
};
const extractFileSync = (opt) => {
  const u = new Unpack2.Sync(opt);
  const file = opt.file;
  const stat = fs.statSync(file);
  const readSize = opt.maxReadSize || 16 * 1024 * 1024;
  const stream = new fsm.ReadStreamSync(file, {
    readSize,
    size: stat.size
  });
  stream.pipe(u);
};
const extractFile = (opt, cb) => {
  const u = new Unpack2(opt);
  const readSize = opt.maxReadSize || 16 * 1024 * 1024;
  const file = opt.file;
  const p = new Promise((resolve2, reject) => {
    u.on("error", reject);
    u.on("close", resolve2);
    fs.stat(file, (er, stat) => {
      if (er) {
        reject(er);
      } else {
        const stream = new fsm.ReadStream(file, {
          readSize,
          size: stat.size
        });
        stream.on("error", reject);
        stream.pipe(u);
      }
    });
  });
  return cb ? p.then(cb, cb) : p;
};
const extractSync = (opt) => new Unpack2.Sync(opt);
const extract = (opt) => new Unpack2(opt);
var x = extract_1;
class ResourceManager {
  static getResourcesPath() {
    return path$7.join(electron.app.getPath("userData"), "resources");
  }
  static getExtractedOpenClawPath() {
    return path$7.join(this.getResourcesPath(), "openclaw");
  }
  /**
   * Extrac the bundled tar.gz to the user data directory if needed
   */
  static async setupResources() {
    if (!electron.app.isPackaged) {
      console.log("[ResourceManager] Development mode, skipping resource extraction.");
      return;
    }
    this.getResourcesPath();
    const openClawDestPath = this.getExtractedOpenClawPath();
    const bundledArchive = path$7.join(process.resourcesPath, "bundled", "openclaw.tar.gz");
    if (!fs$a.existsSync(bundledArchive)) {
      console.warn(`[ResourceManager] Archive not found at ${bundledArchive}. Ensure it is packed correctly.`);
      return;
    }
    const entryExists = fs$a.existsSync(path$7.join(openClawDestPath, "dist", "entry.js"));
    if (entryExists) {
      console.log("[ResourceManager] OpenClaw resources already present and seem valid.");
      return;
    }
    console.log("[ResourceManager] Extracting bundled OpenClaw to user data...");
    if (!fs$a.existsSync(openClawDestPath)) {
      fs$a.mkdirSync(openClawDestPath, { recursive: true });
    }
    try {
      await x({
        file: bundledArchive,
        cwd: openClawDestPath,
        // Depending on how prepare_openclaw packages it, you might need strip: 1
        // Usually `tar -czf file.tar.gz -C bundled openclaw` puts an `openclaw` folder inside
        // So we strip that top-level folder to map perfectly to openClawDestPath
        strip: 1
      });
      console.log("[ResourceManager] Extraction complete.");
      this.createCommandLinks();
    } catch (err) {
      console.error("[ResourceManager] Failed to extract archive:", err);
    }
  }
  /**
   * Creates openclaw.cmd (Windows) or an executable script (macOS/Linux).
   */
  static createCommandLinks() {
    const resourcesPath = this.getResourcesPath();
    if (process.platform === "win32") {
      const cmdPath = path$7.join(resourcesPath, "openclaw.cmd");
      const script = `@ECHO OFF\r
node "%~dp0\\openclaw\\dist\\entry.js" %*`;
      fs$a.writeFileSync(cmdPath, script, "utf8");
      console.log(`[ResourceManager] Created command link at ${cmdPath}`);
    } else {
      const binPath = path$7.join(resourcesPath, "openclaw");
      const script = `#!/bin/sh
node "$(dirname "$0")/openclaw/dist/entry.js" "$@"`;
      fs$a.writeFileSync(binPath, script, { encoding: "utf8", mode: 493 });
      console.log(`[ResourceManager] Created command link at ${binPath}`);
    }
  }
}
class NodeRuntime {
  /**
   * Get the Node.js executable path depending on environment
   */
  static getNodePath() {
    if (!this.isPackaged) {
      return process.env.NODE_PATH || "node";
    }
    const isWindows2 = process.platform === "win32";
    const nodeExecutable = isWindows2 ? "node.exe" : "node";
    const bundledNodePath = path$7.join(process.resourcesPath, "bundled", "node", nodeExecutable);
    if (fs$a.existsSync(bundledNodePath)) {
      return bundledNodePath;
    }
    console.warn(`[NodeRuntime] Bundled Node.js not found at ${bundledNodePath}, falling back to system node`);
    return "node";
  }
  /**
   * Get the OpenClaw entry point path depending on environment
   */
  static getOpenClawEntryPath() {
    if (!this.isPackaged) {
      const workspaceRoot = path$7.resolve(process.cwd(), "..", "..");
      const entryPath = path$7.join(workspaceRoot, "openclaw.mjs");
      if (fs$a.existsSync(entryPath)) {
        console.log(`[NodeRuntime] Dev mode: using workspace root entry → ${entryPath}`);
        return entryPath;
      }
      const alt = path$7.resolve(__dirname, "..", "..", "..", "openclaw.mjs");
      if (fs$a.existsSync(alt)) {
        return alt;
      }
      console.warn('[NodeRuntime] Could not locate openclaw.mjs in workspace root. Falling back to global "openclaw" command.');
      return "openclaw";
    }
    const userDataPath = electron.app.getPath("userData");
    return path$7.join(userDataPath, "resources", "openclaw", "dist", "entry.js");
  }
}
__publicField(NodeRuntime, "isPackaged", electron.app.isPackaged);
class GatewayManager {
  constructor(onReady) {
    __publicField(this, "gatewayProcess", null);
    __publicField(this, "port", 18789);
    __publicField(this, "isRestarting", false);
    __publicField(this, "stoppedByUser", false);
    __publicField(this, "maxRetries", 5);
    __publicField(this, "retryCount", 0);
    this.onReady = onReady;
  }
  async start() {
    var _a, _b;
    if (this.gatewayProcess) {
      console.log("[GatewayManager] Gateway is already running.");
      return;
    }
    try {
      await this.checkAndClearPort();
      const nodePath = NodeRuntime.getNodePath();
      const entryPath = NodeRuntime.getOpenClawEntryPath();
      console.log(`[GatewayManager] Starting Gateway...`);
      console.log(`[GatewayManager] Node executable: ${nodePath}`);
      console.log(`[GatewayManager] Entry script: ${entryPath}`);
      const entryCwd = path$7.dirname(entryPath);
      const env = { ...process.env, NODE_ENV: "production" };
      this.gatewayProcess = child_process.spawn(nodePath, [entryPath], {
        env,
        cwd: entryCwd,
        stdio: "pipe",
        windowsHide: true
      });
      (_a = this.gatewayProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
        console.log(`[Gateway stdout]: ${data.toString()}`);
      });
      (_b = this.gatewayProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
        console.error(`[Gateway stderr]: ${data.toString()}`);
      });
      this.gatewayProcess.on("exit", (code, signal) => {
        console.warn(`[GatewayManager] Process exited with code ${code}, signal ${signal}`);
        this.gatewayProcess = null;
        if (!this.isRestarting && !this.stoppedByUser) {
          this.handleUnexpectedCrash();
        }
      });
      this.waitForHealth();
    } catch (err) {
      console.error("[GatewayManager] Failed to start gateway:", err);
    }
  }
  async stop() {
    this.isRestarting = true;
    this.stoppedByUser = true;
    if (this.gatewayProcess) {
      console.log("[GatewayManager] Stopping gateway process...");
      this.gatewayProcess.kill("SIGTERM");
      await new Promise((resolve2) => setTimeout(resolve2, 3e3));
      if (this.gatewayProcess && !this.gatewayProcess.killed) {
        console.log("[GatewayManager] Force killing gateway process...");
        this.gatewayProcess.kill("SIGKILL");
      }
      this.gatewayProcess = null;
    }
    this.isRestarting = false;
  }
  handleUnexpectedCrash() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(5e3 * this.retryCount, 3e4);
      console.log(`[GatewayManager] Restarting gateway in ${delay}ms (Attempt ${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        this.start();
      }, delay);
    } else {
      console.error("[GatewayManager] Max restart retries reached. Gateway is dead.");
    }
  }
  async waitForHealth() {
    const checkUrl = `http://127.0.0.1:${this.port}/health`;
    const maxAttempts = 30;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      http.get(checkUrl, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          this.retryCount = 0;
          console.log(`[GatewayManager] Gateway is healthy and ready at port ${this.port}`);
          this.onReady(`http://127.0.0.1:${this.port}`);
        }
      }).on("error", () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error(`[GatewayManager] Gateway failed health checks after ${maxAttempts} attempts.`);
        }
      });
    }, 1e3);
  }
  async checkAndClearPort() {
    return Promise.resolve();
  }
}
let mainWindow = null;
let tray = null;
let gatewayManager = null;
let isQuitting = false;
electron.app.on("before-quit", () => {
  isQuitting = true;
});
async function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "OpenClaw Control",
    webPreferences: {
      preload: path$7.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
      return false;
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path$7.join(__dirname, "../dist/index.html"));
  }
  return mainWindow;
}
function createTray() {
  try {
    const { nativeImage } = require("electron");
    const fs2 = require("fs");
    const iconPath = electron.app.isPackaged ? path$7.join(process.resourcesPath, "assets", "icon.ico") : path$7.join(__dirname, "..", "assets", "icon.ico");
    const icon = fs2.existsSync(iconPath) ? iconPath : nativeImage.createEmpty();
    tray = new electron.Tray(icon);
    tray.setToolTip("OpenClaw Control Server");
    const contextMenu = electron.Menu.buildFromTemplate([
      {
        label: "显示窗口 (Show Window)",
        click: () => {
          mainWindow == null ? void 0 : mainWindow.show();
        }
      },
      { type: "separator" },
      {
        label: "退出 (Exit)",
        click: async () => {
          isQuitting = true;
          if (gatewayManager) {
            console.log("[Main] Stopping Gateway before exit...");
            await gatewayManager.stop();
          }
          electron.app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
      mainWindow == null ? void 0 : mainWindow.show();
    });
  } catch (err) {
    console.warn("[Main] Failed to create system tray:", err);
  }
}
electron.app.whenReady().then(async () => {
  console.log("[Main] App ready. Setting up resources...");
  await ResourceManager.setupResources();
  const window2 = await createWindow();
  createTray();
  gatewayManager = new GatewayManager((url) => {
    if (window2 && !window2.isDestroyed()) {
      window2.webContents.send("gateway-ready", url);
    }
  });
  gatewayManager.start();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow == null ? void 0 : mainWindow.show();
    }
  });
});
electron.app.on("window-all-closed", () => {
});
