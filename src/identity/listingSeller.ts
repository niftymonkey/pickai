// Who sells this listing. Read from the id, never guessed.

const listingSeller = (modelId: string): string | null => {
  const firstSlash = modelId.indexOf("/");
  return firstSlash === -1 ? null : modelId.slice(0, firstSlash);
};

export { listingSeller };
