import { expect, test } from "vitest";
import { formatCutoff, formatPrice, formatReleased, formatTokens } from "../format";

test("a price under ten dollars shows cents", () => {
  expect(formatPrice(0.25)).toBe("$0.25");
  expect(formatPrice(3.5)).toBe("$3.50");
  expect(formatPrice(0)).toBe("$0.00");
});
test("a price of ten dollars or more shows whole dollars", () => {
  expect(formatPrice(15)).toBe("$15");
  expect(formatPrice(10)).toBe("$10");
  expect(formatPrice(75)).toBe("$75");
});
test("token counts under a million show K, at or above show M, no trailing zero decimal", () => {
  expect(formatTokens(32_000)).toBe("32K");
  expect(formatTokens(200_000)).toBe("200K");
  expect(formatTokens(1_000_000)).toBe("1M");
  expect(formatTokens(1_500_000)).toBe("1.5M");
  expect(formatTokens(32_768)).toBe("32.8K");
});
test("token counts of 999,500 and above render 1M, never 1000K", () => {
  expect(formatTokens(999_500)).toBe("1M");
  expect(formatTokens(999_950)).toBe("1M");
  expect(formatTokens(999_499)).toBe("999.5K");
});
test("a release date renders as month and year", () => {
  expect(formatReleased("2025-09-29")).toBe("Sep 2025");
  expect(formatReleased("2024-01-04")).toBe("Jan 2024");
  expect(formatReleased("2023-12-15")).toBe("Dec 2023");
});
test("a knowledge cutoff renders as month and year", () => {
  expect(formatCutoff("2024-06")).toBe("Jun 2024");
  expect(formatCutoff("2025-03")).toBe("Mar 2025");
});
