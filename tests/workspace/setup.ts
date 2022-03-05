import type { SmartWalletWrapper } from "@gokiprotocol/client";
import { GokiSDK } from "@gokiprotocol/client";
import { assertTXSuccess, chaiSolana, expectTX } from "@saberhq/chai-solana";
import type { Provider } from "@saberhq/solana-contrib";
import type { Token } from "@saberhq/token-utils";
import { TokenAmount, TokenAugmentedProvider, u64 } from "@saberhq/token-utils";
import type { LockerWrapper } from "@tribecahq/tribeca-sdk";
import { createLocker, TribecaSDK } from "@tribecahq/tribeca-sdk";
import BN from "bn.js";
import * as chai from "chai";

chai.use(chaiSolana);

/**
 * Sets up the Tribeca voting escrow and locks tokens.
 *
 * @param param0
 * @returns
 */
export const setupEnvironment = async ({
  staker,
  admin,
  whitelistEnabled,
}: {
  staker: Provider;
  admin: Provider;
  whitelistEnabled: boolean;
}): Promise<{
  govToken: Token;
  lockerW: LockerWrapper;
  smartWalletWrapper: SmartWalletWrapper;
}> => {
  // Set up Quarry
  const tokenActions = new TokenAugmentedProvider(admin);
  const govToken = await tokenActions.createToken({
    authority: admin.wallet.publicKey,
  });
  const govTokenMint = govToken.mintAccount;

  await assertTXSuccess(
    await tokenActions.mintTo({
      amount: new TokenAmount(govToken, new u64(1_000_000_000000)),
    })
  );

  await assertTXSuccess(
    await tokenActions.mintTo({
      amount: new TokenAmount(govToken, new u64(1_000_000000)),
      to: staker.wallet.publicKey,
    })
  );

  // Setup Locker
  const tribecaSDK = TribecaSDK.load({ provider: admin });
  const gokiSDK = GokiSDK.load({ provider: admin });

  const owners = [admin.wallet.publicKey, staker.wallet.publicKey];
  const { createTXs, lockerWrapper, smartWalletWrapper } = await createLocker({
    sdk: tribecaSDK,
    gokiSDK,
    govTokenMint,
    owners,
    lockerParams: {
      whitelistEnabled,
      maxStakeVoteMultiplier: 1,
      maxStakeDuration: new BN(10 * 24 * 60 * 60), // 10 days
    },
  });
  const lockerW = lockerWrapper;

  for (const { tx, title } of createTXs) {
    await expectTX(tx, title).to.be.fulfilled;
  }

  return {
    govToken,
    lockerW,
    smartWalletWrapper,
  };
};
