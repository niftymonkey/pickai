// Who built the model. Inferred from the name, because the catalog does not carry it.

import { normalizeModelId } from "./normalizeModelId";

// Family tokens seen in the models.dev catalog, mapped to the maker behind them.
// Measured against the live catalog on 2026-08-31: 84% of model identities resolve.
const MAKER_BY_FAMILY: Record<string, string> = {
  anthropic: "anthropic",
  claude: "anthropic",
  openai: "openai",
  gpt: "openai",
  chatgpt: "openai",
  codex: "openai",
  davinci: "openai",
  babbage: "openai",
  whisper: "openai",
  sora: "openai",
  o1: "openai",
  o3: "openai",
  o4: "openai",
  google: "google",
  gemini: "google",
  gemma: "google",
  codegemma: "google",
  medgemma: "google",
  paligemma: "google",
  txgemma: "google",
  embeddinggemma: "google",
  imagen: "google",
  veo: "google",
  lyria: "google",
  palm: "google",
  bison: "google",
  medlm: "google",
  meta: "meta",
  llama: "meta",
  codellama: "meta",
  l3: "meta",
  l4: "meta",
  mistral: "mistral",
  mixtral: "mistral",
  ministral: "mistral",
  devstral: "mistral",
  codestral: "mistral",
  voxtral: "mistral",
  magistral: "mistral",
  pixtral: "mistral",
  alibaba: "alibaba",
  qwen: "alibaba",
  qwq: "alibaba",
  qvq: "alibaba",
  wan: "alibaba",
  tongyi: "alibaba",
  deepseek: "deepseek",
  xai: "xai",
  grok: "xai",
  zhipuai: "zhipuai",
  glm: "zhipuai",
  zai: "zhipuai",
  chatglm: "zhipuai",
  cogview: "zhipuai",
  cogvideo: "zhipuai",
  moonshotai: "moonshotai",
  moonshot: "moonshotai",
  kimi: "moonshotai",
  minimax: "minimax",
  abab: "minimax",
  bytedance: "bytedance",
  doubao: "bytedance",
  seed: "bytedance",
  seedance: "bytedance",
  seedream: "bytedance",
  skylark: "bytedance",
  nvidia: "nvidia",
  nemotron: "nvidia",
  cosmos: "nvidia",
  databricks: "databricks",
  dbrx: "databricks",
  xiaomi: "xiaomi",
  mimo: "xiaomi",
  cohere: "cohere",
  command: "cohere",
  aya: "cohere",
  amazon: "amazon",
  nova: "amazon",
  titan: "amazon",
  baidu: "baidu",
  ernie: "baidu",
  voyage: "voyageai",
  stepfun: "stepfun",
  step: "stepfun",
  kling: "kuaishou",
  kwai: "kuaishou",
  hermes: "nousresearch",
  nous: "nousresearch",
  recraft: "recraft",
  phi: "microsoft",
  mai: "microsoft",
  perplexity: "perplexity",
  sonar: "perplexity",
  tencent: "tencent",
  hunyuan: "tencent",
  hy: "tencent",
  hy3: "tencent",
  upstage: "upstage",
  solar: "upstage",
  ling: "inclusionai",
  ring: "inclusionai",
  flux: "blackforestlabs",
  ai21: "ai21",
  jamba: "ai21",
  ibm: "ibm",
  granite: "ibm",
  watsonx: "ibm",
  olmo: "allenai",
  molmo: "allenai",
  tulu: "allenai",
  yi: "01ai",
  snowflake: "snowflake",
  arctic: "snowflake",
  falcon: "tii",
  reka: "reka",
  exaone: "lg",
  sarvam: "sarvam",
  lfm: "liquid",
  inflection: "inflection",
  dolphin: "cognitivecomputations",
  arcee: "arcee",
  afm: "arcee",
  mercury: "inception",
  sensenova: "sensetime",
  sensechat: "sensetime",
  longcat: "longcat",
  bailing: "bailing",
  stablelm: "stability",
  openchat: "openchat",
  sakana: "sakana",
  poolside: "poolside",
  malibu: "poolside",
  tinker: "thinkingmachines",
  ideogram: "ideogram",
  elevenlabs: "elevenlabs",
  apertus: "swissai",
};

// A family token often carries its own version, as in "gemma4" or "qwen25". Two
// letter tokens are matched whole, because a prefix that short collides.
const PREFIX_FAMILIES = Object.keys(MAKER_BY_FAMILY).filter(
  (family) => family.length >= 3,
);

const makerOfToken = (token: string): string | null => {
  const exact = MAKER_BY_FAMILY[token];
  if (exact) {
    return exact;
  }
  const prefix = PREFIX_FAMILIES.find((family) => token.startsWith(family));
  return prefix ? MAKER_BY_FAMILY[prefix] : null;
};

const makerOfFirstResolvingToken = (tokens: string[]): string | null => {
  for (const token of tokens) {
    const maker = makerOfToken(token);
    if (maker) {
      return maker;
    }
  }
  return null;
};

// An entry whose family token is its maker's own name is an organization byline,
// not a model family. A byline in front is a reseller only when the very next
// token names a different maker's family: "databricks-claude-opus-4-7" is
// Anthropic's model resold, while "deepseek-r1-distill-llama-70b" is DeepSeek's
// own. Stripping the byline any wider is unsafe, because a maker's own name is
// usually the leading token of its own ids (issue #25).
const startsWithResellerByline = (tokens: string[]): boolean => {
  const [byline, family] = tokens;
  if (byline === undefined || family === undefined) return false;
  if (MAKER_BY_FAMILY[byline] !== byline) return false;
  const familyMaker = makerOfToken(family);
  return familyMaker !== null && familyMaker !== byline;
};

const modelMaker = (modelId: string): string | null => {
  const tokens = normalizeModelId(modelId).split("-");
  return makerOfFirstResolvingToken(startsWithResellerByline(tokens) ? tokens.slice(1) : tokens);
};

export { modelMaker };
