---
belge_turu: arastirma_kaydi
konu: Malzemeler — Kaynak Doğrulama Turu 1, Paket P1 (Ahşap, Paneller ve Yüzey Bitişleri)
arastirma_tarihi: 2026-09-25
durum: tamamlandi (P1)
ana_kayit: MALZEME_ARASTIRMASI_01.md
---

# Source Verification Round 1 — Pack P1: Wood, Panels and Finishes

**Scope:** Verify the Round 1 claims for pack P1 against the actual text of the original documents.
- **Materials:** solid oak, plywood, MDF, furniture/wood paint, water-based PU varnish, oil / hardwax-oil finish.
- **Fixed for this round:**
  - Round 1 remains frozen as source discovery.
  - The material sample was not expanded.
  - No permanent knowledge files were created.

---

## 1. Acquisition

All files are in `02_KUTUPHANE/02_MALZEMELER/_INBOX/`. They are git-ignored per the `_INBOX` rule (verified: 6/6 ignored; none appear as `git add -A --dry-run` candidates).

| Local file | Document | Acquired from | Size (bytes) | MD5 (first 12) | Status |
|---|---|---|---|---|---|
| `FPL_GTR282_2021_Ch04_Moisture_Relations.pdf` | Wood Handbook (FPL-GTR-282, 2021) Ch. 4 "Moisture Relations and Physical Properties of Wood" — S.V. Glass, S.L. Zelinka | USDA Forest Service TreeSearch: https://research.fs.usda.gov/treesearch/download/62243.pdf | 2,677,613 | c37b75a5fb7b | Acquired, read |
| `FPL_GTR282_2021_Ch11_Wood_Composites.pdf` | Ch. 11 "Wood-Based Composite Materials: Panel Products, Glued Laminated Timber, Structural Composite Lumber, and Wood–Nonwood Composites" | https://research.fs.usda.gov/treesearch/download/62258.pdf | 6,163,863 | 193b22aad34f | Acquired, read |
| `FPL_GTR282_2021_Ch13_Drying_Dimensional_Change.pdf` | Ch. 13 "Drying and Control of Moisture Content and Dimensional Changes" | https://research.fs.usda.gov/treesearch/download/62261.pdf | 3,891,099 | f24e18f3cb20 | Acquired, read |
| `FPL_GTR282_2021_Ch16_Finishing_Wood.pdf` | Ch. 16 "Finishing Wood" — C.G. Hunt | https://research.fs.usda.gov/treesearch/download/62269.pdf | 15,125,250 | 4519d0afbb5c | Acquired, read |
| `Osmo_Polyx-Oil_Original_PI.pdf` | Osmo Polyx®-Oil Original — Product Information \| Interior (Version 02/24) | https://www.osmo.com/fileadmin/media/pim_assets/pim_file_36247.pdf | 198,746 | a790e80a4c55 | Acquired, read |
| `Minwax_Water_Based_Oil-Modified_Polyurethane_TDS_MWX047_2024.pdf` | Minwax® Water Based **Oil-Modified** Polyurethane TDS (Doc Code MWX047, Rev. 1/17/2024) | https://paintdocs.com/docs/webPDF.jsp?SITEID=MINWAX&lang=2&doctype=PDS&prodno=027426710337 | 409,982 | 9c8036a43300 | Acquired, read. **Not the product named in Round 1** — see §4 |
| — | "Protecting Wood from Humidity" (Feist & Peterson, 1987) | https://www.fpl.fs.usda.gov/documnts/pdf1987/feist87a.pdf | — | — | **Not acquired:** HTTP 403 to both download clients |
| — | BWF Guide No 7 — MDF | https://www.bwf.org.uk/wp-content/uploads/assets/07_mdf.pdf | — | — | **Not acquired:** HTTP 500 (server error, repeated) |

**Acquisition notes:**
- The `fpl.fs.usda.gov/documnts/…` URLs listed in Round 1 return **403** to non-browser clients. The same chapters are served by the official USDA **TreeSearch** download endpoint. Provenance is still the USDA Forest Service.
- The downloaded chapters were **not** checked against the edition landing page for errata. Chapter headers read "General Technical Report FPL–GTR–282".

**Text extraction:**
- Text was extracted locally with a dependency-free Node script (FlateDecode, object streams, ToUnicode CMaps), kept in the session scratchpad and not in the project.
- Body text, headings and tables came through.
- Equations and some table layouts are garbled (two-column tables interleave). Every table value quoted below was re-read against the column structure.
- Page references are PDF pages. For FPL chapters, PDF page *n* = printed page "*chapter*–*n*".

---

## 2. Verdict legend

| Verdict | Meaning |
|---|---|
| **VERIFIED** | The source text states the claim. |
| **VERIFIED — NARROWED** | The source supports a narrower or conditional version. The conditions are recorded. |
| **CORRECTED** | The source contradicts or changes the Round 1 statement. |
| **NOT IN SOURCE** | The acquired source does not address the claim. It remains unverified. |
| **NOT VERIFIABLE** | The source needed to check it was not acquired. |

---

## 3. Claim-by-claim verification

### 3.1 Solid wood (oak) — FPL Ch. 4, Ch. 13

| # | Round 1 claim | Verdict | Source text (location) | Notes |
|---|---|---|---|---|
| W1 | Wood moisture content comes to equilibrium with the RH of the surrounding air | **VERIFIED** | "The moisture remaining in the wood tends to come to equilibrium with the relative humidity of the surrounding air." (Ch. 13, p. 13–1) | Ch. 4 p. 4–1: wood "is hygroscopic; it takes on moisture from the surrounding environment." |
| W2 | Controlling MC avoids major dimensional problems | **VERIFIED — NARROWED** | "If moisture content is controlled within reasonable limits by such methods, major problems from dimensional changes can usually be avoided." (Ch. 13, p. 13–1) | "Usually" and "within reasonable limits" must be kept. |
| W3 | Interior wood should be installed at in-service moisture content | **VERIFIED** (added detail) | Install wood at the moisture content levels that the wood will experience in service, "avoiding problems such as floor buckling or cracks in furniture." Table: interior woodwork, flooring, furniture, trim — average 8% (6–10%) for most of the US; 6% (4–9%) dry southwest; 11% (8–13%) damp warm coast (Ch. 13, p. 13–5) | **US climate zones only.** Not transferable to Turkey without a local EMC source. |
| W4 | Shrinkage is anisotropic (tangential > radial) | **VERIFIED** | "Tangential shrinkage is about twice as great as radial." (Ch. 4, p. 4–7, Fig. 4–4 caption) | Ch. 13 p. 13–8: differential radial/tangential/longitudinal shrinkage is "a major cause of warp". |
| W5 | Oak shrinkage values (new — from the source) | **VERIFIED** (US species) | Table 4–3, green to ovendry: white oak 5.6% radial / 10.5% tangential / 16.3% volumetric; northern red oak 4.0 / 8.6 / 13.7 (Ch. 4, p. 4–8) | Table is "Shrinkage values of **domestic** (US) woods". European oak (*Quercus robur/petraea*) is not listed. |
| W6 | End grain takes up water faster (Round 1 attributed this to APA) | **VERIFIED** (in FPL) | Rate of liquid water absorption "is most rapid in the longitudinal direction (that is, when the transverse section or end grain is exposed to water)." (Ch. 4, p. 4–7) | Ch. 13 p. 13–7: longitudinal diffusion "about 10 to 15 times faster than radial or tangential diffusion". |
| W7 | Red vs white oak identification by tyloses (Wood Database) | **NOT IN SOURCE** | P1 documents do not address tyloses. Ch. 16 Fig. 16–2 is a micrograph of red oak ring-porous vessels. | Stays as Round 1 (Tier C, `I`). |
| W8 | Wood Handbook 2021 is public domain | **NOT IN SOURCE / NARROWED** | No licence statement in the four chapters. Ch. 16 Figs. 16–1 to 16–3 carry "Copyright by N.C. Brown Center for Ultrastructure Studies … Used by permission". | Text is a US government work, but **some figures are third-party copyrighted**. Image reuse needs a per-figure check. |

### 3.2 Plywood — FPL Ch. 11

| # | Round 1 claim | Verdict | Source text (location) | Notes |
|---|---|---|---|---|
| P1 | Plywood is built from veneer layers with alternating grain | **VERIFIED** | "Plywood is a flat panel built up wholly or primarily of sheets of veneer called plies. It is constructed with an odd number of layers with the grain direction of adjacent layers oriented perpendicular to one another." (p. 11–6) | — |
| P2 | Plywood moisture behaviour vs particle panels (Round 1 had no verified statement) | **VERIFIED** (new) | "Unlike most panels fabricated from particles, it undergoes minimal irreversible thickness swelling if wetted." (p. 11–7) | Key contrast with MDF/particleboard, from one authority. |
| P3 | Fastening near edges (a Round 1 open question) | **VERIFIED** (new) | "Because the alternating grain direction of its layers significantly reduces splitting, plywood is an excellent choice for uses that call for fasteners to be placed very near the edges of a panel." (p. 11–7) | — |
| P4 | Round 1 gap: "furniture-grade plywood quality differences" | **GAP PARTLY CLOSED** | Two classes: (a) construction and industrial plywood, (b) **hardwood and decorative plywood**, "categorized by species and characteristics of face veneer, bond durability, and composition of center layers (veneer, lumber, particleboard, MDF, or hardboard) (ANSI/HPVA HP-1-2016)." Also: "plywood can be ordered with a solid core and face veneers" where voids are a problem. (p. 11–7) | Furniture plywood belongs to the HP-1 class, **not** the PS 1 / APA construction class Round 1 leaned on. A "plywood" panel may have an MDF or particleboard core — an identification and moisture caveat. |
| P5 | Bond classification (Exterior / Exposure 1) matters for moisture (APA) | **VERIFIED — NARROWED** | "Exposure 1 plywood is intended for applications not permanently exposed to weather, whereas Exterior plywood is suitable for…" (p. 11–7) | Applies to **construction and industrial plywood** (PS 1–09). HP-1 uses its own bond-durability categories (not detailed in the chapter). |

### 3.3 MDF — FPL Ch. 11

| # | Round 1 claim | Verdict | Source text (location) | Notes |
|---|---|---|---|---|
| M1 | MDF is typically UF-bonded (CAMEO: ~82% fibre, 9% UF, 1% wax) | **VERIFIED — NARROWED** | UF resins "are typically used in the manufacture of products used in interior applications, primarily particleboard and medium-density fiberboard (MDF), because moisture exposure leads to a breakdown of the bond-forming reactions." (p. 11–4) | The CAMEO percentages are **not in P1 sources**. FPL: conventional composites use "only a few percent resin" (p. 11–2), a general statement that is not directly comparable. Percentages stay unverified. |
| M2 | MDF moisture sensitivity (implied in Round 1) | **VERIFIED — mechanism** | Same passage: moisture breaks down UF bonds; excessive heat also breaks down cured UF resin (p. 11–4) | This is the chemical basis for edge swelling / bond failure. FPL does not quantify swelling. |
| M3 | ANSI A208.2 classifies MDF by physical and mechanical properties, tolerances and formaldehyde limits | **VERIFIED** | "ANSI A208.2 classifies MDF by physical and mechanical properties, and identifies dimensional tolerances and formaldehyde emission limits (CPA 2016b)." (p. 11–14) | FPL cites the **2016** edition. Round 1 cited the 2022 revision (CPA). Both statements are true for their dates. |
| M4 | Formaldehyde emission regulation exists for MDF | **VERIFIED** | CARB "has established formaldehyde emission standards that cover hardwood plywood, particleboard, and MDF through their Wood Products Airborne Toxic Control Measure (ATCM)" (p. 11–6). Fig. 11–10: MDF formaldehyde emissions certification tag. | California/US. The EU E1 class is not covered. |
| M5 | MDF is used for furniture | **VERIFIED** | "MDF is frequently used in place of solid wood, plywood, and particleboard in many furniture applications. It is also used for interior door skins, mouldings, and interior trim components." (p. 11–14) | — |
| M6 | Current UK/EU MDF dust exposure limits | **NOT VERIFIABLE** | BWF guide not acquired (HTTP 500). The HSE historic document is not a P1 source. | Remains open (Round 1 flagged the dated MEL values). |

### 3.4 Finishes — FPL Ch. 16

| # | Round 1 claim | Verdict | Source text (location) | Notes |
|---|---|---|---|---|
| F1 | No coating entirely prevents moisture uptake (Feist 1987) | **VERIFIED** (by FPL 2021, not Feist) | "Finishes cannot change the EMC of wood; they only slow down the rate of water entering and leaving the wood." "Because no barrier is perfect, wood will get wet…" (p. 16–12) | A current authoritative source now carries the claim. The Feist article itself was not acquired. |
| F2 | Linseed oil, tung oil and lacquer are poor vapour barriers; paraffin wax nearly seals wood (Feist 1987) | **NOT VERIFIABLE / NOT IN SOURCE** | Ch. 16 does not rank finishes by vapour resistance. It says drying oils (tung, linseed, walnut) "can also be used as sealers", "improve water resistance", and "may require several weeks to cure" (p. 16–31). | The comparative ranking stays unverified until Feist is acquired. |
| F3 | Provenance of "Feist 1987" | **CORRECTED** | — | Search results show it is a **Fine Woodworking magazine article** (May/June 1987, pp. 59–61) by W. Feist (FPL) and G. Peterson, republished on the FPL site. Round 1 listed it as an FPL "research article", Tier A. It is a **popular-press article by FPL authors**, and is dated. |
| F4 | Oily rags self-ignite (Round 1: linseed / drying oils) | **CORRECTED — BROADER** | "Sponges, cloths, and paper towels that are wet with oil-based stain, any other oil or oil-alkyd, or urethane finish are particularly susceptible to spontaneous combustion. To prevent fires, immerse such materials in water and seal in a water-filled air-tight metal container immediately after use." (p. 16–19) | The hazard covers **oil-alkyd and urethane finishes**, not only drying oils. Disposal practice differs between sources: FPL says immerse + sealed water-filled metal container; Round 1's fire service source also allows spreading out to dry. Record both. Do not merge. |
| F5 | Film finishes (varnish/PU) are more durable/protective than oils (Round 1: Tier D) | **VERIFIED — NARROWED** | "Smooth film-forming finishes, such as varnish, are generally easier to clean and better at preventing wood from getting dirty, compared with penetrating finishes such as oils… Films, especially when thicker, can also protect the wood from scratches and dents. Films often get worn away by repeated cleaning or by abrasion." (p. 16–30) · Food-contact items: films are "generally more resistant to staining than the oils or sealers. However, eventually the finish may crack, chip, and peel." (p. 16–31) | FPL frames it as **cleanability and film protection**, with a stated failure mode. The Tier D claim "resists water, heat, chemicals and abrasion better than any other" is **not** supported. |
| F6 | Interior finishes are long-lived (new) | **VERIFIED** | Interior finishes "usually last for decades" (p. 16–29). "There is no fundamental reason a clear finish cannot last essentially forever in an indoor environment, as there is no danger of sunburn." (p. 16–30) | — |
| F7 | Furniture finishing methods are covered by FPL | **CORRECTED** | "Methods for furniture finishing are not included in this chapter… Product literature for furniture finishes often contains recommendations for application." (p. 16–29) | Round 1's pack design assumed FPL covers furniture finishing. It **explicitly does not**. Furniture-specific finishing needs another source class. |
| F8 | Finish terminology is not standardized (new; relevant to taxonomy and templates) | **VERIFIED** | "The nomenclature around clear finishes and stains is quite confusing, in part because manufacturers do not adhere to a standard set of definitions for their products." (p. 16–30) | Directly relevant to `11_BOYA_VERNIK_VE_KAPLAMALAR` subcategory naming (varnish vs lacquer vs "oil"). |
| F9 | Vegetable oils as finishes (new) | **VERIFIED** | Vegetable oils "are food for microorganisms such as mildew or bacteria" and "can become rancid" (p. 16–31) | Relevant to DIY "natural oil" practices. |
| F10 | Lead paint hazard on old surfaces (Round 1: EPA, pre-1978) | **VERIFIED — with date difference** | Lead-based paint "widely used in residential structures in the United States until the early 1940s, and its use continued to some extent, for the exterior of dwellings, until 1976." "When working on old painted surfaces, assume that one or more of the paint coats contain lead." (p. 16–33) | FPL says **1976**; EPA's rule threshold is **1978** (the federal residential sale ban). These are different framings. Keep both with context. FPL also notes lead paint "is still manufactured for special applications" and is "widespread in household paints sold in the developing world". |
| F11 | VOC regulation changes finish formulations | **VERIFIED** (US framing) | "Progressively lower limits on the amount of VOCs allowed in finishes have changed their character." (p. 16–15) | The EU Directive 2004/42/EC is corroborated independently by the Osmo PI (P-O4). |

### 3.5 Product documents — Osmo, Minwax

| # | Round 1 claim | Verdict | Source text (location) | Notes |
|---|---|---|---|---|
| P-O1 | Osmo Polyx-Oil: ~24 m²/L per coat | **VERIFIED — NARROWED** | "approx. 24 m²/l recommended" with a microfibre roller (clear); ~30 m²/l with brushes (coloured, floor/flat brush); fleece ~42 m²/l; single disc ~60 m²/l. "All range specifications refer to Oak wood, sanded with P120–P150." (p. 2) | Coverage depends on the applicator and wood. **Reference wood is oak.** |
| P-O2 | Drying 8–10 h at 23 °C / 50% RH | **VERIFIED — NARROWED** | "Approx. 8-10 h (clear) and approx. 24 h (coloured)… (23 °C/50 % rel. humidity)… Lower temperatures and/or higher air humidity may increase drying times." (p. 2) | The coloured version takes ~24 h. |
| P-O3 | Renovation: one coat on a clean, dry surface | **VERIFIED** | "When renovating an already oiled surface, one coat applied to the clean and dry surface is usually sufficient." (p. 2) | Product-specific repairability claim. |
| P-O4 | (new) VOC and self-ignition | **VERIFIED** | "VOC content of max. 500 g/l (Cat. A/i (2010))", fulfilling 2004/42/EC (p. 1). "Wash out any used cloth… or store in an airtight container (danger of self-ignition)." (p. 3) | Independent corroboration of F4 and of the EU VOC directive's category system. |
| P-O5 | (new) Preconditions and exclusions | **VERIFIED** | Wood "moisture content max. 18%" (p. 1). "Old paints, varnishes and lacquers must be completely removed." (p. 1). "Not recommended for dark and extractive-rich hardwoods (e.g. Wenge, Merbau, Jatoba etc.)" (p. 2). Version 02/24. | Product-specific limits of use. |
| P-M1 | Round 1 listed "MINWAX® Water Based Polyurethane — TDS" | **CORRECTED — misidentified** | The document at the listed paintdocs URL is "Minwax® **Water Based Oil-Modified Polyurethane**" (Doc MWX047, Rev. 1/17/2024, p. 1). | A different product (linseed-oil-modified). File renamed accordingly. |
| P-M2 | Minwax TDS as a reliable product source | **CORRECTED — internally inconsistent document** | The same TDS lists "Resin Type: Linseed Oil-Modified Polyurethane", "Solvent: Mineral Spirits", "Odor: Mild Hydrocarbon" and "CONTAINS ALIPHATIC HYDROCARBONS" (pp. 1, 3), while describing a water-based, soap-and-water cleanup product. The Spanish text describes "Poliuretano de Secado Rápido" (an oil-based product) with different recoat times (3–4 h vs 2 h), and the French cleanup line says to use paint thinner or mineral spirits (p. 2). | This TDS appears to merge content from at least two products. Values usable **only** where unambiguous: 2–3 coats; recoat after 2 h (English); 24 h before light use; VOC 275 g/L; sand 220 grit between coats; "Do not use steel wool"; "NEVER SHAKE". All remain **product-specific**, and the document should be treated as **low-confidence**. |

---

## 4. Summary of results

| Verdict | Count | Claims |
|---|---|---|
| VERIFIED | 16 | W1, W3, W4, W5, W6, P1, P2, P3, M3, M4, M5, F1, F6, F8, F9, F11 |
| VERIFIED — NARROWED / with date difference | 8 | W2, P5, M1, M2, F5, F10, P-O1, P-O2 |
| VERIFIED (product-specific, new detail) | 3 | P-O3, P-O4, P-O5 |
| CORRECTED | 5 | F3 (Feist provenance), F4 (oily-rag scope), F7 (FPL excludes furniture finishing), P-M1 (wrong product), P-M2 (inconsistent TDS) |
| GAP PARTLY CLOSED | 1 | P4 (furniture plywood = HP-1 class) |
| NOT IN SOURCE | 2 | W7 (tyloses), W8 (licence — narrowed by the figure-copyright finding) |
| NOT VERIFIABLE | 2 | M6 (MDF exposure limits — BWF not acquired), F2 (finish vapour ranking — Feist not acquired) |

**Still open after P1:**
- the MDF composition percentages (M1);
- current UK/EU MDF dust limits (M6);
- the comparative vapour-barrier ranking of finishes (F2);
- oak tyloses identification (W7, Tier C only);
- EU and Turkish climate EMC values (W3);
- furniture-specific finishing guidance (F7);
- a trustworthy water-based PU TDS (P-M1/M2).

---

## 5. Workflow observations from P1

These are observations only. No rules were written and no structures were created.

1. **Acquisition can fail silently at the listed URL while succeeding elsewhere.**
   - *OBSERVATION:* FPL's `documnts` path returned 403; the official TreeSearch endpoint served the same chapters. BWF returned 500 repeatedly.
   - *INFERENCE:* A source record needs both the canonical landing page and the actual retrieval URL, plus the retrieval date.
2. **Product TDS can be misidentified by URL and can be internally inconsistent.**
   - *OBSERVATION:* The Minwax URL delivered a different product, and the document mixes two products.
   - *INFERENCE:* Product documents need a title and version check on receipt. A single TDS is not self-validating.
3. **Authoritative sources can explicitly exclude a use case.**
   - *OBSERVATION:* FPL Ch. 16 states that furniture finishing methods are not included.
   - *INFERENCE:* "Covered by an authority" must be checked per claim, not assumed per document.
4. **Licence is per element, not per document.**
   - *OBSERVATION:* A public-agency handbook contains third-party copyrighted micrographs.
   - *INFERENCE:* Visual reuse needs a per-figure provenance check.
5. **One authoritative source verified most claims.** 23 of 37 claims were verified, narrowed or gap-closed from the four FPL chapters alone. The two product documents added conditions (applicator, reference species, temperature/RH) that change how a number may be quoted.
6. **Text extraction is now possible locally** with a small dependency-free script. It handles text-based PDFs; scanned PDFs would still need OCR. The script lives in the session scratchpad, not in the project.
