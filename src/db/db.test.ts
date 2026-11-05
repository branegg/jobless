import { describe, expect, it } from "vitest";
import { openDb } from "./index";
import { applications, companies, jobs } from "./schema";

function seed() {
  const { db } = openDb(":memory:");
  const company = db.insert(companies).values({ name: "Acme", slug: "acme" }).returning().get();
  return { db, company };
}

describe("database", () => {
  it("applies migrations and stores a job", () => {
    const { db, company } = seed();
    const job = db.insert(jobs).values({ source: "lever", externalId: "1", companyId: company.id, title: "Engineer" }).returning().get();
    expect(job.status).toBe("new");
  });
  it("won't store the same job twice", () => {
    const { db, company } = seed();
    const row = { source: "lever" as const, externalId: "1", companyId: company.id, title: "Engineer" };
    db.insert(jobs).values(row).run();
    expect(() => db.insert(jobs).values(row).run()).toThrow(/UNIQUE/);
  });
  it("new applications start as saved and need a real job", () => {
    const { db, company } = seed();
    const job = db.insert(jobs).values({ source: "manual", externalId: "m1", companyId: company.id, title: "Engineer" }).returning().get();
    expect(db.insert(applications).values({ jobId: job.id }).returning().get().stage).toBe("saved");
    expect(() => db.insert(applications).values({ jobId: 9999 }).run()).toThrow(/FOREIGN KEY/);
  });
});
