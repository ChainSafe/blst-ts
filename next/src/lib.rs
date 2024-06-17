#![deny(clippy::all)]

use blst::{blst_scalar, blst_scalar_from_uint64, min_pk, BLST_ERROR};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use rand::{rngs::ThreadRng, Rng};

const DST: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";

#[napi]
pub struct SecretKey(min_pk::SecretKey);

#[napi]
#[derive(Clone)]
pub struct PublicKey(min_pk::PublicKey);

#[napi]
#[derive(Clone)]
pub struct Signature(min_pk::Signature);

#[napi(object)]
pub struct SignatureSet {
  pub msg: Uint8Array,
  pub pk: Reference<PublicKey>,
  pub sig: Reference<Signature>,
}

#[napi]
impl SecretKey {
  #[napi(factory)]
  pub fn from_keygen(ikm: Uint8Array, key_info: Option<Uint8Array>) -> Result<Self> {
    let key_info = key_info.as_deref().unwrap_or(&[]);
    min_pk::SecretKey::key_gen(&ikm.as_ref(), key_info)
      .map(Self)
      .map_err(to_err)
  }

  #[napi(factory)]
  pub fn derive_master_eip2333(ikm: Uint8Array) -> Result<Self> {
    min_pk::SecretKey::derive_master_eip2333(&ikm.as_ref())
      .map(Self)
      .map_err(to_err)
  }

  #[napi]
  pub fn derive_child_eip2333(&self, index: u32) -> Self {
    Self(self.0.derive_child_eip2333(index))
  }

  #[napi(factory)]
  pub fn from_bytes(bytes: Uint8Array) -> Result<Self> {
    min_pk::SecretKey::from_bytes(&bytes.as_ref())
      .map(Self)
      .map_err(to_err)
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    Uint8Array::from(self.0.to_bytes())
  }

  #[napi]
  pub fn to_public_key(&self) -> PublicKey {
    PublicKey(self.0.sk_to_pk())
  }

  #[napi]
  pub fn sign(&self, msg: Uint8Array) -> Signature {
    Signature(self.0.sign(&msg.as_ref(), &DST, &[]))
  }
}

#[napi]
impl PublicKey {
  #[napi(factory)]
  pub fn from_bytes(bytes: Uint8Array, pk_validate: Option<bool>) -> Result<Self> {
    let pk = if pk_validate == Some(true) {
      min_pk::PublicKey::from_bytes(&bytes.as_ref())
    } else {
      min_pk::PublicKey::key_validate(&bytes.as_ref())
    };
    pk.map(Self).map_err(to_err)
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    let bytes = self.0.to_bytes();
    Uint8Array::from(bytes)
  }

  #[napi]
  pub fn key_validate(&self) -> Result<Undefined> {
    self.0.validate().map_err(to_err)
  }
}

#[napi]
impl Signature {
  #[napi(factory)]
  pub fn from_bytes(
    bytes: Uint8Array,
    sig_validate: Option<bool>,
    sig_infcheck: Option<bool>,
  ) -> Result<Self> {
    let sig = if sig_validate == Some(true) {
      min_pk::Signature::from_bytes(&bytes.as_ref())
    } else {
      min_pk::Signature::sig_validate(&bytes.as_ref(), sig_infcheck.unwrap_or(false))
    };
    sig.map(Self).map_err(to_err)
  }

  #[napi]
  pub fn to_bytes(&self) -> Uint8Array {
    Uint8Array::from(self.0.to_bytes())
  }

  #[napi]
  pub fn sig_validate(&self, sig_infcheck: Option<bool>) -> Result<Undefined> {
    min_pk::Signature::validate(&self.0, sig_infcheck.unwrap_or(false)).map_err(to_err)
  }
}

#[napi]
pub fn aggregate_public_keys(
  pks: Vec<&PublicKey>,
  pks_validate: Option<bool>,
) -> Result<PublicKey> {
  let pks = pks.iter().map(|pk| &pk.0).collect::<Vec<_>>();
  min_pk::AggregatePublicKey::aggregate(&pks, pks_validate.unwrap_or(false))
    .map(|pk| PublicKey(pk.to_public_key()))
    .map_err(to_err)
}

#[napi]
pub fn aggregate_signatures(
  sigs: Vec<&Signature>,
  sigs_groupcheck: Option<bool>,
) -> Result<Signature> {
  let sigs = sigs.iter().map(|s| &s.0).collect::<Vec<_>>();
  min_pk::AggregateSignature::aggregate(&sigs, sigs_groupcheck.unwrap_or(false))
    .map(|sig| Signature(sig.to_signature()))
    .map_err(to_err)
}

#[napi]
pub fn aggregate_serialized_public_keys(
  pks: Vec<Uint8Array>,
  pks_validate: Option<bool>,
) -> Result<PublicKey> {
  let pks = pks.iter().map(|pk| pk.as_ref()).collect::<Vec<_>>();
  min_pk::AggregatePublicKey::aggregate_serialized(&pks, pks_validate.unwrap_or(false))
    .map(|pk| PublicKey(pk.to_public_key()))
    .map_err(to_err)
}

#[napi]
pub fn aggregate_serialized_signatures(
  sigs: Vec<Uint8Array>,
  sigs_groupcheck: Option<bool>,
) -> Result<Signature> {
  let sigs = sigs.iter().map(|s| s.as_ref()).collect::<Vec<_>>();
  min_pk::AggregateSignature::aggregate_serialized(&sigs, sigs_groupcheck.unwrap_or(false))
    .map(|sig| Signature(sig.to_signature()))
    .map_err(to_err)
}

#[napi]
pub fn verify(
  msg: Uint8Array,
  pk: &PublicKey,
  sig: &Signature,
  pk_validate: Option<bool>,
  sig_groupcheck: Option<bool>,
) -> bool {
  sig.0.verify(
    sig_groupcheck.unwrap_or(false),
    &msg.as_ref(),
    &DST,
    &[],
    &pk.0,
    pk_validate.unwrap_or(false),
  ) == BLST_ERROR::BLST_SUCCESS
}

#[napi]
pub fn aggregate_verify(
  msgs: Vec<Uint8Array>,
  pks: Vec<&PublicKey>,
  sig: &Signature,
  pk_validate: Option<bool>,
  sigs_groupcheck: Option<bool>,
) -> bool {
  let pks = pks.iter().map(|pk| &pk.0).collect::<Vec<_>>();
  let msgs = msgs.iter().map(|msg| msg.as_ref()).collect::<Vec<_>>();
  min_pk::Signature::aggregate_verify(
    &sig.0,
    sigs_groupcheck.unwrap_or(false),
    &msgs,
    &DST,
    &pks,
    pk_validate.unwrap_or(false),
  ) == BLST_ERROR::BLST_SUCCESS
}

#[napi]
pub fn fast_aggregate_verify(
  msg: Uint8Array,
  pks: Vec<&PublicKey>,
  sig: &Signature,
  sigs_groupcheck: Option<bool>,
) -> bool {
  let pks = pks.iter().map(|pk| &pk.0).collect::<Vec<_>>();
  min_pk::Signature::fast_aggregate_verify(
    &sig.0,
    sigs_groupcheck.unwrap_or(false),
    &msg.as_ref(),
    &DST,
    &pks,
  ) == BLST_ERROR::BLST_SUCCESS
}

#[napi]
pub fn fast_aggregate_verify_pre_aggregated(
  msg: Uint8Array,
  pk: &PublicKey,
  sig: &Signature,
  sigs_groupcheck: Option<bool>,
) -> bool {
  min_pk::Signature::fast_aggregate_verify_pre_aggregated(
    &sig.0,
    sigs_groupcheck.unwrap_or(false),
    &msg.as_ref(),
    &DST,
    &pk.0,
  ) == BLST_ERROR::BLST_SUCCESS
}

#[napi]
pub fn verify_multiple_aggregate_signatures(
  sets: Vec<SignatureSet>,
  pks_validate: Option<bool>,
  sigs_groupcheck: Option<bool>,
) -> bool {
  let (msgs, pks, sigs) = convert_sets(&sets);
  let rands = create_rand_scalars(sets.len());
  min_pk::Signature::verify_multiple_aggregate_signatures(
    &msgs,
    &DST,
    &pks,
    pks_validate.unwrap_or(false),
    &sigs,
    sigs_groupcheck.unwrap_or(false),
    &rands,
    64,
  ) == BLST_ERROR::BLST_SUCCESS
}

#[napi]
pub async fn verify_async(
  msg: Uint8Array,
  pk: &PublicKey,
  sig: &Signature,
  pk_validate: Option<bool>,
  sig_groupcheck: Option<bool>,
) -> bool {
  verify(msg, pk, sig, pk_validate, sig_groupcheck)
}

#[napi]
pub async fn aggregate_verify_async(
  msgs: Vec<Uint8Array>,
  pks: Vec<&PublicKey>,
  sig: &Signature,
  pk_validate: Option<bool>,
  sigs_groupcheck: Option<bool>,
) -> bool {
  aggregate_verify(msgs, pks, sig, pk_validate, sigs_groupcheck)
}

#[napi]
pub async fn fast_aggregate_verify_async(
  msg: Uint8Array,
  pks: Vec<&PublicKey>,
  sig: &Signature,
  sigs_groupcheck: Option<bool>,
) -> bool {
  fast_aggregate_verify(msg, pks, sig, sigs_groupcheck)
}

#[napi]
pub async fn fast_aggregate_verify_pre_aggregated_async(
  msg: Uint8Array,
  pk: &PublicKey,
  sig: &Signature,
  sigs_groupcheck: Option<bool>,
) -> bool {
  fast_aggregate_verify_pre_aggregated(msg, pk, sig, sigs_groupcheck)
}

#[napi]
pub async fn verify_multiple_aggregate_signatures_async(
  sets: Vec<SignatureSet>,
  pks_validate: Option<bool>,
  sigs_groupcheck: Option<bool>,
) -> bool {
  verify_multiple_aggregate_signatures(sets, pks_validate, sigs_groupcheck)
}

fn to_err(e: BLST_ERROR) -> Error {
  Error::from_reason(format!("{:?}", e))
}

pub fn convert_sets<'a>(
  sets: &'a [SignatureSet],
) -> (
  Vec<&'a [u8]>,
  Vec<&'a min_pk::PublicKey>,
  Vec<&'a min_pk::Signature>,
) {
  let len = sets.len();
  let mut msgs = Vec::with_capacity(len);
  let mut pks = Vec::with_capacity(len);
  let mut sigs = Vec::with_capacity(len);

  for set in sets {
    msgs.push(set.msg.as_ref());
    pks.push(&set.pk.0);
    sigs.push(&set.sig.0);
  }

  (msgs, pks, sigs)
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
  (0..len)
    .map(|_| create_scalar(rand_non_zero(&mut rng)))
    .collect()
}
