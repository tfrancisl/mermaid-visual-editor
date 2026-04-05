import type { ClassModel, ClassNode, ClassRelation, ClassRelationType, ClassVisibility, ClassMember, ClassMethod } from "./types";

const CLASS_RELATION_RE = /^(\w+)\s+(?:"([^"]+)"\s+)?(<\|--|<\|\.\.|\*--|\*\.\.|o--|o\.\.|<--|<\.\.|--|\.\.)\s+(?:"([^"]+)"\s+)?(\w+)\s*(?::\s*(.+))?$/;
const CLASS_RELATION_RE2 = /^(\w+)\s+(?:"([^"]+)"\s+)?(--\|>|\.\.\|>|--\*|\.\.\*|--o|\.\.o|-->|\.\.>|--|\.\.)(?:\s+"([^"]+)")?\s+(\w+)\s*(?::\s*(.+))?$/;

function classRelType(arrow: string): ClassRelationType {
  if (arrow.includes("<|") || arrow.includes("|>")) return arrow.includes("..") ? "realization" : "inheritance";
  if (arrow.includes("*")) return "composition";
  if (arrow.includes("o")) return "aggregation";
  if (arrow.includes("..")) return "dependency";
  return "association";
}

function parseClassMember(line: string): { member?: ClassMember; method?: ClassMethod } {
  const t = line.trim();
  const vis = ("+-#~".includes(t[0]) ? t[0] : "") as ClassVisibility;
  const rest = vis ? t.slice(1).trim() : t;

  // Method: name(params) returnType  or  name(params)
  const mm = rest.match(/^(\w+)\(([^)]*)\)\s*(.*)$/);
  if (mm) {
    return { method: { visibility: vis, name: mm[1], params: mm[2].trim(), returnType: mm[3].trim() } };
  }

  // Member: Type name  or  name
  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return { member: { visibility: vis, type: parts[0], name: parts.slice(1).join(" ") } };
  }
  return { member: { visibility: vis, type: "", name: rest } };
}

export function parseClass(source: string): ClassModel {
  const lines = source.split("\n");
  const classMap = new Map<string, ClassNode>();
  const relations: ClassRelation[] = [];
  let currentClass: ClassNode | null = null;
  let braceDepth = 0;
  let seenEdge = 0;

  const ensureClass = (id: string): ClassNode => {
    if (!classMap.has(id)) classMap.set(id, { id, members: [], methods: [] });
    return classMap.get(id)!;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Inside a class block
    if (currentClass && braceDepth > 0) {
      if (line === "}") {
        braceDepth--;
        if (braceDepth === 0) currentClass = null;
        continue;
      }
      if (line.startsWith("<<") && line.endsWith(">>")) {
        currentClass.annotation = line.slice(2, -2).trim();
        continue;
      }
      const { member, method } = parseClassMember(line);
      if (method) currentClass.methods.push(method);
      else if (member) currentClass.members.push(member);
      continue;
    }

    // Class block start: class ClassName { or class ClassName
    const classM = line.match(/^class\s+(\w+)(?:\s*\{)?$/);
    if (classM) {
      currentClass = ensureClass(classM[1]);
      if (line.endsWith("{")) braceDepth = 1;
      continue;
    }

    // Class with label: class ClassName["Label"]
    const classLabelM = line.match(/^class\s+(\w+)\s*\["([^"]+)"\]\s*(?:\{)?$/);
    if (classLabelM) {
      currentClass = ensureClass(classLabelM[1]);
      currentClass.label = classLabelM[2];
      if (line.endsWith("{")) braceDepth = 1;
      continue;
    }

    // Annotation: <<annotation>> ClassName
    const annM = line.match(/^<<(\w+)>>\s+(\w+)$/);
    if (annM) {
      ensureClass(annM[2]).annotation = annM[1];
      continue;
    }

    // Relations (arrow left): src "srcCard" arrow "tgtCard" tgt : label
    // Groups: 1=source, 2=sourceCardinality?, 3=arrow, 4=targetCardinality?, 5=target, 6=label?
    const rm = line.match(CLASS_RELATION_RE);
    if (rm) {
      ensureClass(rm[1]);
      ensureClass(rm[5]);
      relations.push({
        id: `rel-${seenEdge++}`,
        source: rm[1],
        target: rm[5],
        type: classRelType(rm[3]),
        label: rm[6]?.trim(),
        sourceCardinality: rm[2] || undefined,
        targetCardinality: rm[4] || undefined,
      });
      continue;
    }

    // Relations (arrow right): src "srcCard" arrow "tgtCard" tgt : label
    // Groups: 1=source, 2=sourceCardinality?, 3=arrow, 4=targetCardinality?, 5=target, 6=label?
    const rm2 = line.match(CLASS_RELATION_RE2);
    if (rm2 && rm2[5]) {
      ensureClass(rm2[1]);
      ensureClass(rm2[5]);
      relations.push({
        id: `rel-${seenEdge++}`,
        source: rm2[1],
        target: rm2[5],
        type: classRelType(rm2[3]),
        label: rm2[6]?.trim(),
        sourceCardinality: rm2[2] || undefined,
        targetCardinality: rm2[4] || undefined,
      });
      continue;
    }

    // Inline member: ClassName : +method() void
    const inlineM = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (inlineM) {
      const cls = ensureClass(inlineM[1]);
      const { member, method } = parseClassMember(inlineM[2]);
      if (method) cls.methods.push(method);
      else if (member) cls.members.push(member);
    }
  }

  return { type: "classDiagram", classes: [...classMap.values()], relations, rawLines: lines };
}
