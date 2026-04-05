import type { BlockModel, BlockItem } from "../parsers/types";

function serializeBlockItem(item: BlockItem, indent: number, lines: string[]) {
  const pad = " ".repeat(indent);
  if (item.children.length > 0) {
    lines.push(`${pad}block:${item.id}`);
    for (const child of item.children) {
      serializeBlockItem(child, indent + 4, lines);
    }
    lines.push(`${pad}end`);
  } else {
    const spanStr = item.span > 1 ? `:${item.span}` : "";
    lines.push(`${pad}${item.id}["${item.label}"]${spanStr}`);
  }
}

export function serializeBlock(model: BlockModel): string {
  const lines = ["block-beta"];
  if (model.columns > 1) lines.push(`    columns ${model.columns}`);

  for (const b of model.blocks) {
    serializeBlockItem(b, 4, lines);
  }

  for (const a of model.arrows) {
    const label = a.label ? ` "${a.label}" -->` : "";
    lines.push(`    ${a.source} -->${label} ${a.target}`);
  }

  return lines.join("\n");
}
