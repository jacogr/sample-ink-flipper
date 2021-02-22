import fs from 'fs';
import { ApiPromise, Keyring } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

// this is the address of the deployed on-chain contract
// (this sample does not deploy, so it assumes you have already deployed)
const CONTRACT_ADDR = '5ER7FDusXd9uCLPRhAL4YKovMXarP9N6DHgCUVZEtcJSgncC';

// a generic helper to resolve a result into a promise
function resultPromise (callType, tx, pair, onInBlock) {
  return new Promise(async (resolve, reject) => {
    const unsub = await tx.signAndSend(pair, (result) => {
      const { status, contractEvents, dispatchError, dispatchInfo, events } = result;

      console.log(`${callType} (status) ${status.toString()}`);

      // these are for errors that are thrown via the txpool, the tx didn't make it into a block
      if (result.isError) {
        reject(result);
        unsub();
      } else if (status.isInBlock) {
        // all the extrinsic events, if available (this may include failed,
        // where we have the dispatchError extracted)
        // https://polkadot.js.org/docs/api/cookbook/blocks#how-do-i-map-extrinsics-to-their-events
        if (events) {
          console.log(`${callType} (events/system)`, events.map(({ event: { data, method, section } }) =>
            `${section}.${method}${data ? `(${JSON.stringify(data.toHuman())})` : ''}`
          ));
        }

        // should only be available in the case of a call, still handle it here
        // (this is decoded from the system ContractExecution event against the ABI)
        if (contractEvents) {
          console.log(`${callType} (events/contract)`, contractEvents.map(({ args, event: { identifier } }) =>
            `${identifier}(${JSON.stringify(args.map((a) => a.toHuman()))})`
          ));
        }

        // this is part of the ExtrinsicSuccess/ExtrinsicFailed event, the API extracts it from those
        // (which mans it will match with whatever Sucess/Failed eents above are showing)
        console.log(`${callType} (dispatch) ${JSON.stringify(dispatchInfo.toHuman())}`);

        // The dispatchError is extracted from the system ExtrinsicFailed event above
        // (so will match the details there, the API conveinence helper extracts it to ease-of-use)
        if (dispatchError) {
          // show the actual errors as received here by looking up the indexes against the registry
          // https://polkadot.js.org/docs/api/cookbook/tx#how-do-i-get-the-decoded-enum-for-an-extrinsicfailed-event
          if (dispatchError.isModule) {
            // for module errors, we have the section indexed, lookup
            const decoded = tx.registry.findMetaError(dispatchError.asModule);
            const { documentation, name, section } = decoded;

            console.log(`${callType} (error) ${section}.${name}: ${documentation.join(' ')}`);
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            console.log(`${callType} (error) ${JSON.stringify(dispatchError.toHuman())}`);
          }

          reject(dispatchError);
        } else {
          resolve(onInBlock(result));
        }

        unsub();
      }
    });
  });
}

// instantiates a new contract via blueprint
async function flipValue (pair, contract) {
  console.log('');

  // estimate gas for this one
  const { gasConsumed } = await contract.query.flip(pair.address, {});

  // show the gas
  console.log('flipValue: gasLimit::', gasConsumed.toHuman());

  const tx = contract.tx.flip({ gasLimit: gasConsumed });

  return resultPromise('flipValue', tx, pair, () => undefined);
}

async function getValue (pair, contract) {
  console.log('');

  // query
  const { output } = await contract.query.get(pair.address, {});

  // show the gas
  console.log('getValue: output::', output.toHuman());
}

async function main () {
  // create the api, default to 127.0.0.1:9944 (assuming dev)
  const api = await ApiPromise.create();

  // create the keyring and add Alice
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  // create the contract
  const contractJson = fs.readFileSync('flipper.contract', { encoding: 'utf-8' });
  const contract = new ContractPromise(api, contractJson, CONTRACT_ADDR);

  await getValue(alice, contract);
  await flipValue(alice, contract);
  await getValue(alice, contract);
}

main()
  .then(() => {
    console.log('');
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    console.error('Error.', error.message || JSON.stringify(error));
    process.exit(1);
  });
