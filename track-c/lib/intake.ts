// Fixed intake questions. Deterministic — the model never writes questions.
// Stage + multiStage feed the scope gate; loudClaim + actualBehavior feed Signal Extract.

export type IntakeFieldId =
  | "product"
  | "stage"
  | "multiStage"
  | "stages"
  | "loudClaim"
  | "actualBehavior"
  | "userFeedback"
  | "manualWorkaround";

export interface IntakeQuestion {
  id: IntakeFieldId;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "product",
    label: "What are you building?",
    hint: "One line. The domain AI product itself.",
    type: "text",
    placeholder: "e.g. an AI tutor that turns a syllabus into graded practice sets",
  },
  {
    id: "stage",
    label: "What stage are you actually at?",
    type: "select",
    options: [
      { value: "idea", label: "Just an idea" },
      { value: "planning", label: "Planning / researching" },
      { value: "mid_build", label: "Mid-build — something partly works" },
      { value: "launched", label: "Launched / in users' hands" },
    ],
  },
  {
    id: "multiStage",
    label: "Is it a multi-stage AI product?",
    hint: "e.g. setup → agents → iteration → custom model. Distinct stages, not one call.",
    type: "select",
    options: [
      { value: "yes", label: "Yes — multiple distinct stages" },
      { value: "no", label: "No — a single model / single step" },
    ],
  },
  {
    id: "stages",
    label: "Name the stages.",
    hint: "List them in the order you imagine building them.",
    type: "textarea",
    placeholder: "1. data setup\n2. agent orchestration\n3. iteration loop\n4. fine-tuned model",
  },
  {
    id: "loudClaim",
    label: "What do you SAY is the hard part?",
    hint: "The thing you tell people you're stuck on or focused on.",
    type: "textarea",
    placeholder: "e.g. I need to train a custom model before any of this is real",
  },
  {
    id: "actualBehavior",
    label: "What have you ACTUALLY done in the last two weeks?",
    hint: "Concrete actions and non-actions. Be honest about what you avoided.",
    type: "textarea",
    placeholder: "e.g. read papers on fine-tuning, rewrote the plan twice, didn't write any code",
  },
  {
    id: "userFeedback",
    label: "When did you last show your build to a user, and what did they actually do?",
    hint: "Mom Test: Focus on actual behavior and commitments (e.g. did they use it, pay, or give you concrete data)?",
    type: "textarea",
    placeholder: "e.g. I showed the prototype to two friends, they said it was 'cool' but didn't open it again.",
  },
  {
    id: "manualWorkaround",
    label: "How are you (or your users) solving this problem manually right now?",
    hint: "Mom Test: If there's no manual workaround being used, the problem might not be real.",
    type: "textarea",
    placeholder: "e.g. Copying syllabus details into ChatGPT manually, copying answers to a document.",
  },
];
