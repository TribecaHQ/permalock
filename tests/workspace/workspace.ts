import * as anchor from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana } from "@saberhq/chai-solana";
import chai from "chai";

import type { PermalockPrograms } from "../../src";
import { PermalockSDK } from "../../src";

chai.use(chaiSolana);

export type Workspace = PermalockPrograms;

export const makeSDK = (): PermalockSDK => {
  const anchorProvider = anchor.Provider.env();
  anchor.setProvider(anchorProvider);
  const provider = makeSaberProvider(anchorProvider);
  return PermalockSDK.load({
    provider,
  });
};
