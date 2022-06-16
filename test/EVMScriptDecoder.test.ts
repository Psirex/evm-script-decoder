import test from 'ava'
import { defaultAbiCoder } from '@ethersproject/abi'
import { abiProviders, EVMScriptDecoder } from '../src/index'
import { TEST_ABI_ELEMENT, TEST_ADDRESS, NOT_REGISTERED_ADDRESS, fetchMock } from './_helpers'
import Treasury_abi from './_abi/Treasury.abi.json'
import DepositSecurityModule_abi from './_abi/DepositSecurityModule.abi.json'

const REWARD_ADDRESS = '0x922c10dafffb8b9be4c40d3829c8c708a12827f3'

const EVMScript = (address: string) =>
  `0x00000001${address.slice(2)}00000024945233e2000000000000000000000000${REWARD_ADDRESS.slice(2)}`

const EVM_SCRIPT_WITH_NOT_REGISTERED_ADDRESS = EVMScript(NOT_REGISTERED_ADDRESS)
const EVM_SCRIPT_WITH_REGISTERED_ADDRESS = EVMScript(TEST_ADDRESS)
const DECODED_EVM_SCRIPT_COMPLETE = {
  specId: '0x00000001',
  calls: [
    {
      address: TEST_ADDRESS,
      callDataLength: 36,
      methodId: '0x945233e2',
      encodedCallData: '0x000000000000000000000000922c10dafffb8b9be4c40d3829c8c708a12827f3',
      abi: TEST_ABI_ELEMENT,
      decodedCallData: ['0x922C10dAfffb8B9bE4C40d3829C8c708a12827F3'],
    },
  ],
}

const DECODED_EVM_SCRIPT_INCOMPLETE = {
  specId: '0x00000001',
  calls: [
    {
      address: NOT_REGISTERED_ADDRESS,
      callDataLength: 36,
      methodId: '0x945233e2',
      encodedCallData: '0x000000000000000000000000922c10dafffb8b9be4c40d3829c8c708a12827f3',
      abi: undefined,
      decodedCallData: undefined,
    },
  ],
}

let globalFetch = globalThis.fetch
test.before(() => {
  // @ts-ignore
  globalThis.fetch = fetchMock
})

test.after(() => {
  globalThis.fetch = globalFetch
})

test('decodeEVMScript() local strategy address not registered', async (t) => {
  const evmScriptDecoder = new EVMScriptDecoder(
    new abiProviders.Local({
      [TEST_ADDRESS]: [TEST_ABI_ELEMENT],
    })
  )
  const decodedEVMScript = await evmScriptDecoder.decodeEVMScript(
    EVM_SCRIPT_WITH_NOT_REGISTERED_ADDRESS
  )
  t.deepEqual(decodedEVMScript, DECODED_EVM_SCRIPT_INCOMPLETE)
})

test('decodeEVMScript() local strategy address registered', async (t) => {
  const evmScriptDecoder = new EVMScriptDecoder(
    new abiProviders.Local({
      [TEST_ADDRESS]: [TEST_ABI_ELEMENT],
    })
  )
  const decodedEVMScript = await evmScriptDecoder.decodeEVMScript(
    EVM_SCRIPT_WITH_REGISTERED_ADDRESS
  )
  t.deepEqual(decodedEVMScript, DECODED_EVM_SCRIPT_COMPLETE)
})

test('decodeEVMScript() etherscan strategy address not registered', async (t) => {
  const evmScriptDecoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )
  const decodedEVMScript = await evmScriptDecoder.decodeEVMScript(EVMScript(NOT_REGISTERED_ADDRESS))
  t.deepEqual(decodedEVMScript, DECODED_EVM_SCRIPT_INCOMPLETE)
})

test('decodeEVMScript() etherscan strategy address registered', async (t) => {
  const evmScriptDecoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )
  const decodedEVMScript = await evmScriptDecoder.decodeEVMScript(EVMScript(TEST_ADDRESS))
  t.deepEqual(decodedEVMScript, DECODED_EVM_SCRIPT_COMPLETE)
})

test('encodeEVMScript() with methodId and encoded calldata', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )

  const encodedEVMScript = await decoder.encodeEVMScript({
    calls: [
      {
        address: TEST_ADDRESS,
        methodId: '0x945233e2',
        encodedCallData: defaultAbiCoder.encode(['address'], [REWARD_ADDRESS]),
      },
    ],
  })
  t.is(encodedEVMScript, EVMScript(TEST_ADDRESS))
})

test('encodeEVMScript() with signature and encoded calldata', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )

  const encodedEVMScript = await decoder.encodeEVMScript({
    calls: [
      {
        address: TEST_ADDRESS,
        signature: 'removeRewardProgram(address)',
        encodedCallData: defaultAbiCoder.encode(['address'], [REWARD_ADDRESS]),
      },
    ],
  })
  t.is(encodedEVMScript, EVMScript(TEST_ADDRESS))
})

test('encodeEVMScript() with method name and decoded calldata', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )

  const encodedEVMScript = await decoder.encodeEVMScript({
    calls: [
      {
        address: TEST_ADDRESS,
        methodName: 'removeRewardProgram',
        decodedCallData: [REWARD_ADDRESS],
      },
    ],
  })
  t.is(encodedEVMScript, EVMScript(TEST_ADDRESS))
})

test('encodeEVMScript() without providers', async (t) => {
  const decoder = new EVMScriptDecoder()

  const encodedEVMScript = await decoder.encodeEVMScript({
    calls: [
      {
        address: TEST_ADDRESS,
        signature: 'removeRewardProgram(address)',
        encodedCallData: defaultAbiCoder.encode(['address'], [REWARD_ADDRESS]),
      },
    ],
  })
  t.is(encodedEVMScript, EVMScript(TEST_ADDRESS))
})

test('encodeEVMScript() with default address', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )

  const encodedEVMScript = await decoder.encodeEVMScript({
    address: TEST_ADDRESS,
    calls: [
      {
        methodName: 'removeRewardProgram',
        decodedCallData: [REWARD_ADDRESS],
      },
    ],
  })
  t.is(encodedEVMScript, EVMScript(TEST_ADDRESS))
})

test('encodeEVMScript() method not found', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Etherscan({
      apiKey: 'ETHERSCAN_API_KEY',
    })
  )
  await t.throwsAsync(
    () =>
      decoder.encodeEVMScript({
        calls: [
          {
            address: NOT_REGISTERED_ADDRESS,
            methodName: 'removeRewardProgram',
            decodedCallData: [REWARD_ADDRESS],
          },
        ],
      }),
    { message: 'Method ABI for method "removeRewardProgram" not found' }
  )
})

const TREASURY_ADDRESS = '0x4333218072D5d7008546737786663c38B4D561A4'
const DEPOSIT_SECURITY_MODULE_ADDRESS = '0x7dc1c1ff64078f73c98338e2f17d1996ffbb2ede'
const SCRIPT_WITH_NESTED_SCRIPT = '0x000000014333218072d5d7008546737786663c38b4d561a400000084d948d46800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000040000000017dc1c1ff64078f73c98338e2f17d1996ffbb2ede0000002460c8a547000000000000000000000000000000000000000000000000000000000000007b'
const ENCODED_NESTED_CALL_DATA = '123'

test('Parse nested EVMScript', async (t) => {
  const decoder = new EVMScriptDecoder(
    new abiProviders.Local({
      [TREASURY_ADDRESS]: Treasury_abi as any,
      [DEPOSIT_SECURITY_MODULE_ADDRESS]: DepositSecurityModule_abi as any,
    })
  )
  const r = await decoder.decodeEVMScript(SCRIPT_WITH_NESTED_SCRIPT)

  t.is(r.calls[0].decodedCallData?.[0].calls.length, 1)
  t.is(r.calls[0].decodedCallData?.[0].calls[0].address, DEPOSIT_SECURITY_MODULE_ADDRESS)
  t.is(r.calls[0].decodedCallData?.[0].calls[0].decodedCallData[0], ENCODED_NESTED_CALL_DATA)
})
