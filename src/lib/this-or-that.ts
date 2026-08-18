export interface ThisOrThatPrompt {
  id: string;
  a: string;
  b: string;
}

export const THIS_OR_THAT_PROMPTS: ThisOrThatPrompt[] = [
  { id: "beach-mountains", a: "Beach", b: "Mountains" },
  { id: "texting-calling", a: "Texting", b: "Calling" },
  { id: "early-night", a: "Early bird", b: "Night owl" },
  { id: "planned-spontaneous", a: "Planned everything", b: "Fully spontaneous" },
  { id: "sweet-savory", a: "Sweet", b: "Savory" },
  { id: "book-movie", a: "The book", b: "The movie" },
  { id: "coffee-tea", a: "Coffee", b: "Tea" },
  { id: "big-party-small-group", a: "Big party", b: "Small group" },
  { id: "window-aisle", a: "Window seat", b: "Aisle seat" },
  { id: "dogs-cats", a: "Dogs", b: "Cats" },
  { id: "home-out", a: "Staying in", b: "Going out" },
  { id: "practical-sentimental", a: "Practical gift", b: "Sentimental gift" },
  { id: "silence-noise", a: "Total silence", b: "Background noise" },
  { id: "new-place-favorite", a: "Somewhere new", b: "Your favorite spot again" },
  { id: "list-vibes", a: "Make a list", b: "Go with the vibes" },
];
