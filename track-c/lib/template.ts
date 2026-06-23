// The user-facing prediction is assembled by code. The model never emits the
// final sentence freeform — it only fills X and Y.

export function assemblePrediction(wall: string, x: string, y: string): string {
  return `Your wall is ${wall}. You will next try ${x}. If instead you do ${y}, this diagnosis is wrong.`;
}
