import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PERMALOCK_ADDRESSES } from "../..";

/**
 * Finds the address of a Permalock.
 */
export const findPermalockAddress = async (
  base: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("Permalock"), base.toBuffer()],
    PERMALOCK_ADDRESSES.Permalock
  );
};
