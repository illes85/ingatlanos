import type { BillingProvider } from "./types";

/** MOCK szolgáltató: nincs valódi fizetés, a változást a hívó azonnal alkalmazza. */
export const mockBilling: BillingProvider = {
  mode: "mock",
  async createCheckout() {
    return { type: "simulated" };
  },
  async changeSubscription() {
    // A hívó közvetlenül az adatbázisban alkalmazza a váltást.
  },
  async cancelAtPeriodEnd() {
    // A hívó a saját adatbázisában jelöli a lemondást; külső rendszer nincs.
  },
  parseWebhook() {
    throw new Error("MOCK módban nincs webhook.");
  },
};
