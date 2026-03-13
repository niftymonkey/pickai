import { createPicker, fromModelsDev, Purpose, perProvider, perFamily } from "pickai";

const pick = await createPicker(fromModelsDev());

// Get top 5 coding models, but at most 1 per provider
const diverse = pick.recommend(Purpose.Coding, {
  constraints: [perProvider(1)],
  limit: 5,
});

for (const model of diverse) {
  console.log(`${model.provider}/${model.id} — score: ${model.score.toFixed(3)}`);
}

// Combine constraints: max 1 per provider AND max 1 per family
const veryDiverse = pick.recommend(Purpose.Quality, {
  constraints: [perProvider(2), perFamily(1)],
  limit: 10,
});

console.log("Diverse picks:", veryDiverse.map((m) => `${m.family}/${m.id}`));
