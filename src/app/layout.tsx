import type { Metadata } from "next";
import { Besley, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { getDb } from "@/db";
import { pendingFindings } from "@/lib/inbox/inbox";
import { dueApplications } from "@/lib/tracker";
import { readVault } from "@/lib/vault/entries";
import { connection } from "next/server";
import "./globals.css";

const display = Besley({ variable: "--font-display", subsets: ["latin", "latin-ext"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Joblesss",
  description: "My private job search and career record",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const drafts = readVault().entries.filter((entry) => entry.status === "draft").length;
  const due = dueApplications(getDb()).length;
  const emails = pendingFindings(getDb()).length;
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body>
        <div className="shell">
          <aside className="rail">
            <div className="rail-inner">
              <Link href="/" className="brand">Joblesss</Link>
              <nav aria-label="Main">
                <Link href="/">Today</Link>
                <Link href="/jobs">Jobs</Link>
                <Link href="/job-sources">Job sources</Link>
                <Link href="/applications">
                  Applications
                  {due > 0 && <span className="count" aria-label={`${due} next steps due`}>{due}</span>}
                </Link>
                <Link href="/email">
                  Email check
                  {emails > 0 && <span className="count" aria-label={`${emails} email updates waiting`}>{emails}</span>}
                </Link>
                <Link href="/wiki">My profile</Link>
                <Link href="/review">
                  Review
                  {drafts > 0 && <span className="count" aria-label={`${drafts} drafts waiting`}>{drafts}</span>}
                </Link>
                <Link href="/contact">Contact details</Link>
                <Link href="/runs">Agent activity</Link>
              </nav>
            </div>
          </aside>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
