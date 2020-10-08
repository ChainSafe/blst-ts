//
//
// Sample Eth2 implementation
//
//

const DST = "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";

type Pubkey = P1_Affine;
type Signature = P2_Affine;
type AggregateSignature = P2_Aggregate;
type AggregatePublicKey = P1_Aggregate;

function Sign(sk: SecretKey, message: Uint8Array): Signature {
  const sig = new blst.P2();
  sig.hash_to(message, DST, pk_for_wire).sign_with(sk);
  return sig;
}

function Verify(pk: Pubkey, message: Uint8Array, signature: Signature): boolean;

function Aggregate(signatures: Signature[]): Signature;

function FastAggregateVerify(
  PKs: Pubkey[],
  message: Uint8Array,
  signature: Signature
): boolean;

function AggregateVerify(
  PKs: Pubkey[],
  messages: Uint8Array[],
  signature: Signature
): boolean;
