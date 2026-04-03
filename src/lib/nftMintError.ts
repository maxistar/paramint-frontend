type TransactionPlanLike = {
  error?: unknown;
  kind?: string;
  plans?: unknown[];
  status?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (!isRecord(error)) {
    return null;
  }

  const message = error.message;

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return null;
}

function getTransactionPlanResult(error: unknown): TransactionPlanLike | null {
  if (!isRecord(error)) {
    return null;
  }

  const direct = error.transactionPlanResult;

  if (isRecord(direct)) {
    return direct as TransactionPlanLike;
  }

  const context = error.context;

  if (!isRecord(context)) {
    return null;
  }

  const nested = context.transactionPlanResult;

  return isRecord(nested) ? (nested as TransactionPlanLike) : null;
}

function getFirstFailedPlan(plan: TransactionPlanLike): TransactionPlanLike | null {
  if (plan.kind === "single" && plan.status === "failed") {
    return plan;
  }

  if (!Array.isArray(plan.plans)) {
    return null;
  }

  for (const child of plan.plans) {
    if (!isRecord(child)) {
      continue;
    }

    const failed = getFirstFailedPlan(child as TransactionPlanLike);

    if (failed) {
      return failed;
    }
  }

  return null;
}

function getSimulationLogs(error: unknown): string[] {
  if (!isRecord(error)) {
    return [];
  }

  const logs = error.logs;

  if (Array.isArray(logs)) {
    return logs.filter((entry): entry is string => typeof entry === "string");
  }

  const context = error.context;

  if (!isRecord(context) || !Array.isArray(context.logs)) {
    return [];
  }

  return context.logs.filter((entry): entry is string => typeof entry === "string");
}

export function formatNftMintError(error: unknown): string {
  const rootMessage = getErrorMessage(error);
  const planResult = getTransactionPlanResult(error);
  const failedPlan = planResult ? getFirstFailedPlan(planResult) : null;
  const nestedError = failedPlan?.error;
  const nestedMessage = getErrorMessage(nestedError);
  const logs = getSimulationLogs(nestedError);
  const details: string[] = [];

  if (nestedMessage && nestedMessage !== rootMessage) {
    details.push(nestedMessage);
  }

  if (logs.length > 0) {
    details.push(logs.slice(-2).join(" | "));
  }

  if (rootMessage && rootMessage.includes("failed to execute")) {
    return details.length > 0
      ? `Minting failed: ${details.join(" ")}`
      : "Minting failed while executing the transaction plan.";
  }

  if (rootMessage) {
    return details.length > 0 && !rootMessage.includes(details[0] ?? "")
      ? `${rootMessage} ${details.join(" ")}`
      : rootMessage;
  }

  if (details.length > 0) {
    return `Minting failed: ${details.join(" ")}`;
  }

  return "Minting failed unexpectedly.";
}
