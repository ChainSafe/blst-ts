/// <reference types="node" />
import { BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable } from "./types.js";
declare const blstTs: import("./types.js").BlstTs;
export default blstTs;
declare const BLST_CONSTANTS: {
    DST: string;
    SECRET_KEY_LENGTH: number;
    PUBLIC_KEY_LENGTH_UNCOMPRESSED: number;
    PUBLIC_KEY_LENGTH_COMPRESSED: number;
    SIGNATURE_LENGTH_UNCOMPRESSED: number;
    SIGNATURE_LENGTH_COMPRESSED: number;
}, CoordType: typeof import("./types.js").CoordType, PublicKey: typeof import("./types.js").PublicKey, SecretKey: typeof import("./types.js").SecretKey, Signature: typeof import("./types.js").Signature, aggregatePublicKeys: typeof import("./types.js").aggregatePublicKeys, aggregateSignatures: typeof import("./types.js").aggregateSignatures, aggregateVerify: typeof import("./types.js").aggregateVerify, asyncAggregateVerify: typeof import("./types.js").asyncAggregateVerify, asyncFastAggregateVerify: (message: Uint8Array, publicKeys: PublicKeyArg[], signature: SignatureArg) => Promise<boolean>, asyncVerify: (message: Uint8Array, publicKey: PublicKeyArg, signature: SignatureArg) => Promise<boolean>, asyncVerifyMultipleAggregateSignatures: typeof import("./types.js").asyncVerifyMultipleAggregateSignatures, fastAggregateVerify: (message: Uint8Array, publicKeys: PublicKeyArg[], signature: SignatureArg) => boolean, randomBytesNonZero: (bytesCount: number) => Buffer, verify: (message: Uint8Array, publicKey: PublicKeyArg, signature: SignatureArg) => boolean, verifyMultipleAggregateSignatures: typeof import("./types.js").verifyMultipleAggregateSignatures;
export type { BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable };
export { BLST_CONSTANTS, CoordType, PublicKey, SecretKey, Signature, aggregatePublicKeys, aggregateSignatures, aggregateVerify, asyncAggregateVerify, asyncFastAggregateVerify, asyncVerify, asyncVerifyMultipleAggregateSignatures, fastAggregateVerify, randomBytesNonZero, verify, verifyMultipleAggregateSignatures, };
//# sourceMappingURL=index.d.cts.map