/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */

/* auto-generated by NAPI-RS */

const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let loadError = null

function isMusl() {
  // For Node 10
  if (!process.report || typeof process.report.getReport !== 'function') {
    try {
      const lddPath = require('child_process').execSync('which ldd').toString().trim()
      return readFileSync(lddPath, 'utf8').includes('musl')
    } catch (e) {
      return true
    }
  } else {
    const { glibcVersionRuntime } = process.report.getReport().header
    return !glibcVersionRuntime
  }
}

switch (platform) {
  case 'android':
    switch (arch) {
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'blst.android-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.android-arm64.node')
          } else {
            nativeBinding = require('@chainsafe/blst-android-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm':
        localFileExisted = existsSync(join(__dirname, 'blst.android-arm-eabi.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.android-arm-eabi.node')
          } else {
            nativeBinding = require('@chainsafe/blst-android-arm-eabi')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Android ${arch}`)
    }
    break
  case 'win32':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(
          join(__dirname, 'blst.win32-x64-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.win32-x64-msvc.node')
          } else {
            nativeBinding = require('@chainsafe/blst-win32-x64-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'ia32':
        localFileExisted = existsSync(
          join(__dirname, 'blst.win32-ia32-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.win32-ia32-msvc.node')
          } else {
            nativeBinding = require('@chainsafe/blst-win32-ia32-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(
          join(__dirname, 'blst.win32-arm64-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.win32-arm64-msvc.node')
          } else {
            nativeBinding = require('@chainsafe/blst-win32-arm64-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Windows: ${arch}`)
    }
    break
  case 'darwin':
    localFileExisted = existsSync(join(__dirname, 'blst.darwin-universal.node'))
    try {
      if (localFileExisted) {
        nativeBinding = require('./blst.darwin-universal.node')
      } else {
        nativeBinding = require('@chainsafe/blst-darwin-universal')
      }
      break
    } catch {}
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'blst.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.darwin-x64.node')
          } else {
            nativeBinding = require('@chainsafe/blst-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(
          join(__dirname, 'blst.darwin-arm64.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.darwin-arm64.node')
          } else {
            nativeBinding = require('@chainsafe/blst-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
  case 'freebsd':
    if (arch !== 'x64') {
      throw new Error(`Unsupported architecture on FreeBSD: ${arch}`)
    }
    localFileExisted = existsSync(join(__dirname, 'blst.freebsd-x64.node'))
    try {
      if (localFileExisted) {
        nativeBinding = require('./blst.freebsd-x64.node')
      } else {
        nativeBinding = require('@chainsafe/blst-freebsd-x64')
      }
    } catch (e) {
      loadError = e
    }
    break
  case 'linux':
    switch (arch) {
      case 'x64':
        if (isMusl()) {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-x64-musl.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-x64-musl.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-x64-musl')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-x64-gnu.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-x64-gnu.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-x64-gnu')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 'arm64':
        if (isMusl()) {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-arm64-musl.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-arm64-musl.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-arm64-musl')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-arm64-gnu.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-arm64-gnu.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-arm64-gnu')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 'arm':
        if (isMusl()) {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-arm-musleabihf.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-arm-musleabihf.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-arm-musleabihf')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-arm-gnueabihf.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-arm-gnueabihf.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-arm-gnueabihf')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 'riscv64':
        if (isMusl()) {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-riscv64-musl.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-riscv64-musl.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-riscv64-musl')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'blst.linux-riscv64-gnu.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./blst.linux-riscv64-gnu.node')
            } else {
              nativeBinding = require('@chainsafe/blst-linux-riscv64-gnu')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 's390x':
        localFileExisted = existsSync(
          join(__dirname, 'blst.linux-s390x-gnu.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./blst.linux-s390x-gnu.node')
          } else {
            nativeBinding = require('@chainsafe/blst-linux-s390x-gnu')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Linux: ${arch}`)
    }
    break
  default:
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
}

if (!nativeBinding) {
  if (loadError) {
    throw loadError
  }
  throw new Error(`Failed to load native binding`)
}

const { SecretKey, PublicKey, Signature, aggregatePublicKeys, aggregateSignatures, aggregateSerializedPublicKeys, aggregateSerializedSignatures, verify, aggregateVerify, fastAggregateVerify, fastAggregateVerifyPreAggregated, verifyMultipleAggregateSignatures, verifyAsync, aggregateVerifyAsync, fastAggregateVerifyAsync, fastAggregateVerifyPreAggregatedAsync, verifyMultipleAggregateSignaturesAsync } = nativeBinding

module.exports.SecretKey = SecretKey
module.exports.PublicKey = PublicKey
module.exports.Signature = Signature
module.exports.aggregatePublicKeys = aggregatePublicKeys
module.exports.aggregateSignatures = aggregateSignatures
module.exports.aggregateSerializedPublicKeys = aggregateSerializedPublicKeys
module.exports.aggregateSerializedSignatures = aggregateSerializedSignatures
module.exports.verify = verify
module.exports.aggregateVerify = aggregateVerify
module.exports.fastAggregateVerify = fastAggregateVerify
module.exports.fastAggregateVerifyPreAggregated = fastAggregateVerifyPreAggregated
module.exports.verifyMultipleAggregateSignatures = verifyMultipleAggregateSignatures
module.exports.verifyAsync = verifyAsync
module.exports.aggregateVerifyAsync = aggregateVerifyAsync
module.exports.fastAggregateVerifyAsync = fastAggregateVerifyAsync
module.exports.fastAggregateVerifyPreAggregatedAsync = fastAggregateVerifyPreAggregatedAsync
module.exports.verifyMultipleAggregateSignaturesAsync = verifyMultipleAggregateSignaturesAsync
