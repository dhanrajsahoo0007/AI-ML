import "server-only";
import { setSubscriptionCanceller, LiveSubscriptionError } from "@/features/account";
import { serverEnv } from "@/server/env";
import { providerFor } from "./provider";

// Account deletion cancels live subscriptions at the provider first (plan §8.3, §9.3). Imported for its side
// effect by the account deletion route. Without a configured provider the deletion is refused (409), so nobody
// is deleted while still being charged.
setSubscriptionCanceller(async (sub) => {
  const env = serverEnv();
  const provider = providerFor(sub.provider, env);
  if (!provider || !env.DODO_API_KEY) {
    throw new LiveSubscriptionError("Cancel your subscription before deleting your account");
  }
  await provider.cancel(sub.providerSubscriptionId);
});
