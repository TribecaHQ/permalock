import { buildCoderMap } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import type { PermalockProgram, PermalockTypes } from "./programs";
import { PermalockJSON } from "./programs";

/**
 * Permalock program types.
 */
export interface PermalockPrograms {
  Permalock: PermalockProgram;
}

/**
 * Permalock addresses.
 */
export const PERMALOCK_ADDRESSES = {
  Permalock: new PublicKey("PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd"),
};

/**
 * Program IDLs.
 */
export const PERMALOCK_IDLS = {
  Permalock: PermalockJSON,
};

/**
 * Coders.
 */
export const PERMALOCK_CODERS = buildCoderMap<{
  Permalock: PermalockTypes;
}>(PERMALOCK_IDLS, PERMALOCK_ADDRESSES);
