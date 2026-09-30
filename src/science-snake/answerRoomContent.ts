import type { AnswerRoomContent } from "./answerRoom";

/**
 * Answer-room content for every question, keyed by `scienceQuestions`
 * id (approved in chat 2026-09-30).
 *
 * - `questionParts`: the question's existing `prompt`, cut at two
 *   points — not rewritten (checked in answerRoom.test.ts).
 * - `phrases`: a short "room sentence" in 4 pieces (eaten word by word,
 *   except the choice piece), written for building rather than taken
 *   from `modelAnswer` (which runs 17-61
 *   words — too long to split into 4 easy pieces). It must still grade
 *   correct against the question's own keywords (also tested). The full
 *   `modelAnswer` stays as the golden-apple typing target.
 * - `wrongPhrase` drops into slot `wrongReplaces` in place of that
 *   correct piece, with the same shape, so the swapped sentence reads
 *   fine but is scientifically wrong ("it warmed up" ↔ "it cooled
 *   down"). Either a straight opposite, or the misconception the
 *   question is built around when that fits the slot.
 */
export interface AnswerRoomQuestion extends AnswerRoomContent {
  questionParts: [string, string, string];
}

export const answerRoomContent: Record<string, AnswerRoomQuestion> = {
  "puppy-vs-robot-dog": {
    questionParts: [
      "Mei Ling has a toy robot dog and a real puppy.",
      "The robot dog can move and make sounds too, just like the puppy.",
      "Give two reasons why the puppy is a living thing but the robot dog is not.",
    ],
    phrases: ["The puppy is living", "because", "it can grow bigger", "and have puppies of its own."],
    wrongPhrase: "it can move and bark",
    wrongReplaces: 2,
  },
  "sams-bean-seedling": {
    questionParts: [
      "Sam plants a bean seed in a pot and waters it every day.",
      "After a week, he sees a tiny sprout with a little root poking out of the soil and a small stem with tiny leaves above it.",
      "What stage of the plant's life cycle is Sam looking at, and what will happen to it next?",
    ],
    phrases: ["It is the seedling stage,", "and", "it will keep growing", "into a mature plant."],
    wrongPhrase: "It is the seed stage,",
    wrongReplaces: 0,
  },
  "aishas-melting-ice": {
    questionParts: [
      "Aisha takes an ice cube out of the freezer and leaves it on the kitchen table.",
      "After 20 minutes, she comes back and finds a small puddle of water instead.",
      "Explain what happened to the ice and why.",
    ],
    phrases: ["The ice melted", "because", "it warmed up", "to room temperature."],
    wrongPhrase: "it cooled down",
    wrongReplaces: 2,
  },
  "paperclip-vs-paper-magnet": {
    questionParts: ["Why does a magnet attract", "a paper clip", "but not a piece of paper?"],
    phrases: ["The paper clip is made of steel,", "but", "paper is not magnetic,", "so the magnet cannot attract it."],
    wrongPhrase: "paper is too light,",
    wrongReplaces: 2,
  },
  "ravis-caterpillar-pupa": {
    questionParts: [
      "Ravi found a caterpillar in his garden and put it in a container to observe.",
      "Two weeks later, he found it wrapped in a hard case, not moving at all. His sister said the caterpillar died.",
      "Explain why Ravi's sister is wrong, and what is really happening to the caterpillar.",
    ],
    phrases: ["The caterpillar is not dead", "because", "it is now a pupa,", "changing into a butterfly."],
    wrongPhrase: "it is now an egg,",
    wrongReplaces: 2,
  },
  "weijies-wilted-plant": {
    questionParts: [
      "Wei Jie forgot to water his potted plant for two weeks.",
      "When he finally watered it again, the wilted leaves became firm and upright within a few hours.",
      "Explain how the water helped the leaves stand up again, and how it got from the soil to the leaves.",
    ],
    phrases: ["The roots absorbed water,", "and", "the stem carried it up", "to the leaves."],
    wrongPhrase: "The leaves absorbed water,",
    wrongReplaces: 0,
  },
  "mrs-tans-umbrella": {
    questionParts: [
      "Mrs Tan is buying a new umbrella.",
      "She picks one with a nylon canopy instead of one made of paper.",
      "Explain why nylon is a better material for an umbrella than paper.",
    ],
    phrases: ["Nylon is waterproof,", "but", "paper absorbs water", "and would tear in the rain."],
    wrongPhrase: "paper repels water",
    wrongReplaces: 2,
  },
  "farahs-evaporating-puddles": {
    questionParts: [
      "After a rainy morning, Farah notices puddles on the playground.",
      "By the afternoon, under the hot sun, the puddles have completely disappeared.",
      "Explain what happened to the water in the puddles.",
    ],
    phrases: ["The sun heated the puddles,", "so", "the water evaporated", "into water vapour."],
    wrongPhrase: "the water condensed",
    wrongReplaces: 2,
  },
  "mr-lims-hot-pot-handle": {
    questionParts: [
      "Mr Lim is cooking soup in a metal pot with a wooden spoon resting inside it.",
      "After a while, the metal pot handle feels very hot, but the wooden spoon handle still feels cool.",
      "Explain why the metal feels hot but the wood does not.",
    ],
    phrases: ["Metal is a good conductor of heat,", "but", "wood is an insulator,", "so the spoon feels cool."],
    wrongPhrase: "wood is a good conductor,",
    wrongReplaces: 2,
  },
  "meis-changing-shadow": {
    questionParts: [
      "Mei was standing under a tree at noon and had almost no shadow, but later at 5pm her shadow stretched far across the playground.",
      "Her brother said this happens because the sun becomes bigger in the late afternoon.",
      "Explain why her brother is wrong, and what actually causes the change in shadow length.",
    ],
    phrases: ["In the late afternoon,", "the sun is lower in the sky,", "so", "her shadow gets longer."],
    wrongPhrase: "the sun is higher in the sky,",
    wrongReplaces: 1,
  },
  "priyas-grandpa-digestion": {
    questionParts: [
      "Priya's grandfather says that once food reaches the stomach, digestion is finished",
      "and the food goes straight into the blood from there.",
      "Explain why her grandfather is not quite right.",
    ],
    phrases: ["Digestion is completed", "in the small intestine,", "where the digested food", "is absorbed into the blood."],
    wrongPhrase: "in the stomach,",
    wrongReplaces: 1,
  },
  "hannahs-mouldy-bread": {
    questionParts: [
      "Hannah left a slice of bread in the cupboard beside the steamy rice cooker.",
      "A week later, the bread was covered in fuzzy green patches. Her brother says the bread itself grew the patches.",
      "Explain what the patches really are and why they grew so well there.",
    ],
    phrases: ["The green patches are mould,", "which grew", "because", "the cupboard was warm and damp."],
    wrongPhrase: "the cupboard was cold and dry.",
    wrongReplaces: 3,
  },
  "daniels-stuck-jar-lid": {
    questionParts: [
      "Daniel's mum cannot open a jar of jam because the metal lid is stuck tight.",
      "She runs the lid under hot water for a minute, and then it twists open easily.",
      "Explain why the hot water helped her open the jar.",
    ],
    phrases: ["The hot water heated the lid,", "so", "the metal lid expanded", "and could twist open."],
    wrongPhrase: "the metal lid contracted",
    wrongReplaces: 2,
  },
  "ethans-bubbling-bottle": {
    questionParts: [
      "At bath time, Ethan pushes an empty plastic bottle straight down into the water, mouth first. Hardly any water goes into the bottle.",
      "When he tilts the bottle to one side, big bubbles rush out and water quickly flows in.",
      "Explain why water could only flow into the bottle after he tilted it.",
    ],
    phrases: ["The bottle was full of air,", "and", "the air took up space,", "so the water could not get in."],
    wrongPhrase: "the air took up no space,",
    wrongReplaces: 2,
  },
  "zaras-dark-bedroom": {
    questionParts: [
      "Zara wakes up at night and wants to find her storybook on her desk.",
      "The room is completely dark, and even with her eyes wide open she cannot see the book. When she switches on her lamp, she can see it clearly.",
      "Explain why she can only see the book once the lamp is on.",
    ],
    phrases: ["Light from the lamp shines on the book,", "and", "the book reflects the light", "into Zara's eyes."],
    wrongPhrase: "Light from Zara's eyes shines on the book,",
    wrongReplaces: 0,
  },
  "nuruls-sweating-can": {
    questionParts: [
      "Nurul takes a can of cold drink out of the fridge and puts it on the table.",
      "A few minutes later, the outside of the can is covered in tiny water droplets, even though the can is sealed and not leaking.",
      "Explain where the water droplets came from.",
    ],
    phrases: ["Water vapour in the air", "touched the cold can,", "so", "it condensed into droplets."],
    wrongPhrase: "it evaporated into droplets.",
    wrongReplaces: 3,
  },
  "aidens-magnetic-train": {
    questionParts: [
      "Aiden's toy train carriages have a magnet at each end.",
      "When he brings two carriages together one way, they push away from each other and will not join. When he turns one carriage around, they snap together.",
      "Explain why.",
    ],
    phrases: ["At first, the same poles", "faced each other and repelled,", "but", "opposite poles attract each other."],
    wrongPhrase: "faced each other and attracted,",
    wrongReplaces: 1,
  },
  "kais-whale-is-not-a-fish": {
    questionParts: [
      "At the aquarium, Kai says the whale is a fish because it lives in the sea and swims with fins.",
      "His sister Lin says the whale is actually a mammal.",
      "Explain why Lin is right.",
    ],
    phrases: ["A whale breathes air with lungs", "and", "gives birth to live young,", "so it is a mammal."],
    wrongPhrase: "A whale breathes water with gills",
    wrongReplaces: 0,
  },
  "chloes-bouncy-castle-grass": {
    questionParts: [
      "A bouncy castle stood on the school field for a whole week during the school carnival.",
      "When it was taken away, Chloe saw a big square of pale yellow, weak-looking grass where it had been, while the grass all around was still green. The field was watered every day, so the soil under the castle was still damp.",
      "Explain why the grass under the castle turned yellow.",
    ],
    phrases: ["The bouncy castle blocked the sunlight,", "so", "the grass could not make food", "and turned pale."],
    wrongPhrase: "the grass could not get water",
    wrongReplaces: 2,
  },
  "joshs-door-and-window": {
    questionParts: [
      "On a sunny afternoon, Josh notices that the wooden door casts a dark shadow on the floor,",
      "but the clear glass window next to it does not.",
      "Explain why.",
    ],
    phrases: ["The glass window is transparent,", "but", "the wooden door is opaque,", "so it casts a dark shadow."],
    wrongPhrase: "the wooden door is transparent,",
    wrongReplaces: 2,
  },
};
