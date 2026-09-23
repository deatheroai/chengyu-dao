import type { ScienceQuestion } from "./types";

/**
 * P4 Science questions, authored 2026-09-16 and approved on chat review
 * in batches of 5 (BACKLOG.md's "authored + reviewed in batches of 5" —
 * general P4 MOE syllabus topics, not sourced from an official syllabus
 * document, per DECISIONS.md's content-sourcing resolution).
 *
 * Batch 1's first draft of questions 1-3 read as too generic/bare-recall;
 * revised to a concrete scenario per question before approval, and its
 * original question 5 ("list the butterfly life cycle's 4 stages in
 * order") was replaced entirely for reading as MCQ-shaped rather than
 * short-answer. Batch 2 and 3 boundaries are marked inline below.
 */
export const scienceQuestions: ScienceQuestion[] = [
  // --- Batch 1 ---
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
  // --- Batch 2: authored and approved on chat review 2026-09-16. An
  // earlier draft's 5th question (a chicken-vs-butterfly life cycle
  // contrast) was rejected as "not very relevant" and replaced with the
  // light-and-shadows question below before approval. ---
  {
    id: "weijies-wilted-plant",
    topic: "plant-systems",
    icon: "🌱",
    prompt:
      "Wei Jie forgot to water his potted plant for two weeks. When he finally watered it again, the wilted leaves became firm and upright within a few hours. Explain how the water helped the leaves stand up again, and how it got from the soil to the leaves.",
    requiredKeywords: [
      ["root", "roots"],
      ["stem", "transport", "transports", "carried", "carries", "carry"],
    ],
    minWords: 10,
    hint: "Think about which part underground takes in water first, and then which part above ground acts like a straw carrying that water up to the leaves.",
    modelAnswer: "The roots absorbed water from the soil, and the stem carried the water up to the leaves, making them firm and upright again.",
    sourceNotes: "Plant systems — functions of roots (absorb water) and stem (transport water to leaves) — standard P4 Systems theme content.",
  },
  {
    id: "mrs-tans-umbrella",
    topic: "materials",
    icon: "🪵",
    prompt: "Mrs Tan is buying a new umbrella. She picks one with a nylon canopy instead of one made of paper. Explain why nylon is a better material for an umbrella than paper.",
    requiredKeywords: [
      ["waterproof", "water-resistant", "does not absorb water", "doesn't absorb water", "repels water"],
      ["absorb water", "absorbs water", "soggy", "soaks up water", "gets wet"],
    ],
    minWords: 10,
    hint: "Think about what happens to paper when it gets rained on, compared to nylon — which one lets water soak in, and which one keeps water out?",
    modelAnswer: "Nylon is waterproof and does not absorb water, so it keeps Mrs Tan dry, but paper absorbs water and would become soggy and tear in the rain.",
    sourceNotes: "Diversity/properties of materials (waterproof vs. absorbent) applied to material selection — standard P3/P4 Diversity theme content, reinforced at P4.",
  },
  {
    id: "farahs-evaporating-puddles",
    topic: "water-cycle",
    icon: "💧",
    prompt: "After a rainy morning, Farah notices puddles on the playground. By the afternoon, under the hot sun, the puddles have completely disappeared. Explain what happened to the water in the puddles.",
    requiredKeywords: [
      ["evaporate", "evaporated", "evaporation"],
      ["water vapour", "water vapor", "gas", "heat", "sun", "warmed", "heated"],
    ],
    minWords: 8,
    hint: "Think about what the sun's heat does to the water in the puddles — does it disappear completely, or does it change into something we can't see?",
    modelAnswer: "The heat from the sun caused the water in the puddles to evaporate, turning into water vapour that rose into the air.",
    sourceNotes: "Water cycle — evaporation caused by heat, water turning into water vapour — standard P4 Cycles/Matter theme content.",
  },
  {
    id: "mr-lims-hot-pot-handle",
    topic: "materials",
    icon: "🍳",
    prompt:
      "Mr Lim is cooking soup in a metal pot with a wooden spoon resting inside it. After a while, the metal pot handle feels very hot, but the wooden spoon handle still feels cool. Explain why the metal feels hot but the wood does not.",
    requiredKeywords: [
      ["conductor", "conducts heat", "conduct heat", "good conductor"],
      ["insulator", "does not conduct heat", "doesn't conduct heat", "poor conductor", "bad conductor"],
    ],
    minWords: 10,
    hint: "Think about which material lets heat travel through it quickly, making the handle heat up fast — and which material is much slower to let heat pass through, so it stays cool.",
    modelAnswer:
      "The metal pot handle feels hot because metal is a good conductor of heat, but the wooden spoon feels cool because wood is an insulator and does not conduct heat well.",
    sourceNotes: "Materials — thermal conductors vs. insulators (metal vs. wood) — standard P4 Systems/Materials theme content.",
  },
  {
    id: "meis-changing-shadow",
    topic: "light-and-shadows",
    icon: "☀️",
    prompt:
      "Mei was standing under a tree at noon and had almost no shadow, but later at 5pm her shadow stretched far across the playground. Her brother said this happens because the sun becomes bigger in the late afternoon. Explain why her brother is wrong, and what actually causes the change in shadow length.",
    requiredKeywords: [
      ["lower in the sky", "sun is lower", "sun is low", "closer to the horizon", "low in the sky", "sun's angle is lower"],
      ["stretches her shadow", "shadow longer", "shadow becomes longer", "shadow gets longer", "makes it longer", "much longer", "shadow to be longer"],
    ],
    minWords: 12,
    hint: "At 5pm, is the sun higher up or closer to the horizon than it is at noon? Think about how a sun lower in the sky sends light in at a shallower angle — what would that do to how far a shadow stretches out?",
    modelAnswer:
      "Mei's brother is wrong — the sun doesn't change size. In the late afternoon the sun is much lower in the sky, closer to the horizon, so its light hits Mei at a shallower angle. That shallower angle stretches her shadow out and makes it much longer, unlike at noon when the sun is high overhead and her shadow is short.",
    sourceNotes:
      "Light and shadows — shadow length changes with the sun's angle in the sky (a lower sun casts a longer shadow via a shallower light angle), not its size — standard P3/P4 Light theme content, reinforced at P4. Revised 2026-09-16 per feedback to require the actual mechanism (why longer specifically), not just 'the sun's position changes.'",
  },
  // --- Batch 3: drafted 2026-09-23, pending chat review. Topics kept to
  // the P3/P4 (Lower Block) syllabus — electrical circuits, cells and
  // forces were considered and dropped as P5/P6 content. ---
  {
    id: "priyas-grandpa-digestion",
    topic: "human-digestive-system",
    icon: "🍚",
    prompt:
      "Priya's grandfather says that once food reaches the stomach, digestion is finished and the food goes straight into the blood from there. Explain why her grandfather is not quite right.",
    requiredKeywords: [
      ["small intestine"],
      ["absorb", "absorbed", "absorbs", "absorption", "into the blood", "bloodstream"],
    ],
    minWords: 10,
    hint: "The stomach only does part of the job. Which long, coiled tube does the food go into after the stomach, and what happens to the digested food while it is there?",
    modelAnswer:
      "Grandpa is not quite right, because the stomach only digests part of the food. Digestion is completed in the small intestine, where the digested food is absorbed into the blood.",
    sourceNotes:
      "Human digestive system — digestion completed in the small intestine, where digested food is absorbed into the bloodstream (not the stomach) — standard P3/P4 Systems theme content.",
  },
  {
    id: "hannahs-mouldy-bread",
    topic: "fungi",
    icon: "🍄",
    prompt:
      "Hannah left a slice of bread in the cupboard beside the steamy rice cooker. A week later, the bread was covered in fuzzy green patches. Her brother says the bread itself grew the patches. Explain what the patches really are and why they grew so well there.",
    requiredKeywords: [
      ["mould", "mold", "fungus", "fungi"],
      ["warm", "damp", "moist", "wet", "water", "feed", "feeds", "fed", "nutrients"],
    ],
    minWords: 10,
    hint: "The bread isn't alive — but something tiny landed on it and started living there. Which group of living things, neither plant nor animal, grows on old bread? And what was it like beside the steamy rice cooker?",
    modelAnswer:
      "The green patches are mould, which is a type of fungus. The mould grew well because the cupboard was warm and damp, and it fed on the bread.",
    sourceNotes:
      "Diversity of living things — fungi (mould) as a living group distinct from plants/animals, growing on food in warm, damp conditions — standard P3/P4 Diversity theme content.",
  },
  {
    id: "daniels-stuck-jar-lid",
    topic: "heat",
    icon: "🫙",
    prompt:
      "Daniel's mum cannot open a jar of jam because the metal lid is stuck tight. She runs the lid under hot water for a minute, and then it twists open easily. Explain why the hot water helped her open the jar.",
    requiredKeywords: [
      ["expand", "expands", "expanded", "expanding", "expansion"],
      ["heat", "hot water", "warm", "hotter"],
    ],
    minWords: 10,
    hint: "Think about what happens to the size of a metal object when its temperature goes up. Would a slightly bigger lid grip the jar more tightly, or less tightly?",
    modelAnswer:
      "The metal lid gained heat from the hot water, so it expanded and became slightly bigger. This loosened the lid, so it could twist open easily.",
    sourceNotes: "Heat — effects of heat gain: metals expand when heated (and contract when cooled) — standard P4 Energy theme content.",
  },
  {
    id: "ethans-dry-tissue",
    topic: "states-of-matter",
    icon: "🥤",
    prompt:
      "Ethan stuffs a dry tissue into the bottom of an empty cup. He turns the cup upside down and pushes it straight down into a basin of water. When he lifts it out, the tissue is still dry. Explain why the water did not wet the tissue.",
    requiredKeywords: [
      ["air"],
      ["space", "room", "trapped", "kept the water out", "keeps the water out", "pushed the water", "pushes the water"],
    ],
    minWords: 10,
    hint: "The cup looks empty, but is it really? Think about what was already inside the cup before it went into the water, and whether water can move into a spot that is already filled.",
    modelAnswer:
      "The cup was not really empty. It was full of air, and air takes up space, so the water could not get into the cup to wet the tissue.",
    sourceNotes: "Matter — gases (air) have mass and occupy space — standard P3/P4 Cycles/Matter theme content.",
  },
  {
    id: "zaras-dark-bedroom",
    topic: "light-and-shadows",
    icon: "💡",
    prompt:
      "Zara wakes up at night and wants to find her storybook on her desk. The room is completely dark, and even with her eyes wide open she cannot see the book. When she switches on her lamp, she can see it clearly. Explain why she can only see the book once the lamp is on.",
    requiredKeywords: [
      ["light"],
      ["reflect", "reflects", "reflected", "reflecting", "bounce", "bounces", "bounced"],
    ],
    minWords: 10,
    hint: "Zara's eyes are working fine, so something has to travel from the lamp to the book, and then from the book into her eyes. What does the lamp give out, and what does the book do with it?",
    modelAnswer:
      "Light from the lamp shines on the book, and the book reflects the light into Zara's eyes, so she can see it. In the dark, there is no light for the book to reflect.",
    sourceNotes: "Light — we see non-luminous objects when light from a source is reflected off them into our eyes — standard P3/P4 Energy (Light) theme content.",
  },
];

export const scienceQuestionsById: Record<string, ScienceQuestion> = Object.fromEntries(
  scienceQuestions.map((q) => [q.id, q]),
);
