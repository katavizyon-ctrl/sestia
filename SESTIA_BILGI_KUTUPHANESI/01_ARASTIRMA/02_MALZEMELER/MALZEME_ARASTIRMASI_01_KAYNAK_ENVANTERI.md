---
belge_turu: arastirma_kaydi
konu: Malzemeler — Round 1 kaynak envanteri (Output 2)
arastirma_tarihi: 2026-09-25
durum: tamamlandi (ilk tur)
ana_kayit: MALZEME_ARASTIRMASI_01.md
---

# Materials Research Round 1 — Detailed Source Inventory (Output 2)

This file is Output 2 of the Round 1 materials research. The research record, matrix, gap map, shortlist and synthesis are in `MALZEME_ARASTIRMASI_01.md`, in the same folder.

## How to read this inventory

**Verification level (VER)** — read this before relying on any entry:

| Code | Meaning |
|---|---|
| **R** | The page was fetched and read in this round. Statements are checked against its text. |
| **I** | Identified through search. Title, publisher, URL and a search-index summary were seen, but the document itself was **not read**. "Supports" describes what the document is *reported* to cover, not what was verified. |
| **I-pdf** | As **I**. A fetch was attempted but the PDF could not be text-extracted in this environment. |

Only two sources reached **R** in Round 1. Every "Supports" statement for an **I** source must be confirmed against the document before it becomes a claim in a knowledge file.

> **Update 2026-09-25 — Source Verification Round 1, Pack P1:**
> - The P1 entries below (FPL Ch. 4/11/13/16, Osmo, Minwax, Feist, BWF) carry an added **P1** line with their new status.
> - Claim-level verdicts and exact quotes are in `MALZEME_ARASTIRMASI_01_DOGRULAMA_P1.md`.
> - Round 1 text is left as originally written, so the discovery record stays intact.

**Authority classes** follow the research brief:

| Class | Meaning |
|---|---|
| A | Primary / authoritative |
| B | Manufacturer technical |
| C | Professional / technical secondary |
| D | General secondary |

**Scope** is either `General` (material-level) or `Product` (one product or brand).

**Other notes:**
- **Mirror:** A source hosted by a third party rather than its publisher. Provenance should be re-confirmed at the official location before preserving it.
- **DL:** Whether the source is a downloadable file.
- **INBOX:** Whether the source is recommended for the `_INBOX` shortlist in the main record.

---

## 01 — `01_AHSAP`

### Solid oak (`01_MASIF_AHSAP`)

**SOURCE 01**
- **Title:** Wood Handbook — Wood as an Engineering Material (FPL-GTR-282, 2021); especially Ch. 4 "Moisture Relations and Physical Properties of Wood", Ch. 13 "Drying and Control of Moisture Content and Dimensional Changes", Ch. 16 "Finishing Wood"
- **Organization:** USDA Forest Service, Forest Products Laboratory
- **URL:** https://research.fs.usda.gov/fpl/wood-handbook · chapter PDFs: https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_04_fpl_gtr282.pdf · …/chapter_13_fpl_gtr282.pdf · …/chapter_16_fpl_gtr282.pdf
- **Type / class / scope:** handbook · A · General
- **Supports:** moisture–humidity equilibrium, shrinkage and dimensional change, physical properties by species, finishing behaviour (reported chapter scope)
- **Does not establish:** furniture-specific care routines; product-specific finish performance; EU/Turkish species or market context (US-centred)
- **DL:** YES (per-chapter PDFs; public domain per the Wikimedia Commons listing) · **INBOX:** YES · **VER:** I
- **Reason:** Foundational and reusable across the wood, panel and finish families.
- **P1:**
  - Ch. 4, 13 and 16 were acquired via USDA TreeSearch and are now in `_INBOX`. **VER → R.**
  - The `fpl.fs.usda.gov/documnts` URLs return 403.
  - Ch. 16 contains third-party copyrighted figures, so "public domain" does not extend to every figure.

**SOURCE 02**
- **Title:** Distinguishing Red and White Oak
- **Organization:** The Wood Database (Eric Meier)
- **URL:** https://www.wood-database.com/wood-articles/distinguishing-red-oak-from-white-oak/
- **Type / class / scope:** professional article · C · General
- **Supports:** end-grain identification of red vs white oak by tyloses in the earlywood pores, with stated caveats (clean end grain; examine heartwood, because sapwood may lack tyloses)
- **Does not establish:** definitive species identification; properties beyond identification
- **DL:** NO · **INBOX:** NO (web reference; link only) · **VER:** I
- **Reason:** Strong identification value, and the caveats are explicit.

**SOURCE 03**
- **Title:** InsideWood
- **Organization:** NC State University Libraries
- **URL:** https://insidewood.lib.ncsu.edu/
- **Type / class / scope:** institutional database / image collection · A · General
- **Supports:** microscopic wood anatomy descriptions (IAWA feature list) and photomicrographs
- **Does not establish:** macroscopic, phone-photo identification; use or care
- **DL:** NO · **INBOX:** NO · **VER:** I
- **Reason:** Authoritative, but microscopic; relevant for SESTIA only as a deep reference.

**SOURCE 04**
- **Title:** Wood dust — health hazards and control
- **Organization:** SafeWork NSW (NSW Government)
- **URL:** https://www.safework.nsw.gov.au/resource-library/manufacturing/wood-safety-kit/wood-dust-health-hazards-and-control
- **Type / class / scope:** institutional webpage · A · General
- **Supports:** wood dust health hazard framing and controls
- **Does not establish:** exposure limits outside NSW jurisdiction
- **DL:** NO · **INBOX:** NO · **VER:** I
- **Reason:** Jurisdiction-specific; useful as a pointer.

### Plywood (`02_KONTRPLAK_PLYWOOD`)

**SOURCE 01**
- **Title:** Wood Handbook Ch. 11 "Wood-Based Composite Materials: Panel Products, Glued Laminated Timber, Structural Composite Lumber, and Wood–Nonwood Composites" (2021)
- **Organization:** USDA FPL
- **URL:** https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_11_fpl_gtr282.pdf
- **Type / class / scope:** handbook · A · General
- **Supports:** plywood construction (veneer layers), adhesives, panel types incl. particleboard and fiberboard (reported scope)
- **Does not establish:** furniture-grade plywood quality differences (e.g. void-free cores); EU grading
- **DL:** YES · **INBOX:** YES · **VER:** I
- **Reason:** One chapter covers plywood and MDF together, so the two materials can be compared from a single source.
- **P1:**
  - Acquired (TreeSearch 62258). **VER → R.**
  - Closes part of the "furniture-grade plywood" gap: it belongs to the hardwood and decorative plywood class (ANSI/HPVA HP-1-2016), whose centre layers may be veneer, lumber, particleboard, MDF or hardboard.

**SOURCE 02**
- **Title:** Wood Handbook Ch. 12 "Mechanical Properties of Wood-Based Composite Materials" (2021)
- **Organization:** USDA FPL
- **URL:** https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_12_fpl_gtr282.pdf
- **Type / class / scope:** handbook · A · General
- **Supports:** mechanical property data for panel products
- **Does not establish:** practical fastening or edge guidance
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** APA Engineered Wood Construction Guide (Form E30)
- **Organization:** APA – The Engineered Wood Association
- **URL:** found only as third-party copies, e.g. https://web.njit.edu/~washd/cet331/download/notes/construction_guide.pdf. The official APA location was not confirmed.
- **Type / class / scope:** technical guide · A (industry association) · General, US structural panels
- **Supports:** bond classification (Exterior / Exposure 1) and moisture exposure; storage (end grain takes up moisture faster than faces) (search-index summary)
- **Does not establish:** decorative or furniture plywood behaviour; non-US grading
- **DL:** YES (Mirror) · **INBOX:** NO until an official copy is located · **VER:** I
- **Reason:** Construction-sheathing context, not furniture — a scope mismatch to keep in mind.

### MDF (`03_MDF`)

**SOURCE 01**
- **Title:** Wood Handbook Ch. 11 (shared with plywood)
- **Organization / URL:** see Plywood SOURCE 01
- **VER:** I

**SOURCE 02**
- **Title:** Medium Density Fiberboard (product page) and ANSI A208.2-2022 "Medium Density Fiberboard (MDF) for Interior Applications"
- **Organization:** Composite Panel Association (ANSI-accredited standards developer)
- **URL:** https://www.compositepanel.org/products/medium-density-fiberboard/ · https://www.compositepanel.org/new-ansi-mdf-standard-available/
- **Type / class / scope:** standard + institutional webpage · A · General (North America)
- **Supports:** MDF grading by physical and mechanical properties, dimensional tolerances, formaldehyde emission requirement (the 2022 edition adds US EPA TSCA Title VI)
- **Does not establish:** EU emission classes (E1 etc.); DIY guidance
- **DL:** the standard is likely purchase/registration (not confirmed) · **INBOX:** page link only · **VER:** I

**SOURCE 03**
- **Title:** BWF Guide No 7 — Medium Density Fibreboard (MDF)
- **Organization:** British Woodworking Federation
- **URL:** https://www.bwf.org.uk/wp-content/uploads/assets/07_mdf.pdf
- **Type / class / scope:** technical guide · A (trade association) · General
- **Supports:** (not confirmed) MDF use, machining and safety guidance
- **Does not establish:** —
- **DL:** YES · **INBOX:** YES, if retrievable · **VER:** I (fetch returned HTTP 500)
- **Reason:** Retry needed; date unknown.
- **P1:** Acquisition failed again (HTTP 500 to two clients). Not acquired. MDF exposure-limit claims remain unverifiable.

**SOURCE 04**
- **Title:** Medium density fiberboard (MDF)
- **Organization:** MFA Boston — CAMEO
- **URL:** https://cameo.mfa.org/wiki/Medium_density_fiberboard_(MDF)
- **Type / class / scope:** institutional database · A (conservation) · General
- **Supports:** a composition description (reported as ~82% wood fibre, 9% urea-formaldehyde resin, 1% paraffin wax)
- **Does not establish:** that all current MDF uses UF resin. Low-emission and alternative-resin boards exist in the market (**not verified this round**), so the composition must not be generalized.
- **DL:** NO · **INBOX:** NO · **VER:** I
- **P1:**
  - FPL Ch. 11 confirms UF is "typically" used for MDF, and that moisture breaks down UF bonds.
  - The 82/9/1 percentages are **not** confirmed by any P1 source.

**SOURCE 05 (outdated — kept on purpose)**
- **Title:** Newsletter of the Woodworking National Interest Group — MDF hazard assessment
- **Organization:** HSE (historic document, hosted by a third party)
- **URL:** https://www.scosarg.com/media/leaflets/HSE/Mdf%20Hazard%20Assessment%20Doc.pdf
- **Type / class / scope:** institutional document · A (historic) · General
- **Supports:** historic control approach (LEV; keep dust and formaldehyde as low as reasonably practicable)
- **Does not establish:** current limits. It uses "MEL" values (5 mg/m³ wood dust; 2 ppm formaldehyde) from a superseded UK regime. A current secondary summary states HSE applies the 3 mg/m³ hardwood WEL to MDF dust (**not verified at source**).
- **DL:** YES (Mirror) · **INBOX:** NO · **VER:** I
- **Reason:** Recorded as an example of time-sensitive safety data.

---

## 02 — `02_TAS_VE_TAS_ESASLI_MALZEMELER`

### Marble (`01_MERMER`)

**SOURCE 01**
- **Title:** Dimension Stone Design Manual (2022 edition; a July 2024 edition was published online in January 2025)
- **Organization:** Natural Stone Institute (NSI)
- **URL:** official: https://www.naturalstoneinstitute.org/about/press-releases/2022-press-releases/updated-dimension-stone-design-manual-available-now/ (resource library). Full 2022 PDF seen only as a Mirror: https://republicelite.com/wp-content/uploads/2022/06/DSDM_2022_All_Chapters.pdf
- **Type / class / scope:** technical handbook · A (industry association) · General
- **Supports:** stone descriptions, technical data, installation, detailing for wet areas and countertops, maintenance (reported scope)
- **Does not establish:** behaviour of a specific quarry/block; non-US practice
- **DL:** YES · **INBOX:** YES (official copy) · **VER:** I

**SOURCE 02**
- **Title:** Learn About Cleaning Products for Natural Stone (consumer care pages)
- **Organization:** NSI
- **URL:** https://www.naturalstoneinstitute.org/consumers/care/
- **Type / class / scope:** maintenance guide · A · General
- **Supports:** neutral cleaners; acid avoidance on calcareous stone
- **Does not establish:** etch repair methods (that is professional work)
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Which ASTM Standards Are Relevant to Natural Stone
- **Organization:** NSI
- **URL:** https://www.naturalstoneinstitute.org/designprofessionals/astm/
- **Type / class / scope:** institutional webpage · A · General
- **Supports:** a map of the relevant ASTM specifications (e.g. marble, travertine)
- **Does not establish:** the standards' contents (paywalled)
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 04**
- **Title:** Building Stones Database for England / Building Stone Database Scotland
- **Organization:** British Geological Survey (with Historic England / Historic Environment Scotland)
- **URL:** https://www.bgs.ac.uk/mineralsuk/minerals/building-stones/building-stones-database-for-england/ · https://webservices.bgs.ac.uk/buildingstone
- **Type / class / scope:** institutional database + image collection · A · General (UK stones)
- **Supports:** stone identity, provenance, reference imagery
- **Does not establish:** imported decorative marbles common in Turkey
- **DL:** NO · **INBOX:** NO · **VER:** I

### Travertine (`02_TRAVERTEN`)

**SOURCE 01**
- **Title:** NSI Dimension Stone Design Manual — "Travertine" chapter (© 2022)
- **Organization:** NSI
- **URL:** Mirror: https://transparencycatalog.com/assets/uploads/greener-images/12-TRAVERTINE-2022.pdf
- **Type / class / scope:** handbook chapter · A · General
- **Supports:** (not confirmed) definition, filled/unfilled and honed/polished finishes, property requirements
- **Does not establish:** —
- **DL:** YES · **INBOX:** YES, via the full official manual · **VER:** I-pdf
- **Reason:** The fetch summary was generic and is not relied on.

**SOURCE 02**
- **Title:** ASTM C1527/C1527M Standard Specification for Travertine Dimension Stone
- **Organization:** ASTM International
- **URL:** https://store.astm.org/c1527_c1527m-11r18.html
- **Type / class / scope:** standard · A · General
- **Supports:** which property requirements exist (absorption, density, compressive strength, modulus of rupture, abrasion, flexural strength); the scope explicitly excludes cast/agglomerated products
- **Does not establish:** requirement values (paywalled, not read)
- **DL:** purchase · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** NSI consumer care pages (shared with marble)
- **VER:** I

### Engineered quartz (`08_KUVARS_KOMPOZIT`)

**SOURCE 01**
- **Title:** Silica — Engineered stone ban
- **Organization:** Safe Work Australia
- **URL:** https://www.safeworkaustralia.gov.au/safety-topic/hazards/silica/engineered-stone-ban
- **Type / class / scope:** regulator webpage · A · General (Australia)
- **Supports:**
  - the ban on manufacture/supply/processing/installation of engineered stone benchtops, panels and slabs from 1 July 2024;
  - that products with <1% crystalline silica (e.g. some porcelain and sintered stone) are outside the ban;
  - the statement that there is no evidence of a safe silica threshold in engineered stone (all per search-index summary)
- **Does not establish:** rules outside Australia; the precise legal definition (the page timed out on fetch)
- **DL:** NO · **INBOX:** NO (link; regulatory page changes) · **VER:** I

**SOURCE 02**
- **Title:** OSHA/NIOSH Hazard Alert: Worker Exposure to Silica during Countertop Manufacturing, Finishing, and Installation (NIOSH pub. 2026-101; updated February 2026)
- **Organization:** NIOSH (CDC) / OSHA
- **URL:** https://www.cdc.gov/niosh/publications/numbered/2026-101.html
- **Type / class / scope:** hazard alert · A · General (US)
- **Supports:** engineered stone RCS content "typically over 90%"; silicosis risk; the OSHA PEL of 50 µg/m³ (8-hour TWA); controls
- **Does not establish:** consumer-use risk of an installed, uncut surface (not addressed in the summary seen)
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 03**
- **Title:** Wilsonart® Quartz Care & Maintenance (3/27/23)
- **Organization:** Wilsonart
- **URL:** https://www.wilsonart.com/media/Technical_Resources/en/Quartz_Care_Maintenance.pdf
- **Type / class / scope:** maintenance guide · B · Product
- **Supports:** care instructions for that product line (e.g. hot pads/trivets)
- **Does not establish:** material-wide heat limits
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 04**
- **Title:** Cambria Quartz Product Care
- **Organization:** Cambria
- **URL:** https://www.cambriausa.com/quartz-countertops/product-care
- **Type / class / scope:** maintenance guide · B · Product
- **Supports:** second-manufacturer care guidance, for comparison
- **DL:** NO · **INBOX:** NO · **VER:** I

**Recorded disagreement:**
- A general encyclopedia summary states quartz is "not affected by temperatures lower than 150 °C".
- Manufacturer care guides instead say to always use a trivet, and warn about thermal shock near edges and cut-outs.

These are not reconciled. The 150 °C figure has no identified primary source. **Unresolved.**

---

## 03 — `03_SERAMIK_VE_FAYANS`

### Porcelain / gres (`02_PORSELEN_VE_GRES`)

**SOURCE 01**
- **Title:** Porcelain in the Ceramic Tile Industry
- **Organization:** Tile Council of North America (TCNA)
- **URL:** https://tcnatile.com/wp-content/uploads/2022/08/Porcelain-in-the-Ceramic-Tile-Industry.pdf
- **Type / class / scope:** technical guide · A (industry association) · General
- **Supports:** (not confirmed — PDF not extracted) the porcelain definition and certification context
- **DL:** YES · **INBOX:** YES · **VER:** I-pdf

**SOURCE 02**
- **Title:** ISO 13006:2018 Ceramic tiles — Definitions, classification, characteristics and marking (preview)
- **Organization:** ISO (preview via iTeh)
- **URL:** https://cdn.standards.iteh.ai/samples/63406/15e46e89b1ca44098a24ce182c51bcc0/ISO-13006-2018.pdf
- **Type / class / scope:** standard (preview) · A · General
- **Supports:** classification by forming method and water absorption; group BIa = dry-pressed, Eb ≤ 0.5%
- **Does not establish:** full requirement tables (preview only)
- **DL:** preview · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** The Eminence of Porcelain Tile (ANSI A137.1 / ASTM definition)
- **Organization:** ANSI (blog)
- **URL:** https://blog.ansi.org/ansi/porcelain-ceramic-tile-ansi-a137-1-astm-definition/
- **Type / class / scope:** institutional webpage · A · General
- **Supports:** the porcelain definition: absorption ≤ 0.5% per ASTM C373 (ANSI A137.1 / A137.3); PTCA certification
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 04**
- **Title:** DIN EN 14411 — Terms and classifications (09.2020)
- **Organization:** Agrob Buchtal
- **URL:** https://agrob-buchtal.de/upload/media/downloads/0001/04/2123ed406d7f2894f8dc5cb71e48f177bc449847/DIN_EN_14411_EN.pdf
- **Type / class / scope:** technical guide · B · General (explains the EN standard)
- **Supports:** an EU classification explainer
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**Note:** The definitional claim (≤ 0.5% absorption) is consistent across ISO, ANSI and the manufacturer explainer. This is an example of a claim that one authoritative source can establish.

### Terracotta (`03_TERRAKOTTA_VE_PISMIS_TOPRAK`)

**SOURCE 01**
- **Title:** Understanding and Conserving Terracotta and Faience
- **Organization:** Historic England
- **URL:** https://historicengland.org.uk/advice/technical-advice/buildings/decorative-features/terracotta-and-faience/
- **Type / class / scope:** conservation guidance · A · General (architectural terracotta)
- **Supports:** deterioration mechanisms, manufacturing and construction defects, conservation approach
- **Does not establish:** unglazed interior **floor-tile** care. The scope differs from the target material (**scope mismatch**).
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 02**
- **Title:** Inform Guide: Terracotta and Faience
- **Organization:** Historic Environment Scotland (Engine Shed)
- **URL:** https://www.engineshed.scot/publications/publication/?publicationId=2e62ad79-55f8-4dd4-ad5c-a59800a2d8f3
- **Type / class / scope:** conservation guide · A · General (architectural)
- **Supports / limits:** same scope caveat as SOURCE 01
- **DL:** YES (likely PDF; not confirmed) · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** Technical Sheet, Installation & Maintenance
- **Organization:** Terra Tiles (terracotta tile producer)
- **URL:** https://terra-tiles.com/en/installation-and-maintenance.php
- **Type / class / scope:** installation / maintenance guide · B · Product
- **Supports:** sealing/impregnation and maintenance practice for that producer's tiles
- **Does not establish:** general terracotta behaviour
- **DL:** NO · **INBOX:** NO · **VER:** I

**Gap:** For unglazed terracotta *floor tiles*, every care and efflorescence source found in this round was either Tier D (blogs, retailers) or one producer's own guidance. No independent institutional source was found.

### Handmade tile / çini (`04_CINI_VE_EL_YAPIMI_SERAMIK`)

**SOURCE 01**
- **Title:** "Farklı Silis Oranlarının Taş Çini Özelliklerine Olan Etkilerinin Araştırılması"
- **Organization:** El-Cezeri Journal of Science and Engineering (DergiPark)
- **URL:** https://dergipark.org.tr/en/pub/ecjse/article/949223
- **Type / class / scope:** academic paper · A · General (replica stonepaste çini)
- **Supports:** the effect of 80% vs 90% silica on the technical properties of replica "taş çini" bodies
- **Does not establish:** commercial çini (Kütahya-type) properties; care or durability in use
- **DL:** YES (likely PDF via DergiPark; not confirmed) · **INBOX:** YES · **VER:** I
- **Reason:** A Turkish primary research source — relevant and rare.

**SOURCE 02**
- **Title:** İznik Çinisi
- **Organization:** T.C. Bursa Valiliği
- **URL:** https://www.bursa.gov.tr/iznik-cinisi
- **Type / class / scope:** institutional webpage · A (government; cultural rather than technical) · General
- **Supports:** cultural/historical identity; reported composition claims
- **Does not establish:** technical performance
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** İznik Çinisi
- **Organization:** İznik Vakfı (foundation that also produces tiles)
- **URL:** https://www.iznik.com/tr/sayfa/iznik-cinisi
- **Type / class / scope:** institutional / producer webpage · B/C · General
- **Supports:** the producer's description of a high-quartz body and its production
- **Does not establish:** independent verification
- **DL:** NO · **INBOX:** NO · **VER:** I

**Recorded disagreement (unresolved):**
- *Quartz content:* reported values across the Turkish sources seen include ~80% quartz, 75–85%, and 85–90% "in the best period".
- *Firing temperature:* 850–950 °C in one summary; not cross-checked.

These may refer to different periods, replica recipes or definitions (quartz vs total silica).

---

## 04 — `04_METAL`

### Carbon / mild steel (`01_DEMIR_VE_CELIK`)

**SOURCE 01**
- **Title:** Corrosion of structural steel (overview and protection)
- **Organization:** SteelConstruction.info (BCSA / SCI)
- **URL:** https://www.steelconstruction.info/Corrosion_of_structural_steel
- **Type / class / scope:** technical guide · A/C (industry-technical) · General
- **Supports:** time of wetness and pollution (sulphates, chlorides) drive the corrosion rate; the statement that a dry heated interior has insignificant corrosion risk
- **Does not establish:** decorative/furniture finishes (powder coat, clear lacquer, "raw steel" looks)
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 02**
- **Title:** Steel Corrosion Rate in Atmospheric & Other Environments
- **Organization:** American Galvanizers Association
- **URL:** https://galvanizeit.org/corrosion/corrosion-process/corrosion-rate
- **Type / class / scope:** institutional webpage · B/C (industry association with a commercial interest in galvanizing) · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Change in Enforcement Expectations for Mild Steel Welding Fume (STSU1-2019)
- **Organization:** HSE (UK)
- **URL:** https://www.hse.gov.uk/safetybulletins/mild-steel-welding-fume.htm
- **Type / class / scope:** regulator bulletin · A · General (UK)
- **Supports:** mild steel welding fume treated as a human carcinogen (IARC evidence); LEV required indoors; RPE for residual fume and outdoor work
- **DL:** NO · **INBOX:** NO · **VER:** I

**Gap:** No independent source was found for interior steel furniture finishes or for the care of "raw" and clear-lacquered steel.

### Aluminium (`03_ALUMINYUM`)

**SOURCE 01**
- **Title:** AAC Technical Bulletin — Specifying Anodized Finishes (2024 upload)
- **Organization:** Aluminum Anodizers Council
- **URL:** https://www.anodizing.org/wp-content/uploads/2024/09/specifying-anodized-finishes.pdf
- **Type / class / scope:** technical bulletin · A/B (industry association) · General
- **Supports:** anodized finish specification basics
- **Does not establish:** powder-coated or raw aluminium behaviour
- **DL:** YES · **INBOX:** YES · **VER:** I-pdf (not fetched)

**SOURCE 02**
- **Title:** AAMA 609 & 610-02 Cleaning and Maintenance Guide for Architecturally Finished Aluminum
- **Organization:** AAMA (now FGIA); copy hosted by C.R. Laurence
- **URL:** https://www.crlaurence.com/medias/care-architecturally-finished-aluminum.pdf (long query string omitted)
- **Type / class / scope:** maintenance guide / standard · A · General
- **DL:** YES (Mirror) · **INBOX:** YES, if the official copy is confirmed · **VER:** I

**SOURCE 03**
- **Title:** Anodize Cleaning & Maintenance
- **Organization:** Linetec
- **URL:** https://linetec.com/anodize/anodize-cleaning-maintenance/
- **Type / class / scope:** maintenance guide · B · General (finisher)
- **Supports:** mild soap; harsh chemicals can mar the finish
- **DL:** NO · **INBOX:** NO · **VER:** I

### Brass (`05_PIRINC_VE_BRONZ`)

**SOURCE 01**
- **Title:** The Cleaning, Polishing and Protective Waxing of Brass and Copper — CCI Notes 9/3
- **Organization:** Canadian Conservation Institute
- **URL:** https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/canadian-conservation-institute-notes/care--brass-copper.html
- **Type / class / scope:** conservation guide · A · General
- **Supports:** gentle cleaning methods; avoiding abrasives; protective waxing
- **Does not establish:** the treatment of lacquered new hardware
- **DL:** NO (web) · **INBOX:** save as a web capture (the page is authoritative) · **VER:** I

**SOURCE 02**
- **Title:** Clear Organic Finishes for Copper and Copper Alloys (A1350)
- **Organization:** Copper Development Association
- **URL:** https://www.copper.org/publications/pub_list/pdf/a1350.pdf
- **Type / class / scope:** technical guide · A/B (industry association) · General
- **Supports:** lacquers with tarnish inhibitor (benzotriazole); surface prep requirements
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 03**
- **Title:** Statuary and Patina Finishes / How to Apply Statuary and Patina Finishes (A1081)
- **Organization:** Copper Development Association
- **URL:** https://copper.org/resources/properties/protection/finishes/ · https://www.copper.org/publications/pub_list/pdf/a1081.pdf
- **Type / class / scope:** technical guide · A/B · General
- **Supports:** brown/statuary finishes for brass and bronze; how patinas form
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 04**
- **Title:** Cleaning Copper Alloy Architectural Features
- **Organization:** US GSA (Historic Preservation Technical Procedures)
- **URL:** https://www.gsa.gov/real-estate/technical-procedures/cleaning-copper-alloy-architectural-features
- **Type / class / scope:** technical procedure · A · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**Not researched:** lead content in free-machining brass (relevant to safety and food contact). Recorded as a gap.

---

## 05 — `05_CAM_VE_AYNA`

### Tempered glass (`02_TEMPERLI_VE_LAMINE_CAM`)

**SOURCE 01**
- **Title:** Nickel Sulfide and Spontaneous Breakage
- **Organization:** Vitro Architectural Glass (Glass Education Center)
- **URL:** https://glassed.vitroglazings.com/nickel-sulfide-and-spontaneous-breakage
- **Type / class / scope:** technical guide · B · General (manufacturer education)
- **Supports:**
  - tempered glass cannot be cut after tempering;
  - nickel sulfide inclusions can cause spontaneous breakage **only in fully tempered** glass;
  - there is no practical way to inspect for the inclusions
- **DL:** NO · **INBOX:** save as a web capture · **VER:** I

**SOURCE 02**
- **Title:** Safety glass — laminated or tempered for higher safety
- **Organization:** Guardian Glass
- **URL:** https://www.guardianglass.com/us/en/why-glass/build-with-glass/glass-functions/safety-glass
- **Type / class / scope:** technical webpage · B · General
- **Supports:** breakage patterns and safety classification context
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Installation Techniques Designed to Prolong the Life of Flat Glass Products
- **Organization:** GANA (Glass Association of North America); copy hosted by United Plate Glass
- **URL:** https://www.unitedplateglass.com/resources/product_technical_documents/gana_properinstallationtechniques_1.pdf
- **Type / class / scope:** technical guide · A (industry association) · General
- **DL:** YES (Mirror) · **INBOX:** YES, if the official copy is found · **VER:** I

**Gap:** The product standards (EN 12150, ASTM C1048) and safety-glazing rules (e.g. ANSI Z97.1 / 16 CFR 1201) were not accessed.

### Laminated glass (`02_TEMPERLI_VE_LAMINE_CAM` — same subcategory as tempered)

**SOURCE 01**
- **Title:** Sealant Compatibility – Saflex™ Structural (DG) PVB interlayer
- **Organization:** Eastman (Saflex)
- **URL:** https://saflex-vanceva.eastman.com/content/dam/saflex/pdf-documents/arch/saflex-structural/AMI%20ATD%20Sealant%20Compatibility%20-%20Saflex%20Structural%20(DG)_101024.pdf
- **Type / class / scope:** compatibility guide · B · Product (interlayer)
- **Supports:** "no commercially available sealant has been found to be consistently 100% compatible"; acetoxy silicones show the largest edge effects (search summary)
- **Does not establish:** EVA or SGP interlayer behaviour
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Exploring the edge
- **Organization:** Eastman (Saflex)
- **URL:** https://saflex-vanceva.eastman.com/en/architectural/resources/inspiration/exploring-edge
- **Type / class / scope:** technical article · B · Product
- **Supports:** edge stability and edge delamination
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Testing of Glass Laminates for Edge Stability
- **Organization:** glassonweb.com
- **URL:** https://www.glassonweb.com/article/testing-glass-laminates-edge-stability
- **Type / class / scope:** professional article · C · General
- **DL:** NO · **INBOX:** NO · **VER:** I

### Mirror (`05_AYNA_VE_AYNA_YUZEYLERI`)

**SOURCE 01**
- **Title:** Mirox MNGE & 4Green — Installation Guide, v3.0 (June 2018)
- **Organization:** AGC Glass Europe
- **URL:** https://www.agc-yourglass.com/sites/default/files/technical_documents/original/IG_Mirox_V03_EN.pdf
- **Type / class / scope:** installation guide · B · Product
- **Supports:** neutral-cure, backing-compatible adhesives; adhesive strip pattern; avoiding solvent/acid adhesives
- **Does not establish:** other mirror brands' backings
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** GANA installation techniques (shared with tempered glass)
- **VER:** I

**SOURCE 03**
- **Title:** Seven Deadly Sins of Mirror Installation
- **Organization:** Walker Glass
- **URL:** https://www.walkerglass.com/blog/seven-deadly-sins-of-mirror-installation/
- **Type / class / scope:** professional article · B/C · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**Note:** Explanations of desilvering / black-edge corrosion (moisture and ammonia cleaners attacking the edge) came mainly from Tier D and mirror-seller pages. They are plausible but **not confirmed by an institutional source** this round.

---

## 06 — `06_KUMAS_VE_TEKSTIL`

### Linen (`01_DOGAL_LIFLI_KUMASLAR`)

**SOURCE 01**
- **Title:** Flax fibre — Performance and properties
- **Organization:** Alliance for European Flax-Linen & Hemp (formerly CELC)
- **URL:** https://allianceflaxlinenhemp.eu/en/flax-performance-and-properties
- **Type / class / scope:** institutional webpage · A/B (sector promotion body — note its promotional interest) · General
- **Supports:** fibre-level properties (absorption, thermoregulation, stiffness)
- **Does not establish:** the upholstery performance of a given linen fabric
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 02**
- **Title:** ACT Voluntary Performance Guidelines (overview + abrasion, colorfastness to light, physical properties, crocking, flammability)
- **Organization:** Association for Contract Textiles
- **URL:** https://contracttextiles.org/performance-guidelines/ · https://contracttextiles.org/wp-content/uploads/2016/12/act_abrasion_011615.pdf
- **Type / class / scope:** standard-like guideline · A (industry association) · General (fibre-neutral)
- **Supports:** which performance dimensions matter for upholstery and how they are tested
- **Does not establish:** linen-specific values
- **DL:** YES · **INBOX:** YES · **VER:** I

**Gap:** No independent source was found on linen-specific lightfastness, pilling or abrasion in upholstery use.

### Polyester upholstery fabric (`02_SENTETIK_VE_KARISIM_KUMASLAR` / `03_DOSEMELIK_KUMASLAR` — fits both)

**SOURCE 01**
- **Title:** ACT Performance Guidelines (shared)
- **VER:** I

**SOURCE 02**
- **Title:** Materials Market Report 2025 (published 18 September 2025)
- **Organization:** Textile Exchange
- **URL:** https://textileexchange.org/knowledge-center/reports/materials-market-report-2025/ · PDF: https://textileexchange.org/app/uploads/2025/09/Materials-Market-Report-2025.pdf
- **Type / class / scope:** market / sustainability report · A · General
- **Supports:** polyester ~59% of global fibre output (88% fossil-based); recycled polyester share ~12%, 98% of it from PET bottles; <1% of the fibre market from recycled textiles (2024 data)
- **Does not establish:** the recyclability of a specific upholstery fabric
- **DL:** YES · **INBOX:** YES (**time-sensitive**) · **VER:** I

**SOURCE 03**
- **Title:** The Furniture and Furnishings (Fire) (Safety) Regulations 1988 + "New upholstered furniture: fire safety" guide
- **Organization:** legislation.gov.uk / Business Companion (trading standards)
- **URL:** https://legislation.gov.uk/uksi/1988/1324/schedule/3/made?view=plain · https://www.businesscompanion.info/en/quick-guides/product-safety/new-upholstered-furniture-fire-safety
- **Type / class / scope:** regulation + guide · A · General (UK only)
- **Supports:** cigarette and match tests (BS 5852), cover fabric requirements
- **Does not establish:** Turkish or EU-wide requirements
- **DL:** NO · **INBOX:** NO · **VER:** I

### Velvet (`06_ORGULU_VE_DOKULU_KUMASLAR` / `03_DOSEMELIK_KUMASLAR`)

**SOURCE 01**
- **Title:** An upholsterer and curtain makers guide to velvet
- **Organization:** James Dunlop Textiles
- **URL:** https://www.jamesdunloptextiles.com/journal/trends-inspiration/handling-care-velvets
- **Type / class / scope:** handling / care guide · B · General (manufacturer)
- **Supports:** pile bruising/flattening in cotton velvet; brushing in the pile direction
- **DL:** NO · **INBOX:** save as a web capture · **VER:** I

**SOURCE 02**
- **Title:** ACT Performance Guidelines (shared)
- **VER:** I

**Note:**
- Upholstery cleaning codes (W / S / WS / X) are widely repeated on Tier D pages.
- Those pages attribute the codes to a "Joint Industry Committee"; **the origin was not verified**.
- Velvet durability figures ("15,000–25,000 double rubs" for cotton velvet) come from a Tier D retailer page and are **not relied on**.

---

## 07 — `07_DERI_VE_DERI_ALTERNATIFLERI`

### Full-grain leather (`01_DOGAL_DERI`)

**SOURCE 01**
- **Title:** 74 need-to-know leather industry terms; LWG List of Definitions v1.1
- **Organization:** Leather Working Group
- **URL:** https://www.leatherworkinggroup.com/learn-more/features/74-essential-leather-industry-terms/ · https://www.leatherworkinggroup.com/fileadmin/uploads/lwg/Knowledge/LWG_List_of_Definitions_v1.1.pdf
- **Type / class / scope:** glossary · A (multi-stakeholder certification body) · General
- **Supports:** definitions of full grain, corrected grain, nubuck and suede
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** ISO 15115:2019 Leather — Vocabulary (and EN 15987:2022)
- **Organization:** ISO / CEN
- **URL:** https://www.iso.org/standard/67424.html · preview: https://cdn.standards.iteh.ai/samples/67424/1a3dedfed756454db8c0925d256d00b7/ISO-15115-2019.pdf
- **Type / class / scope:** standard · A · General
- **Supports:** formal terminology, including a coating-thickness criterion referenced in definitions (not read in full)
- **DL:** preview · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Caring for leather, skin and fur (modified 2018-12-14)
- **Organization:** Canadian Conservation Institute
- **URL:** https://www.canada.ca/en/conservation-institute/services/preventive-conservation/guidelines-collections/caring-leather-skin-fur.html
- **Type / class / scope:** conservation guide · A · General (museum objects)
- **Supports:**
  - keep RH below 65% (mould) and stable;
  - remove UV;
  - no leather dressings for museum objects (oils oxidize and stiffen, attract dust);
  - avoid saddle soap (alkaline);
  - red rot in vegetable-tanned leather
- **Does not establish:** the care of finished upholstery leather in daily use
- **DL:** NO · **INBOX:** save as a web capture · **VER:** **R**

**SOURCE 04**
- **Title:** Genuine leather or lookalike material?
- **Organization:** SATRA Technology
- **URL:** https://www.satra.com/spotlight/article.php?id=512
- **Type / class / scope:** professional / technical article · A/C (testing institute) · General
- **Supports:** a uniform cross-section indicates non-leather; reference to EN ISO 17131:2020 (identification by microscopy); a hand-held loupe for surface and cross-section
- **DL:** NO · **INBOX:** save as a web capture · **VER:** I

**Recorded contextual disagreement:**
- CCI advises against dressings for **museum objects**.
- Furniture-leather retailers commonly recommend conditioners for **in-use upholstery**.

This is not necessarily a contradiction: the objects, finishes and goals differ. It must not be collapsed into one rule.

### Nubuck / suede (`02_SUET_VE_NUBUK`)

- **SOURCE 01:** LWG terms (shared). Nubuck is buffed on the grain side and the grain pattern stays visible; suede is napped, typically on the flesh/split side. **VER:** I
- **SOURCE 02:** ISO 15115 (shared). **VER:** I

**Gap:** Cleaning and stain removal for nubuck and suede were found only on care-product manufacturer and retailer pages (Tier B/D with a commercial interest).

### PU synthetic leather (`04_SENTETIK_DERI`)

**SOURCE 01**
- **Title:** Hydrolysis: What You Need to Know
- **Organization:** Association for Contract Textiles
- **URL:** https://contracttextiles.org/learn/hydrolysis-what-you-need-to-know/
- **Type / class / scope:** technical guide · A · General
- **Supports:**
  - PU-coated fabrics are susceptible to hydrolysis; PVC-based fabrics are not;
  - ACT recommends ISO 1419 (70 °C, ≥95% RH) with a **5-week minimum**;
  - "no direct correlation of testing weeks to years of service in the field"
- **DL:** NO (references a 2022 document) · **INBOX:** save as a web capture · **VER:** **R**

**SOURCE 02**
- **Title:** Physical Properties — Coated Fabrics, Indoor Use
- **Organization:** ACT
- **URL:** https://contracttextiles.org/performance-guidelines/physical-properties-coated-fabrics/
- **Type / class / scope:** guideline · A · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Hydrolysis Testing Methods (2017)
- **Organization:** Mitchell Faux Leathers
- **URL:** https://mitchellfauxleathers.com/home/faux-leather-viewpoint/viewpoint/2017/03/27/hydrolysis-testing-methods
- **Type / class / scope:** professional article · B · General
- **Supports:** the view that residential upholstery should withstand ≥3 weeks and commercial ≥5 weeks
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 04**
- **Title:** REACH Annex XVII entry 51 (phthalates DEHP, DBP, BBP, DIBP ≥0.1% in plasticised material in articles, since July 2020)
- **Organization:** ECHA / European Commission
- **URL:** https://echa.europa.eu/documents/10162/aaa92146-a005-1dc2-debe-93c80b57c5ee
- **Type / class / scope:** regulation · A · General (EU)
- **Supports:** the chemical restriction relevant to **PVC-coated** (not PU) synthetic leathers and to flexible vinyl
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**Explained disagreement:** 3 weeks (Mitchell, residential) vs 5 weeks (ACT, contract). The difference is one of **application context**. ACT also warns against converting weeks into years of service.

---

## 08 — `08_DOGAL_LIF_VE_ORGU_MALZEMELERI`

### Rattan (`01_RATTAN_VE_KAMIS`)

**SOURCE 01**
- **Title:** INBAR technical reports on rattan processing (several PDFs; e.g. https://www.inbar.int/wp-content/uploads/2020/05/1489452519.pdf)
- **Organization:** International Bamboo and Rattan Organisation (INBAR; treaty-based intergovernmental body)
- **Type / class / scope:** technical report · A · General
- **Supports:** processing: steaming and steam-bending, drying to moisture content, chemicals used in processing (search summary)
- **Does not establish:** the domestic care of finished furniture
- **DL:** YES · **INBOX:** YES, after the exact title is confirmed · **VER:** I (the exact report title was not confirmed)

**SOURCE 02**
- **Title:** FAQs on Bamboo and Rattan
- **Organization:** INBAR
- **URL:** https://www.inbar.int/faqs/
- **Type / class / scope:** institutional webpage · A · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**Gap:**
- Care claims (e.g. 40–60% RH, misting, linseed oil, bleach for mildew) came only from Tier D pages. **Not relied on.**
- Natural rattan vs synthetic "PE rattan" / resin wicker was not researched. This is an important visual-identification risk.

### Bamboo (`02_BAMBU`)

**SOURCE 01**
- **Title:** Post-Harvest Bamboo Treatment, Preservation and Storage Practices (2022); Technical Report No. 26
- **Organization:** INBAR
- **URL:** https://www.inbar.int/wp-content/uploads/2020/05/1489455793.pdf (TR 26)
- **Type / class / scope:** technical report · A · General
- **Supports:** untreated culm durability is low (a summary reports "<2 years" without treatment); treatment methods
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Traditional Chinese bamboo furniture processing techniques
- **Organization:** INBAR
- **URL:** https://www.inbar.int/wp-content/uploads/2020/05/1489453235.pdf
- **Type / class / scope:** technical report · A · General
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** Peer-reviewed studies on bamboo scrimber (e.g. PMC9823703, PMC7582354)
- **Organization:** various journals (via PMC)
- **Type / class / scope:** academic paper · A · Product-class (scrimber, not round culm or plybamboo)
- **DL:** YES · **INBOX:** NO (too specialised for Round 1) · **VER:** I

**Observation:** "Bamboo" covers at least round culm, split/woven bamboo, plybamboo panels and bamboo scrimber, and these behave differently.

### Cork (`03_MANTAR`)

**SOURCE 01**
- **Title:** "Cork: a strategic material"
- **Organization:** peer-reviewed review (PMC3990040)
- **URL:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3990040/
- **Type / class / scope:** academic review · A · General
- **Supports:** cork structure and properties (low density, elasticity, low permeability)
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** "The Potential of Agglomerated Cork for Sandwich Structures…"
- **Organization:** peer-reviewed (PMC6960757)
- **URL:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6960757/
- **Type / class / scope:** academic paper · A · Product-class (agglomerated cork)
- **Supports:** reported ranges: thermal conductivity 0.036–0.065 W/m·K; density 65–240 kg/m³ (across cork materials)
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** Cork Flooring Product Specifications
- **Organization:** AmCork
- **URL:** https://www.amcork.com/pages/cork-flooring-product-specifications
- **Type / class / scope:** specification sheet · B · Product
- **DL:** NO · **INBOX:** NO · **VER:** I

**Gap:** APCOR (the Portuguese Cork Association) technical publications were not reached.

---

## 09 — `09_PLASTIK_VE_KAUCUK`

### Acrylic / PMMA (`01_AKRILIK_PLEKSI`)

**SOURCE 01**
- **Title:** Cleaning and disinfecting PLEXIGLAS® (211-13); Guidelines for Workshop Practice: Fabricating Tips for Solid Sheets (311-5); Surface Treatment (311-4)
- **Organization:** Röhm
- **URL:** https://www.plexiglas.de/files/plexiglas-content/pdf/technische-informationen/211-13-Cleaning-and-Disinfecting-PLEXIGLAS.pdf · https://www.plexiglas.de/files/plexiglas-content/pdf/verarbeitungsrichtlinie/311-5-Fabricating-Tips-for-PLEXIGLAS.pdf
- **Type / class / scope:** maintenance guide + fabrication guide · B · Product (PLEXIGLAS®)
- **Supports:** cleaning, machining, edge treatment, bonding, forming
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** "Crazing Initiation and Growth in Polymethyl Methacrylate under Effects of Alcohol and Stress" (Polymers 2023)
- **Organization:** MDPI (PMC10052915)
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10052915/
- **Type / class / scope:** academic paper · A · General
- **Supports:** alcohol acts through diffusion, while machining stress drives crazing growth
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** "Effects of selected solvents on PMMA after prolonged exposure" (npj Heritage Science 2023)
- **Organization:** Nature Portfolio
- **URL:** https://www.nature.com/articles/s40494-023-00881-z
- **Type / class / scope:** academic paper · A · General
- **DL:** YES · **INBOX:** NO · **VER:** I

**Recorded disagreement:**
- The Röhm web page summary permits isopropanol (or benzene-free petroleum ether) for heavier soiling, while also warning against ethanol/alcohol.
- Several generic guides say to avoid alcohol entirely.
- The research paper links crazing to alcohol **plus stress**.

Possible reconciliation — specific solvent, concentration, exposure time and residual stress — is **not yet verified**.

### Polycarbonate (`02_POLIKARBONAT`)

**SOURCE 01**
- **Title:** Makrolon® Technical Manual; Makrolon® polycarbonate sheet Fabrication Guide
- **Organization:** Exolon Group (formerly Covestro sheet business); copies from distributors
- **URL:** https://www.exolongroup.com/index.php/fuseaction/download/lrn_file/mf0261_e_170828.pdf · https://www.emcoplastics.com/assets/pdf/makrolon/Makrolon%20Fabrication%20Guide%20.pdf
- **Type / class / scope:** technical manual · B · Product
- **Supports:** hardcoated (AR) grades for scratch resistance; coextruded UV layer; fabrication parameters
- **DL:** YES · **INBOX:** YES (the Exolon copy) · **VER:** I

**SOURCE 02**
- **Title:** A Guide to Chemical Resistance of Polycarbonate Sheet
- **Organization:** The Plastic Shop (distributor)
- **URL:** https://www.theplasticshop.co.uk/plastic_technical_data_sheets/chemical_resistance_guide_polycarbonate_sheet.pdf
- **Type / class / scope:** compatibility chart · B/C · General
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 03**
- **Title:** Polycarbonate Fabrication Guide
- **Organization:** Interstate Advanced Materials
- **URL:** https://www.interstateplastics.com/docs/polycarbonate-fabrication-guide.pdf
- **Type / class / scope:** fabrication guide · C · General
- **DL:** YES · **INBOX:** NO · **VER:** I

### PVC — rigid foam sheet (`03_PVC_VE_VINIL`)

**SOURCE 01**
- **Title:** FOREX® processing guidelines (issue 2011); FOREX® Product Guide (06/2022)
- **Organization:** 3A Composites
- **URL:** https://d2zo35mdb530wx.cloudfront.net/_binary/UCPtkBAMXPlasticsBelgium/nl/viscom/forex/link-EN_FOREX-processing-guidelines.pdf
- **Type / class / scope:** fabrication guide · B · Product
- **Supports:** machining, cold/hot bending, thermoforming; dust and vapour hazards during sawing, grinding and thermoforming
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Forex / Forex Classic
- **Organization:** MFA Boston — CAMEO
- **URL:** https://cameo.mfa.org/wiki/Forex
- **Type / class / scope:** institutional database · A · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** REACH entry 51 (shared)
- **Note:** applies to *plasticised* PVC, not rigid foam sheet
- **VER:** I

**Sample note:** Rigid foam PVC was chosen over "PVC" in general, because flexible vinyl overlaps heavily with `07_DERI…/04_SENTETIK_DERI` and coated fabrics.

---

## 10 — `10_BETON_ALCI_VE_SIVA`

### Concrete (`01_BETON_VE_CIMENTO_ESASLI_MALZEMELER`)

**SOURCE 01**
- **Title:** Preventing Skin Problems from Working with Portland Cement (OSHA 3351-07, 2008)
- **Organization:** OSHA
- **URL:** https://www.osha.gov/sites/default/files/publications/OSHA-3351-portland-cement.pdf
- **Type / class / scope:** safety guide · A · General (US)
- **Supports:** wet cement is highly alkaline (pH 12–13); caustic burns; irritant and allergic dermatitis
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Secondary Efflorescence in Concrete Countertops and Floors
- **Organization:** Concrete Countertop Institute
- **URL:** https://concretecountertopinstitute.com/free-training/efflorescence-part-2-secondary-efflorescence-in-concrete-countertops-and-floors/
- **Type / class / scope:** trade education · C (training business) · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Cement Burns
- **Organization:** National Precast Concrete Association
- **URL:** https://precast.org/blog/cement-burns/
- **Type / class / scope:** professional article · C · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**Gap:** No PCA or ACI technical documents on interior concrete surfaces (sealing, staining) were reached. The sealing/efflorescence content seen is Tier C/D.

### Gypsum plaster (`02_ALCI_VE_ALCI_URUNLERI`)

**SOURCE 01**
- **Title:** Installation Guidance — Thistle Finishing Plaster; White Book — Plaster systems (updated 22.05.25)
- **Organization:** British Gypsum (Saint-Gobain)
- **URL:** https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-finishing-plaster.pdf · https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf
- **Type / class / scope:** installation guide · B · Product
- **Supports:** suction and cold affect finishing times; minimum drying temperatures (2 °C for several products, 5 °C for DuraFinish)
- **DL:** YES · **INBOX:** YES (the White Book chapter) · **VER:** I

**SOURCE 02**
- **Title:** GA-216-2010 Application and Finishing of Gypsum Panel Products
- **Organization:** Gypsum Association
- **URL:** https://www.gypsum.org/wp-content/uploads/2011/11/GA-216-2010.pdf (the 2021 edition exists on ICC)
- **Type / class / scope:** standard · A · General
- **Supports:** gypsum panel products are not for constant moisture, ponding or cascading water
- **Does not establish:** wet-applied plaster (this concerns board)
- **DL:** YES · **INBOX:** supplementary (a newer edition exists) · **VER:** I

**Gap:** Gypsum vs lime plaster distinctions were not researched here; lime belongs to `03_KIREC_VE_MINERAL_SIVALAR`.

### Microcement (`05_MIKROCIMENTO_VE_DEKORATIF_YUZEYLER`)

**SOURCE 01**
- **Title:** Reinforced Microcement — Technical Data Sheet (May 2023)
- **Organization:** Stucco Italiano
- **URL:** https://stuccoitaliano.com/wp-content/uploads/2023/05/Reinforced_Microcement_TDS_Stucco_Italiano_02052023.pdf
- **Type / class / scope:** TDS · B · Product
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Technical data sheets and catalogues
- **Organization:** Topciment
- **URL:** https://www.topciment.com/en/data-sheet
- **Type / class / scope:** TDS library · B · Product
- **DL:** YES · **INBOX:** pick one system TDS · **VER:** I

**SOURCE 03**
- **Title:** Base Microcement 100% Waterproof — TDS
- **Organization:** Innova Chemical
- **URL:** https://www.innovachemical.es/wp-content/uploads/2022/07/T.D.S-Base-Microcement-100-waterproof-Innova.pdf
- **Type / class / scope:** TDS · B · Product
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**Finding:** No independent institutional, standard or peer-reviewed source specific to microcement was found. A targeted academic query returned only general concrete-coating literature.
- Claims about cracking — "microcement rarely cracks, the substrate does" — come exclusively from manufacturers and installers.
- Manufacturers have a direct interest in attributing failures to substrate or installation.
- These claims are **plausible but not independently verified**.

---

## 11 — `11_BOYA_VERNIK_VE_KAPLAMALAR`

### Furniture / wood paint (`02_MOBILYA_VE_AHSAP_BOYALARI`)

**SOURCE 01**
- **Title:** Wood Handbook Ch. 16 "Finishing Wood" (C.G. Hunt, 2021)
- **Organization:** USDA FPL
- **URL:** https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_16_fpl_gtr282.pdf
- **Type / class / scope:** handbook · A · General
- **DL:** YES · **INBOX:** YES · **VER:** I
- **P1:**
  - Acquired (TreeSearch 62269). **VER → R.**
  - The chapter states that furniture finishing methods are **not included** (p. 16–29).
  - Its lead-paint section dates US residential use "until 1976", while EPA's rule uses 1978.

**SOURCE 02**
- **Title:** Lead-Safe Renovations for DIYers
- **Organization:** US EPA
- **URL:** https://www.epa.gov/lead/lead-safe-renovations-diyers
- **Type / class / scope:** safety guide · A · General (US)
- **Supports:**
  - sanding, heating or stripping old lead paint creates hazards;
  - the RRP rule prohibits open-flame burning and abrasive blasting for certified work;
  - the RRP rule does not bind homeowners in their own homes
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Directive 2004/42/EC (VOC content limits for decorative paints and varnishes; Phase II since 1 January 2010)
- **Organization:** EUR-Lex
- **URL:** https://eur-lex.europa.eu/LexUriServ/LexUriServ.do?uri=OJ:L:2004:143:0087:0096:EN:PDF
- **Type / class / scope:** regulation · A · General (EU)
- **DL:** YES · **INBOX:** supplementary · **VER:** I

**SOURCE 04**
- **Title:** CEPE Guideline for VOC Determination of the Decorative Paint Industry
- **Organization:** CEPE (European Council of the Paint, Printing Ink and Artists' Colours Industry)
- **URL:** https://cepe.org/wp-content/uploads/2023/10/CEPE-Guideline-for-VOC-Determination-of-the-Decorative-Paint-Industry-1.pdf
- **Type / class / scope:** technical guide · A/B (industry association) · General
- **DL:** YES · **INBOX:** NO · **VER:** I

**Gap:** No representative furniture-paint TDS (e.g. a chalk-type or waterborne enamel) was collected. Adhesion to previously finished or laminate surfaces is undocumented in this round.

### Clear finish — water-based polyurethane varnish (`03_VERNIK_VE_LAKE`)

**SOURCE 01**
- **Title:** Wood Handbook Ch. 16 (shared)
- **VER:** I

**SOURCE 02**
- **Title:** Protecting Wood from Humidity — lab tests show which finishes work, which don't (Feist, 1987)
- **Organization:** USDA FPL
- **URL:** https://www.fpl.fs.usda.gov/documnts/pdf1987/feist87a.pdf
- **Type / class / scope:** research article · A · General (**dated 1987**)
- **Supports:** of 91 finishes tested, no coating entirely prevents moisture adsorption; linseed oil, tung oil and lacquer are poor vapour barriers; paraffin wax is highly effective (search summary)
- **Does not establish:** the performance of modern waterborne formulations
- **DL:** YES · **INBOX:** YES · **VER:** I
- **P1 — correction and status:**
  - Per search results, this is a **Fine Woodworking magazine article** (May/June 1987, pp. 59–61) by W. Feist (FPL) and G. Peterson, republished on the FPL site. It is not a peer-reviewed FPL research report, so it should be treated as class C (a popular article by expert authors) and as **dated**.
  - Not acquired (HTTP 403).
  - Its core claim, that no finish fully stops moisture exchange, is independently verified by FPL Ch. 16 (2021).

**SOURCE 03**
- **Title:** MINWAX® Water Based Polyurethane — Technical Data Sheet
- **Organization:** Minwax (Sherwin-Williams)
- **URL:** https://assets.paintsupply.com/wp-content/uploads/2024/06/TDS-Minwax-027426710337-151849.pdf (distributor-hosted)
- **Type / class / scope:** TDS · B · Product
- **DL:** YES (Mirror) · **INBOX:** YES, via the official paintdocs.com link · **VER:** I
- **P1 — correction:**
  - The paintdocs.com document acquired is "Minwax® Water Based **Oil-Modified** Polyurethane" (MWX047, rev. 1/17/2024) — a different product.
  - The document is internally inconsistent: it lists a mineral-spirits solvent, and its Spanish text describes an oil-based "Fast-Drying" product.
  - Saved as `Minwax_Water_Based_Oil-Modified_Polyurethane_TDS_MWX047_2024.pdf`. **VER → R, low confidence.**
  - A reliable water-based PU TDS is still missing.

### Oil / hardwax-oil finish (`04_YAG_MUM_VE_CILALAR`)

**SOURCE 01**
- **Title:** Polyx®-Oil Original — Product Information
- **Organization:** Osmo
- **URL:** https://www.osmo.com/fileadmin/media/pim_assets/pim_file_36247.pdf
- **Type / class / scope:** TDS · B · Product
- **Supports:** ~24 m²/L per coat; drying ~8–10 h at 23 °C / 50% RH; renovation by a single coat on a clean surface
- **DL:** YES · **INBOX:** YES · **VER:** I
- **P1:** Acquired (Version 02/24). **VER → R.** All three values are verified with narrowing conditions:
  - 24 m²/l applies to the microfibre roller and clear product; the reference wood is oak.
  - 8–10 h drying is for the clear product; the coloured product takes ~24 h.
  - The document adds: VOC ≤ 500 g/l (2004/42/EC Cat. A/i); a self-ignition warning for cloths; wood MC ≤ 18%; not recommended for dark, extractive-rich hardwoods.

**SOURCE 02**
- **Title:** The Fire Hazards of Linseed Oil
- **Organization:** East Sussex Fire & Rescue Service
- **URL:** https://www.esfrs.org/the-fire-hazards-of-linseed-oil
- **Type / class / scope:** safety guide · A · General
- **Supports:** oily rags can self-heat and ignite; spread them out to dry or soak them in water; metal container with water
- **DL:** NO · **INBOX:** save as a web capture · **VER:** I

**SOURCE 03**
- **Title:** Fire Prevention 52: Spontaneous Combustion — Fact or Fiction?
- **Organization:** US National Park Service
- **URL:** https://nps.gov/articles/fire-prevention-52-spontaneous-combustion.htm
- **Type / class / scope:** safety article · A · General
- **DL:** NO · **INBOX:** NO · **VER:** I

**SOURCE 04**
- **Title:** Testing Hard-Wax Oil Finishes (2024)
- **Organization:** Fine Woodworking
- **URL:** https://www.finewoodworking.com/2024/06/24/testing-hard-wax-oil-finishes
- **Type / class / scope:** professional article (practical test) · C · Product comparison
- **DL:** NO · **INBOX:** NO · **VER:** I

---

## 12 — `12_YARDIMCI_MALZEMELER`

### PVAc wood adhesive (`01_TUTKAL_VE_YAPISTIRICILAR`)

**SOURCE 01**
- **Title:** Interpretation of DIN EN 204/205 (October 2017)
- **Organization:** IVK — Industrieverband Klebstoffe e.V.
- **URL:** https://www.klebstoffe.com/wp-content/uploads/2020/04/Interpretation_DIN_EN_204-205_EN.pdf
- **Type / class / scope:** technical guide · A (industry association) · General
- **Supports:** (not confirmed — PDF not extracted) the D1–D4 durability class interpretation
- **DL:** YES · **INBOX:** YES · **VER:** I-pdf

**SOURCE 02**
- **Title:** Polyvinyl acetate adhesives
- **Organization:** AkzoNobel Wood Adhesives
- **URL:** https://woodadhesives.akzonobel.com/en/adhesive-technologies/polyvinyl-acetate
- **Type / class / scope:** technical webpage · B · General
- **Supports:** PVAc available as D1–D3 (1K) and D4 (1K and 2K)
- **DL:** NO · **INBOX:** NO · **VER:** I

**Summary of classes (Tier B/D summaries — confirm against IVK before use):**
- D1/D2: interior;
- D3: interior with frequent exposure to water, and exterior not exposed to weather;
- D4: severe exposure, e.g. window frames.

EN 204 covers **non-structural** thermoplastic adhesives. **Gap:** Wood Handbook Ch. 10 (adhesives) was not checked this round.

### Epoxy (`02_EPOKSI_VE_RECINELER`)

**SOURCE 01**
- **Title:** WEST SYSTEM® User Manual (March 2025) + Epoxy Safety guide
- **Organization:** WEST SYSTEM (Gougeon Brothers / Wessex Resins)
- **URL:** https://eu.westsystem.com/app/uploads/2025/06/English-WEST-SYSTEM-User-Manual-March-2025-Low-res.pdf · https://www.westsystem.com/app/uploads/2023/01/000-574-Epoxy-Safety.pdf
- **Type / class / scope:** application manual + safety guide · B · Product (widely used as a de facto reference)
- **Supports:** mixing and handling; amine blush (wash with water and an abrasive pad); the sensitisation risk rises with repeated contact
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** Skin Sensitisation and Dermatitis Among Epoxy-Exposed Workers in a Wind Turbine Plant (Contact Dermatitis, 2026)
- **Organization:** Wiley
- **URL:** https://onlinelibrary.wiley.com/doi/10.1111/cod.70138
- **Type / class / scope:** academic paper · A · General
- **DL:** paywalled (likely) · **INBOX:** NO · **VER:** I

**Explained non-conflict:**
- Summaries gave "less than 2% of epoxy users" developing allergic dermatitis (from a manufacturer context).
- An academic context gave "11.7–12.5% of occupational allergic contact dermatitis cases" attributable to epoxy.

These are **different denominators** (users vs ACD cases), not a contradiction. Neither figure was verified at source.

### Silicone sealant (`03_SILIKON_MASTIK_VE_SIZDIRMAZLIK`)

**SOURCE 01**
- **Title:** Joint Sealant guide specification 07 92 00
- **Organization:** Dow
- **URL:** https://www.dow.com/documents/63/63-6205-01-architectural-specifications-section-07-92-00.pdf
- **Type / class / scope:** specification guide · B · Product
- **Supports:** non-staining per ASTM C1248 on listed substrates for specific products; stone compatibility testing
- **DL:** YES · **INBOX:** YES · **VER:** I

**SOURCE 02**
- **Title:** ASTM C1248 Standard Test Method for Staining of Porous Substrate by Joint Sealants
- **Organization:** ASTM International
- **URL:** https://store.astm.org/c1248-22.html
- **Type / class / scope:** standard · A · General
- **Supports:** the existence and design of the staining test (four exposure types)
- **DL:** purchase · **INBOX:** NO · **VER:** I

**SOURCE 03**
- **Title:** Neutral vs. acetoxy silicone: understanding the differences
- **Organization:** Penosil
- **URL:** https://penosil.com/neutral-vs-acetoxy-silicone-understanding-the-differences/
- **Type / class / scope:** technical article · B · General
- **Supports:** acetoxy cures by releasing acetic acid; neutral cure is preferred on natural stone and sensitive metals
- **DL:** NO · **INBOX:** NO · **VER:** I

**Cross-family links:**
- Eastman Saflex sealant compatibility (laminated glass).
- AGC Mirox installation guide (mirror backings).

Compatibility of sealants and adhesives with substrates recurs across families 02, 04, 05 and 12.

---

## Cross-family sources

| Source | URL | Class | Relevance |
|---|---|---|---|
| CAMEO (Conservation and Art Materials Encyclopedia Online), MFA Boston | https://cameo.mfa.org/wiki/Main_Page | A | ~10,000 materials, >6,000 images incl. microscopy. Broad identification and composition reference across families. **VER:** I |
| Material ConneXion | https://insights.materialconnexion.com/material-library/ | B/C (subscription) | Materials library of manufacturer products with images. Access requires a subscription. **VER:** I |
| BGS Building Stone Databases | see Marble SOURCE 04 | A | Stone identification imagery (UK). **VER:** I |
