"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrontendUrl = getFrontendUrl;
/**
 * Returns the correct frontend URL for the context.
 * @param {"main"|"dashboard"} context - Which frontend to use
 * @returns {string}
 */
function getFrontendUrl(context = "main") {
    if (context === "dashboard") {
        return process.env.DASHBOARD_URL || "http://localhost:3002";
    }
    return process.env.FRONTEND_URL || "http://localhost:3000";
}
