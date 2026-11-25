// The shared teaching components. Everything an MDX author can use from this folder is exported here
// and registered in src/lib/mdx-doc.tsx. Interactive parts (Tabs, DecisionTree, SpotTheFlag, GuessTheLevel, WhichPrinciple) are islands loaded lazily.

export { KeyIdea } from "./key-idea";
export { Term, Glossary } from "./term";
export { Compare } from "./compare";
export { ProsCons } from "./pros-cons";
export { Tabs } from "./tabs";
export { Tab } from "./lazy.client";
export { Quiz, QuizItem } from "./quiz";
export { DecisionTree } from "./decision-tree";
export { SpotTheFlag } from "./spot-the-flag";
export { GuessTheLevel, WhichPrinciple } from "./choice-drill";
export { StoryBuilder, StoryMatrix, MockLoop, PrepChecklist } from "./practice-tools";
export { RequirementsTable } from "./requirements-table";
export { EstimateTable } from "./estimate-table";
export { Numbers } from "./numbers";
export { PatternUses } from "./pattern-uses";
export { LearningPath } from "./learning-path";
