#include "addon.h"

namespace
{
    SignatureSet::SignatureSet(Napi::Env env, const Napi::Value &raw_arg)
        : BlstBase{env},
          _msg{_env},
          _publicKey{_env},
          _signature{_env}
    {
        Napi::HandleScope scope(_env);
        if (!raw_arg.IsObject())
        {
            SetError("SignatureSet must be an object");
            return;
        }
        Napi::Object set = raw_arg.As<Napi::Object>();
        if (!set.Has("msg"))
        {
            SetError("SignatureSet must have a 'msg' property");
            return;
        }
        _msg = Uint8ArrayArg{_env, set.Get("msg"), "msg"};
        if (!set.Has("publicKey"))
        {
            SetError("SignatureSet must have a 'publicKey' property");
            return;
        }
        _publicKey = PublicKeyArg{_env, set.Get("publicKey")};
        if (!set.Has("signature"))
        {
            SetError("SignatureSet must have a 'signature' property");
            return;
        }
        _signature = SignatureArg{_env, set.Get("signature")};
    };

    SignatureSetArray::SignatureSetArray(Napi::Env env, const Napi::Value &raw_arg)
        : BlstBase{env},
          _sets{}
    {
        if (!raw_arg.IsArray())
        {
            SetError("signatureSets must be of type SignatureSet[]");
            return;
        }
        Napi::Array arr = raw_arg.As<Napi::Array>();
        uint32_t length = arr.Length();
        _sets.reserve(length);
        for (uint32_t i = 0; i < length; i++)
        {
            _sets.push_back({_env, arr[i]});
            if (_sets[i].HasError())
            {
                SetError(_sets[i].GetError());
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
            UINT_8_ARRAY_ARG = 2,
            UINT_8_ARRAY_ARG_ARRAY = 3,
            PUBLIC_KEY_ARG = 4,
            PUBLIC_KEY_ARG_ARRAY = 5,
            SIGNATURE_ARG = 6,
            SIGNATURE_ARG_ARRAY = 7,
            SIGNATURE_SET = 8,
            SIGNATURE_SET_ARRAY = 9
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
                case TestCase::SET_ERROR:
                    SetError("setup: TestCase.SET_ERROR");
                    break;
                case TestCase::THROW_ERROR:
                    throw Napi::Error::New(_env, "setup: TestCase.THROW_ERROR");
                    break;
                case TestCase::UINT_8_ARRAY_ARG:
                {
                    Uint8ArrayArg a{_env, _info[3], "TEST"};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::UINT_8_ARRAY_ARG_ARRAY:
                {
                    Uint8ArrayArgArray a{_env, _info[3], "TEST", "TESTS"};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::PUBLIC_KEY_ARG:
                {
                    PublicKeyArg a{_env, _info[3]};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::PUBLIC_KEY_ARG_ARRAY:
                {
                    PublicKeyArgArray a{_env, _info[3]};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::SIGNATURE_ARG:
                {
                    SignatureArg a{_env, _info[3]};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::SIGNATURE_ARG_ARRAY:
                {
                    SignatureArgArray a{_env, _info[3]};
                    if (a.HasError())
                    {
                        SetError(a.GetError());
                        return;
                    }
                    break;
                }
                case TestCase::SIGNATURE_SET_ARRAY:
                {
                    SignatureSetArray a{_env, _info[3]};
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
            if (_test_phase != TestPhase::EXECUTION)
            {
                _return_value.append("VALID_TEST");
                return;
            }

            switch (_test_case)
            {
            case TestCase::SET_ERROR:
                SetError("execution: TestCase.SET_ERROR");
                break;
            case TestCase::THROW_ERROR:
                throw std::exception();
                break;
            case -1:
            default:
                _return_value.append("VALID_TEST");
            }
        }
        Napi::Value GetReturnValue() override
        {
            if (_test_phase != TestPhase::RETURN)
            {
                return Napi::String::New(_env, _return_value);
            }
            switch (_test_case)
            {
            case TestCase::SET_ERROR:
                SetError("return: TestCase.SET_ERROR");
                break;
            case TestCase::THROW_ERROR:
                throw Napi::Error::New(_env, "return: TestCase.THROW_ERROR");
                break;
            default:
                SetError("return: unknown test case");
            }
            return _env.Undefined();
        }

    private:
        TestPhase _test_phase;
        int32_t _test_case;
        std::string _return_value;
    };

    /**
     *
     *
     * VerifyMultipleAggregateSignatures
     *
     *
     */
    class VerifyMultipleAggregateSignaturesWorker : public BlstAsyncWorker
    {
    public:
        VerifyMultipleAggregateSignaturesWorker(
            const Napi::CallbackInfo &info)
            : BlstAsyncWorker(info),
              _result{true},
              _ctx{new blst::Pairing{true, _module->_dst}},
              _sets{_env, _info[0]} {}

    protected:
        void Setup() override
        {
            if (_sets.HasError())
            {
                SetError(_sets.GetError());
            }
        };

        void Execute() override
        {
            if (_sets.Size() == 0)
            {
                _result = false;
                return;
            }
            size_t random_bytes_length{_module->_random_bytes_length};
            for (size_t i = 0; i < _sets.Size(); i++)
            {
                blst::byte rand[random_bytes_length];
                _module->GetRandomBytes(rand, random_bytes_length);
                blst::BLST_ERROR err = _ctx->mul_n_aggregate(_sets[i]._publicKey.AsAffine(),
                                                             _sets[i]._signature.AsAffine(),
                                                             rand,
                                                             random_bytes_length,
                                                             _sets[i]._msg.Data(),
                                                             _sets[i]._msg.ByteLength());
                if (err != blst::BLST_ERROR::BLST_SUCCESS)
                {
                    std::ostringstream msg;
                    msg << _module->GetBlstErrorString(err) << ": Invalid aggregation at index " << i;
                    SetError(msg.str());
                    return;
                }
            }
            _ctx->commit();
            _result = _ctx->finalverify();
        }

        Napi::Value GetReturnValue() override
        {
            return Napi::Boolean::New(_env, _result);
        };

    private:
        bool _result;
        std::unique_ptr<blst::Pairing> _ctx;
        SignatureSetArray _sets;
    };
}

namespace Functions
{
    Napi::Value RunTest(const Napi::CallbackInfo &info)
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

    Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info)
    {
        VerifyMultipleAggregateSignaturesWorker *worker = new VerifyMultipleAggregateSignaturesWorker{info};
        return worker->Run();
    };

    Napi::Value VerifyMultipleAggregateSignaturesSync(const Napi::CallbackInfo &info)
    {
        VerifyMultipleAggregateSignaturesWorker worker{info};
        return worker.RunSync();
    };

    void Init(const Napi::Env &env, Napi::Object &exports)
    {
        exports.Set(Napi::String::New(env, "runTest"), Napi::Function::New(env, RunTest));
        exports.Set(Napi::String::New(env, "verifyMultipleAggregateSignatures"), Napi::Function::New(env, VerifyMultipleAggregateSignatures));
        exports.Set(Napi::String::New(env, "verifyMultipleAggregateSignaturesSync"), Napi::Function::New(env, VerifyMultipleAggregateSignaturesSync));
    };
}