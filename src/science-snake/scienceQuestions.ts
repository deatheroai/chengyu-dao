import type { ScienceQuestion } from "./types";

/**
 * Batch 1: 5 P4 Science questions, authored 2026-09-16 and approved on
 * chat review (BACKLOG.md's "authored + reviewed in batches of 5" —
 * general P4 MOE syllabus topics, not sourced from an official syllabus
 * document, per DECISIONS.md's content-sourcing resolution). The first
 * draft of questions 1-3 read as too generic/bare-recall; revised to a
 * concrete scenario per question before approval, and question 5
 * (originally "list the butterfly life cycle's 4 stages in order") was
 * replaced entirely for reading as MCQ-shaped rather than short-answer.
 */
export const scienceQuestions: ScienceQuestion[] = [
  {
    id: "puppy-vs-robot-dog",
    topic: "diversity-living-nonliving",
    icon: "🔍",
    prompt:
      "Mei Ling has a toy robot dog and a real puppy. The robot dog can move and make sounds too, just like the puppy. Give two reasons why the puppy is a living thing but the robot dog is not.",
    requiredKeywords: [
      ["grow", "grows", "growing", "bigger"],
      ["reproduce", "reproduction", "have puppies", "have babies", "give birth"],
    ],
    minWords: 8,
    hint: "The robot can move and make sounds just like the puppy — so think of what a puppy does that no robot really can, like getting bigger over time or having babies of its own.",
    modelAnswer:
      "The puppy is living because it can grow bigger as it gets older, and it can reproduce by having puppies of its own one day. The robot dog cannot really do either of those things.",
    sourceNotes:
      "MRSGREN characteristics of living things (growth, reproduction) vs. a non-living thing that superficially shares movement/sound — standard P3/P4 Diversity theme content.",
  },
  {
    id: "sams-bean-seedling",
    topic: "life-cycles",
    icon: "🍃",
    prompt:
      "Sam plants a bean seed in a pot and waters it every day. After a week, he sees a tiny sprout with a little root poking out of the soil and a small stem with tiny leaves above it. What stage of the plant's life cycle is Sam looking at, and what will happen to it next?",
    requiredKeywords: [
      ["seedling", "young plant"],
      ["grow", "grows", "growing", "mature", "matures", "develop", "develops"],
    ],
    minWords: 8,
    hint: "Sam's sprout already has a root, stem, and leaves — that's not the seed stage anymore. What do we call this next stage, and what does it do as time passes?",
    modelAnswer: "Sam is looking at the seedling stage. Over time, the seedling will keep growing bigger until it becomes a mature plant.",
    sourceNotes: "Flowering plant life cycle (seed → germination → seedling → mature plant) — standard P4 Cycles theme content.",
  },
  {
    id: "aishas-melting-ice",
    topic: "states-of-matter",
    icon: "🧊",
    prompt:
      "Aisha takes an ice cube out of the freezer and leaves it on the kitchen table. After 20 minutes, she comes back and finds a small puddle of water instead. Explain what happened to the ice and why.",
    requiredKeywords: [
      ["melt", "melted", "melting"],
      ["warm", "warmed", "warmer", "heat", "heated", "room temperature"],
    ],
    minWords: 8,
    hint: "Think about the temperature of the kitchen table compared to the freezer — what does heat do to ice?",
    modelAnswer: "The ice melted because it warmed up to room temperature, changing from a solid into a liquid.",
    sourceNotes: "Change of state (solid to liquid via heating/melting) — standard P4 Cycles/Matter theme content.",
  },
  {
    id: "paperclip-vs-paper-magnet",
    topic: "magnets",
    icon: "🧲",
    prompt: "Why does a magnet attract a paper clip but not a piece of paper?",
    requiredKeywords: [
      ["iron", "steel", "metal", "magnetic material"],
      ["not magnetic", "non-magnetic", "isn't magnetic", "is not magnetic"],
    ],
    minWords: 8,
    hint: "Think about what material the paper clip is made of, compared to paper — is paper a magnetic material?",
    modelAnswer:
      "A magnet attracts the paper clip because it is made of a magnetic material like iron or steel, but paper is not magnetic so the magnet does not attract it.",
    sourceNotes: "Magnetic vs. non-magnetic materials — standard P4 Systems theme content.",
  },
  {
    id: "ravis-caterpillar-pupa",
    topic: "life-cycles",
    icon: "🦋",
    prompt:
      "Ravi found a caterpillar in his garden and put it in a container to observe. Two weeks later, he found it wrapped in a hard case, not moving at all. His sister said the caterpillar died. Explain why Ravi's sister is wrong, and what is really happening to the caterpillar.",
    requiredKeywords: [
      ["pupa", "chrysalis", "cocoon"],
      ["life cycle", "changing", "change", "turn into a butterfly", "turning into a butterfly", "metamorphosis", "still alive"],
    ],
    minWords: 10,
    hint: "The hard case isn't a coffin — it's a normal stage in an insect's life cycle. What is this resting stage called, and what is the caterpillar turning into inside it?",
    modelAnswer:
      "Ravi's sister is wrong because the caterpillar is not dead — it has entered the pupa (chrysalis) stage of its life cycle, where its body is changing so it can become an adult butterfly.",
    sourceNotes:
      "Complete metamorphosis (egg-larva-pupa-adult) — standard P4 Cycles theme content. Replaces an earlier draft that asked to list all 4 stages in order, which read as MCQ-shaped rather than short-answer.",
  },
];

export const scienceQuestionsById: Record<string, ScienceQuestion> = Object.fromEntries(
  scienceQuestions.map((q) => [q.id, q]),
);
