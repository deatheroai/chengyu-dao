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
 * short-answer. Later batch boundaries are marked inline below.
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
      [
        "waterproof",
        "water proof",
        "water-resistant",
        "does not absorb water",
        "doesn't absorb water",
        "repels water",
        "does not let water through",
        "doesn't let water through",
        "does not allow water to pass through",
        "doesn't allow water to pass through",
      ],
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
  // --- Batch 3: authored and approved on chat review 2026-09-23. Topics kept to
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
    id: "ethans-bubbling-bottle",
    topic: "states-of-matter",
    icon: "🫧",
    prompt:
      "At bath time, Ethan pushes an empty plastic bottle straight down into the water, mouth first. Hardly any water goes into the bottle. When he tilts the bottle to one side, big bubbles rush out and water quickly flows in. Explain why water could only flow into the bottle after he tilted it.",
    requiredKeywords: [
      ["air"],
      [
        "space",
        "room",
        "trapped",
        "escape",
        "escaped",
        "escapes",
        "came out",
        "comes out",
        "come out",
        "coming out",
        "get out",
        "got out",
        "bubbled out",
        "leave the bottle",
        "left the bottle",
        "let out",
        "kept the water out",
        "keeps the water out",
        "pushed the water",
        "pushes the water",
      ],
    ],
    minWords: 12,
    hint: "The bottle looks empty, but is it really? Think about what was already filling the bottle before it went into the water — and what those big bubbles were made of.",
    modelAnswer:
      "The bottle was not really empty — it was full of air. Air takes up space, so the water could not get in. When Ethan tilted the bottle, the air escaped as bubbles, making room for the water to flow in.",
    sourceNotes:
      "Matter — gases (air) occupy space — standard P3/P4 Cycles/Matter theme content. Revised on review 2026-09-23 from a tissue-in-an-upturned-cup scenario that was hard to picture actually working; the bath-time bottle makes the air visible as bubbles.",
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
  // --- Batch 4: drafted 2026-09-24, pending chat review. ---
  {
    id: "nuruls-sweating-can",
    topic: "water-cycle",
    icon: "🥫",
    prompt:
      "Nurul takes a can of cold drink out of the fridge and puts it on the table. A few minutes later, the outside of the can is covered in tiny water droplets, even though the can is sealed and not leaking. Explain where the water droplets came from.",
    requiredKeywords: [
      ["water vapour", "water vapor", "vapour", "vapor"],
      ["condense", "condensed", "condenses", "condensation", "cooled", "cools", "cooler", "loses heat", "lost heat", "turned into water", "turns into water", "became water"],
    ],
    minWords: 12,
    hint: "The can isn't leaking, so the water must have come from the air around it. What invisible form of water is in the air, and what happens to it when it touches something very cold?",
    modelAnswer:
      "The water droplets came from water vapour in the air. When the water vapour touched the cold can, it lost heat and condensed into tiny water droplets.",
    sourceNotes: "Water cycle / heat loss — water vapour in the air condenses on a cold surface — standard P4 Cycles (Matter/Water) theme content.",
  },
  {
    id: "aidens-magnetic-train",
    topic: "magnets",
    icon: "🚂",
    prompt:
      "Aiden's toy train carriages have a magnet at each end. When he brings two carriages together one way, they push away from each other and will not join. When he turns one carriage around, they snap together. Explain why.",
    requiredKeywords: [
      ["like poles", "same poles", "same pole", "north and north", "south and south", "north pole and north pole", "south pole and south pole", "two north", "two south", " n and n", " s and s"],
      ["unlike poles", "opposite poles", "different poles", "north and south", "south and north", "north pole and south pole", "south pole and north pole", " n and s", " s and n"],
    ],
    minWords: 12,
    hint: "Every magnet has two ends called poles. Think about which kinds of poles push each other away, and which kinds pull each other together.",
    modelAnswer:
      "The first time, the same poles were facing each other, like north and north, so they repelled. When Aiden turned the carriage around, opposite poles faced each other, so they attracted and snapped together.",
    sourceNotes: "Magnets — like poles repel, unlike poles attract — standard P3/P4 Interactions theme content.",
  },
  {
    id: "kais-whale-is-not-a-fish",
    topic: "classifying-animals",
    icon: "🐋",
    prompt:
      "At the aquarium, Kai says the whale is a fish because it lives in the sea and swims with fins. His sister Lin says the whale is actually a mammal. Explain why Lin is right.",
    requiredKeywords: [
      ["lungs", "breathe air", "breathes air", "breathing air", "blowhole", "surface to breathe"],
      ["give birth", "gives birth", "live young", "young alive", "babies alive", "milk"],
    ],
    minWords: 12,
    hint: "Think about how a fish takes in air underwater, and why a whale has to keep coming up to the surface. Then think about how baby whales are born and fed, compared to baby fish.",
    modelAnswer:
      "Lin is right because a whale breathes air using lungs, not gills like a fish. A whale also gives birth to live young and feeds its babies with milk, just like other mammals.",
    sourceNotes:
      "Diversity — classifying animals by characteristics (mammals: lungs, give birth to live young, feed young with milk) vs. fish (gills, lay eggs) — standard P3/P4 Diversity theme content.",
  },
  {
    id: "lilys-cupboard-seedlings",
    topic: "plant-systems",
    icon: "🌿",
    prompt:
      "Lily puts one pot of bean seedlings on a sunny windowsill and an identical pot inside a dark cupboard. She waters both the same amount. After a week, the seedlings in the cupboard are pale yellow, thin and weak, while the ones on the windowsill are green and healthy. Explain why.",
    requiredKeywords: [
      ["light", "sunlight"],
      ["food"],
    ],
    minWords: 12,
    hint: "Both pots got the same water, so the only difference is where they were kept. What was missing inside the cupboard, and what do green leaves need it for?",
    modelAnswer:
      "The seedlings in the cupboard did not get any light. Plants need light to make their own food, so without light they became weak and pale, while the seedlings on the windowsill could make food and grow healthily.",
    sourceNotes: "Plants need light to make their own food (a fair test with water kept the same) — standard P3/P4 Systems/Diversity theme content.",
  },
  {
    id: "joshs-door-and-window",
    topic: "light-and-shadows",
    icon: "🪟",
    prompt:
      "On a sunny afternoon, Josh notices that the wooden door casts a dark shadow on the floor, but the clear glass window next to it does not. Explain why.",
    requiredKeywords: [
      ["transparent", "lets light pass", "lets light through", "lets most light", "allows light to pass", "allows light through", "light passes through", "light can pass", "light goes through", "light can go through", "light can get through"],
      ["opaque", "blocks light", "block light", "blocks the light", "does not let light", "doesn't let light", "does not allow light", "doesn't allow light", "light cannot pass", "cannot pass through", "cannot go through", "can't go through", "cannot get through", "can't get through", "does not go through", "doesn't go through"],
    ],
    minWords: 12,
    hint: "Can you see through the glass? Can you see through the wood? Think about what that tells you about how much of the sunlight each one lets reach the floor behind it.",
    modelAnswer:
      "The glass window is transparent, so it lets most light pass through and does not form a dark shadow. The wooden door is opaque, so it blocks light and casts a dark shadow on the floor.",
    sourceNotes: "Light — transparent materials let most light through, opaque materials block light and form shadows — standard P3/P4 Energy (Light) theme content.",
  },
];

export const scienceQuestionsById: Record<string, ScienceQuestion> = Object.fromEntries(
  scienceQuestions.map((q) => [q.id, q]),
);
