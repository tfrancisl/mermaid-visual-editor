import type { StateModel, StateNode, StateTransition } from "./types";

export function parseState(source: string): StateModel {
  const lines = source.split("\n");
  const stateMap = new Map<string, StateNode>();
  const transitions: StateTransition[] = [];
  let transCount = 0;
  let hasCompositeStates = false;

  const ensureState = (id: string): StateNode => {
    if (id === "[*]") {
      // Start/end markers — create unique nodes per context
      if (!stateMap.has(id)) stateMap.set(id, { id, kind: "start" });
      return stateMap.get(id)!;
    }
    if (!stateMap.has(id)) stateMap.set(id, { id, kind: "normal" });
    return stateMap.get(id)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%") || line === "end" || line === "{" || line === "}") continue;

    // Concurrency divider --
    if (line === "--") {
      hasCompositeStates = true;
      continue;
    }

    // State label: state "Label" as StateName
    const slm = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)$/);
    if (slm) {
      const node = ensureState(slm[2]);
      node.label = slm[1];
      continue;
    }

    // Nested state block: state "X" { or state X {
    const nestedM = line.match(/^state\s+(?:"[^"]+"|[\w-]+)\s*\{/);
    if (nestedM) {
      hasCompositeStates = true;
      continue;
    }

    // Choice/fork/join markers: state Name <<choice>>
    const choiceM = line.match(/^state\s+(\w+)\s+<<(choice|fork|join)>>$/);
    if (choiceM) {
      const node = ensureState(choiceM[1]);
      node.kind = choiceM[2] as "choice" | "fork" | "join";
      if (choiceM[2] === "fork" || choiceM[2] === "join") hasCompositeStates = true;
      continue;
    }

    // Composite state block: state "Label" { or state Name {
    if (line.match(/^state\s+(?:"[^"]+"|[\w-]+)\s*\{/)) {
      hasCompositeStates = true;
    }

    // Concurrency divider inside composite state
    if (line === "--") {
      hasCompositeStates = true;
    }

    // Skip other state declarations (e.g. "state Name {")
    if (line.startsWith("state ")) continue;

    // Transition: State1 --> State2 : label (supports [*] start/end markers)
    const tm = line.match(/^(\[\*\]|[\w-]+)\s*-->\s*(\[\*\]|[\w-]+)\s*(?::\s*(.+))?$/);
    if (tm) {
      const srcId = tm[1];
      const tgtId = tm[2];
      ensureState(srcId);
      const tgtNode = ensureState(tgtId);
      // If target is [*], mark as end
      if (tgtId === "[*]") tgtNode.kind = "end";
      transitions.push({
        id: `t-${transCount++}`,
        source: srcId,
        target: tgtId,
        label: tm[3]?.trim(),
      });
      continue;
    }
  }

  return { type: "stateDiagram-v2", states: [...stateMap.values()], transitions, hasCompositeStates: hasCompositeStates || undefined, rawLines: lines };
}
