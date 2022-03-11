/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  assertTXSuccess,
  assertTXThrows,
  expectTX,
} from "@saberhq/chai-solana";
import { getATAAddress, getTokenAccount, u64 } from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TRIBECA_CODERS } from "@tribecahq/tribeca-sdk";
import { expect } from "chai";

import type { PermalockData } from "../src";
import { PermalockErrors } from "../src";
import { makeSDK } from "./workspace";
import { setupEnvironment } from "./workspace/setup";

describe("Permalock", () => {
  const sdk = makeSDK();

  const stakerSDK = sdk.withSigner(Keypair.generate());
  const adminSDK = sdk.withSigner(Keypair.generate());

  before(async () => {
    await (await stakerSDK.provider.requestAirdrop(LAMPORTS_PER_SOL)).wait();
    await (await adminSDK.provider.requestAirdrop(LAMPORTS_PER_SOL)).wait();
  });

  let permalockKey: PublicKey;
  let govTokenMint: PublicKey;
  let permalockData: PermalockData;

  before("can initialize a new permalock", async () => {
    const { lockerW, govToken } = await setupEnvironment({
      staker: stakerSDK.provider,
      admin: adminSDK.provider,
      whitelistEnabled: false,
    });
    govTokenMint = govToken.mintAccount;

    const baseKP = Keypair.generate();
    const {
      permalock,
      mint,
      tx: permalockTX,
    } = await adminSDK.permalock.createPermalock({
      locker: lockerW.locker,
      lockerMint: govToken.mintAccount,
      baseKP,
    });
    await expectTX(permalockTX, "Create the Permalock").to.be.fulfilled;

    permalockKey = permalock;
    permalockData = await adminSDK.permalock.program.account.permalock.fetch(
      permalock
    );

    expect(mint).to.eqAddress(baseKP.publicKey);
    expect(permalockData.base).to.eqAddress(baseKP.publicKey);

    // escrow
    expect(permalockData.stakedTokenMint).to.eqAddress(govToken.mintAccount);
    // pendingTokens

    expect(permalockData.owner).to.eqAddress(
      adminSDK.provider.wallet.publicKey
    );
  });

  it("deposit and lock", async () => {
    const govTokens = await getATAAddress({
      mint: govTokenMint,
      owner: stakerSDK.provider.wallet.publicKey,
    });

    const preDepositGov = await getTokenAccount(stakerSDK.provider, govTokens);
    const initialAmount = preDepositGov.amount;

    const initialEscrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
      adminSDK.provider
    ).account.escrow.fetch(permalockData.escrow);
    expect(initialEscrowData.amount).to.bignumber.equal(new u64(0));

    const depositTX = await stakerSDK.permalock.deposit({
      permalock: permalockKey,
      amount: new u64(1_000),
    });
    await expectTX(depositTX, "deposit").to.be.fulfilled;

    const postDepositGov = await getTokenAccount(stakerSDK.provider, govTokens);
    expect(postDepositGov.amount).to.bignumber.equal(
      initialAmount.sub(new u64(1_000))
    );

    // sync the escrow
    await expectTX(stakerSDK.permalock.refreshLock({ permalock: permalockKey }))
      .to.be.fulfilled;

    const escrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
      adminSDK.provider
    ).account.escrow.fetch(permalockData.escrow);
    expect(escrowData.amount).to.bignumber.equal(new u64(1_000));
  });

  describe("owner only", () => {
    it("set vote delegate", async () => {
      const { lockerW, govToken } = await setupEnvironment({
        staker: stakerSDK.provider,
        admin: adminSDK.provider,
        whitelistEnabled: false,
      });
      const { permalock, tx: permalockTX } =
        await adminSDK.permalock.createPermalock({
          locker: lockerW.locker,
          lockerMint: govToken.mintAccount,
        });
      await expectTX(permalockTX, "Create the Permalock").to.be.fulfilled;

      // delegate is permalock
      {
        const permalockData =
          await adminSDK.permalock.program.account.permalock.fetch(permalock);
        const escrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
          adminSDK.provider
        ).account.escrow.fetch(permalockData.escrow);
        expect(escrowData.voteDelegate).to.eqAddress(permalock);
      }

      await assertTXThrows(
        await stakerSDK.permalock.setVoteDelegate({
          permalock,
          newDelegate: stakerSDK.provider.walletKey,
        }),
        PermalockErrors.UnauthorizedNotOwner
      );
      await assertTXSuccess(
        await adminSDK.permalock.setVoteDelegate({
          permalock,
          newDelegate: stakerSDK.provider.walletKey,
        })
      );

      // delegate is now staker
      {
        const permalockData =
          await adminSDK.permalock.program.account.permalock.fetch(permalock);
        const escrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
          adminSDK.provider
        ).account.escrow.fetch(permalockData.escrow);
        expect(escrowData.voteDelegate).to.eqAddress(
          stakerSDK.provider.walletKey
        );
      }

      await assertTXThrows(
        await stakerSDK.permalock.setVoteDelegate({
          permalock,
          newDelegate: stakerSDK.provider.walletKey,
        }),
        PermalockErrors.UnauthorizedNotOwner
      );
      await assertTXSuccess(
        await adminSDK.permalock.setVoteDelegate({
          permalock,
          newDelegate: adminSDK.provider.walletKey,
        })
      );

      // delegate is now admin
      {
        const permalockData =
          await adminSDK.permalock.program.account.permalock.fetch(permalock);
        const escrowData = await TRIBECA_CODERS.LockedVoter.getProgram(
          adminSDK.provider
        ).account.escrow.fetch(permalockData.escrow);
        expect(escrowData.voteDelegate).to.eqAddress(
          adminSDK.provider.walletKey
        );
      }
    });
  });

  describe("setOwner", () => {
    it("set owner may only be called by owner setter", async () => {
      const { lockerW, govToken } = await setupEnvironment({
        staker: stakerSDK.provider,
        admin: adminSDK.provider,
        whitelistEnabled: false,
      });
      const { permalock, tx: permalockTX } =
        await adminSDK.permalock.createPermalock({
          locker: lockerW.locker,
          lockerMint: govToken.mintAccount,
          ownerSetter: adminSDK.provider.walletKey,
        });
      await expectTX(permalockTX, "Create the Permalock").to.be.fulfilled;

      await assertTXThrows(
        stakerSDK.permalock.setOwner({
          permalock,
          newOwner: stakerSDK.provider.wallet.publicKey,
        }),
        PermalockErrors.UnauthorizedNotOwnerSetter
      );
      await assertTXSuccess(
        adminSDK.permalock.setOwner({
          permalock,
          newOwner: stakerSDK.provider.wallet.publicKey,
        })
      );
      await assertTXThrows(
        adminSDK.permalock.setOwner({
          permalock,
          newOwner: stakerSDK.provider.wallet.publicKey,
        }),
        PermalockErrors.UnauthorizedNotOwnerSetter
      );
      await assertTXThrows(
        stakerSDK.permalock.setOwner({
          permalock,
          newOwner: adminSDK.provider.wallet.publicKey,
        }),
        PermalockErrors.UnauthorizedNotOwnerSetter
      );
    });

    it("owner setter defaults to system program", async () => {
      const { lockerW, govToken } = await setupEnvironment({
        staker: stakerSDK.provider,
        admin: adminSDK.provider,
        whitelistEnabled: false,
      });
      const { permalock, tx: permalockTX } =
        await adminSDK.permalock.createPermalock({
          locker: lockerW.locker,
          lockerMint: govToken.mintAccount,
        });
      await expectTX(permalockTX, "Create the Permalock").to.be.fulfilled;

      await assertTXThrows(
        stakerSDK.permalock.setOwner({
          permalock,
          newOwner: stakerSDK.provider.wallet.publicKey,
        }),
        PermalockErrors.UnauthorizedNotOwnerSetter
      );
      await assertTXThrows(
        adminSDK.permalock.setOwner({
          permalock,
          newOwner: stakerSDK.provider.wallet.publicKey,
        }),
        PermalockErrors.UnauthorizedNotOwnerSetter
      );
    });
  });
});
