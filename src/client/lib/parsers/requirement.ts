import type { RequirementModel, Requirement, ReqElement, ReqRelation } from "./types";

export function parseRequirement(source: string): RequirementModel {
  const lines = source.split("\n");
  const requirements: Requirement[] = [];
  const elements: ReqElement[] = [];
  const relations: ReqRelation[] = [];

  let blockType: "requirement" | "element" | null = null;
  let currentReq: Partial<Requirement> = {};
  let currentElem: Partial<ReqElement> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;

    // Requirement block start: requirementType "Name" {
    const reqM = line.match(/^(\w+(?:Requirement)?)\s+"([^"]+)"\s*\{$/);
    if (reqM && !line.startsWith("element")) {
      blockType = "requirement";
      currentReq = { kind: reqM[1], name: reqM[2], id: "", text: "", risk: "Low", verifyMethod: "Analysis" };
      continue;
    }

    // Element block start: element "Name" {
    const elemM = line.match(/^element\s+"([^"]+)"\s*\{$/);
    if (elemM) {
      blockType = "element";
      currentElem = { name: elemM[1], type: "" };
      continue;
    }

    if (line === "}") {
      if (blockType === "requirement" && currentReq.name) {
        requirements.push(currentReq as Requirement);
      } else if (blockType === "element" && currentElem.name) {
        elements.push(currentElem as ReqElement);
      }
      blockType = null;
      continue;
    }

    if (blockType === "requirement") {
      const idM = line.match(/^id:\s*"?([^"]+)"?$/);
      if (idM) { currentReq.id = idM[1].trim(); continue; }
      const textM = line.match(/^text:\s*"?([^"]+)"?$/);
      if (textM) { currentReq.text = textM[1].trim(); continue; }
      const riskM = line.match(/^risk:\s*(\w+)$/);
      if (riskM) { currentReq.risk = riskM[1] as Requirement["risk"]; continue; }
      const vmM = line.match(/^verifymethod:\s*(\w+)$/i);
      if (vmM) { currentReq.verifyMethod = vmM[1] as Requirement["verifyMethod"]; continue; }
    }

    if (blockType === "element") {
      const typeM = line.match(/^type:\s*"?([^"]+)"?$/);
      if (typeM) { currentElem.type = typeM[1].trim(); continue; }
      const drM = line.match(/^docRef:\s*"?([^"]+)"?$/);
      if (drM) { currentElem.docRef = drM[1].trim(); continue; }
    }

    // Relations: source - type -> target
    const relM = line.match(/^(\w+)\s*-\s*(contains|copies|derives|satisfies|verifies|refines|traces)\s*->\s*(\w+)$/);
    if (relM) {
      relations.push({
        source: relM[1],
        target: relM[3],
        type: relM[2] as ReqRelation["type"],
      });
    }
  }

  return { type: "requirementDiagram", requirements, elements, relations, rawLines: lines };
}
