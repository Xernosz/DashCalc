# Changelog

Every notable change to DashCalc goes here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-29

Out of beta. DashCalc got redesigned top to bottom, and now it looks as good as the math works.

### Added

- A front page that explains DashCalc in about 10 seconds, with an animated route map you can pause.
- A Day/Night switch on every page. Night is the default, and your pick is saved.
- A Privacy & terms page (`legal.html`).
- Anonymous visit counting with GoatCounter: page views plus 3 yes/no events, with no cookies and no IDs. It can be turned off on Setup, and browsers that send Do Not Track or Global Privacy Control are never counted.
- The version number in the footer, updated by a GitHub Action whenever a release is published.

### Changed

- The calculator: a gauge-style grade dial, pay and miles side by side, and Skip/Take buttons in thumb reach.
- The Ledger is now the Journal (`journal.html`), with day groups, a "You kept" total and a strip of your last grades. Old `ledger.html` links still work, and "Passed" is now "Skipped".
- Setup moved to `setup.html` (`app.js` is now `setup.js`), with grouped cards and live cost readouts.

### Fixed

- Firefox no longer asks for storage permission on the front page. It asks on your first real save.
- Settings no longer crash when the saved data is empty.
- Journal backups are named with your local date instead of UTC, and $0 offers restore correctly.
- The front page example numbers come from the real math, so they stay right when the IRS rate changes.

### Security

- The release robot only accepts tags shaped like `v1.2.3`, so a bad tag can't slip code into `version.js`.

## [0.9.0] - 2026-09-21

The beta. Three weeks from a first rough frontend to a working app.

### Added

- The offer calculator: net pay per hour and per mile after gas, car wear and taxes, with a letter grade.
- A Setup page for your car, gas price, home state and driving habits, with autosave.
- The Ledger, for offers you took or passed, with edit, delete and undo.
- A Far trip toggle that counts the drive back to your zone.
- A cheat sheet of the least an offer should pay, for your car.
- The IRS mileage rate looked up by date, split into tax and car wear.
- Journal backup, and export to JSON or CSV.

[1.0.0]: https://github.com/Xernosz/DashCalc/releases/tag/v1.0.0
[0.9.0]: https://github.com/Xernosz/DashCalc/tree/5268e93
