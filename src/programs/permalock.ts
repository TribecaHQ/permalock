import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { PermalockIDL } from "../idls/permalock";

export * from "../idls/permalock";

export type PermalockTypes = AnchorTypes<
  PermalockIDL,
  {
    permalock: PermalockData;
  }
>;

type Accounts = PermalockTypes["Accounts"];

export type PermalockData = Accounts["Permalock"];

export type PermalockProgram = PermalockTypes["Program"];
