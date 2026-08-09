import type { BridgeApi } from "../shared/contracts";

declare global {
  interface Window {
    everyHelper?: BridgeApi;
  }
}

export {};
