import type { Contact } from "../vault/contact";
import type { Draft } from "./packet";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bullets(items: { text: string }[]): string {
  return items.length === 0 ? "" : `<ul>${items.map((item) => `<li>${esc(item.text)}</li>`).join("")}</ul>`;
}

const STYLE = `
@page { size: A4; margin: 15mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10pt/1.38 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; }
h1 { margin: 0; font-size: 19pt; font-weight: 700; letter-spacing: -0.01em; }
.headline { font-size: 11pt; margin-top: 1pt; }
.contact { margin-top: 4pt; font-size: 9pt; color: #333; }
.contact a { color: inherit; text-decoration: none; }
.summary { margin: 10pt 0 0; }
h2 { margin: 13pt 0 4pt; padding-bottom: 2pt; border-bottom: 0.75pt solid #111; font-size: 10.5pt; font-weight: 700; }
.item { margin-top: 7pt; break-inside: avoid; }
.item:first-of-type { margin-top: 0; }
.line { display: flex; justify-content: space-between; gap: 12pt; }
.role { font-weight: 700; }
.period { white-space: nowrap; color: #333; }
ul { margin: 2pt 0 0; padding-left: 12pt; }
li { margin-top: 1.5pt; }
p { margin: 0; }
`;

export function renderCvHtml(draft: Draft, contact: Contact): string {
  const reach = [contact.location, contact.email, contact.phone].filter(Boolean).map(esc);
  const links = contact.links.map((link) => `<a href="${esc(link.url)}">${esc(link.label)}</a>`);
  const experience = draft.experience
    .map((job) => `<div class="item"><div class="line"><span class="role">${esc(job.role)}, ${esc(job.company)}</span><span class="period">${esc(job.period)}</span></div>${bullets(job.bullets)}</div>`)
    .join("");
  const projects = draft.projects.map((project) => `<div class="item"><div class="role">${esc(project.name)}</div>${bullets(project.bullets)}</div>`).join("");
  const skills = draft.skills.map((item) => `<p>${esc(item.text)}</p>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(contact.name)} CV</title><style>${STYLE}</style></head><body>
<h1>${esc(contact.name)}</h1>
<div class="headline">${esc(draft.headline)}</div>
<div class="contact">${[...reach, ...links].join(" &nbsp;|&nbsp; ")}</div>
${draft.summary.text ? `<p class="summary">${esc(draft.summary.text)}</p>` : ""}
${experience ? `<h2>Experience</h2>${experience}` : ""}
${projects ? `<h2>Projects</h2>${projects}` : ""}
${skills ? `<h2>Skills and languages</h2>${skills}` : ""}
</body></html>`;
}

export async function renderPdf(html: string, file: string): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: file, format: "A4", preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}
