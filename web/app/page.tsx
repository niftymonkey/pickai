import { DecisionSurface } from "@/components/decision-surface";
import { loadRated } from "@/lib/load-rated";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { models, source } = await loadRated();
  return <DecisionSurface models={models} source={source} />;
}
