import type { Debrief } from "@/domain/coaching";
import type { Turn } from "@/domain/session";

export type CounterpartLineByTurnId = Readonly<
  Record<string, string | undefined>
>;

export function buildCounterpartLineByTurnId(
  debrief: Debrief,
  transcript: readonly Turn[],
  openingLine: string,
): CounterpartLineByTurnId {
  const counterpartLines: Record<string, string | undefined> = {};

  for (const moment of debrief.moments) {
    const managerTurnIndex = transcript.findIndex(
      (turn) => turn.id === moment.turnId,
    );
    const managerTurn = transcript[managerTurnIndex];

    if (!managerTurn || managerTurn.speaker !== "manager") {
      continue;
    }

    if (managerTurnIndex === 0) {
      counterpartLines[moment.turnId] = openingLine;
      continue;
    }

    const precedingTurn = transcript[managerTurnIndex - 1];
    if (precedingTurn?.speaker === "counterpart") {
      counterpartLines[moment.turnId] = precedingTurn.text;
    }
  }

  return counterpartLines;
}
