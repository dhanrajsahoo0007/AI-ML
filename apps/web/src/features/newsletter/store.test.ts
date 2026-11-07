import { describeStoreContract } from "./store.contract";
import { MemoryNewsletterStore } from "./store";

describeStoreContract("MemoryNewsletterStore", (now) => new MemoryNewsletterStore(now));
