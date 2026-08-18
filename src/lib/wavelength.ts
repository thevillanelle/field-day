export interface WavelengthPrompt {
  id: string;
  left: string;
  right: string;
}

export const WAVELENGTH_PROMPTS: WavelengthPrompt[] = [
  { id: "planned-chaotic", left: "Fully planned", right: "Fully chaotic" },
  { id: "recharge", left: "Recharges alone", right: "Recharges with people" },
  { id: "logic-feeling", left: "Leads with logic", right: "Leads with feeling" },
  { id: "night", left: "Quiet night in", right: "Loud night out" },
  { id: "time", left: "Lives in the past", right: "Lives in the future" },
];
