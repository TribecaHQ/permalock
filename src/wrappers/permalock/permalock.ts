import type { TransactionEnvelope } from "@saberhq/solana-contrib";
import type { ProgramAccount, u64 } from "@saberhq/token-utils";
import {
  getATAAddress,
  getOrCreateATA,
  SPLToken,
  Token,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { PublicKey, Signer } from "@solana/web3.js";
import {
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  findEscrowAddress,
  TRIBECA_ADDRESSES,
  TRIBECA_CODERS,
} from "@tribecahq/tribeca-sdk";
import invariant from "tiny-invariant";

import type { PermalockData, PermalockProgram } from "../../programs/permalock";
import type { PermalockSDK } from "../../sdk";
import { findPermalockAddress } from "./pda";

/**
 * Handles interacting with the Permalock program.
 */
export class PermalockWrapper {
  readonly program: PermalockProgram;

  /**
   * Constructor for a {@link PermalockWrapper}.
   * @param sdk
   */
  constructor(readonly sdk: PermalockSDK) {
    this.program = sdk.programs.Permalock;
  }

  /**
   * Provider.
   */
  get provider() {
    return this.sdk.provider;
  }

  /**
   * Creates a Permalock.
   * @param param0
   * @returns
   */
  async createPermalock({
    locker,
    lockerMint,
    baseKP = Keypair.generate(),
    owner = this.provider.wallet.publicKey,
    ownerSetter = SystemProgram.programId,
    payer = this.provider.wallet.publicKey,
  }: {
    locker: PublicKey;
    lockerMint?: PublicKey;
    baseKP?: Signer;
    owner?: PublicKey;
    ownerSetter?: PublicKey;
    payer?: PublicKey;
  }): Promise<{
    permalock: PublicKey;
    mint: PublicKey;
    tx: TransactionEnvelope;
  }> {
    const [permalock] = await findPermalockAddress(baseKP.publicKey);
    const [escrow, escrowBump] = await findEscrowAddress(locker, permalock);

    const lockerData = await this.provider.getAccountInfo(locker);
    const stakedTokenMint =
      lockerMint ??
      (lockerData
        ? TRIBECA_CODERS.LockedVoter.accountParsers.locker(
            lockerData.accountInfo.data
          ).tokenMint
        : null);
    invariant(stakedTokenMint);

    const stakedToken = await Token.load(
      this.provider.connection,
      stakedTokenMint
    );
    invariant(stakedToken);

    const pendingTokensATA = await getOrCreateATA({
      provider: this.provider,
      mint: stakedTokenMint,
      owner: permalock,
    });

    const stakedEscrowATA = await getOrCreateATA({
      provider: this.provider,
      mint: stakedTokenMint,
      owner: escrow,
    });

    return {
      permalock,
      mint: baseKP.publicKey,
      tx: this.provider.newTX(
        [
          stakedEscrowATA.instruction,
          pendingTokensATA.instruction,
          this.program.instruction.createPermalock(escrowBump, {
            accounts: {
              base: baseKP.publicKey,
              permalock,
              locker,
              escrow,
              permalockPendingTokens: pendingTokensATA.address,
              owner,
              ownerSetter,
              payer,
              systemProgram: SystemProgram.programId,
              lockedVoterProgram: TRIBECA_ADDRESSES.LockedVoter,
            },
          }),
        ],
        [baseKP]
      ),
    };
  }
  /**
   * Sets a Permalock's escrow's vote delegate.
   * @param param0
   * @returns
   */
  async setVoteDelegate({
    permalock,
    newDelegate,
    owner = this.provider.wallet.publicKey,
  }: {
    permalock: PublicKey;
    newDelegate: PublicKey;
    owner?: PublicKey;
  }) {
    const permalockData = await this.program.account.permalock.fetchNullable(
      permalock
    );
    if (!permalockData) {
      throw new Error(`permalock ${permalock.toString()} not found`);
    }
    return this.setVoteDelegateWithEscrow({
      permalock,
      escrow: permalockData.escrow,
      newDelegate,
      owner,
    });
  }

  /**
   * Sets a Permalock's escrow's vote delegate.
   * @param param0
   * @returns
   */
  setVoteDelegateWithEscrow({
    permalock,
    escrow,
    newDelegate,
    owner = this.provider.wallet.publicKey,
  }: {
    permalock: PublicKey;
    escrow: PublicKey;
    newDelegate: PublicKey;
    owner?: PublicKey;
  }) {
    return this.provider.newTX([
      this.program.instruction.setVoteDelegate({
        accounts: {
          permalock,
          escrow,
          newDelegate,
          owner,
          lockedVoterProgram: TRIBECA_ADDRESSES.LockedVoter,
        },
      }),
    ]);
  }

  /**
   * Sets a Permalock's owner.
   * @param param0
   * @returns
   */
  setOwner({
    permalock,
    ownerSetter = this.provider.wallet.publicKey,
    newOwner,
  }: {
    permalock: PublicKey;
    ownerSetter?: PublicKey;
    newOwner: PublicKey;
  }) {
    return this.provider.newTX([
      this.program.instruction.setOwner({
        accounts: {
          permalock,
          ownerSetter,
          newOwner,
        },
      }),
    ]);
  }

  /**
   * Refreshes the lockup of a Permalock.
   * @param param0
   * @returns
   */
  async refreshLock({
    permalock,
    whitelistEntry,
  }: {
    permalock: PublicKey;
    /**
     * The locker whitelist entry, if applicable.
     */
    whitelistEntry?: PublicKey;
  }) {
    const permalockData = await this.program.account.permalock.fetchNullable(
      permalock
    );
    if (!permalockData) {
      throw new Error(`permalock ${permalock.toString()} not found`);
    }
    const maybeEscrowData = await this.provider.getAccountInfo(
      permalockData.escrow
    );
    if (!maybeEscrowData) {
      throw new Error(`escrow ${permalockData.escrow.toString()} not found`);
    }
    const escrowData = TRIBECA_CODERS.LockedVoter.accountParsers.escrow(
      maybeEscrowData.accountInfo.data
    );

    return this.provider.newTX([
      this.program.instruction.refreshLock({
        accounts: {
          permalock,
          locker: escrowData.locker,
          escrow: permalockData.escrow,
          escrowTokens: escrowData.tokens,
          permalockPendingTokens: permalockData.pendingTokens,
          lockedVoterProgram: TRIBECA_ADDRESSES.LockedVoter,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        remainingAccounts: whitelistEntry
          ? [
              {
                pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
                isWritable: false,
                isSigner: false,
              },
              {
                pubkey: whitelistEntry,
                isWritable: false,
                isSigner: false,
              },
            ]
          : undefined,
      }),
    ]);
  }

  /**
   * Deposits tokens into a Permalock.
   * @param param0
   * @returns
   */
  async deposit({
    amount,
    permalock,
    sourceAuthority = this.provider.wallet.publicKey,
  }: {
    amount: u64;
    permalock: PublicKey;
    sourceAuthority?: PublicKey;
  }) {
    const permalockData = await this.program.account.permalock.fetchNullable(
      permalock
    );
    if (!permalockData) {
      throw new Error(`could not find permalock: ${permalock.toString()}`);
    }
    return await this.depositWithData({
      amount,
      permalock: {
        publicKey: permalock,
        account: permalockData,
      },
      sourceAuthority,
    });
  }

  /**
   * Deposits tokens into a Permalock.
   * @param param0
   * @returns
   */
  async depositWithData({
    amount,
    permalock,
    sourceAuthority = this.provider.wallet.publicKey,
  }: {
    amount: u64;
    permalock: ProgramAccount<PermalockData>;
    sourceAuthority?: PublicKey;
  }) {
    const sourceTokensATA = await getATAAddress({
      mint: permalock.account.stakedTokenMint,
      owner: sourceAuthority,
    });
    return this.provider.newTX([
      SPLToken.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        sourceTokensATA,
        permalock.account.pendingTokens,
        sourceAuthority,
        [],
        amount
      ),
    ]);
  }
}
