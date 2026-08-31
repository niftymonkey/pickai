// One model, one key: the form two ids are compared in.

const DATE_SUFFIX = /-\d{8}$/;
const SEPARATORS = /[\s.]+/g;

const normalizeModelId = (modelId: string): string => {
  const withoutSellerPath = modelId.slice(modelId.lastIndexOf("/") + 1);
  const withoutVariant = withoutSellerPath.split(":")[0];
  const hyphenated = withoutVariant.replace(SEPARATORS, "-");
  return hyphenated.replace(DATE_SUFFIX, "").toLowerCase();
};

export { normalizeModelId };
