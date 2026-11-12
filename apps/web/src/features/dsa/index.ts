// Public API of the dsa (problems kind) feature: the app/<section> route helpers, SEO, the MDX renderers and the
// small server components of those pages. The views are .tsx, so server-only tests must not import this index;
// sections/kinds.ts (loaded by plain Node) imports kind.ts by path for the same reason, and the client islands
// (problem-list.client.tsx, problem-workspace.client.tsx) are imported by path.
export { DifficultyLabel, ProEditorial, Tags } from "./components";
export { numberedTitle, outlinesForTopic, problemListHref, problemsForTopic, topicLabel } from "./kind";
export { showsPremiumEditorialLocally } from "./local-view";
export { outlineNotes, outlineStatement, problemEditorial, problemStatement } from "./mdx";
export {
  dsaContent,
  dsaSection,
  findOutline,
  getProblem,
  getTopic,
  practiceGroups,
  problemIndex,
  problemLabels,
  problemParams,
  relatedLinks,
  topicParams,
  workspaceProps,
  type ProblemParams,
  type TopicParams,
} from "./routes";
export {
  HUB_DESCRIPTION,
  HUB_TITLE,
  hubCrumbs,
  hubSeo,
  LIST_DESCRIPTION,
  LIST_TITLE,
  listSeo,
  problemSeo,
  topicSeo,
} from "./seo";
export { TOPICS_DIR } from "./source";
