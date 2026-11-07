import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const vault = path.join(process.env.JOBLESSS_E2E_DIR!, "vault");

function seed(relative: string, text: string) {
  const file = path.join(vault, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

test.describe.configure({ mode: "serial" });

test("an empty profile tells you what to do first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start by building your profile.");
  await expect(page.getByText("pnpm agent profile-import")).toBeVisible();
});

test("adding an entry saves it as confirmed and it shows up in search", async ({ page }) => {
  await page.goto("/wiki");
  await page.getByText("Add something to your profile").click();
  await page.getByLabel("Title").fill("Shipped billing in Łódź");
  await page.getByLabel("Details").fill("Moved 40 customers to the new billing system.");
  await page.getByRole("button", { name: "Add to profile" }).click();
  await expect(page).toHaveURL(/\/wiki\/facts\/shipped-billing-in-lodz/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shipped billing in Łódź");
  await expect(page.getByText("Can be used")).toBeVisible();
  await page.goto("/wiki?q=lodz");
  await expect(page.getByRole("link", { name: "Shipped billing in Łódź" })).toBeVisible();
  await page.goto("/wiki?q=nonexistentword");
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

test("reviewing a draft confirms it, and rejecting hides it", async ({ page }) => {
  seed("facts/draft-one.md", "---\ntitle: Led the migration\nstatus: draft\nvisibility: private\nsource: CV.pdf\nreviewNote: The CVs disagree on the year.\n---\nMoved everything.");
  seed("facts/draft-two.md", "---\ntitle: Won an award that never happened\nstatus: draft\nvisibility: public\nsource: CV.pdf\n---\nNot true.");
  seed("facts/broken.md", "---\nstatus: draft\n---\nThis has no title.");

  await page.goto("/review");
  await expect(page.getByText("1 file can't be read.")).toBeVisible();
  await expect(page.locator(".count")).toHaveText("2");

  const first = page.getByTestId("review-facts-draft-one");
  await expect(first.getByText("The CVs disagree on the year.")).toBeVisible();
  await first.getByRole("button", { name: "Make public" }).click();
  await expect(first.getByRole("button", { name: "Make private" })).toBeVisible();
  await first.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator(".stamp")).toBeVisible();
  await expect(first).toHaveCount(0);

  const second = page.getByTestId("review-facts-draft-two");
  await second.getByRole("button", { name: "Reject" }).click();
  await expect(second).toHaveCount(0);

  await expect(page.getByText("Nothing to review.")).toBeVisible();
  await page.goto("/wiki");
  await expect(page.getByRole("link", { name: "Led the migration" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Won an award" })).toHaveCount(0);

  const saved = fs.readFileSync(path.join(vault, "facts/draft-one.md"), "utf8");
  expect(saved).toContain("status: confirmed");
  expect(saved).toContain("visibility: public");
  expect(saved).not.toContain("reviewNote");
});

test("editing an entry changes the file", async ({ page }) => {
  await page.goto("/wiki/facts/draft-one");
  await page.getByText("Edit this entry").click();
  await page.getByLabel("Title").fill("Led the database migration");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Led the database migration");
  expect(fs.readFileSync(path.join(vault, "facts/draft-one.md"), "utf8")).toContain("title: Led the database migration");
});

test("asking a question returns an answer with a working citation, and the run is logged", async ({ page }) => {
  await page.goto("/wiki");
  await page.getByRole("textbox", { name: "Ask about your career" }).fill("What did I ship?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("You shipped it.")).toBeVisible();
  await expect(page.getByRole("link", { name: "facts/shipped-billing" })).toHaveAttribute("href", "/wiki/facts/shipped-billing");
  await page.goto("/runs");
  await expect(page.getByText("Question about profile")).toBeVisible();
  await expect(page.getByText("Finished")).toBeVisible();
});

test("a missing entry and a sneaky path both give 404s", async ({ page, request }) => {
  expect((await page.goto("/wiki/facts/does-not-exist"))?.status()).toBe(404);
  expect((await page.goto("/wiki/secrets/anything"))?.status()).toBe(404);
  fs.mkdirSync(path.join(vault, "assets"), { recursive: true });
  expect((await request.get("/vault-asset/..%2Ffacts%2Fdraft-one.md")).status()).toBe(404);
  expect((await request.get("/vault-asset/nothing.png")).status()).toBe(404);
});

test("history is kept in the vault's own git repository", async () => {
  expect(fs.existsSync(path.join(vault, ".git"))).toBe(true);
});
