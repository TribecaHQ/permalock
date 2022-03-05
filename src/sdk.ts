import { newProgramMap } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import { SolanaAugmentedProvider } from "@saberhq/solana-contrib";
import type { Signer } from "@solana/web3.js";

import type { PermalockPrograms } from ".";
import { PERMALOCK_ADDRESSES, PERMALOCK_IDLS } from "./constants";
import { PermalockWrapper } from "./wrappers";

/**
 * Permalock SDK.
 */
export class PermalockSDK {
  constructor(
    readonly provider: AugmentedProvider,
    readonly programs: PermalockPrograms
  ) {}

  /**
   * Creates a new instance of the SDK with the given keypair.
   */
  withSigner(signer: Signer): PermalockSDK {
    return PermalockSDK.load({
      provider: this.provider.withSigner(signer),
    });
  }

  /**
   * Loads the SDK.
   * @returns
   */
  static load({ provider }: { provider: Provider }): PermalockSDK {
    const programs: PermalockPrograms = newProgramMap<PermalockPrograms>(
      provider,
      PERMALOCK_IDLS,
      PERMALOCK_ADDRESSES
    );
    return new PermalockSDK(new SolanaAugmentedProvider(provider), programs);
  }

  /**
   * Permalock program helpers.
   */
  get permalock(): PermalockWrapper {
    return new PermalockWrapper(this);
  }
}
