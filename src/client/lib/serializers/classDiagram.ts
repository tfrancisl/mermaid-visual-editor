import type { ClassModel, ClassRelationType } from "../parsers/types";

function classRelArrow(type: ClassRelationType): string {
  switch (type) {
    case "inheritance":  return "<|--";
    case "composition":  return "*--";
    case "aggregation":  return "o--";
    case "dependency":   return "<..";
    case "realization":  return "<|..";
    default:             return "<--";
  }
}

export function serializeClass(model: ClassModel): string {
  const lines = ["classDiagram"];

  for (const cls of model.classes) {
    if (cls.members.length === 0 && cls.methods.length === 0 && !cls.annotation) continue;
    lines.push(`    class ${cls.id} {`);
    if (cls.annotation) lines.push(`        <<${cls.annotation}>>`);
    for (const m of cls.members) {
      lines.push(`        ${m.visibility}${m.type}${m.type ? " " : ""}${m.name}`);
    }
    for (const m of cls.methods) {
      lines.push(`        ${m.visibility}${m.name}(${m.params})${m.returnType ? " " + m.returnType : ""}`);
    }
    lines.push(`    }`);
  }

  for (const r of model.relations) {
    const label = r.label ? ` : ${r.label}` : "";
    const srcCard = r.sourceCardinality ? ` "${r.sourceCardinality}"` : "";
    const tgtCard = r.targetCardinality ? ` "${r.targetCardinality}"` : "";
    lines.push(`    ${r.source}${srcCard} ${classRelArrow(r.type)}${tgtCard} ${r.target}${label}`);
  }

  return lines.join("\n");
}
