export function comparePlotCodes(first: string | null | undefined, second: string | null | undefined) {
  const left = normalizePlotCode(first);
  const right = normalizePlotCode(second);
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) return Number(left) - Number(right);
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortByPlotCode<T extends { code: string | null | undefined }>(items: T[]) {
  return [...items].sort((first, second) => comparePlotCodes(first.code, second.code));
}

function normalizePlotCode(value: string | null | undefined) {
  return String(value ?? "").trim();
}
