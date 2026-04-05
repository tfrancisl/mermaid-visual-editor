import type { ERModel, EREntity, ERAttribute, ERCardinality, ERRelation } from "./types";

function parseERCardinality(s: string): ERCardinality {
  switch (s) {
    case "||": return "||";
    case "o|": case "|o": return "o|";
    case "|{": case "}|": return "|{";
    case "o{": case "}o": return "o{";
    default: return "||";
  }
}

export function parseER(source: string): ERModel {
  const lines = source.split("\n");
  const entityMap = new Map<string, EREntity>();
  const relations: ERRelation[] = [];
  let currentEntity: EREntity | null = null;
  let braceDepth = 0;
  let relCount = 0;

  const ensureEntity = (name: string): EREntity => {
    if (!entityMap.has(name)) entityMap.set(name, { name, attributes: [] });
    return entityMap.get(name)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Inside entity block
    if (currentEntity && braceDepth > 0) {
      if (line === "}") {
        braceDepth--;
        if (braceDepth === 0) currentEntity = null;
        continue;
      }
      // Attribute: type name PK|FK|UK "comment"
      const am = line.match(/^(\w+)\s+(\w+)\s*(?:(PK|FK|UK))?\s*(?:"([^"]*)")?$/);
      if (am) {
        currentEntity.attributes.push({
          type: am[1],
          name: am[2],
          key: (am[3] as ERAttribute["key"]) || "",
          comment: am[4],
        });
      }
      continue;
    }

    // Entity block start: ENTITY_NAME {
    const entityM = line.match(/^(\w+)\s*\{$/);
    if (entityM) {
      currentEntity = ensureEntity(entityM[1]);
      braceDepth = 1;
      continue;
    }

    // Relationship: ENTITY_A ||--o{ ENTITY_B : label  (-- identifying, .. non-identifying)
    const relM = line.match(/^(\w+)\s+(\|[|o{]|o[|{]|}\||}o)(--|\.\.)(\|[|o{]|o[|{]|}\||}o)\s+(\w+)\s*:\s*(.+)$/);
    if (relM) {
      ensureEntity(relM[1]);
      ensureEntity(relM[5]);
      relations.push({
        id: `er-${relCount++}`,
        entityA: relM[1],
        entityB: relM[5],
        cardA: parseERCardinality(relM[2]),
        cardB: parseERCardinality(relM[4]),
        identifying: relM[3] !== "..",
        label: relM[6].trim(),
      });
    }
  }

  return { type: "erDiagram", entities: [...entityMap.values()], relations, rawLines: lines };
}
