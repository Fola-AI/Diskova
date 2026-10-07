"use server";

import { ZodError } from "zod";

import { getSession } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { ISSUE_REPORT_CONFIRMATION } from "@/lib/safety/copy";
import { IssueReportError, submitIssueReport } from "@/lib/services/issue-reports";
import { fieldErrors } from "@/lib/validation/auth";

export async function submitIssueReportAction(input: unknown): Promise<{ ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  try {
    const session = await getSession();
    const { ip } = await requestMeta();
    await submitIssueReport(session, input, { ip });
    return { ok: true, message: ISSUE_REPORT_CONFIRMATION };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
    if (err instanceof IssueReportError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
