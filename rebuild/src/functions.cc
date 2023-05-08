#include "functions.h"

namespace
{
    /**
     *
     *
     * VerifyMultipleAggregateSignatures
     *
     *
     */
    class SignatureSet
    {
    public:
        Uint8ArrayArg _msg;
        PublicKeyArg _publicKey;
        SignatureArg _signature;

        SignatureSet(const BlstTsAddon *addon, const Napi::Env &env, const Napi::Value &raw_arg)
            : _msg{_env},
              _publicKey{addon, _env},
              _signature{addon, _env},
              _addon{addon},
              _env{env},
              _error{}
        {
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
            _publicKey = PublicKeyArg{_addon, _env, set.Get("publicKey")};
            if (!set.Has("signature"))
            {
                SetError("SignatureSet must have a 'signature' property");
                return;
            }
            _signature = SignatureArg{_addon, _env, set.Get("signature")};
        };

        void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
        bool HasError() { return _error.size() > 0; };
        std::string GetError() { return _error; };

    private:
        const BlstTsAddon *_addon;
        Napi::Env _env;
        std::string _error;

        void SetError(const std::string &err) { _error = err; };
    };
    class SignatureSetArray
    {
    public:
        std::vector<SignatureSet> _sets;

        SignatureSetArray(const BlstTsAddon *addon, const Napi::Env &env, const Napi::Value &raw_arg)
            : _sets{},
              _env{env},
              _error{}
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
                _sets.push_back(SignatureSet{addon, env, arr[i]});
                if (_sets[i].HasError())
                {
                    SetError(_sets[i].GetError());
                    return;
                }
            }
        };
        SignatureSetArray(const SignatureSetArray &source) = delete;
        SignatureSetArray(SignatureSetArray &&source) = default;

        SignatureSetArray &operator=(const SignatureSetArray &source) = delete;
        SignatureSetArray &operator=(SignatureSetArray &&source) = default;
        SignatureSet &operator[](size_t index)
        {
            return _sets[index];
        }

        size_t Size() { return _sets.size(); }
        void Reserve(size_t size) { return _sets.reserve(size); }
        void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
        bool HasError() { return _error.size() > 0; };
        std::string GetError() { return _error; };

    private:
        Napi::Env _env;
        std::string _error;

        void SetError(const std::string &err) { _error = err; };
    };

    class VerifyMultipleAggregateSignaturesWorker : public BlstAsyncWorker
    {
    public:
        VerifyMultipleAggregateSignaturesWorker(
            const Napi::CallbackInfo &info)
            : BlstAsyncWorker(info),
              _result{true},
              _ctx{std::make_unique<blst::Pairing>(true, _module->_global_state->_dst)},
              _sets{_module, _env, _info[0]} {}

    protected:
        void Setup() override
        {
            if (_sets.HasError())
            {
                SetError(_sets.GetError());
                return;
            }
        };

        void Execute() override
        {
            size_t length{_module->_global_state->_random_bytes_length};
            for (size_t i = 0; i < _sets.Size(); i++)
            {
                blst::byte rand[length];
                _module->GetRandomBytes(rand, length);
                blst::BLST_ERROR err = _ctx->mul_n_aggregate(_sets[i]._publicKey.AsAffine(),
                                                             _sets[i]._signature.AsAffine(),
                                                             rand,
                                                             length,
                                                             _sets[i]._msg.Data(),
                                                             _sets[i]._msg.ByteLength());
                if (err != blst::BLST_ERROR::BLST_SUCCESS)
                {
                    std::ostringstream msg;
                    msg << "BLST_ERROR::" << _module->GetBlstErrorString(err) << ": Invalid aggregation at index " << i;
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
    Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info)
    {
        VerifyMultipleAggregateSignaturesWorker *worker = new VerifyMultipleAggregateSignaturesWorker{info, 0};
        return worker->Run();
    };

    Napi::Value VerifyMultipleAggregateSignaturesSync(const Napi::CallbackInfo &info)
    {
        VerifyMultipleAggregateSignaturesWorker worker{info, 0};
        return worker.RunSync();
    };

    void Init(const Napi::Env &env, Napi::Object &exports)
    {
        exports.Set(Napi::String::New(env, "verifyMultipleAggregateSignatures"), Napi::Function::New(env, VerifyMultipleAggregateSignatures));
        exports.Set(Napi::String::New(env, "verifyMultipleAggregateSignaturesSync"), Napi::Function::New(env, VerifyMultipleAggregateSignaturesSync));
    };
}