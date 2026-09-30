import type { AnswerRoomContent } from "./answerRoom";

/**
 * Answer-room content, keyed by `scienceQuestions` id. Prototype stage:
 * one question only (the melting ice), so the room can be tried on a
 * phone before all 20 questions get split — see BACKLOG.md's redesign
 * entry for the batches-of-5 plan.
 *
 * `questionParts` is the question's existing `prompt` cut at two
 * points, not rewritten. `phrases` join back into its existing
 * `modelAnswer` word for word (checked in answerRoom.test.ts).
 */
export interface AnswerRoomQuestion extends AnswerRoomContent {
  questionParts: [string, string, string];
}

export const answerRoomContent: Record<string, AnswerRoomQuestion> = {
  "aishas-melting-ice": {
    questionParts: [
      "Aisha takes an ice cube out of the freezer and leaves it on the kitchen table.",
      "After 20 minutes, she comes back and finds a small puddle of water instead.",
      "Explain what happened to the ice and why.",
    ],
    phrases: ["The ice melted", "because", "it warmed up", "to room temperature,", "changing from a solid", "into a liquid."],
    wrongPhrase: "it got colder",
  },
};
