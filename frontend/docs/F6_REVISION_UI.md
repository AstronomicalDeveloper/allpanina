# F6: manual review corrections

Base: `f6a7ba9`, branch `refactor/frontend-redesign`, initially clean. Both `2448554` and `ad14545` are ancestors (F0-F5b). No scientific files, processing services, Worker, metrics or factors changed. Changes remain local for review.

## Ten observations

1. Map legend: moved above attribution, with bounded scrolling. MapLibre controls retain their separate corners. Requires visual confirmation.
2. Observation popup: MapLibre automatic anchor selection (no fixed anchor), maximum width 300px and viewport bounds, bounded internal scrolling, enabled close button, above overlays. Leaving a feature no longer removes the popup before its content can be read or scrolled. Requires viewport checks.
3. Coordinates: moved into the existing geographic context card, visible on mobile and desktop rather than competing with bottom controls.
4. Map tabs: minimal 2px corners; existing active state and focus retained.
5. MODIS/VIIRS only: B1 explanation points to Calendar and Method; no cell-level estimate introduced.
6. Removed TimeBar component and its CSS. Explore retains year, month and whole-year selection and URL synchronisation; regression test exercises those controls.
7. Mobile sheet: removed the CSS override that forced a hidden panel to display and the rule hiding its show/close controls. Handle and header cannot shrink away. Existing three-height transitions and keyboard button behaviour remain; tab selection opens the intermediate height. Manual touch and real CSS layout checks remain required.
8. Public scientific copy: removed management approvals, review codes and internal document references. `publicCopy.json` records each original string, source field and SHA-256 together with its English explanation. Unknown revisions receive an explicit source-file notice rather than an invented translation. Full original limitations and provenance remain downloadable. This is reviewable editorial copy, not a claim of new scientific validation or independent translation approval. The regression test verifies every source field and hash. Human review of wording remains recommended.
9. My region: horizontal progress strip and unused styling removed. Numbered cards, current section, completed headings, validation and processing flow retained. Worker unchanged.
10. About: ChatGPT and Codex (OpenAI), Claude (Anthropic) acknowledged for development, review, documentation and technical assistance. Human scientific responsibility stated without claiming additional audits.

## Verification and limitations

Run frontend lint, explicit TypeScript check, test suite and production build. Automated interface tests use JSDOM and a simulated map runtime; they do not validate CSS geometry or touch operation in an actual browser.

Browser review required at desktop and 390px: legend/attribution/zoom separation, popup near every viewport edge and above sheet, scroll and close, sheet peek/half/full and hide/show, map dragging outside sheet, keyboard focus, Explore selection and URL, numbered region flow and public Method wording. Short landscape viewports also need review. Do not report these visual checks as passed until performed.

The existing production chunk-size warning is retained. No push, deployment or Nginx changes.

Final checks: lint passed; explicit TypeScript check passed; 250 tests passed with ALLPANINA_LENTO=1 (zero skipped), including Ucayali byte parity; production build passed. git diff --check passed. Remaining visual checks above have not been executed.

Follow-up from mobile screenshots: legend now sits alongside attribution above the sheet. Navbar spacing and scope select use the available flex width so the menu button remains in the row. Popup opens only on click, remains over that cell and dismisses when the pointer leaves it (including a move to another feature). This supersedes the earlier popup-hover behaviour. Desktop/mobile CSS still requires real browser review.

Latest screenshot follow-up: select arrow container now has the same maximum width as the select; uploaded public/logo.jpeg replaces the placeholder brand. Legend moved inside the + tools menu (not a second hamburger). Clicked popups use a 120px pointer tolerance and 650ms exit grace period; pointer entry into the popup cancels dismissal so content remains scrollable. Tests cover that transition. This supersedes the immediate-on-exit behaviour described above.

Brand correction: removed the uploaded JPEG at the user's request. Restored the AllpaNina wordmark with a decorative fire SVG in place of the original circle. Publication to main was paused before any merge or push.
