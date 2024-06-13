#![deny(clippy::all)]

use blst::{blst_scalar, blst_scalar_from_uint64, min_pk, BLST_ERROR};
use napi::{bindgen_prelude::{Object, Uint8Array}, Error};
use napi_derive::napi;
use rand::{rngs::ThreadRng, Rng};

const DST: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";

#[napi]
pub struct SecretKey {
  sk: min_pk::SecretKey,
}

#[napi]
#[derive(Clone)]
pub struct PublicKey {
  pk: min_pk::PublicKey,
}

#[napi]
#[derive(Clone)]
pub struct Signature {
  sig: min_pk::Signature,
}

#[napi]
impl SecretKey {
  #[napi(factory)]
  pub fn from_keygen(ikm: Uint8Array, key_info: Option<Uint8Array>) -> Result<Self, Error> {
    let key_info = key_info.as_deref().unwrap_or(&[]);
    match min_pk::SecretKey::key_gen(&ikm.as_ref(), key_info) {
      Ok(sk) => Ok(Self { sk }),
      Err(e) => Err(to_err(e)),
    }
  }

  #[napi(factory)]
  pub fn from_bytes(bytes: Uint8Array) -> Result<Self, Error> {
    let sk = min_pk::SecretKey::from_bytes(&bytes.as_ref());
    match sk {
      Ok(sk) => Ok(Self { sk }),
      Err(e) => Err(to_err(e)),
    }
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    let bytes = self.sk.to_bytes();
    Uint8Array::from(bytes)
  }

  #[napi]
  pub fn to_public_key(&self) -> PublicKey {
    PublicKey {
      pk: self.sk.sk_to_pk()
    }
  }

  #[napi]
  pub fn sign(&self, msg: Uint8Array) -> Signature {
    Signature {
      sig: self.sk.sign(&msg.as_ref(), &DST, &[])
    }
  }
}

#[napi]
impl PublicKey {
  #[napi(factory)]
  pub fn from_bytes(bytes: Uint8Array) -> Result<Self, Error> {
    let pk = min_pk::PublicKey::from_bytes(&bytes.as_ref());
    match pk {
      Ok(pk) => Ok(Self { pk }),
      Err(e) => Err(to_err(e)),
    }
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    let bytes = self.pk.to_bytes();
    Uint8Array::from(bytes)
  }
}

#[napi]
impl Signature {
  #[napi(factory)]
  pub fn from_bytes(bytes: Uint8Array) -> Result<Self, Error> {
    let sig = min_pk::Signature::from_bytes(&bytes.as_ref());
    match sig {
      Ok(sig) => Ok(Self { sig }),
      Err(e) => Err(to_err(e)),
    }
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    let bytes = self.sig.to_bytes();
    Uint8Array::from(bytes)
  }
}

#[napi]
pub fn aggregate_public_keys(pks: Vec<&PublicKey>, pks_validate: Option<bool>) -> Result<PublicKey, Error> {
  let pks = pks.iter().map(|pk| &pk.pk).collect::<Vec<_>>();
  match min_pk::AggregatePublicKey::aggregate(&pks, pks_validate.unwrap_or(false)) {
    Ok(pk) => Ok(PublicKey { pk: pk.to_public_key() }),
    Err(e) => Err(to_err(e)),
  }
}

#[napi]
pub fn aggregate_signatures(sigs: Vec<&Signature>, sigs_groupcheck: Option<bool>) -> Result<Signature, Error> {
  let sigs = sigs.iter().map(|s| &s.sig).collect::<Vec<_>>();
  match min_pk::AggregateSignature::aggregate(&sigs, sigs_groupcheck.unwrap_or(false)) {
    Ok(sig) => Ok(Signature { sig: sig.to_signature() }),
    Err(e) => Err(to_err(e)),
  }
}

#[napi]
pub fn verify(msg: Uint8Array, pk: &PublicKey, sig: &Signature, pk_validate: Option<bool>, sig_groupcheck: Option<bool>) -> bool {
  match sig.sig.verify(sig_groupcheck.unwrap_or(false), &msg.as_ref(), &DST, &[], &pk.pk, pk_validate.unwrap_or(false)) {
    BLST_ERROR::BLST_SUCCESS => true,
    _ => false,
  }
}

#[napi]
pub fn aggregate_verify(msgs: Vec<Uint8Array>, pks: Vec<&PublicKey>, sig: &Signature, pk_validate: Option<bool>, sigs_groupcheck: Option<bool>) -> bool {
  let pks = pks.iter().map(|pk| &pk.pk).collect::<Vec<_>>();
  let msgs = msgs.iter().map(|msg| msg.as_ref()).collect::<Vec<_>>();
  match min_pk::Signature::aggregate_verify(&sig.sig, sigs_groupcheck.unwrap_or(false), &msgs, &DST, &pks, pk_validate.unwrap_or(false)) {
    BLST_ERROR::BLST_SUCCESS => true,
    _ => false,
  }
}

#[napi]
pub fn fast_aggregate_verify(msg: Uint8Array, pks: Vec<&PublicKey>, sig: &Signature, sigs_groupcheck: Option<bool>) -> bool {
  let pks = pks.iter().map(|pk| &pk.pk).collect::<Vec<_>>();
  match min_pk::Signature::fast_aggregate_verify(&sig.sig, sigs_groupcheck.unwrap_or(false), &msg.as_ref(), &DST, &pks) {
    BLST_ERROR::BLST_SUCCESS => true,
    _ => false,
  }
}

#[napi]
pub fn fast_aggregate_verify_pre_aggregated(msg: Uint8Array, pk: &PublicKey, sig: &Signature, sigs_groupcheck: Option<bool>) -> bool {
  match min_pk::Signature::fast_aggregate_verify_pre_aggregated(&sig.sig, sigs_groupcheck.unwrap_or(false), &msg.as_ref(), &DST, &pk.pk) {
    BLST_ERROR::BLST_SUCCESS => true,
    _ => false,
  }
}

#[napi]
pub fn verify_multiple_aggregate_signatures(
  #[napi(ts_arg_type = "{msg: Uint8Array, pk: PublicKey, sig: Signature}[]")] sets: Vec<Object>,
  pks_validate: Option<bool>, sigs_groupcheck: Option<bool>
) -> Result<bool, Error> {
  let len = sets.len();
  let mut msgs = Vec::with_capacity(len);
  let mut pks = Vec::with_capacity(len);
  let mut sigs = Vec::with_capacity(len);

  for obj in sets {
    match obj.get::<&str, Uint8Array>("msg")? {
      Some(msg) => msgs.push(msg),
      None => return Err(Error::from_reason("missing msg")),
    }

    match obj.get::<&str, &PublicKey>("pk")? {
      Some(pk) => pks.push(&pk.pk),
      None => return Err(Error::from_reason("missing pk")),
    }

    match obj.get::<&str, &Signature>("sig")? {
      Some(sig) => sigs.push(&sig.sig),
      None => return Err(Error::from_reason("missing sig")),
    }
  }

  let msgs = msgs.iter().map(|msg| msg.as_ref()).collect::<Vec<_>>();

  let rands = create_rand_scalars(msgs.len());
  match min_pk::Signature::verify_multiple_aggregate_signatures(&msgs, &DST, &pks, pks_validate.unwrap_or(false), &sigs, sigs_groupcheck.unwrap_or(false), &rands, 64) {
    BLST_ERROR::BLST_SUCCESS => Ok(true),
    _ => Ok(false),
  }
}

fn to_err(e: BLST_ERROR) -> Error {
  Error::from_reason(format!("{:?}", e))
}

fn rand_non_zero(rng: &mut ThreadRng) -> u64 {
  loop {
    let r = rng.gen();
    if r != 0 {
      return r;
    }
  }
}

fn create_scalar(i: u64) -> blst_scalar {
  let mut vals = [0u64; 4];
  vals[0] = i;
  let mut scalar = std::mem::MaybeUninit::<blst_scalar>::uninit();
  // TODO: remove this `unsafe` code-block once we get a safe option from `blst`.
  //
  // https://github.com/sigp/lighthouse/issues/1720
  unsafe {
    blst_scalar_from_uint64(scalar.as_mut_ptr(), vals.as_ptr());
    scalar.assume_init()
  }
}


/// Creates a vector of random scalars, each 64 bits
fn create_rand_scalars(len: usize) -> Vec<blst_scalar> {
  let mut rng = rand::thread_rng();
  (0..len).map(|_| create_scalar(rand_non_zero(&mut rng))).collect()
}
