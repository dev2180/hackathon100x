// Closed taxonomy of bottlenecks (Move 2). Editing this list is the scoring bar:
// a sentence true of every stuck beginner is a horoscope, so the enum stays closed
// and the model must pick from it or ABSTAIN.

export const TAXONOMY_VERSION = "move2-v1";

export const BOTTLENECKS = [
  "flat_terrain",
  "fear_of_shipping",
  "no_idea",
  "motivation_only",
  "outsourcing_judgment",
] as const;

export type Bottleneck = (typeof BOTTLENECKS)[number];

// Short human label for UI chips.
export const BOTTLENECK_LABELS: Record<Bottleneck, string> = {
  flat_terrain: "Flat terrain",
  fear_of_shipping: "Fear of shipping",
  no_idea: "No idea",
  motivation_only: "Motivation only",
  outsourcing_judgment: "Outsourcing judgment",
};

// The phrase dropped into the prediction template: "Your wall is [wall]."
export const BOTTLENECK_WALL: Record<Bottleneck, string> = {
  flat_terrain:
    "flat terrain — every build stage feels equally urgent and equally hard, so you can't see which lever to pull first",
  fear_of_shipping:
    "fear of shipping — the work is ready enough but putting it in front of someone real keeps getting deferred",
  no_idea:
    "no idea — there is no concrete thing being built yet, only the intention to build",
  motivation_only:
    "motivation only — the energy is there but it isn't attached to a specific next action",
  outsourcing_judgment:
    "outsourcing judgment — you're trying to hand off the decisions that are the actual product, not just the labor",
};

// Definitions handed to the Bottleneck Mapper so it picks from a fixed taxonomy.
export const BOTTLENECK_DESCRIPTIONS: Record<Bottleneck, string> = {
  flat_terrain:
    "The builder holds every stage at equal weight (setup, agents, iteration, custom model all feel equally urgent and hard) and can't see the time/cost/scale tradeoff inside each stage. No levers visible, so they freeze.",
  fear_of_shipping:
    "The builder has something workable but avoids exposing it to a real user. The block is emotional exposure, not missing knowledge or unclear priorities.",
  no_idea:
    "The builder has no concrete product or scope yet — only a desire to build something. There is nothing partly-built to diagnose.",
  motivation_only:
    "The builder has drive and enthusiasm but no specific actionable next step. The energy is unattached to any concrete stage of work.",
  outsourcing_judgment:
    "The builder wants to delegate the core judgment calls of the product itself (not just implementation labor), turning themselves into a buyer of their own product instead of its builder.",
};
