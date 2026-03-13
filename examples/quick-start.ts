import { createPicker, fromModelsDev, Purpose } from "pickai";

const pick = await createPicker(fromModelsDev());

// Find the 10 cheapest models
const cheap = pick.find({ sort: "costAsc", limit: 10 });

// Recommend the best model for coding
const [best] = pick.recommend(Purpose.Coding);
console.log(best.id, best.score);
