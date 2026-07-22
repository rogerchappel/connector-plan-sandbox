import { readFile } from "node:fs/promises";

const APPROVAL_ORDER = ["none", "ask", "explicit", "blocked"];

export async function loadJson(path) {
  const raw = await readFile(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error.message}`);
  }
}

export function evaluatePlan(plan, policy) {
  if (!Array.isArray(plan.actions)) throw new Error("Plan must include an actions array.");
  if (!policy || typeof policy !== "object") throw new Error("Policy must be an object.");
  validatePolicyApprovals(policy);

  const actions = plan.actions.map((action, index) => evaluateAction(action, index, policy));
  const blockers = actions.flatMap((action) => action.blockers.map((blocker) => ({ actionId: action.id, ...blocker })));
  const approval = highestApproval(actions.map((action) => action.approval));
  const sensitiveFields = [...new Set(actions.flatMap((action) => action.sensitiveFields))].sort();

  return {
    connector: plan.connector || policy.connector || "unknown",
    requestId: plan.requestId || "unknown-request",
    actionCount: actions.length,
    approval,
    blocked: blockers.length > 0,
    sensitiveFields,
    actions,
    blockers,
    summary: buildSummary(actions, blockers, approval)
  };
}

function validatePolicyApprovals(policy) {
  if (policy.defaultApproval !== undefined) {
    validateApproval(policy.defaultApproval, "Policy defaultApproval");
  }

  for (const [resource, resourcePolicy] of Object.entries(policy.resources || {})) {
    if (resourcePolicy?.approval !== undefined) {
      validateApproval(resourcePolicy.approval, `Policy approval for resource ${resource}`);
    }
  }
}

function validateApproval(approval, label) {
  if (!APPROVAL_ORDER.includes(approval)) {
    throw new Error(`${label} must be one of: ${APPROVAL_ORDER.join(", ")}.`);
  }
}

export function renderMarkdown(receipt) {
  const lines = [
    `# Connector Dry-Run Receipt: ${receipt.requestId}`,
    "",
    `Connector: ${receipt.connector}`,
    `Actions: ${receipt.actionCount}`,
    `Approval: ${receipt.approval}`,
    `Blocked: ${receipt.blocked ? "yes" : "no"}`,
    ""
  ];

  lines.push("## Actions", "");
  for (const action of receipt.actions) {
    lines.push(`- ${action.id}: ${action.operation} ${action.resource} - ${action.approval}`);
    if (action.sensitiveFields.length) lines.push(`  Sensitive fields: ${action.sensitiveFields.join(", ")}`);
    for (const blocker of action.blockers) lines.push(`  Blocker: ${blocker.reason}`);
  }
  if (!receipt.actions.length) lines.push("- None recorded.");
  lines.push("");

  lines.push("## Summary", "", receipt.summary, "");
  if (receipt.blockers.length) {
    lines.push("## Blockers", "");
    for (const blocker of receipt.blockers) lines.push(`- ${blocker.actionId}: ${blocker.reason}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function renderJson(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

function evaluateAction(action, index, policy) {
  if (!action || typeof action !== "object") throw new Error(`Action ${index} must be an object.`);
  const id = action.id || `action-${index + 1}`;
  const operation = action.operation || "unknown";
  const resource = action.resource || "unknown";
  const resourcePolicy = policy.resources?.[resource] || null;
  const blockers = blockedByPolicy(operation, resource, policy);

  if (!resourcePolicy) {
    blockers.push({ reason: `Resource is not present in policy fixture: ${resource}` });
  } else if (!resourcePolicy.operations?.includes(operation)) {
    blockers.push({ reason: `Operation ${operation} is not allowed for ${resource}` });
  }

  const fields = Array.isArray(action.fields) ? action.fields : [];
  const sensitiveFields = fields.filter((field) => resourcePolicy?.sensitiveFields?.includes(field));
  const approval = blockers.length ? "blocked" : resourcePolicy?.approval || policy.defaultApproval || "ask";

  return {
    id,
    operation,
    resource,
    description: action.description || "",
    fields,
    sensitiveFields,
    approval,
    blockers
  };
}

function blockedByPolicy(operation, resource, policy) {
  return (policy.blocked || [])
    .filter((rule) => (rule.operation === operation || rule.operation === "*") && (rule.resource === resource || rule.resource === "*"))
    .map((rule) => ({ reason: rule.reason || "Blocked by policy fixture." }));
}

function highestApproval(values) {
  return values.reduce((highest, value) => {
    return APPROVAL_ORDER.indexOf(value) > APPROVAL_ORDER.indexOf(highest) ? value : highest;
  }, "none");
}

function buildSummary(actions, blockers, approval) {
  if (blockers.length) return `${blockers.length} blocker(s) must be resolved before any live connector use.`;
  const writes = actions.filter((action) => action.operation === "write").length;
  const reads = actions.filter((action) => action.operation === "read").length;
  return `${reads} read action(s), ${writes} write action(s), approval mode ${approval}.`;
}
