// Public API of the practice feature (server side).
export {
  MAX_MERGE_RATINGS,
  questionIdSchema,
  ratingItemSchema,
  ratingSchema,
  storyIdSchema,
  storySchema,
} from "./schema";
export { addRating, deleteStory, listRatings, listStories, mergeRatings, saveStory } from "./store";

/** The switch in content/features.yaml that lets the account store story text. */
export const STORY_SYNC_FLAG = "practiceStories";
