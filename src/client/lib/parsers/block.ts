import type { BlockModel, BlockItem, BlockArrow } from "./types";

export function parseBlock(source: string): BlockModel {
  const lines = source.split("\n");
  let columns = 1;
  const blocks: BlockItem[] = [];
  const arrows: BlockArrow[] = [];
  let arrowCount = 0;
  const blockStack: BlockItem[][] = [blocks];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // columns N
    const colM = line.match(/^columns\s+(\d+)$/);
    if (colM) { columns = Number(colM[1]); continue; }

    // end of nested block
    if (line === "end") {
      if (blockStack.length > 1) blockStack.pop();
      continue;
    }

    // Arrow: id1 --> id2 or id1 --> "label" --> id2
    const arrowM = line.match(/^(\w+)\s*(-->|---)\s*(?:"([^"]+)"\s*-->?\s*)?(\w+)$/);
    if (arrowM) {
      arrows.push({ id: `ba-${arrowCount++}`, source: arrowM[1], target: arrowM[4], label: arrowM[3] });
      continue;
    }

    // Block with label and span: id["label"]:span  or  id["label"]
    const blockM = line.match(/^(\w+)(?:\["([^"]+)"\])?(?::(\d+))?$/);
    if (blockM) {
      const item: BlockItem = {
        id: blockM[1],
        label: blockM[2] || blockM[1],
        span: blockM[3] ? Number(blockM[3]) : 1,
        children: [],
      };
      blockStack[blockStack.length - 1].push(item);
      continue;
    }

    // Nested block start: block:id or block
    const nestedM = line.match(/^block(?::(\w+))?$/);
    if (nestedM) {
      const item: BlockItem = {
        id: nestedM[1] || `block-${i}`,
        label: nestedM[1] || "",
        span: 1,
        children: [],
      };
      blockStack[blockStack.length - 1].push(item);
      blockStack.push(item.children);
    }
  }

  return { type: "block-beta", columns, blocks, arrows, rawLines: lines };
}
