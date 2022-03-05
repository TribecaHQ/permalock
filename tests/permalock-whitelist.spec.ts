/* eslint-disable @typescript-eslint/no-misused-promises */
import type { SmartWalletWrapper } from "@gokiprotocol/client";
import { assertTXSuccess, expectTX } from "@saberhq/chai-solana";
import type { Provider } from "@saberhq/solana-contrib";
import { SolanaAugmentedProvider } from "@saberhq/solana-contrib";
import { getATAAddress, getTokenAccount, u64 } from "@saberhq/token-utils";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { findWhitelistAddress, TRIBECA_CODERS } from "@tribecahq/tribeca-sdk";
import { expect } from "chai";

import { PERMALOCK_ADDRESSES } from "../src";
import { makeSDK } from "./workspace";
import { setupEnvironment } from "./workspace/setup";

const executeTransactionBySmartWallet = async ({
  provider,
  owners,
  smartWalletWrapper,
  instructions,
}: {
  provider: Provider;
  owners: Provider[];
  smartWalletWrapper: SmartWalletWrapper;
  instructions: TransactionInstruction[];
}): Promise<PublicKey> => {
  const { transactionKey, tx: tx1 } = await smartWalletWrapper.newTransaction({
    proposer: provider.wallet.publicKey,
    instructions,
  });
  await assertTXSuccess(tx1, "create new transaction");

  for (const owner of owners) {
    await assertTXSuccess(
      new SolanaAugmentedProvider(owner).newTX([
        smartWalletWrapper.program.instruction.approve({
          accounts: {
            smartWallet: smartWalletWrapper.key,
            transaction: transactionKey,
            owner: owner.wallet.publicKey,
          },
        }),
      ])
    );
  }

  const tx2 = await smartWalletWrapper.executeTransaction({
    transactionKey,
    owner: provider.wallet.publicKey,
  });
  await assertTXSuccess(tx2, "execute transaction");
  return transactionKey;
};

describe("Permalock Whitelist", () => {
  const sdk = makeSDK();

  const stakerSDK = sdk.withSigner(Keypair.generate());
  const adminSDK = sdk.withSigner(Keypair.generate());

  before(async () => {
    await (await stakerSDK.provider.requestAirdrop(LAMPORTS_PER_SOL)).wait();
    await (await adminSDK.provider.requestAirdrop(LAMPORTS_PER_SOL)).wait();
  });

  it("deposit with a whitelist", async () => {
    const { lockerW, govToken, smartWalletWrapper } = await setupEnvironment({
      staker: stakerSDK.provider,
      admin: adminSDK.provider,
      whitelistEnabled: true,
    });

    const govTokens = await getATAAddress({
      mint: govToken.mintAccount,
      owner: stakerSDK.provider.wallet.publicKey,
    });

    const { permalock, tx: permalockTX } =
      await adminSDK.permalock.createPermalock({
        locker: lockerW.locker,
        lockerMint: govToken.mintAccount,
      });
    await assertTXSuccess(permalockTX);

    const preDepositGov = await getTokenAccount(stakerSDK.provider, govTokens);
    const initialAmount = preDepositGov.amount;

    const permalockData =
      await adminSDK.permalock.program.account.permalock.fetch(permalock);
    const initialEscrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
      adminSDK.provider
    ).account.escrow.fetch(permalockData.escrow);
    expect(initialEscrowData.amount).to.bignumber.equal(new u64(0));

    const depositTX = await stakerSDK.permalock.deposit({
      permalock,
      amount: new u64(1_000),
    });
    await expectTX(depositTX, "deposit").to.be.fulfilled;

    const postDepositGov = await getTokenAccount(stakerSDK.provider, govTokens);
    expect(postDepositGov.amount).to.bignumber.equal(
      initialAmount.sub(new u64(1_000))
    );

    const [whitelistEntry] = await findWhitelistAddress(
      lockerW.locker,
      PERMALOCK_ADDRESSES.Permalock,
      permalock
    );

    // create the whitelist entry
    await executeTransactionBySmartWallet({
      provider: adminSDK.provider,
      smartWalletWrapper,
      owners: [adminSDK.provider, stakerSDK.provider],
      instructions: [
        await lockerW.createApproveProgramLockPrivilegeIx(
          PERMALOCK_ADDRESSES.Permalock,
          permalock
        ),
      ],
    });

    // sync the escrow
    await assertTXSuccess(
      await stakerSDK.permalock.refreshLock({ permalock, whitelistEntry })
    );

    const escrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
      adminSDK.provider
    ).account.escrow.fetch(permalockData.escrow);
    expect(escrowData.amount).to.bignumber.equal(new u64(1_000));
  });
});
