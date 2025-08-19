// src/utils/frontendUrl.ts

/**
 * Returns the correct frontend URL for the context.
 * @param {"main"|"dashboard"} context - Which frontend to use
 * @returns {string}
 */
export function getFrontendUrl(context: "main" | "dashboard" = "main"): string {
  if (context === "dashboard") {
    return process.env.DASHBOARD_URL || "http://localhost:3002";
  }
  return process.env.FRONTEND_URL || "http://localhost:3000";
}
