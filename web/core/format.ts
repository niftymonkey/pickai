// Display formatters for catalog values.

const formatPrice = (perM: number): string =>
  perM >= 10 ? `$${Math.round(perM)}` : `$${perM.toFixed(2)}`;

const withOneDecimalAtMost = (scaled: number): string => {
  const rounded = Math.round(scaled * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

// From 999,500 the K form would round toward "1000K", so the M form takes over there.
const formatTokens = (n: number): string =>
  n >= 999_500
    ? `${withOneDecimalAtMost(n / 1_000_000)}M`
    : `${withOneDecimalAtMost(n / 1_000)}K`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthAndYear = (year: string, month: string): string =>
  `${MONTHS[Number(month) - 1]} ${year}`;

const formatReleased = (iso: string): string => {
  const [year, month] = iso.split("-");
  return monthAndYear(year, month);
};

const formatCutoff = (ym: string): string => {
  const [year, month] = ym.split("-");
  return monthAndYear(year, month);
};

export { formatPrice, formatTokens, formatReleased, formatCutoff };
