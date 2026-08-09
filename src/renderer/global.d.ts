import type { BridgeApi } from "../shared/contracts";

declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare global {
  interface Window {
    everyHelper?: BridgeApi;
  }
}

export {};
