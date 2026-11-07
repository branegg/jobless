import path from "node:path";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { events, inboxFindings } from "../src/db/schema";
import { applicationsToCheck, recordFindings } from "../src/lib/inbox/inbox";
import { addApplication, moveStage, recordFormStarted } from "../src/lib/tracker";

test.describe.configure({ mode: "serial" });

function withDb<T>(work: (db: ReturnType<typeof openDb>["db"]) => T): T {
  const { db, sqlite } = openDb(path.join(process.env.JOBLESSS_E2E_DIR!, "test.db"));
  try {
    return work(db);
  } finally {
    sqlite.close();
  }
}

function seed(company: string, messageId: string, extra = {}) {
  return withDb((db) => {
    const added = addApplication(db, { company, title: "Engineering Lead", stage: "saved" });
    if (!added.ok) throw new Error("expected new");
    recordFindings(db, applicationsToCheck(db), { findings: [{ applicationId: added.id, kind: "confirmation", confidence: "high", suspicious: false, messageId, emailDate: new Date().toISOString(), from: "no-reply@ashbyhq.com", subject: "Thanks for applying", quote: "We received your <b>application</b>.", ...extra }] }, false);
    return added.id;
  });
}

test("an update waits for your OK, shows plainly and moves the application when accepted", async ({ page }) => {
  seed("Email One", "m1");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Emails waiting for your OK: 1" }).getByRole("link", { name: "Email One" })).toHaveAttribute("href", "/email");
  await page.goto("/email");
  await expect(page.getByText("We received your <b>application</b>.")).toBeVisible();
  await expect(page.getByText("Every update waits for your OK.")).toBeVisible();
  await page.getByRole("button", { name: "Move to Submitted" }).click();
  await expect(page.getByText("Nothing waiting.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Earlier" }).getByText("Applied", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Engineering Lead at Email One" }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Submitted");
  await expect(page.getByText(/Email from no-reply@ashbyhq.com/)).toBeVisible();
  await expect(page.getByText("From the email check")).toBeVisible();
});

test("a suspicious email is flagged, and ignoring leaves the application alone", async ({ page }) => {
  seed("Email Two", "m2", { suspicious: true, kind: "rejection" });
  await page.goto("/email");
  await expect(page.getByText("text aimed at AI tools")).toBeVisible();
  await page.getByRole("button", { name: "Ignore" }).click();
  await expect(page.getByText("Nothing waiting.")).toBeVisible();
  await page.getByRole("link", { name: "Engineering Lead at Email Two" }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Saved");
});

test("automatic mode can be turned on and off", async ({ page }) => {
  await page.goto("/email");
  await page.getByRole("button", { name: "Apply clear updates automatically" }).click();
  await expect(page.getByText("Clear updates apply by themselves.")).toBeVisible();
  await page.getByRole("button", { name: "Ask me first again" }).click();
  await expect(page.getByText("Every update waits for your OK.")).toBeVisible();
});

test("Today asks about a form started days ago with no email found", async ({ page }) => {
  const id = withDb((db) => {
    const added = addApplication(db, { company: "Quiet Co", title: "CTO", stage: "packet_ready" });
    if (!added.ok) throw new Error("expected new");
    recordFormStarted(db, added.id);
    db.update(events).set({ at: new Date(Date.now() - 5 * 86_400_000) }).where(eq(events.applicationId, added.id)).run();
    return added.id;
  });
  await page.goto("/");
  const ask = page.getByRole("region", { name: "Did you send these?" });
  await expect(ask.getByRole("link", { name: "CTO at Quiet Co" })).toBeVisible();
  await ask.getByRole("button", { name: "Yes, I sent it" }).click();
  await expect(page.getByRole("region", { name: "Did you send these?" })).toHaveCount(0);
  await page.goto(`/applications/${id}`);
  await expect(page.locator(".head-meta .mark")).toHaveText("Submitted");
});

test("a company writing back leads the overview until you've dealt with it", async ({ page }) => {
  const applicationId = withDb((db) => {
    const added = addApplication(db, { company: "Reply Co", title: "Engineer", stage: "submitted" });
    if (!added.ok) throw new Error("expected new");
    moveStage(db, added.id, "screening");
    db.insert(inboxFindings).values({ applicationId: added.id, messageId: "reply-1", kind: "screening", confidence: "high", emailAt: new Date(), fromAddress: "Mark <mark@reply.example>", subject: "Next steps", quote: "We would like to move you forward", status: "applied" }).run();
    return added.id;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).getByRole("link", { name: /from Reply Co|new from Reply Co/ })).toHaveAttribute("href", `/applications/${applicationId}`);
  const replies = page.getByRole("region", { name: /wrote back/ });
  await expect(replies.getByText("We would like to move you forward")).toBeVisible();
  await expect(replies.getByRole("link", { name: "Open in Gmail" })).toHaveAttribute("href", /^https:\/\/mail\.google\.com\/mail\/u\/0\/#search\//);
  await replies.getByRole("button", { name: "I’ve dealt with this" }).click();
  await expect(page.locator(".need", { hasText: "We would like to move you forward" })).toHaveCount(0);
  await expect(page.locator(".feed").getByText("Reply Co: We would like to move you forward")).toBeVisible();
});
