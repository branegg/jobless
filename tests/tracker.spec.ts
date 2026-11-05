import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("an empty tracker opens the form, and adding sends you to the application", async ({ page }) => {
  await page.goto("/applications");
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  await page.getByLabel("Company").fill("Acme");
  await page.getByLabel("Role").fill("Head of Engineering");
  await page.getByLabel("Link to the job").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.locator("p.error")).toHaveText("The link must start with http:// or https://.");
  await expect(page.getByLabel("Company")).toHaveValue("Acme");

  await page.getByLabel("Link to the job").fill("https://jobs.acme.com/1?utm_source=x");
  await page.getByLabel("Location").fill("London");
  await page.getByLabel("Where it is now").selectOption("saved");
  await page.getByLabel("Notes").fill("Referred by Ola");
  await page.getByRole("button", { name: "Add application" }).click();

  await expect(page).toHaveURL(/\/applications\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Head of Engineering at Acme");
  await expect(page.getByRole("link", { name: "Job page" })).toHaveAttribute("href", "https://jobs.acme.com/1");
  await expect(page.getByText("Referred by Ola")).toBeVisible();
  await expect(page.getByText("Added as Saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo last move" })).toHaveCount(0);
});

test("adding the same job again points at the one you have", async ({ page }) => {
  await page.goto("/applications");
  await page.getByText("Add an application").click();
  await page.getByLabel("Company").fill("Someone else");
  await page.getByLabel("Role").fill("Another role");
  await page.getByLabel("Link to the job").fill("https://jobs.acme.com/1");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.locator("p.error")).toContainText("You're already tracking this job.");
  await page.locator("p.error").getByRole("link", { name: "Open it" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Head of Engineering at Acme");
});

test("marking as submitted plans a follow-up, and undo puts it back", async ({ page }) => {
  await page.goto("/applications");
  await page.getByRole("link", { name: "Head of Engineering at Acme" }).click();
  await page.getByRole("button", { name: "Mark as submitted" }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Submitted");
  await expect(page.getByLabel("What needs doing")).toHaveValue("Follow up if no reply");
  await expect(page.getByText(/^Sent /)).toBeVisible();

  await page.getByRole("button", { name: "Undo last move" }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Saved");
  await expect(page.getByLabel("What needs doing")).toHaveValue("");
  await expect(page.getByText("Undid the move to Submitted, back to Saved")).toBeVisible();
  await page.getByRole("button", { name: "Mark as submitted" }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Submitted");
});

test("a next step that's due shows on Today and in the menu", async ({ page }) => {
  await page.goto("/applications");
  await page.getByRole("link", { name: "Head of Engineering at Acme" }).click();
  await page.getByLabel("What needs doing").fill("Email the recruiter");
  await page.getByLabel("By when").fill("2020-01-15");
  await page.getByRole("button", { name: "Save next step" }).click();
  await expect(page.getByRole("button", { name: "Clear next step" })).toBeVisible();

  await page.goto("/");
  const due = page.getByRole("region", { name: "Due now" });
  await expect(due.getByRole("link", { name: "Head of Engineering at Acme" })).toBeVisible();
  await expect(due.getByText("Email the recruiter")).toBeVisible();
  await expect(due.getByText("Was due 15 Jan 2020")).toBeVisible();
  await expect(page.getByRole("navigation").getByLabel("1 next steps due")).toHaveText("1");

  await due.getByRole("link", { name: "Head of Engineering at Acme" }).click();
  await page.getByRole("button", { name: "Clear next step" }).click();
  await expect(page.getByRole("button", { name: "Clear next step" })).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Due now" })).toHaveCount(0);
});

test("notes, stage moves and details all stick", async ({ page }) => {
  await page.goto("/applications");
  await page.getByRole("link", { name: "Head of Engineering at Acme" }).click();
  await page.getByLabel("Add a note").fill("Spoke to the CTO");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Spoke to the CTO")).toBeVisible();

  await expect(page.getByLabel("Other stage")).toHaveValue("");
  await page.getByLabel("Other stage").selectOption("interview");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Interview");
  await expect(page.getByRole("button", { name: "Mark as offer" })).toBeVisible();

  await page.getByText("Fix the details or delete").click();
  await page.getByLabel("Role").fill("CTO");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CTO at Acme");

  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Interview" })).toBeVisible();
  await expect(page.getByText("1 open, 0 closed.")).toBeVisible();
});

test("rejecting moves it to Closed, and deleting removes it", async ({ page }) => {
  await page.goto("/applications");
  await page.getByRole("link", { name: "CTO at Acme" }).click();
  await page.getByLabel("Other stage").selectOption("rejected");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.locator(".head-meta .mark")).toHaveText("Rejected");
  await expect(page.getByRole("button", { name: /^Mark as/ })).toHaveCount(0);

  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Closed" })).toBeVisible();
  await page.getByRole("link", { name: "CTO at Acme" }).click();
  await page.getByText("Fix the details or delete").click();
  await page.getByRole("button", { name: "Delete application" }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});

test("an older application keeps the date you give it", async ({ page }) => {
  await page.goto("/applications");
  await page.getByLabel("Company").fill("Fabrikam");
  await page.getByLabel("Role").fill("Product Engineer");
  await expect(page.getByLabel("Date you sent it")).not.toHaveValue("");
  await page.getByLabel("Date you sent it").fill("2020-03-02");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Sent 2 Mar 2020")).toBeVisible();
  await page.goto("/applications");
  await expect(page.getByText("Sent 2 Mar 2020")).toBeVisible();
  await expect(page.getByText(/^Was due 9 Mar 2020/)).toBeVisible();
});

test("an application that doesn't exist shows not found", async ({ page }) => {
  const response = await page.goto("/applications/99999");
  expect(response?.status()).toBe(404);
});
