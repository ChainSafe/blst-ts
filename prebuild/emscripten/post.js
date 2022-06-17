// Bindings utilities

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function WrapperObject() {
}
WrapperObject.prototype = Object.create(WrapperObject.prototype);
WrapperObject.prototype.constructor = WrapperObject;
WrapperObject.prototype.__class__ = WrapperObject;
WrapperObject.__cache__ = {};
Module['WrapperObject'] = WrapperObject;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant)
    @param {*=} __class__ */
function getCache(__class__) {
  return (__class__ || WrapperObject).__cache__;
}
Module['getCache'] = getCache;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant)
    @param {*=} __class__ */
function wrapPointer(ptr, __class__) {
  var cache = getCache(__class__);
  var ret = cache[ptr];
  if (ret) return ret;
  ret = Object.create((__class__ || WrapperObject).prototype);
  ret.ptr = ptr;
  return cache[ptr] = ret;
}
Module['wrapPointer'] = wrapPointer;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function castObject(obj, __class__) {
  return wrapPointer(obj.ptr, __class__);
}
Module['castObject'] = castObject;

Module['NULL'] = wrapPointer(0);

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function destroy(obj) {
  if (!obj['__destroy__']) throw 'Error: Cannot destroy object. (Did you create it yourself?)';
  obj['__destroy__']();
  // Remove from cache, so the object can be GC'd and refs added onto it released
  delete getCache(obj.__class__)[obj.ptr];
}
Module['destroy'] = destroy;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function compare(obj1, obj2) {
  return obj1.ptr === obj2.ptr;
}
Module['compare'] = compare;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function getPointer(obj) {
  return obj.ptr;
}
Module['getPointer'] = getPointer;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function getClass(obj) {
  return obj.__class__;
}
Module['getClass'] = getClass;

// Converts big (string or array) values into a C-style storage, in temporary space

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
var ensureCache = {
  buffer: 0,  // the main buffer of temporary storage
  // TODO: ensureCache seems to have issues increasing its size;
  // `Module['_free']` is `undefined`
  size: 1024,   // the size of buffer
  pos: 0,    // the next free offset in buffer
  temps: [], // extra allocations
  needed: 0, // the total size we need next time

  prepare: function() {
    if (ensureCache.needed) {
      // clear the temps
      for (var i = 0; i < ensureCache.temps.length; i++) {
        Module['_free'](ensureCache.temps[i]);
      }
      ensureCache.temps.length = 0;
      // prepare to allocate a bigger buffer
      Module['_free'](ensureCache.buffer);
      ensureCache.buffer = 0;
      ensureCache.size += ensureCache.needed;
      // clean up
      ensureCache.needed = 0;
    }
    if (!ensureCache.buffer) { // happens first time, or when we need to grow
      ensureCache.size += 128; // heuristic, avoid many small grow events
      ensureCache.buffer = Module['_malloc'](ensureCache.size);
      assert(ensureCache.buffer);
    }
    ensureCache.pos = 0;
  },
  alloc: function(array, view) {
    assert(ensureCache.buffer);
    var bytes = view.BYTES_PER_ELEMENT;
    var len = array.length * bytes;
    len = (len + 7) & -8; // keep things aligned to 8 byte boundaries
    var ret;
    if (ensureCache.pos + len >= ensureCache.size) {
      // we failed to allocate in the buffer, ensureCache time around :(
      assert(len > 0); // null terminator, at least
      ensureCache.needed += len;
      ret = Module['_malloc'](len);
      ensureCache.temps.push(ret);
    } else {
      // we can allocate in the buffer
      ret = ensureCache.buffer + ensureCache.pos;
      ensureCache.pos += len;
    }
    return ret;
  },
  copy: function(array, view, offset) {
    offset >>>= 0;
    var bytes = view.BYTES_PER_ELEMENT;
    switch (bytes) {
      case 2: offset >>>= 1; break;
      case 4: offset >>>= 2; break;
      case 8: offset >>>= 3; break;
    }
    for (var i = 0; i < array.length; i++) {
      view[offset + i] = array[i];
    }
  },
};

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureString(value) {
  if (typeof value === 'string') {
    var intArray = intArrayFromString(value);
    var offset = ensureCache.alloc(intArray, HEAP8);
    ensureCache.copy(intArray, HEAP8, offset);
    return offset;
  }
  return value;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureUint8(value) {
  switch (typeof value) {
    case "string":
      value = intArrayFromString(value);
      break;
    case "object":
      break;
    default:
      throw new Error(`unsupported value type: ${value.constructor.name}`);
  }

  var offset = ensureCache.alloc(value, HEAPU8);
  ensureCache.copy(value, HEAPU8, offset);
  return offset;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt8(value) {
  if (typeof value === 'object') {
    var offset = ensureCache.alloc(value, HEAP8);
    ensureCache.copy(value, HEAP8, offset);
    return offset;
  }
  return value;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt16(value) {
  if (typeof value === 'object') {
    var offset = ensureCache.alloc(value, HEAP16);
    ensureCache.copy(value, HEAP16, offset);
    return offset;
  }
  return value;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt32(value) {
  if (typeof value === 'object') {
    var offset = ensureCache.alloc(value, HEAP32);
    ensureCache.copy(value, HEAP32, offset);
    return offset;
  }
  return value;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureFloat32(value) {
  if (typeof value === 'object') {
    var offset = ensureCache.alloc(value, HEAPF32);
    ensureCache.copy(value, HEAPF32, offset);
    return offset;
  }
  return value;
}
/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureFloat64(value) {
  if (typeof value === 'object') {
    var offset = ensureCache.alloc(value, HEAPF64);
    ensureCache.copy(value, HEAPF64, offset);
    return offset;
  }
  return value;
}


// VoidPtr
/** @suppress {undefinedVars, duplicate} @this{Object} */function VoidPtr() { throw "cannot construct a VoidPtr, no constructor in IDL" }
VoidPtr.prototype = Object.create(WrapperObject.prototype);
VoidPtr.prototype.constructor = VoidPtr;
VoidPtr.prototype.__class__ = VoidPtr;
VoidPtr.__cache__ = {};
Module['VoidPtr'] = VoidPtr;

  VoidPtr.prototype['__destroy__'] = VoidPtr.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_VoidPtr___destroy___0(self);
};
// P1_Affine
/** @suppress {undefinedVars, duplicate} @this{Object} */function P1_Affine(input, len) {
  ensureCache.prepare();
  if (input && typeof input === 'object') {
    if (input instanceof Uint8Array) {
      var _input = ensureUint8(input);
      this.ptr = _emscripten_bind_P1_Affine_P1_Affine_2(_input, input.length);
      return;
    } else {
      input= input.ptr;
    }
  }
  else input = ensureUint8(input);
  if (len && typeof len === 'object') len = len.ptr;
  if (input === undefined) { this.ptr = _emscripten_bind_P1_Affine_P1_Affine_0(); getCache(P1_Affine)[this.ptr] = this;return }
  if (len === undefined) { this.ptr = _emscripten_bind_P1_Affine_P1_Affine_1(input); getCache(P1_Affine)[this.ptr] = this;return }
  this.ptr = _emscripten_bind_P1_Affine_P1_Affine_2(input, len);
  getCache(P1_Affine)[this.ptr] = this;
};;
P1_Affine.prototype = Object.create(WrapperObject.prototype);
P1_Affine.prototype.constructor = P1_Affine;
P1_Affine.prototype.__class__ = P1_Affine;
P1_Affine.__cache__ = {};
Module['P1_Affine'] = P1_Affine;

P1_Affine.prototype['dup'] = P1_Affine.prototype.dup = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_Affine_dup_0(self), P1_Affine);
};;

P1_Affine.prototype['to_jacobian'] = P1_Affine.prototype.to_jacobian = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_Affine_to_jacobian_0(self), P1);
};;

P1_Affine.prototype['serialize'] = P1_Affine.prototype.serialize = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(96), HEAPU8);
  _emscripten_bind_P1_Affine_serialize_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 96));
  // TODO: free `out`?
};;

P1_Affine.prototype['compress'] = P1_Affine.prototype.compress = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(48), HEAPU8);
  _emscripten_bind_P1_Affine_compress_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 48));
  // TODO: free `out`?
};;

P1_Affine.prototype['on_curve'] = P1_Affine.prototype.on_curve = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_Affine_on_curve_0(self));
};;

P1_Affine.prototype['in_group'] = P1_Affine.prototype.in_group = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_Affine_in_group_0(self));
};;

P1_Affine.prototype['is_inf'] = P1_Affine.prototype.is_inf = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_Affine_is_inf_0(self));
};;

P1_Affine.prototype['is_equal'] = P1_Affine.prototype.is_equal = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return !!(_emscripten_bind_P1_Affine_is_equal_1(self, p));
};;

P1_Affine.prototype['core_verify'] = P1_Affine.prototype.core_verify = /** @suppress {undefinedVars, duplicate} @this{Object} */function(pk, hash_or_encode, msg, msg_len, DST, aug, aug_len) {
  var self = this.ptr;
  ensureCache.prepare();
  if (pk && typeof pk === 'object') pk = pk.ptr;
  if (hash_or_encode && typeof hash_or_encode === 'object') hash_or_encode = hash_or_encode.ptr;
  if (msg && typeof msg === 'object') msg = msg.ptr;
  else msg = ensureString(msg);
  if (msg_len && typeof msg_len === 'object') msg_len = msg_len.ptr;
  if (DST && typeof DST === 'object') DST = DST.ptr;
  else DST = ensureString(DST);
  if (aug && typeof aug === 'object') aug = aug.ptr;
  else aug = ensureString(aug);
  if (aug_len && typeof aug_len === 'object') aug_len = aug_len.ptr;
  return _emscripten_bind_P1_Affine_core_verify_7(self, pk, hash_or_encode, msg, msg_len, DST, aug, aug_len);
};;

  P1_Affine.prototype['__destroy__'] = P1_Affine.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_P1_Affine___destroy___0(self);
};
// P1
/** @suppress {undefinedVars, duplicate} @this{Object} */function P1(input, len) {
  ensureCache.prepare();
  if (input instanceof Uint8Array) {
    var _input = ensureUint8(input);
    this.ptr = _emscripten_bind_P1_P1_2(_input, input.length);
    getCache(P1)[this.ptr] = this;
    return;
  }
  if (input && typeof input === 'object') input = input.ptr;
  if (len && typeof len === 'object') len = len.ptr;
  if (input === undefined) { this.ptr = _emscripten_bind_P1_P1_0(); getCache(P1)[this.ptr] = this;return }
  if (len === undefined) { this.ptr = _emscripten_bind_P1_P1_1(input); getCache(P1)[this.ptr] = this;return }
  this.ptr = _emscripten_bind_P1_P1_2(input, len);
  getCache(P1)[this.ptr] = this;
};;
P1.prototype = Object.create(WrapperObject.prototype);
P1.prototype.constructor = P1;
P1.prototype.__class__ = P1;
P1.__cache__ = {};
Module['P1'] = P1;

P1.generator = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  return wrapPointer(_emscripten_bind_P1_P1_generator_0(), P1);
};;

P1.prototype['dup'] = P1.prototype.dup = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_dup_0(self), P1);
};;

P1.prototype['to_affine'] = P1.prototype.to_affine = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_to_affine_0(self), P1_Affine);
};;

P1.prototype['serialize'] = P1.prototype.serialize = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(96), HEAPU8);
  _emscripten_bind_P1_serialize_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 96));
  // TODO: free `out`?
};;

P1.prototype['compress'] = P1.prototype.compress = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(48), HEAPU8);
  _emscripten_bind_P1_compress_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 48));
  // TODO: free `out`?
};;

P1.prototype['on_curve'] = P1.prototype.on_curve = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_on_curve_0(self));
};;

P1.prototype['in_group'] = P1.prototype.in_group = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_in_group_0(self));
};;

P1.prototype['is_inf'] = P1.prototype.is_inf = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P1_is_inf_0(self));
};;

P1.prototype['is_equal'] = P1.prototype.is_equal = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return !!(_emscripten_bind_P1_is_equal_1(self, p));
};;

P1.prototype['aggregate'] = P1.prototype.aggregate = /** @suppress {undefinedVars, duplicate} @this{Object} */function(input) {
  var self = this.ptr;
  if (input && typeof input === 'object') input = input.ptr;
  _emscripten_bind_P1_aggregate_1(self, input);
};;

P1.prototype['sign_with'] = P1.prototype.sign_with = /** @suppress {undefinedVars, duplicate} @this{Object} */function(sk) {
  var self = this.ptr;
  if (sk && typeof sk === 'object') sk = sk.ptr;
  return wrapPointer(_emscripten_bind_P1_sign_with_1(self, sk), P1);
};;

P1.prototype['hash_to'] = P1.prototype.hash_to = /** @suppress {undefinedVars, duplicate} @this{Object} */function(msg, DST, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_dst] = ensureRef(DST);
  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  return wrapPointer(_emscripten_bind_P1_hash_to_5(self, _msg, msg_len, _dst, _aug, aug_len), P1);
};;

P1.prototype['encode_to'] = P1.prototype.encode_to = /** @suppress {undefinedVars, duplicate} @this{Object} */function(msg, DST, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_dst] = ensureRef(DST);
  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  return wrapPointer(_emscripten_bind_P1_encode_to_5(self, _msg, msg_len, _dst, _aug, aug_len), P1);
};;

P1.prototype['mult'] = P1.prototype.mult = /** @suppress {undefinedVars, duplicate} @this{Object} */function(scalar) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_scalar, scalar_len] = ensureRef(scalar);
  return wrapPointer(_emscripten_bind_P1_mult_1(self, _scalar, scalar_len * 8), P1);
};;

P1.prototype['neg'] = P1.prototype.neg = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_neg_0(self), P1);
};;

P1.prototype['cneg'] = P1.prototype.cneg = /** @suppress {undefinedVars, duplicate} @this{Object} */function(flag) {
  var self = this.ptr;
  if (flag && typeof flag === 'object') flag = flag.ptr;
  return wrapPointer(_emscripten_bind_P1_cneg_1(self, flag), P1);
};;

P1.prototype['add'] = P1.prototype.add = /** @suppress {undefinedVars, duplicate} @this{Object} */function(a) {
  var self = this.ptr;
  switch(a.constructor) {
    case P1:
      return wrapPointer(_emscripten_bind_P1_add_1__P1(self, a.ptr), P1);
    case P1_Affine:
      return wrapPointer(_emscripten_bind_P1_add_1__P1_Affine(self, a.ptr), P1);
    default:
      throw new Error("unsuported type for `a` arg");
  }
};;

P1.prototype['dbl'] = P1.prototype.dbl = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P1_dbl_0(self), P1);
};;

  P1.prototype['__destroy__'] = P1.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_P1___destroy___0(self);
};
// P2_Affine
/** @suppress {undefinedVars, duplicate} @this{Object} */function P2_Affine(input, len) {
  ensureCache.prepare();
  if (input && typeof input === 'object') {
    if (input instanceof Uint8Array) {
      var _input = ensureUint8(input);
      this.ptr = _emscripten_bind_P2_Affine_P2_Affine_2(_input, input.length);
      return;
    } else {
      input= input.ptr;
    }
  }
  else input = ensureUint8(input);
  if (input && typeof input === 'object') input = input.ptr;
  if (len && typeof len === 'object') len = len.ptr;
  if (input === undefined) { this.ptr = _emscripten_bind_P2_Affine_P2_Affine_0(); getCache(P2_Affine)[this.ptr] = this;return }
  if (len === undefined) { this.ptr = _emscripten_bind_P2_Affine_P2_Affine_1(input); getCache(P2_Affine)[this.ptr] = this;return }
  this.ptr = _emscripten_bind_P2_Affine_P2_Affine_2(input, len);
  getCache(P2_Affine)[this.ptr] = this;
};;
P2_Affine.prototype = Object.create(WrapperObject.prototype);
P2_Affine.prototype.constructor = P2_Affine;
P2_Affine.prototype.__class__ = P2_Affine;
P2_Affine.__cache__ = {};
Module['P2_Affine'] = P2_Affine;

P2_Affine.prototype['dup'] = P2_Affine.prototype.dup = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_Affine_dup_0(self), P2_Affine);
};;

P2_Affine.prototype['to_jacobian'] = P2_Affine.prototype.to_jacobian = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_Affine_to_jacobian_0(self), P2);
};;

P2_Affine.prototype['serialize'] = P2_Affine.prototype.serialize = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(192), HEAPU8);
  _emscripten_bind_P2_Affine_serialize_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 192));
  // TODO: free `out`?
};;

P2_Affine.prototype['compress'] = P2_Affine.prototype.compress = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(96), HEAPU8);
  _emscripten_bind_P2_Affine_compress_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 96));
};;

P2_Affine.prototype['on_curve'] = P2_Affine.prototype.on_curve = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_Affine_on_curve_0(self));
};;

P2_Affine.prototype['in_group'] = P2_Affine.prototype.in_group = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_Affine_in_group_0(self));
};;

P2_Affine.prototype['is_inf'] = P2_Affine.prototype.is_inf = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_Affine_is_inf_0(self));
};;

P2_Affine.prototype['is_equal'] = P2_Affine.prototype.is_equal = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return !!(_emscripten_bind_P2_Affine_is_equal_1(self, p));
};;

P2_Affine.prototype['core_verify'] = P2_Affine.prototype.core_verify = /** @suppress {undefinedVars, duplicate} @this{Object} */function(pk, hash_or_encode, msg, msg_len, DST, aug, aug_len) {
  var self = this.ptr;
  ensureCache.prepare();
  if (pk && typeof pk === 'object') pk = pk.ptr;
  if (hash_or_encode && typeof hash_or_encode === 'object') hash_or_encode = hash_or_encode.ptr;
  if (msg && typeof msg === 'object') msg = msg.ptr;
  else msg = ensureString(msg);
  if (msg_len && typeof msg_len === 'object') msg_len = msg_len.ptr;
  if (DST && typeof DST === 'object') DST = DST.ptr;
  else DST = ensureString(DST);
  if (aug && typeof aug === 'object') aug = aug.ptr;
  else aug = ensureString(aug);
  if (aug_len && typeof aug_len === 'object') aug_len = aug_len.ptr;
  return _emscripten_bind_P2_Affine_core_verify_7(self, pk, hash_or_encode, msg, msg_len, DST, aug, aug_len);
};;

  P2_Affine.prototype['__destroy__'] = P2_Affine.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_P2_Affine___destroy___0(self);
};
// P2
/** @suppress {undefinedVars, duplicate} @this{Object} */function P2(input, len) {
  ensureCache.prepare();
  if (input instanceof Uint8Array) {
    var _input = ensureUint8(input);
    this.ptr = _emscripten_bind_P2_P2_2(_input, input.length);
    getCache(P2)[this.ptr] = this;
    return;
  }
  if (input && typeof input === 'object') input = input.ptr;
  else input = ensureString(input);
  if (len && typeof len === 'object') len = len.ptr;
  if (input === undefined) { this.ptr = _emscripten_bind_P2_P2_0(); getCache(P2)[this.ptr] = this;return }
  if (len === undefined) { this.ptr = _emscripten_bind_P2_P2_1(input); getCache(P2)[this.ptr] = this;return }
  this.ptr = _emscripten_bind_P2_P2_2(input, len);
  getCache(P2)[this.ptr] = this;
};;
P2.prototype = Object.create(WrapperObject.prototype);
P2.prototype.constructor = P2;
P2.prototype.__class__ = P2;
P2.__cache__ = {};
Module['P2'] = P2;

P2.generator = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  return wrapPointer(_emscripten_bind_P2_P2_generator_0(), P2);
};;

P2.prototype['dup'] = P2.prototype.dup = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_dup_0(self), P2);
};;

P2.prototype['to_affine'] = P2.prototype.to_affine = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_to_affine_0(self), P2_Affine);
};;

P2.prototype['serialize'] = P2.prototype.serialize = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(192), HEAPU8);
  _emscripten_bind_P2_serialize_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 192));
};;

P2.prototype['compress'] = P2.prototype.compress = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(96), HEAPU8);
  _emscripten_bind_P2_compress_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 96));
};;

P2.prototype['on_curve'] = P2.prototype.on_curve = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_on_curve_0(self));
};;

P2.prototype['in_group'] = P2.prototype.in_group = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_in_group_0(self));
};;

P2.prototype['is_inf'] = P2.prototype.is_inf = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_P2_is_inf_0(self));
};;

P2.prototype['is_equal'] = P2.prototype.is_equal = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return !!(_emscripten_bind_P2_is_equal_1(self, p));
};;

P2.prototype['aggregate'] = P2.prototype.aggregate = /** @suppress {undefinedVars, duplicate} @this{Object} */function(input) {
  var self = this.ptr;
  if (input && typeof input === 'object') input = input.ptr;
  _emscripten_bind_P2_aggregate_1(self, input);
};;

P2.prototype['sign_with'] = P2.prototype.sign_with = /** @suppress {undefinedVars, duplicate} @this{Object} */function(scalar) {
  var self = this.ptr;
  if (scalar && typeof scalar === 'object') scalar = scalar.ptr;
  return wrapPointer(_emscripten_bind_P2_sign_with_1(self, scalar), P2);
};;

P2.prototype['hash_to'] = P2.prototype.hash_to = /** @suppress {undefinedVars, duplicate} @this{Object} */function(msg, DST, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_dst] = ensureRef(DST);
  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  return wrapPointer(_emscripten_bind_P2_hash_to_5(self, _msg, msg_len, _dst, _aug, aug_len), P2);
};;

P2.prototype['encode_to'] = P2.prototype.encode_to = /** @suppress {undefinedVars, duplicate} @this{Object} */function(msg, DST, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_dst] = ensureRef(DST);
  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  return wrapPointer(_emscripten_bind_P2_encode_to_5(self, _msg, msg_len, _dst, _aug, aug_len), P2);
};;

P2.prototype['mult'] = P2.prototype.mult = /** @suppress {undefinedVars, duplicate} @this{Object} */function(scalar) {
  var self = this.ptr;
  const [_scalar, scalar_len] = ensureRef(scalar);
  return wrapPointer(_emscripten_bind_P2_mult_1(self, _scalar, scalar_len * 8), P2);
};;

P2.prototype['neg'] = P2.prototype.neg = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_neg_0(self), P2);
};;

P2.prototype['cneg'] = P2.prototype.cneg = /** @suppress {undefinedVars, duplicate} @this{Object} */function(flag) {
  var self = this.ptr;
  if (flag && typeof flag === 'object') flag = flag.ptr;
  return wrapPointer(_emscripten_bind_P2_cneg_1(self, flag), P2);
};;

P2.prototype['add'] = P2.prototype.add = /** @suppress {undefinedVars, duplicate} @this{Object} */function(a) {
  var self = this.ptr;
  switch(a.constructor) {
    case P2:
      return wrapPointer(_emscripten_bind_P2_add_1__P2(self, a.ptr), P2);
    case P2_Affine:
      return wrapPointer(_emscripten_bind_P2_add_1__P2_Affine(self, a.ptr), P2);
    default:
      throw new Error("unsuported type for `a` arg");
  }
};;

P2.prototype['dbl'] = P2.prototype.dbl = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_P2_dbl_0(self), P2);
};;

  P2.prototype['__destroy__'] = P2.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_P2___destroy___0(self);
};
// SecretKey
/** @suppress {undefinedVars, duplicate} @this{Object} */function SecretKey() {
  this.ptr = _emscripten_bind_SecretKey_SecretKey_0();
  getCache(SecretKey)[this.ptr] = this;
};;
SecretKey.prototype = Object.create(WrapperObject.prototype);
SecretKey.prototype.constructor = SecretKey;
SecretKey.prototype.__class__ = SecretKey;
SecretKey.__cache__ = {};
Module['SecretKey'] = SecretKey;

SecretKey.prototype['keygen'] = SecretKey.prototype.keygen = /** @suppress {undefinedVars, duplicate} @this{Object} */function(ikm, info) {
  var self = this.ptr;
  var ikm_len = 0;
  ensureCache.prepare();
  if (ikm && typeof ikm === 'object') {
    if (ikm instanceof Uint8Array) {
      ikm_len = ikm.length;
      ikm = ensureUint8(ikm, ikm.length);
    } else {
      throw new Error("unsupported ikm type");
    }
  } else {
    ikm_len = ikm.length;
    ikm = ensureString(ikm);
  }
  if (info && typeof info === 'object') info = info.ptr;
  else info = ensureString(info || "");
  _emscripten_bind_SecretKey_keygen_3(self, ikm, ikm_len, info);
};;

SecretKey.prototype['from_bendian'] = SecretKey.prototype.from_bendian = /** @suppress {undefinedVars, duplicate} @this{Object} */function(input) {
  var self = this.ptr;
  ensureCache.prepare();
  if (typeof input == 'object') { input = ensureInt8(input); }
  _emscripten_bind_SecretKey_from_bendian_1(self, input);
};;

SecretKey.prototype['from_lendian'] = SecretKey.prototype.from_lendian = /** @suppress {undefinedVars, duplicate} @this{Object} */function(input) {
  var self = this.ptr;
  ensureCache.prepare();
  if (typeof input == 'object') { input = ensureInt8(input); }
  _emscripten_bind_SecretKey_from_lendian_1(self, input);
};;

SecretKey.prototype['to_bendian'] = SecretKey.prototype.to_bendian = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(32), HEAPU8);
  // var out = _malloc(32);
  _emscripten_bind_SecretKey_to_bendian_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 32));
  // TODO: free `out`?
};;

SecretKey.prototype['to_lendian'] = SecretKey.prototype.to_lendian = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  ensureCache.prepare();
  var out = ensureCache.alloc(new Uint8Array(32), HEAPU8);
  _emscripten_bind_SecretKey_to_lendian_1(self, out);
  return new Uint8Array(HEAPU8.subarray(out, out + 32));
  // TODO: free `out`?
};;

  SecretKey.prototype['__destroy__'] = SecretKey.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_SecretKey___destroy___0(self);
};

function unexpectedTypeError(expected, actual) {
  return new Error(`expected ${expected}, got: ${actual}`);
}

// PT
/** @suppress {undefinedVars, duplicate} @this{Object} */function PT(p, q) {
  if (q === undefined) {
    switch (p.constructor.name) {
      case "P1_Affine":
        this.ptr = _emscripten_bind_PT_PT__P1_Affine_1(p.ptr)
        break;
      case "P2_Affine":
        this.ptr = _emscripten_bind_PT_PT__P2_Affine_1(p.ptr)
        break;
      default:
        throw new Error(`unsupported type: ${p.constructor.name}`);
    }
    getCache(PT)[this.ptr] = this
    return
  }

  if (p.constructor === P1_Affine) {
    if (q.constructor !== P2_Affine) {
      throw unexpectedTypeError(P1_Affine, q.constructor);
    }
    this.ptr = _emscripten_bind_PT_PT_2(p.ptr, q.ptr);
  } else {
    if (q.constructor !== P1_Affine) {
      throw unexpectedTypeError(P2_Affine, q.constructor);
    }
    this.ptr = _emscripten_bind_PT_PT_2(q.ptr, p.ptr);
  }
  getCache(PT)[this.ptr] = this;
};;
PT.prototype = Object.create(WrapperObject.prototype);
PT.prototype.constructor = PT;
PT.prototype.__class__ = PT;
PT.__cache__ = {};
Module['PT'] = PT;

PT.prototype['dup'] = PT.prototype.dup = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_PT_dup_0(self), PT);
};;

PT.prototype['is_one'] = PT.prototype.is_one = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_PT_is_one_0(self));
};;

PT.prototype['is_equal'] = PT.prototype.is_equal = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return !!(_emscripten_bind_PT_is_equal_1(self, p));
};;

PT.prototype['sqr'] = PT.prototype.sqr = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_PT_sqr_0(self), PT);
};;

PT.prototype['mul'] = PT.prototype.mul = /** @suppress {undefinedVars, duplicate} @this{Object} */function(p) {
  var self = this.ptr;
  if (p && typeof p === 'object') p = p.ptr;
  return wrapPointer(_emscripten_bind_PT_mul_1(self, p), PT);
};;

PT.prototype['final_exp'] = PT.prototype.final_exp = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_PT_final_exp_0(self), PT);
};;

PT.prototype['in_group'] = PT.prototype.in_group = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return !!(_emscripten_bind_PT_in_group_0(self));
};;

PT.prototype['finalverify'] = PT.prototype.finalverify = /** @suppress {undefinedVars, duplicate} @this{Object} */function(gt1, gt2) {
  var self = this.ptr;
  if (gt1 && typeof gt1 === 'object') gt1 = gt1.ptr;
  if (gt2 && typeof gt2 === 'object') gt2 = gt2.ptr;
  return !!(_emscripten_bind_PT_finalverify_2(self, gt1, gt2));
};;

PT.prototype['one'] = PT.prototype.one = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  return wrapPointer(_emscripten_bind_PT_one_0(self), PT);
};;

  PT.prototype['__destroy__'] = PT.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_PT___destroy___0(self);
};
// Pairing
/** @suppress {undefinedVars, duplicate} @this{Object} */function Pairing(hash_or_encode, DST) {
  ensureCache.prepare();
  const [_dst, DST_len] = ensureRef(DST);
  this.ptr = _emscripten_bind_Pairing_Pairing_3(hash_or_encode, _dst, DST_len);
  getCache(Pairing)[this.ptr] = this;
};;
Pairing.prototype = Object.create(WrapperObject.prototype);
Pairing.prototype.constructor = Pairing;
Pairing.prototype.__class__ = Pairing;
Pairing.__cache__ = {};
Module['Pairing'] = Pairing;

Pairing.prototype['aggregate'] = Pairing.prototype.aggregate = /** @suppress {undefinedVars, duplicate} @this{Object} */function(pk, sig, msg, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  if (pk.constructor === P1_Affine) {
    pk = pk.ptr;

    if (sig.constructor !== P2_Affine) {
      throw new Error("`pk` is P1_Affine, expected `sig` to be P2_Affine; received: " + sig.constructor.name);
    }
    sig = sig.ptr;
    return _emscripten_bind_Pairing_aggregate_6__P1_P2(self, pk, sig, _msg, msg_len, _aug, aug_len);
  } else {
    pk = pk.ptr;

    if (sig.constructor !== P1_Affine) {
      throw new Error("`pk` is P2_Affine, expected `sig` to be P1_Affine; received: " + sig.constructor.name);
    }
    sig = sig.ptr;
    return _emscripten_bind_Pairing_aggregate_6__P2_P1(self, pk, sig, _msg, msg_len, _aug, aug_len);
  }
};;

Pairing.prototype['mul_n_aggregate'] = Pairing.prototype.mul_n_aggregate = /** @suppress {undefinedVars, duplicate} @this{Object} */function(pk, sig, scalar, msg, aug) {
  var self = this.ptr;
  ensureCache.prepare();

  const [_scalar, scalar_len] = ensureRef(scalar);
  const [_msg, msg_len] = ensureRef(msg);
  const [_aug, aug_len] = ensureRef(aug);

  if (pk.constructor === P1_Affine) {
    pk = pk.ptr;

    if (sig.constructor !== P2_Affine) {
      throw new Error("`pk` is P1_Affine, expected `sig` to be P2_Affine; received: " + sig.constructor.name);
    }
    sig = sig.ptr;
    return _emscripten_bind_Pairing_mul_n_aggregate_8__P1_P2(self, pk, sig, _scalar, scalar_len, _msg, msg_len, _aug, aug_len);
  } else {
    pk = pk.ptr;

    if (sig.constructor !== P1_Affine) {
      throw new Error("`pk` is P2_Affine, expected `sig` to be P1_Affine; received: " + sig.constructor.name);
    }
    sig = sig.ptr;
    return _emscripten_bind_Pairing_mul_n_aggregate_8__P2_P1(self, pk, sig, _scalar, scalar_len, _msg, msg_len, _aug, aug_len);
  }
};;

Pairing.prototype['commit'] = Pairing.prototype.commit = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_Pairing_commit_0(self);
};;

Pairing.prototype['merge'] = Pairing.prototype.merge = /** @suppress {undefinedVars, duplicate} @this{Object} */function(ctx) {
  var self = this.ptr;
  if (ctx && typeof ctx === 'object') ctx = ctx.ptr;
  return _emscripten_bind_Pairing_merge_1(self, ctx);
};;

Pairing.prototype['finalverify'] = Pairing.prototype.finalverify = /** @suppress {undefinedVars, duplicate} @this{Object} */function(sig) {
  var self = this.ptr;
  if (sig && typeof sig === 'object') sig = sig.ptr;
  return !!(_emscripten_bind_Pairing_finalverify_1(self, sig));
};;

Pairing.prototype['__destroy__'] = Pairing.prototype.__destroy__ = /** @suppress {undefinedVars, duplicate} @this{Object} */function() {
  var self = this.ptr;
  _emscripten_bind_Pairing___destroy___0(self);
};

// G1
/** @suppress {undefinedVars, duplicate} @this{Object} */function G1() {
  return wrapPointer(_emscripten_bind_G1_0(), P1);
};;
Module['G1'] = G1;

// G2
/** @suppress {undefinedVars, duplicate} @this{Object} */function G2() {
  return wrapPointer(_emscripten_bind_G2_0(), P2);
};;
Module['G2'] = G2;

function ensureRef(val) {
  // TODO: something else (nullptr)?
  if (typeof val === "undefined") {
    return [ensureString(""), 0];
  }

  switch (val.constructor.name) {
    case "String":
      return [ensureString(val), val.length];
    case "Buffer":
      // NB: intentional fallthrough.
    case "Uint8Array":
      return [ensureUint8(val), val.length];
    // TODO:
    // case BigInt:
    default:
      throw new Error(`unsupported type for \`val\`: ${val.constructor.name}`);
  }
}

const initialized = new Promise(resolve => {
  Module['onRuntimeInitialized'] = function() {
    resolve();
  };
});

function onInitialized(callback) {
  initialized.then(callback).catch((e) => {
    throw e;
  });
}

module.exports = {
  initialized,
  onInitialized,
  // BLS12_381_G1,
  // BLS12_381_NEG_G1,
  // BLS12_381_G2,
  // BLS12_381_NEG_G2,
  SecretKey,
  P1,
  P2,
  P1_Affine,
  P2_Affine,
  PT,
  Pairing,
  G1,
  G2,
};
