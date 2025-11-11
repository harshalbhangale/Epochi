# Quickstart (Data Write and Read)

## Pre-requisites

A typescript environment with [`viem`](https://viem.sh/) and [`@somnia-chain/streams`](https://www.npmjs.com/package/@somnia-chain/streams) installed

## Steps

### 1. Define your schema as a string and plug it into the schema encoder

```typescript
import { SDK, zeroBytes32, SchemaEncoder } from "@somnia-chain/streams"

const gpsSchema = `uint64 timestamp, int32 latitude, int32 longitude, int32 altitude, uint32 accuracy, bytes32 entityId, uint256 nonce`
const schemaEncoder = new SchemaEncoder(gpsSchema)
```

`schemaEncoder` can now be used to encode data for broadcast and also decode data when reading it from Somnia Data Stream SDK.

### 2. Compute your unique schema identifier from the schema

<pre class="language-typescript"><code class="lang-typescript"><strong>const sdk = new SDK({
</strong>    public: getPublicClient(),
    wallet: getWalletClient(),
})
const schemaId = await sdk.streams.computeSchemaId(gpsSchema)
console.log(`Schema ID ${schemaId}`)
</code></pre>

All data broadcast with the Somnia Data Stream SDK write mechanism must be linked to a schema ID so that we know how to decode the data on read.

### 3. Encode the data you want to store that is compatible with the schema

```typescript
const encodedData: Hex = schemaEncoder.encodeData([
    { name: "timestamp", value: Date.now().toString(), type: "uint64" },
    { name: "latitude", value: "51509865", type: "int32" },
    { name: "longitude", value: "-0118092", type: "int32" },
    { name: "altitude", value: "0", type: "int32" },
    { name: "accuracy", value: "0", type: "uint32" },
    { name: "entityId", value: zeroBytes32, type: "bytes32" }, // object providing GPS data
    { name: "nonce", value: "0", type: "uint256" },
])
```

The value returned is a raw hex encoded bytes value that can be broadcast on-chain via the Somnia Data Stream SDK.&#x20;

### 4. Publish data (with our without a public schema)

```typescript
const publishTxHash = await sdk.streams.set([{
    id: toHex("london", { size: 32 }),
    schemaId: computedGpsSchemaId,
    data: encodedData,
}])
```

`set` has the following parameter `dataStreams` which is a list of data points being written to chain\
\
`dataStreams` has the `DataStream[]` type:

```typescript
type Hex = `0x{string}`
type DataStream = {
    id: Hex // Unique data key for the publisher
    schemaId: Hex // Computed from the raw schema string
    data: Hex // From step 3, raw bytes data formated as a hex string
}
```

### 5. Direct data read without reactivity

```typescript
const data = await sdk.streams.getByKey(
  computedGpsSchemaId,
  publisherWalletAddress,
  dataKey
)
```

This last step shows how you request data from Somnia data streams filtering on:

1. Schema ID
2. Address of the account that wrote the data to chain
   1. This could be an EOA or another smart contract

The response from `getByKey` will be the data published but decoded for the specified schema.&#x20;

Note: where the schema ID is associated with a public data schema that has been registered on-chain, the SDK will automatically decode the raw data published on-chain and return that decoded data removing the need for the decoder. If the schema is not public, the schema decoder will be required outside of the SDK and you will instead get raw bytes from the chain. Example:

```typescript
if (data) {
  schemaEncoder.decode(data)
}
```

Further filters can be applied client side to the data in order to filter for specifics within the data. GitBook also allows you to set up a bi-directional sync with an existing repository on GitHub or GitLab. Setting up Git Sync allows you and your team to write content in GitBook or in code, and never have to worry about your content becoming out of sync.
