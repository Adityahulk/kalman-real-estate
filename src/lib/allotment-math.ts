const SHARE_TOTAL = 100;
const SHARE_EPSILON = 0.0001;

export type JointShareSplit = {
  primary: number;
  joint: number;
  total: number;
  valid: boolean;
  message: string | null;
};

export function parseSharePercentage(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("%", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveJointShareSplit(input: {
  jointAllotteeName: string;
  primaryShare: unknown;
  jointShare: unknown;
}): JointShareSplit {
  if (!input.jointAllotteeName.trim()) {
    return { primary: SHARE_TOTAL, joint: 0, total: SHARE_TOTAL, valid: true, message: null };
  }

  let primary = parseSharePercentage(input.primaryShare);
  let joint = parseSharePercentage(input.jointShare);

  // Preserve older 50/50 records and safely infer the missing side when only one share was stored.
  if (primary === null && joint === null) {
    primary = 50;
    joint = 50;
  } else if (primary === null && joint !== null) {
    primary = SHARE_TOTAL - joint;
  } else if (joint === null && primary !== null) {
    joint = SHARE_TOTAL - primary;
  }

  primary ??= 0;
  joint ??= 0;
  const total = primary + joint;

  if (!hasAtMostTwoDecimalPlaces(primary) || !hasAtMostTwoDecimalPlaces(joint)) {
    return {
      primary,
      joint,
      total,
      valid: false,
      message: "Share percentages can have at most two decimal places.",
    };
  }

  if (primary <= 0 || joint <= 0) {
    return {
      primary,
      joint,
      total,
      valid: false,
      message: "Each joint allottee must have a share greater than 0%.",
    };
  }
  if (primary >= SHARE_TOTAL || joint >= SHARE_TOTAL) {
    return {
      primary,
      joint,
      total,
      valid: false,
      message: "Each joint allottee's share must be less than 100%.",
    };
  }
  if (Math.abs(total - SHARE_TOTAL) > SHARE_EPSILON) {
    return {
      primary,
      joint,
      total,
      valid: false,
      message: `Joint allottee shares must total exactly 100%. Current total: ${formatShareNumber(total)}%.`,
    };
  }

  return { primary, joint, total, valid: true, message: null };
}

export function formatShareNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatSharePercentage(value: number) {
  return `${formatShareNumber(value)}%`;
}

function hasAtMostTwoDecimalPlaces(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < SHARE_EPSILON;
}
