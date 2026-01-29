/**
 * VectorTile Parser Bundle for PMTiles
 * Self-contained Pbf and VectorTile implementation
 * No external dependencies required
 * 
 * Based on: pbf@3.2.1 and @mapbox/vector-tile@1.3.1
 */
(function(global) {
    'use strict';

    // ============================================
    // PBF LIBRARY (Protocol Buffers Reader/Writer)
    // ============================================
    
    function Pbf(buf) {
        this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
        this.pos = 0;
        this.type = 0;
        this.length = this.buf.length;
    }

    Pbf.Varint = 0;
    Pbf.Fixed64 = 1;
    Pbf.Bytes = 2;
    Pbf.Fixed32 = 5;

    var SHIFT_LEFT_32 = (1 << 16) * (1 << 16);
    var SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;
    var TEXT_DECODER = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf-8');

    Pbf.prototype = {
        destroy: function() {
            this.buf = null;
        },

        // === Reading ===

        readFields: function(readField, result, end) {
            end = end || this.length;

            while (this.pos < end) {
                var val = this.readVarint(),
                    tag = val >> 3,
                    startPos = this.pos;

                this.type = val & 7;
                readField(tag, result, this);

                if (this.pos === startPos) this.skip(val);
            }
            return result;
        },

        readMessage: function(readField, result) {
            return this.readFields(readField, result, this.readVarint() + this.pos);
        },

        readFixed32: function() {
            var val = readUInt32(this.buf, this.pos);
            this.pos += 4;
            return val;
        },

        readSFixed32: function() {
            var val = readInt32(this.buf, this.pos);
            this.pos += 4;
            return val;
        },

        readFixed64: function() {
            var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
            this.pos += 8;
            return val;
        },

        readSFixed64: function() {
            var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
            this.pos += 8;
            return val;
        },

        readFloat: function() {
            var val = ieee754read(this.buf, this.pos, true, 23, 4);
            this.pos += 4;
            return val;
        },

        readDouble: function() {
            var val = ieee754read(this.buf, this.pos, true, 52, 8);
            this.pos += 8;
            return val;
        },

        readVarint: function(isSigned) {
            var buf = this.buf,
                val, b;

            b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
            b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
            b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
            b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
            b = buf[this.pos];   val |= (b & 0x0f) << 28;

            return readVarintRemainder(val, isSigned, this);
        },

        readVarint64: function() {
            return this.readVarint(true);
        },

        readSVarint: function() {
            var num = this.readVarint();
            return num % 2 === 1 ? (num + 1) / -2 : num / 2;
        },

        readBoolean: function() {
            return Boolean(this.readVarint());
        },

        readString: function() {
            var end = this.readVarint() + this.pos;
            var pos = this.pos;
            this.pos = end;

            if (end - pos >= 12 && TEXT_DECODER) {
                return TEXT_DECODER.decode(this.buf.subarray(pos, end));
            }
            return readUtf8(this.buf, pos, end);
        },

        readBytes: function() {
            var end = this.readVarint() + this.pos,
                buffer = this.buf.subarray(this.pos, end);
            this.pos = end;
            return buffer;
        },

        readPackedVarint: function(arr, isSigned) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned));
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readVarint(isSigned));
            return arr;
        },

        readPackedSVarint: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readSVarint());
            return arr;
        },

        readPackedBoolean: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readBoolean());
            return arr;
        },

        readPackedFloat: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readFloat());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readFloat());
            return arr;
        },

        readPackedDouble: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readDouble());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readDouble());
            return arr;
        },

        readPackedFixed32: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readFixed32());
            return arr;
        },

        readPackedSFixed32: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readSFixed32());
            return arr;
        },

        readPackedFixed64: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readFixed64());
            return arr;
        },

        readPackedSFixed64: function(arr) {
            if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64());
            var end = readPackedEnd(this);
            arr = arr || [];
            while (this.pos < end) arr.push(this.readSFixed64());
            return arr;
        },

        skip: function(val) {
            var type = val & 7;
            if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
            else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
            else if (type === Pbf.Fixed32) this.pos += 4;
            else if (type === Pbf.Fixed64) this.pos += 8;
            else throw new Error('Unimplemented type: ' + type);
        }
    };

    function readPackedEnd(pbf) {
        return pbf.type === Pbf.Bytes ? pbf.readVarint() + pbf.pos : pbf.pos + 1;
    }

    function readUInt32(buf, pos) {
        return ((buf[pos]) |
            (buf[pos + 1] << 8) |
            (buf[pos + 2] << 16)) +
            (buf[pos + 3] * 0x1000000);
    }

    function readInt32(buf, pos) {
        return ((buf[pos]) |
            (buf[pos + 1] << 8) |
            (buf[pos + 2] << 16)) +
            (buf[pos + 3] << 24);
    }

    function readVarintRemainder(l, s, p) {
        var buf = p.buf, h, b;

        b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
        b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
        b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
        b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
        b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
        b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);

        throw new Error('Expected varint not more than 10 bytes');
    }

    function toNum(low, high, isSigned) {
        if (isSigned) {
            return high * 0x100000000 + (low >>> 0);
        }
        return ((high >>> 0) * 0x100000000) + (low >>> 0);
    }

    function readUtf8(buf, pos, end) {
        var str = '';
        var i = pos;

        while (i < end) {
            var b0 = buf[i];
            var c = null;
            var bytesPerSequence = b0 > 0xEF ? 4 : b0 > 0xDF ? 3 : b0 > 0xBF ? 2 : 1;

            if (i + bytesPerSequence > end) break;

            var b1, b2, b3;

            if (bytesPerSequence === 1) {
                if (b0 < 0x80) c = b0;
            } else if (bytesPerSequence === 2) {
                b1 = buf[i + 1];
                if ((b1 & 0xC0) === 0x80) {
                    c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F);
                    if (c <= 0x7F) c = null;
                }
            } else if (bytesPerSequence === 3) {
                b1 = buf[i + 1];
                b2 = buf[i + 2];
                if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
                    c = (b0 & 0x0F) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F);
                    if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) c = null;
                }
            } else if (bytesPerSequence === 4) {
                b1 = buf[i + 1];
                b2 = buf[i + 2];
                b3 = buf[i + 3];
                if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
                    c = (b0 & 0x0F) << 0x12 | (b1 & 0x3F) << 0x0C | (b2 & 0x3F) << 0x06 | (b3 & 0x3F);
                    if (c <= 0xFFFF || c >= 0x110000) c = null;
                }
            }

            if (c === null) {
                c = 0xFFFD;
                bytesPerSequence = 1;
            } else if (c > 0xFFFF) {
                c -= 0x10000;
                str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800);
                c = 0xDC00 | c & 0x3FF;
            }

            str += String.fromCharCode(c);
            i += bytesPerSequence;
        }

        return str;
    }

    // IEEE754 read helper
    function ieee754read(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = (nBytes * 8) - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? (nBytes - 1) : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];

        i += d;

        e = s & ((1 << (-nBits)) - 1);
        s >>= (-nBits);
        nBits += eLen;
        for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

        m = e & ((1 << (-nBits)) - 1);
        e >>= (-nBits);
        nBits += mLen;
        for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

        if (e === 0) {
            e = 1 - eBias;
        } else if (e === eMax) {
            return m ? NaN : ((s ? -1 : 1) * Infinity);
        } else {
            m = m + Math.pow(2, mLen);
            e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    }

    // ============================================
    // VECTOR TILE LIBRARY
    // ============================================

    function VectorTileFeature(pbf, end, extent, keys, values) {
        this.properties = {};
        this.extent = extent;
        this.type = 0;
        this._pbf = pbf;
        this._geometry = -1;
        this._keys = keys;
        this._values = values;

        pbf.readFields(readFeature, this, end);
    }

    function readFeature(tag, feature, pbf) {
        if (tag === 1) feature.id = pbf.readVarint();
        else if (tag === 2) readTag(pbf, feature);
        else if (tag === 3) feature.type = pbf.readVarint();
        else if (tag === 4) feature._geometry = pbf.pos;
    }

    function readTag(pbf, feature) {
        var end = pbf.readVarint() + pbf.pos;

        while (pbf.pos < end) {
            var key = feature._keys[pbf.readVarint()],
                value = feature._values[pbf.readVarint()];
            feature.properties[key] = value;
        }
    }

    VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

    VectorTileFeature.prototype.loadGeometry = function() {
        var pbf = this._pbf;
        pbf.pos = this._geometry;

        var end = pbf.readVarint() + pbf.pos,
            cmd = 1,
            length = 0,
            x = 0,
            y = 0,
            lines = [],
            line;

        while (pbf.pos < end) {
            if (length <= 0) {
                var cmdLen = pbf.readVarint();
                cmd = cmdLen & 0x7;
                length = cmdLen >> 3;
            }

            length--;

            if (cmd === 1 || cmd === 2) {
                x += pbf.readSVarint();
                y += pbf.readSVarint();

                if (cmd === 1) {
                    if (line) lines.push(line);
                    line = [];
                }

                line.push({ x: x, y: y });

            } else if (cmd === 7) {
                if (line) {
                    line.push({ x: line[0].x, y: line[0].y });
                }

            } else {
                throw new Error('unknown command ' + cmd);
            }
        }

        if (line) lines.push(line);

        return lines;
    };

    VectorTileFeature.prototype.bbox = function() {
        var pbf = this._pbf;
        pbf.pos = this._geometry;

        var end = pbf.readVarint() + pbf.pos,
            cmd = 1,
            length = 0,
            x = 0,
            y = 0,
            x1 = Infinity,
            x2 = -Infinity,
            y1 = Infinity,
            y2 = -Infinity;

        while (pbf.pos < end) {
            if (length <= 0) {
                var cmdLen = pbf.readVarint();
                cmd = cmdLen & 0x7;
                length = cmdLen >> 3;
            }

            length--;

            if (cmd === 1 || cmd === 2) {
                x += pbf.readSVarint();
                y += pbf.readSVarint();
                if (x < x1) x1 = x;
                if (x > x2) x2 = x;
                if (y < y1) y1 = y;
                if (y > y2) y2 = y;

            } else if (cmd !== 7) {
                throw new Error('unknown command ' + cmd);
            }
        }

        return [x1, y1, x2, y2];
    };

    // VectorTileLayer
    function VectorTileLayer(pbf, end) {
        this.version = 1;
        this.name = null;
        this.extent = 4096;
        this.length = 0;
        this._pbf = pbf;
        this._keys = [];
        this._values = [];
        this._features = [];

        pbf.readFields(readLayer, this, end);

        this.length = this._features.length;
    }

    function readLayer(tag, layer, pbf) {
        if (tag === 15) layer.version = pbf.readVarint();
        else if (tag === 1) layer.name = pbf.readString();
        else if (tag === 5) layer.extent = pbf.readVarint();
        else if (tag === 2) layer._features.push(pbf.pos);
        else if (tag === 3) layer._keys.push(pbf.readString());
        else if (tag === 4) layer._values.push(readValueMessage(pbf));
    }

    function readValueMessage(pbf) {
        var value = null,
            end = pbf.readVarint() + pbf.pos;

        while (pbf.pos < end) {
            var tag = pbf.readVarint() >> 3;

            value = tag === 1 ? pbf.readString() :
                tag === 2 ? pbf.readFloat() :
                tag === 3 ? pbf.readDouble() :
                tag === 4 ? pbf.readVarint64() :
                tag === 5 ? pbf.readVarint() :
                tag === 6 ? pbf.readSVarint() :
                tag === 7 ? pbf.readBoolean() : null;
        }

        return value;
    }

    VectorTileLayer.prototype.feature = function(i) {
        if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

        this._pbf.pos = this._features[i];

        var end = this._pbf.readVarint() + this._pbf.pos;
        return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
    };

    // VectorTile
    function VectorTile(pbf, end) {
        this.layers = pbf.readFields(readTile, {}, end);
    }

    function readTile(tag, layers, pbf) {
        if (tag === 3) {
            var layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
            if (layer.length) layers[layer.name] = layer;
        }
    }

    // ============================================
    // EXPORT TO GLOBAL
    // ============================================
    
    global.Pbf = Pbf;
    global.VectorTile = VectorTile;
    global.VectorTileFeature = VectorTileFeature;
    global.VectorTileLayer = VectorTileLayer;

    console.log('✅ VectorTile Parser loaded - Pbf and VectorTile available as globals');

})(typeof window !== 'undefined' ? window : this);
