---
name: Joblesss
description: My private job search and career record
colors:
  pen: "#1f3fa6"
  pen-dark: "#a9bcff"
  pen-ink: "#ffffff"
  pen-ink-dark: "#10204f"
  pen-wash: "#e1e7f7"
  pen-wash-dark: "#232f57"
  seal: "#17613f"
  seal-dark: "#8ad6a8"
  seal-wash: "#d4e8da"
  seal-wash-dark: "#1e4434"
  live: "#1f8a58"
  live-dark: "#5fd39a"
  draft: "#8a5a00"
  draft-dark: "#e9c26e"
  draft-wash: "#f5e7c4"
  draft-wash-dark: "#453513"
  danger: "#a3261c"
  danger-dark: "#f29b92"
  private: "#6b2c5f"
  private-dark: "#e2afd6"
  private-wash: "#efdfeb"
  private-wash-dark: "#442a40"
  highlight: "#fbe58a"
  highlight-dark: "#6b5a12"
  paper: "#e9f0ea"
  paper-dark: "#12231f"
  sheet: "#f6faf6"
  sheet-dark: "#182d28"
  ink: "#16302b"
  ink-dark: "#e3efe7"
  ink-soft: "#4a635c"
  ink-soft-dark: "#a3bcb1"
  rule: "#b9cfc1"
  rule-dark: "#30493f"
  rule-strong: "#7fa391"
  rule-strong-dark: "#4e7063"
  hairline: "#dce7df"
  hairline-dark: "#263d36"
  rail: "#16302b"
  rail-dark: "#0c1a17"
  rail-ink: "#dbe8e0"
  rail-ink-dark: "#cfe0d6"
  rail-soft: "#9db8aa"
  rail-soft-dark: "#8ba99b"
  rail-active: "#2a4a42"
  rail-active-dark: "#1f3a33"
  rail-count: "#f5d98a"
  rail-count-dark: "#e9c26e"
typography:
  display:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  subhead:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
  stat:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.15
    fontFeature: "tnum"
  score:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "tnum"
  brand:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.45
  reading:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.45
    fontFeature: "tnum"
  note:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  note-strong:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.45
    fontFeature: "tnum"
  mark:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.45
  rail-label:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.45
  command:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
  round: "50%"
spacing:
  hair: "0.25rem"
  tight: "0.5rem"
  row: "0.625rem"
  snug: "0.75rem"
  gutter: "1rem"
  pane: "1.125rem"
  head: "1.25rem"
  section: "2rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.3125rem 0.75rem"
  button-hover:
    backgroundColor: "{colors.paper}"
  button-compact:
    typography: "{typography.note-strong}"
    padding: "0.1875rem 0.5625rem"
  button-primary:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.pen-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.3125rem 0.75rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.3125rem 0.75rem"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.3125rem 0.75rem"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.6rem"
  rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    width: "13rem"
  rail-link:
    textColor: "{colors.rail-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.5rem"
  rail-link-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "#ffffff"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.5rem"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  sheet-head:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "0.625rem 1rem"
  group-head:
    backgroundColor: "{colors.draft-wash}"
    textColor: "{colors.draft}"
    typography: "{typography.note-strong}"
    padding: "0.3125rem 1rem"
  stat:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.stat}"
    padding: "0.75rem 1rem"
  mark-done:
    backgroundColor: "{colors.seal-wash}"
    textColor: "{colors.seal}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
    padding: "0 0.375rem"
  mark-waiting:
    backgroundColor: "{colors.draft-wash}"
    textColor: "{colors.draft}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
    padding: "0 0.375rem"
  mark-running:
    backgroundColor: "{colors.pen-wash}"
    textColor: "{colors.pen}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
    padding: "0 0.375rem"
  mark-private:
    backgroundColor: "{colors.private-wash}"
    textColor: "{colors.private}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
    padding: "0 0.375rem"
  command:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.command}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.8rem"
  live-dot:
    backgroundColor: "{colors.live}"
    rounded: "{rounded.round}"
    size: "0.5rem"
---

# Design System: Joblesss

## Overview

**Creative North Star: "The Colleague's Status Sheet"**

Joblesss reads like a sheet a trusted colleague keeps while you are away: where things stand in plain sentences, then the numbers, then what needs you, then what got done. A dark green rail holds the place, a pale green ground sits behind it, and paler sheets carry the work. Everything is set in one sans at a compact size, so a screen holds a lot without feeling crowded.

Colour is the panel's reporting language. The greens are the room; blue, green, amber, red and plum each say something about the state of an item. Depth comes from tone and thin rules, never from cast shadows. Motion is limited to quick state changes and a small pulse while an agent is working.

An earlier version used a serif display face and a ledger margin line. Both were retired by an approved change, and neither belongs in new work.

**Key Characteristics:**
- Dense, calm and readable at 14px body size, with tabular numerals everywhere.
- A dark green rail, a pale green ground and paler sheets, in light and dark.
- Colour reports state, and amber always means the person is being waited on.
- Flat surfaces with 1px rules and small corners, from 3px to 6px.
- Words carry the interface: the shipped surfaces use no icons.

## Colors

A committed green neutral family with a small set of saturated state colours; every colour has a light value and a `-dark` sibling applied through the system colour scheme.

### Primary
- **Pen Blue** (#1f3fa6 light, #a9bcff dark): links, primary buttons, the focus ring, the text caret, and the Running and stage marks. Pen Ink (#ffffff light, #10204f dark) is the text on a primary button; Pen Wash (#e1e7f7 light, #232f57 dark) sits behind marks.

### Secondary
- **Seal Green** (#17613f light, #8ad6a8 dark): done, sent and confirmed marks, high job scores, form accents. Seal Wash (#d4e8da light, #1e4434 dark) sits behind its marks.
- **Live Green** (#1f8a58 light, #5fd39a dark): only the pulsing dot in the status line while an agent runs.
- **Waiting Amber** (#8a5a00 light, #e9c26e dark): anything waiting on the person: stopped forms, drafts, things to check, the group bands in Needs you, the attention underline in the briefing. Amber Wash (#f5e7c4 light, #453513 dark) backs bands, marks and review notes.
- **Stop Red** (#a3261c light, #f29b92 dark): failed and blocked marks, late due dates, errors, notices and destructive buttons. Its marks use a 12% mix of the red over transparent.
- **Private Plum** (#6b2c5f light, #e2afd6 dark): the Private mark only. Plum Wash (#efdfeb light, #442a40 dark) sits behind it.
- **Highlighter Yellow** (#fbe58a light, #6b5a12 dark): text selection and matched search words.

### Neutral
- **Paper** (#e9f0ea light, #12231f dark): the page ground and the hover fill on buttons and number cells.
- **Sheet** (#f6faf6 light, #182d28 dark): every container and every input.
- **Ink** (#16302b light, #e3efe7 dark): primary text, and the inverted command block.
- **Soft Ink** (#4a635c light, #a3bcb1 dark): notes, timestamps, labels, zero values and quiet buttons. Ended and closed marks use a 14% mix of it over transparent.
- **Rule** (#b9cfc1 light, #30493f dark): the outer border of containers.
- **Strong Rule** (#7fa391 light, #4e7063 dark): button and input borders, briefing link underlines, the dividers between stat groups, and the idle status dot.
- **Hairline** (#dce7df light, #263d36 dark): the lines between rows and the gaps between number cells.
- **Rail** (#16302b light, #0c1a17 dark): the navigation column, darkest of the three layers in both schemes.
- **Rail Ink** (#dbe8e0 light, #cfe0d6 dark) and **Rail Soft** (#9db8aa light, #8ba99b dark): rail links, and group labels with open-item totals.
- **Rail Active** (#2a4a42 light, #1f3a33 dark): the current page's fill. Hover uses it at 60%.
- **Rail Count** (#f5d98a light, #e9c26e dark): counts of things waiting on the person, and the rail's focus ring.

### Named Rules
**The Meaning Only Rule.** Hue outside the green neutrals always reports something: blue is an action, a link or running work; green is done or a strong fit; amber is waiting on the person; red is failed or late; plum is private. If a colour reports nothing, it is the wrong colour.

**The Amber Is Yours Rule.** Amber means the person is being waited on, on every surface from the rail count to the briefing underline. Agent work in progress is blue, never amber.

## Typography

**Display Font:** Instrument Sans (with system-ui, sans-serif)
**Body Font:** Instrument Sans (with system-ui, sans-serif)
**Label/Mono Font:** the system monospace stack (ui-monospace, SFMono-Regular, Menlo), for commands and code only

**Character:** One friendly, slightly narrow grotesque carries everything, and hierarchy comes from size and weight. Tabular numerals are on across the whole body, so times, scores and counts line up in their columns.

### Hierarchy
- **Display** (500, 1.625rem, 1.3, -0.01em): the briefing sentences at the top of Overview, measured to 44em. Linked phrases rise to 700. Drops to 1.25rem at 720px.
- **Headline** (700, 1.5rem, 1.2, -0.01em): the page heading on every other screen.
- **Title** (700, 1.125rem, 1.2): section and sheet headings, including sheet heads.
- **Subhead** (600, 1rem, 1.2): parts within an application packet.
- **Stat** (600, 1.625rem, 1.15): the numbers in number cells; zero values drop to 500 in Soft Ink. Drops to 1.25rem at 720px.
- **Score** (600, 1.125rem, 1.25): the job score beside a row, in Soft Ink, turning Seal Green at 75 or above.
- **Reading** (400, 0.9375rem, 1.55): long text such as job descriptions and vault prose, at 68ch to 72ch.
- **Body** (400, 0.875rem, 1.45): the default for rows and controls. Row titles and field labels use 600.
- **Note** (400, 0.8125rem, 1.45): row notes, timestamps, stat labels and sheet-head details. Group bands and table headers use 600.
- **Mark** (600, 0.75rem): status marks. **Rail Label** (500, 0.75rem): rail group labels.
- **Command** (400, 0.95rem, monospace): commands the person must run in a terminal.

### Named Rules
**The One Sans Rule.** Instrument Sans sets every word in the interface. The only exception is literal code and terminal commands, which use the system monospace stack.

**The Sentence Case Rule.** All labels and headings are sentence case at normal or slightly tight tracking. Group names are real headings, never decoration above one.

**The Honest Zero Rule.** A zero stays on screen as a zero, in Soft Ink at weight 500 with no link. Every other number opens the items behind it.

## Layout

A two-column shell: a 13rem rail, sticky on tall pages, and a fluid main column capped at 92rem, with 1.625rem top padding and side padding of `clamp(1rem, 2.5vw, 2rem)`. Sections sit 2rem apart, and the Overview panes and stat strip sit 1.125rem apart.

Rows are built as grids with fixed columns for what repeats and a fluid column for titles: job rows use 3.5rem score, fluid title, 13rem location and pay, then actions. Application rows drop the actions column. Activity entries use 3.25rem time, 4.5rem mark and fluid text. Row padding is about 0.5rem to 0.625rem vertically and 1rem at the edges. Long text from job pages and emails is clamped to two lines, with the full text on hover or behind the row's link.

Below 1180px, the seven-cell stat strip becomes three columns with the first cell spanning the top, the two Overview panes stack, and row location text moves under the title. Below 720px, the rail becomes a top strip with a brand line and a horizontally scrolling nav with group labels hidden, and every multi-column form collapses to one column.

## Elevation & Depth

This system is flat. Depth comes from three tonal layers (rail, paper, sheet) and 1px rules, in both colour schemes. There are no drop shadows anywhere in the build.

### Shadow Vocabulary
- **Stage divider** (`box-shadow: inset 2px 0 0` in Strong Rule): a line, not a shadow, separating the three groups of number cells. It is removed once the strip wraps below 1180px.

### Named Rules
**The Flat Sheet Rule.** Surfaces stay flat in every state. Hover changes a fill, and focus draws an outline; nothing lifts.

## Shapes

Small, firm corners that step by size: gently softened marks, inputs and command blocks (3px), buttons, nav links, tables and disclosures (4px), and sheets, row groups and the stat strip (6px). Containers clip their contents, so bands and hairlines run to the edge. The only round form is the 0.5rem status dot.

## Components

### Buttons
Standard, compact and quiet; actions sit in the rows they affect.
- **Shape:** gently softened corners (4px) with a 1px Strong Rule border on the default button.
- **Default:** transparent fill, Ink text, weight 600, with a compact variant inside rows (0.8125rem).
- **Primary:** Pen Blue fill and border with Pen Ink text, for the main action on detail screens and forms.
- **Quiet / Danger:** transparent border with Soft Ink or Stop Red text, sometimes with no side padding to sit as text beside other actions.
- **Hover / Focus:** default hover fills with Paper; primary hover brightens by 1.12. Active moves down 1px. Focus is a 2px Pen Blue outline with 2px offset. Disabled drops to 55% opacity with a progress cursor.

### Marks
Small labelled tags that report one state.
- **Style:** weight 600 at 0.75rem, 3px corners, text colour on its own wash, never wrapping.
- **State:** Seal for sent, done and confirmed; Amber for stopped, draft and check; Blue for running and stages; Soft Ink for ended and closed; Red for failed and blocked; Plum for private. Public is plain Soft Ink, and rejected is Soft Ink struck through.

### Cards / Containers
- **Corner Style:** 6px for sheets and row groups, 4px for tables and disclosures.
- **Background:** Sheet on Paper.
- **Shadow Strategy:** none, per the Flat Sheet Rule.
- **Border:** 1px Rule outside, Hairline between rows.
- **Internal Padding:** 1rem at the sides; sheet heads use 0.625rem top and bottom.
- **Group band:** a full-width Amber Wash strip with Amber text heads each group in Needs you. The one exception is "A company wrote back", which uses Seal Wash with Seal text and always comes first, because good news must not read as another chore.

### Inputs / Fields
- **Style:** Sheet fill, 1px Strong Rule border, 3px corners, full width with the label above at weight 600. Textareas start at 11rem tall.
- **Focus:** the same global 2px Pen Blue outline, with no border shift or glow.
- **Error:** Stop Red text at weight 600 under the form.

### Navigation
The dark rail is the fixed point of the app. Links are Body on Rail with 4px corners; hover fills with Rail Active at 60% in 150ms; the current page has a solid Rail Active fill, white text and weight 600. Amber counts mark what waits on the person, and quiet totals show open items. Focus uses a Rail Count outline. Below 720px it becomes a horizontally scrolling strip. Filters within a page are plain links, with the current one bold, Ink and underlined at 2px.

### Briefing
The status of the search as one or two Display sentences whose phrases are the links. Links are bold and inherit Ink, underlined at 2px in Strong Rule or in Amber when they need the person; hover takes the underline to the text colour. A Soft Ink status line sits below it with a status dot, which pulses opacity over 2s in Live Green while an agent runs and rests in Strong Rule otherwise. The pulse stops under reduced motion.

### Number Cells
A single sheet of joined cells separated by 1px Hairline gaps. Each cell pairs a Stat number with Note words below it. Linked cells fill with Paper on hover in 150ms. A cell needing the person turns its number Amber.

### Rows
The repeating unit for jobs, applications, needs and agent activity: a bold title link with a Soft Ink note below it, side information in Note size, and actions at the far end. Titles underline on hover. Rows are separated by Hairline, with no zebra striping.

### Command Block
Commands the person must run, in Paper on Ink with 3px corners and the Command type style. It is the only inverted element in the main column.

### Confirmed Stamp
A known leftover on `/review`, recorded as it stands and outside the approved change: a rotated (-9deg) Seal Green "Confirmed" stamp with a 3px border that drops in with an overshoot easing over 260ms, while the row content fades to 45%. It stops animating under reduced motion. It is not a pattern for other surfaces.

## Do's and Don'ts

### Do:
- **Do** use the same token names in light and dark, and check both schemes; dark values come from the system colour scheme, not a toggle.
- **Do** keep amber for what waits on the person and blue for what agents are doing now.
- **Do** pair every number with its words, and link every number above zero to the items behind it.
- **Do** keep hover to a change of fill, at 150ms ease-out when it animates, and stop looping or entrance animation under reduced motion.
- **Do** clamp long notes from job pages and emails to two lines, and keep the full text reachable on hover or behind the row's link.

### Don't:
- **Don't** set a serif or any second display face; Instrument Sans carries the briefing and headings.
- **Don't** draw a ledger margin line. The unused `--margin-line` variable is left over from the retired design and is not a token.
- **Don't** add drop shadows or lifted hover states; the inset stage divider is the only `box-shadow` in the system.
- **Don't** add uppercase or tracked labels, or small labels stacked above headings.
- **Don't** use a state colour as decoration or for emphasis alone.
- **Don't** hide a zero to make a screen look cleaner; show it under the Honest Zero Rule.
- **Don't** carry the Confirmed stamp's rotation or overshoot easing to anything else.
