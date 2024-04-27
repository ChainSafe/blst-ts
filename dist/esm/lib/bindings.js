import { randomBytes } from "node:crypto";
export function prepareBindings(bindings) {
    bindings.SecretKey.prototype.toHex = function toHex() {
        const uint8 = this.serialize();
        return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
    };
    bindings.PublicKey.prototype.toHex = function toHex(compress) {
        const uint8 = this.serialize(compress);
        return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
    };
    bindings.Signature.prototype.toHex = function toHex(compress) {
        const uint8 = this.serialize(compress);
        return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
    };
    return {
        ...bindings,
        CoordType: {
            affine: 0,
            jacobian: 1,
        },
        randomBytesNonZero(bytesCount) {
            const rand = randomBytes(bytesCount);
            for (let i = 0; i < bytesCount; i++) {
                if (rand[i] !== 0)
                    return rand;
            }
            rand[0] = 1;
            return rand;
        },
        verify(message, publicKey, signature) {
            return bindings.aggregateVerify([message], [publicKey], signature);
        },
        asyncVerify(message, publicKey, signature) {
            return bindings.asyncAggregateVerify([message], [publicKey], signature);
        },
        fastAggregateVerify(message, publicKeys, signature) {
            let key;
            try {
                // this throws for invalid key, catch and return false
                key = bindings.aggregatePublicKeys(publicKeys);
            }
            catch {
                return false;
            }
            return bindings.aggregateVerify([message], [key], signature);
        },
        asyncFastAggregateVerify(message, publicKeys, signature) {
            let key;
            try {
                // this throws for invalid key, catch and return false
                key = bindings.aggregatePublicKeys(publicKeys);
            }
            catch {
                return Promise.resolve(false);
            }
            return bindings.asyncAggregateVerify([message], [key], signature);
        },
    };
}
//# sourceMappingURL=bindings.js.map