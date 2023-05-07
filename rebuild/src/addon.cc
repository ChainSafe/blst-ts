#include "addon.h"

/**
 *
 *
 * BlstAsyncWorker
 *
 *
 */
Napi::Value BlstAsyncWorker::RunSync()
{
    WORKER_TRY_CATCH_BEGIN
    Setup();
    if (HasError())
    {
        goto out_err;
    }
    OnExecute(_env);
    // `OnWorkComplete` calls `Destroy` causing `GetReturnValue` to segfault.
    // When calling `RunSnyc` the class is stack allocated (should be!!!) so
    // should clean itself up and `SuppressDestruct` is safe here.
    SuppressDestruct();
    OnWorkComplete(_env, napi_ok);
    if (HasError())
    {
        goto out_err;
    }
    Napi::Value ret_val = GetReturnValue();
    if (HasError())
    {
        goto out_err;
    }
    return ret_val;
    WORKER_TRY_CATCH_END("RunSync");
};
Napi::Value BlstAsyncWorker::Run()
{
    WORKER_TRY_CATCH_BEGIN
    _use_deferred = true;
    Setup();
    if (HasError())
    {
        goto out_err;
    }
    Queue();
    return GetPromise();
    WORKER_TRY_CATCH_END("Run");
};
void BlstAsyncWorker::SetError(const std::string &err)
{
    BlstBase::SetError(err);
    Napi::AsyncWorker::SetError(err);
};
void BlstAsyncWorker::OnOK()
{
    if (_use_deferred)
    {
        _deferred.Resolve(GetReturnValue());
    }
};
void BlstAsyncWorker::OnError(Napi::Error const &err)
{
    if (_use_deferred)
    {
        _deferred.Reject(err.Value());
    }
    else
    {
        err.ThrowAsJavaScriptException();
    }
};
Napi::Promise BlstAsyncWorker::GetPromise()
{
    return _deferred.Promise();
};

/**
 *
 *
 * Uint8ArrayArg
 *
 *
 */
Uint8ArrayArg::Uint8ArrayArg(
    Napi::Env env,
    const Napi::Value &val,
    const std::string &err_prefix)
    : BlstBase{env},
      _error_prefix{err_prefix},
      _data{nullptr},
      _byte_length{0},
      _ref{}
{
    if (val.IsTypedArray())
    {
        Napi::TypedArray untyped = val.As<Napi::TypedArray>();
        if (untyped.TypedArrayType() == napi_uint8_array)
        {
            _ref = Napi::Persistent(untyped.As<Napi::Uint8Array>());
            _data = _ref.Value().Data();
            _byte_length = _ref.Value().ByteLength();
            return;
        }
    }
    SetError(err_prefix + " must be of type BlstBuffer");
};
const uint8_t *Uint8ArrayArg::Data()
{
    if (HasError())
    {
        return nullptr;
    }
    return _data;
};
size_t Uint8ArrayArg::ByteLength()
{
    if (HasError())
    {
        return 0;
    }
    return _byte_length;
};
bool Uint8ArrayArg::ValidateLength(size_t length1, size_t length2)
{
    if (_error_prefix.size() == 0) // hasn't been fully initialized
    {
        return false;
    }
    if (_error.size() != 0) // already an error, don't overwrite
    {
        return false;
    }
    bool is_valid = false;
    if (ByteLength() == length1 || (length2 != 0 && ByteLength() == length2))
    {
        is_valid = true;
    }
    else
    {
        std::ostringstream msg;
        msg << _error_prefix << " is " << ByteLength() << " bytes, but must be ";
        if (length1 != 0)
        {
            msg << length1;
        };
        if (length2 != 0)
        {
            if (length1 != 0)
            {
                msg << " or ";
            }
            msg << length2;
        };
        msg << " bytes long";
        SetError(msg.str());
    }
    return is_valid;
};
/**
 *
 *
 * Uint8ArrayArgArray
 *
 *
 */
Uint8ArrayArgArray::Uint8ArrayArgArray(
    Napi::Env env,
    const Napi::Value &raw_arg,
    const std::string &err_prefix_singular,
    const std::string &err_prefix_plural)
    : BlstBase{env},
      _args{}
{
    if (!raw_arg.IsArray())
    {
        SetError(err_prefix_plural + " must be of type BlstBuffer[]");
        return;
    }
    Napi::Array arr = raw_arg.As<Napi::Array>();
    uint32_t length = arr.Length();
    _args.reserve(length);
    for (uint32_t i = 0; i < length; i++)
    {
        _args.push_back(Uint8ArrayArg{env, arr[i], err_prefix_singular});
        if (_args[i].HasError())
        {
            SetError(_args[i].GetError());
            return;
        }
    }
};
/**
 *
 *
 * TestWorker
 *
 *
 */
class TestWorker : public BlstAsyncWorker
{
public:
    enum TestSyncOrAsync
    {
        SYNC = 0,
        ASYNC = 1,
    };
    enum TestPhase
    {
        SETUP = 0,
        EXECUTION = 1,
        RETURN = 2
    };
    enum TestCase
    {
        NORMAL_EXECUTION = -1,
        SET_ERROR = 0,
        THROW_ERROR = 1,
    };

public:
    TestWorker(const Napi::CallbackInfo &info)
        : BlstAsyncWorker{info},
          _test_phase{TestPhase::SETUP},
          _test_case{0},
          _return_value{} {}

protected:
    void
    Setup() override
    {
        Napi::Value test_phase_value = _info[1];
        if (!test_phase_value.IsNumber())
        {
            SetError("testPhase must be a TestPhase enum");
            return;
        }
        _test_phase = static_cast<TestPhase>(test_phase_value.As<Napi::Number>().Uint32Value());
        Napi::Value test_case_value = _info[2];
        if (!test_case_value.IsNumber())
        {
            SetError("testCase must be a TestCase enum");
            return;
        }
        _test_case = test_case_value.As<Napi::Number>().Int32Value();
        if (_test_phase == TestPhase::SETUP)
        {
            switch (_test_case)
            {
            case 0:
                SetError("setup: TestCase.SET_ERROR");
                break;
            case 1:
                throw Napi::Error::New(_env, "setup: TestCase.THROW_ERROR");
                break;
            case 2:
            {
                Uint8ArrayArg a{_env, _info[3], "TEST"};
                if (a.HasError())
                {
                    SetError(a.GetError());
                    return;
                }
                break;
            }
            case 3:
            {
                Uint8ArrayArgArray a{_env, _info[3], "TEST", "TESTS"};
                if (a.HasError())
                {
                    SetError(a.GetError());
                    return;
                }
                break;
            }
            }
        }
    }
    void Execute() override
    {
        _return_value.append("CORRECT_VALUE");
        if (_test_phase == TestPhase::EXECUTION)
        {
            switch (_test_case)
            {
            case 0:
                SetError("execution: TestCase.SET_ERROR");
                break;
            case 1:
                // skip in execution. cannot throw from here
                // throw Napi::Error::New(_env, "execution: TestCase.THROW_ERROR");
                break;
            case 2:
            default:
                // no-op
                break;
            }
        }
    }
    Napi::Value GetReturnValue() override
    {
        if (_test_phase == TestPhase::RETURN)
        {
            switch (_test_case)
            {
            case 0:
                SetError("return: TestCase.SET_ERROR");
                break;
            case 1:
                throw Napi::Error::New(_env, "return: TestCase.THROW_ERROR");
                break;
            default:
                SetError("return: unknown test case");
            }
        }
        return Napi::String::New(_env, _return_value);
    }

private:
    TestPhase _test_phase;
    int32_t _test_case;
    std::string _return_value;
};

/**
 *
 *
 * BlstTsAddon
 *
 *
 */
BlstTsAddon::BlstTsAddon(Napi::Env env, Napi::Object exports)
    : _dst{"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"},
      _secret_key_length{32},
      _public_key_compressed_length{48},
      _public_key_uncompressed_length{96},
      _signature_compressed_length{96},
      _signature_uncompressed_length{192},
      _random_bytes_length{8},
      _blst_error_strings{
          "BLST_SUCCESS",
          "BLST_BAD_ENCODING",
          "BLST_POINT_NOT_ON_CURVE",
          "BLST_POINT_NOT_IN_GROUP",
          "BLST_AGGR_TYPE_MISMATCH",
          "BLST_VERIFY_FAIL",
          "BLST_PK_IS_INFINITY",
          "BLST_BAD_SCALAR",
      }
{
    DefineAddon(exports, {
                             InstanceValue("BLST_CONSTANTS", BuildJsConstants(env), napi_enumerable),
                             InstanceMethod("runTest", &BlstTsAddon::RunTest, napi_enumerable),
                         });
    SecretKey::Init(env, exports, this);
    PublicKey::Init(env, exports, this);
    Signature::Init(env, exports, this);
    Functions::Init(env, exports);
    env.SetInstanceData(this);
}
std::string BlstTsAddon::GetBlstErrorString(const blst::BLST_ERROR &err)
{
    return _blst_error_strings[err];
}
bool BlstTsAddon::GetRandomBytes(blst::byte *ikm, size_t length)
{
    // [randomBytes](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/lib/internal/crypto/random.js#L98)
    // [RandomBytesJob](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/lib/internal/crypto/random.js#L139)
    // [RandomBytesTraits::DeriveBits](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/crypto/crypto_random.cc#L65)
    // [CSPRNG](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/crypto/crypto_util.cc#L63)
    do
    {
        if (1 == RAND_status())
        {
            if (1 == RAND_bytes(ikm, length))
            {
                return true;
            }
        }
    } while (1 == RAND_poll());

    return false;
};
Napi::Value BlstTsAddon::RunTest(const Napi::CallbackInfo &info)
{
    if (!info[0].IsNumber())
    {
        throw Napi::TypeError::New(info.Env(), "First argument must be enum TestSyncOrAsync");
    }
    int32_t sync_or_async = info[0].ToNumber().Int32Value();
    if (sync_or_async == 0)
    {
        TestWorker worker{info};
        return worker.RunSync();
    }
    TestWorker *worker = new TestWorker{info};
    return worker->Run();
}
Napi::Object BlstTsAddon::BuildJsConstants(Napi::Env &env)
{
    Napi::Object _js_constants = Napi::Object::New(env);
    _js_constants.Set(Napi::String::New(env, "DST"), Napi::String::New(env, _dst));
    _js_constants.Set(Napi::String::New(env, "SECRET_KEY_LENGTH"), Napi::Number::New(env, _secret_key_length));
    _js_constants.Set(Napi::String::New(env, "PUBLIC_KEY_LENGTH_COMPRESSED"), Napi::Number::New(env, _public_key_compressed_length));
    _js_constants.Set(Napi::String::New(env, "PUBLIC_KEY_LENGTH_UNCOMPRESSED"), Napi::Number::New(env, _public_key_uncompressed_length));
    _js_constants.Set(Napi::String::New(env, "SIGNATURE_LENGTH_COMPRESSED"), Napi::Number::New(env, _signature_compressed_length));
    _js_constants.Set(Napi::String::New(env, "SIGNATURE_LENGTH_UNCOMPRESSED"), Napi::Number::New(env, _signature_uncompressed_length));
    return _js_constants;
}

NODE_API_ADDON(BlstTsAddon)
