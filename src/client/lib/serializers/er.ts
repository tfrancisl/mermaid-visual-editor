import type { ERModel } from "../parsers/types";

function erCardStr(c: string): string {
  switch (c) {
    case "||": return "||";
    case "|{": return "|{";
    case "o|": return "o|";
    case "o{": return "o{";
    default:   return "||";
  }
}

export function serializeER(model: ERModel): string {
  const lines = ["erDiagram"];

  for (const r of model.relations) {
    const connector = r.identifying === false ? ".." : "--";
    lines.push(`    ${r.entityA} ${erCardStr(r.cardA)}${connector}${erCardStr(r.cardB)} ${r.entityB} : ${r.label}`);
  }

  for (const ent of model.entities) {
    if (ent.attributes.length === 0) continue;
    lines.push(`    ${ent.name} {`);
    for (const a of ent.attributes) {
      const parts = [a.type, a.name];
      if (a.key) parts.push(a.key);
      if (a.comment) parts.push(`"${a.comment}"`);
      lines.push(`        ${parts.join(" ")}`);
    }
    lines.push(`    }`);
  }

  return lines.join("\n");
}
