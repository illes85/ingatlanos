import type messages from "../../messages/hu.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "hu";
    Messages: typeof messages;
  }
}
