declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const tables: (service: TurndownService) => void;
}
