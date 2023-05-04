#ifndef BLST_TS_FUNCTIONS_H__
#define BLST_TS_FUNCTIONS_H__

#include "napi.h"
#include "public_key.h"
#include "addon.h"

namespace Functions
{
    /**
     *
     *
     * AggregatePublicKeys
     *
     *
     */
    class AggregatePublicKeysWorker : public BlstAsyncWorker
    {
    public:
        AggregatePublicKeysWorker(const Napi::CallbackInfo &info, size_t arg_position)
            : BlstAsyncWorker(info),
              _result{},
              _public_keys{_env, _info[arg_position]} {}

        void Setup() override
        {
            if (_public_keys.HasError())
            {
                SetError(_public_keys.GetError());
            }
        };

        void Execute() override
        {
            for (size_t i = 0; i < _public_keys.Size(); i++)
            {
                try
                {
                    _result.add(*_public_keys[i].AsJacobian());
                }
                catch (const blst::BLST_ERROR &err)
                {
                    std::ostringstream msg;
                    msg << "BLST_ERROR::" << _module->GetBlstErrorString(err) << ": Invalid key at index " << i;
                    SetError(msg.str());
                }
            }
        }

        Napi::Value GetReturnValue() override
        {
            Napi::EscapableHandleScope scope(_env);
            Napi::Object wrapped = _module->_public_key_ctr.New({Napi::External<void *>::New(Env(), nullptr)});
            wrapped.TypeTag(&_module->_public_key_tag);
            PublicKey *pk = PublicKey::Unwrap(wrapped);
            pk->_jacobian.reset(new blst::P1{_result});
            pk->_has_jacobian = true;
            return scope.Escape(wrapped);
        };

        blst::P1 &GetAggregate() { return _result; };

    private:
        blst::P1 _result;
        PublicKeyArgArray _public_keys;
    };

    Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info)
    {
        AggregatePublicKeysWorker *worker = new AggregatePublicKeysWorker{info, 0};
        return worker->Run();
    };

    Napi::Value AggregatePublicKeysSync(const Napi::CallbackInfo &info)
    {
        AggregatePublicKeysWorker worker{info, 0};
        return worker.RunSync();
    };

    /**
     *
     *
     * AggregateSignatures
     *
     *
     */
    class AggregateSignaturesWorker : public BlstAsyncWorker
    {
    public:
        AggregateSignaturesWorker(const Napi::CallbackInfo &info, size_t arg_position)
            : BlstAsyncWorker(info),
              _result{},
              _signatures{_env, _info[arg_position]} {}

    protected:
        void Setup() override
        {
            if (_signatures.HasError())
            {
                SetError(_signatures.GetError());
            }
        };

        void Execute() override
        {
            for (size_t i = 0; i < _signatures.Size(); i++)
            {
                try
                {
                    _result.add(*_signatures[i].AsJacobian());
                }
                catch (const blst::BLST_ERROR &err)
                {
                    std::ostringstream msg;
                    msg << "BLST_ERROR::" << _module->GetBlstErrorString(err) << ": Invalid signature at index " << i;
                    SetError(msg.str());
                }
            }
        }

        Napi::Value GetReturnValue() override
        {
            Napi::EscapableHandleScope scope(_env);
            Napi::Object wrapped = _module->_signature_ctr.New({Napi::External<void *>::New(Env(), nullptr)});
            wrapped.TypeTag(&_module->_signature_tag);
            Signature *sig = Signature::Unwrap(wrapped);
            sig->_jacobian.reset(new blst::P2{_result});
            sig->_has_jacobian = true;
            return scope.Escape(wrapped);
        };

    private:
        blst::P2 _result;
        SignatureArgArray _signatures;
    };

    Napi::Value AggregateSignatures(const Napi::CallbackInfo &info)
    {
        Napi::EscapableHandleScope scope(info.Env());
        AggregateSignaturesWorker *worker = new AggregateSignaturesWorker{info, 0};
        return scope.Escape(worker->Run());
    };
    Napi::Value AggregateSignaturesSync(const Napi::CallbackInfo &info)
    {
        Napi::EscapableHandleScope scope(info.Env());
        AggregateSignaturesWorker worker{info, 0};
        return scope.Escape(worker.RunSync());
    };

    /**
     *
     *
     * Init
     *
     *
     */
    void Init(Napi::Env env, Napi::Object &exports)
    {
        exports.Set(Napi::String::New(env, "aggregatePublicKeys"), Napi::Function::New(env, AggregatePublicKeys));
        exports.Set(Napi::String::New(env, "aggregatePublicKeysSync"), Napi::Function::New(env, AggregatePublicKeysSync));
        exports.Set(Napi::String::New(env, "aggregateSignatures"), Napi::Function::New(env, AggregateSignatures));
        exports.Set(Napi::String::New(env, "aggregateSignaturesSync"), Napi::Function::New(env, AggregateSignaturesSync));
    };
}

#endif /* BLST_TS_FUNCTIONS_H__ */