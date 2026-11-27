# Real village seed data

`real-villages.json` holds 9 real Palestinian villages from 6 governorates
(Nablus, Bethlehem, Ramallah & al-Bireh, Jenin, Salfit, Qalqilya). The course
does not require real data; it is here to demonstrate provenance on real
information during the presentation.

## Rules followed

- **Every fact has a source.** Population figures, name origins, history and
  entries each carry the reference they came from (PCBS census results via City
  Population, Wikipedia articles and their cited references, UNESCO, Travel
  Palestine). Wikipedia is cited as the secondary source it is.
- **Nothing is guessed.** Fields without a verified source stay empty, for
  example Arraba has no coordinates and several villages have no elevation.
- **Conflicts are kept, not resolved silently.** Deir Istiya has two 1997
  population records (2,803 and 2,802) from different sources, and the notes
  record elevation disagreements (Taybeh 900 vs 850 m, Deir Istiya 379 vs 430 m).
- **Everything starts as DRAFT.** A VERIFIER must review records before they are
  marked VERIFIED.

## Load it

Start the API, then run with an EDITOR or ADMIN account:

```sh
SEED_EMAIL=you@example.com SEED_PASSWORD='your-password' npm run seed:villages
```

On Windows PowerShell:

```powershell
$env:SEED_EMAIL="you@example.com"; $env:SEED_PASSWORD="your-password"; npm run seed:villages
```

The script uses the public API (validation, permissions and audit log apply).
Re-running is safe: existing villages are skipped. Set `API_URL` if the API is
not on `http://localhost:3000/api/v1`.
