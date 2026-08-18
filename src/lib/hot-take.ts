export interface HotTakePrompt {
  id: string;
  statement: string;
}

export const HOT_TAKE_PROMPTS: HotTakePrompt[] = [
  { id: "small-talk", statement: "Small talk is underrated." },
  { id: "text-first", statement: "It's fine to text first." },
  { id: "astrology", statement: "Astrology says something real about people." },
  { id: "remote-work", statement: "Remote work makes people worse coworkers." },
  { id: "true-crime", statement: "It's a little unhinged how much people enjoy true crime podcasts." },
];
