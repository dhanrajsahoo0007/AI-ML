import { describeStoreContract } from "./store.contract";
import { MemoryNewsletterStore } from "./store";

describeStoreContract("MemoryNewsletterStore", () => new MemoryNewsletterStore());
