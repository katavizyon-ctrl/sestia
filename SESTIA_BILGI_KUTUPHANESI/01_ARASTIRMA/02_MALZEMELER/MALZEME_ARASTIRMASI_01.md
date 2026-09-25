---
belge_turu: arastirma_kaydi
konu: Malzemeler — Round 1 kaynak keşfi ve bilgi ihtiyacı haritası (12 aile, 36 malzeme)
arastirma_tarihi: 2026-09-25
durum: tamamlandi (ilk tur)
ek_dosyalar:
  - MALZEME_ARASTIRMASI_01_KAYNAK_ENVANTERI.md
  - MALZEME_ARASTIRMASI_01_GORSEL_ENVANTERI.md
  - MALZEME_ARASTIRMASI_01_DOGRULAMA_P1.md
---

# Materials Research Round 1 — Source Discovery and Knowledge-Needs Map

**Scope:** `02_KUTUPHANE/02_MALZEMELER/`. All 12 existing material families, 36 sampled materials.
**Governing rule:** Breadth first. Evidence first. Architecture later.
**Outputs:**
- Outputs 1, 4, 5, 6, 7, the query bank and the final synthesis are in this file.
- Output 2 (detailed source inventory) is in `MALZEME_ARASTIRMASI_01_KAYNAK_ENVANTERI.md`.
- Output 3 (visual source inventory) is in `MALZEME_ARASTIRMASI_01_GORSEL_ENVANTERI.md`.

---

## 0. Method and limits of this round

These limits affect how every result below should be read.

1. **Discovery depth.** About 100 candidate sources were identified via web search.
   - **Two sources were read in full** (ACT hydrolysis page; CCI leather guidance).
   - Every other source is characterized from its title, publisher, URL and search-index summary. The source inventory marks each entry `R` (read) or `I` (identified only).
   - "What the source establishes" means *what it is reported to cover*, until it is read.
2. **PDFs could not be text-extracted** in this environment. Fetches of the TCNA, IVK and NSI PDFs returned unreadable binary. This is itself a workflow finding (§7.8).
3. **No images were viewed.** The visual inventory lists candidate sources.
4. **Nothing was downloaded** into any `_INBOX`. Output 5 is a recommendation list only.
5. **No knowledge files, metadata, taxonomy or infrastructure were changed.**

---

## 1. Sample selection

Each family's existing subcategories (from the filesystem) were inspected first. Samples were chosen from them.

| Family | Selected material | Existing subcategory | Change vs brief suggestion — reason |
|---|---|---|---|
| 01_AHSAP | Solid oak | `01_MASIF_AHSAP` | — |
| | Plywood | `02_KONTRPLAK_PLYWOOD` | — |
| | MDF | `03_MDF` | — |
| 02_TAS… | Marble | `01_MERMER` | — |
| | Travertine | `02_TRAVERTEN` | — |
| | Engineered quartz | `08_KUVARS_KOMPOZIT` | Chosen over sintered stone. It exposes a sharp safety/regulatory divergence (silica), which sintered stone mostly avoids. |
| 03_SERAMIK… | Porcelain / gres | `02_PORSELEN_VE_GRES` | — |
| | Terracotta (unglazed tile) | `03_TERRAKOTTA_VE_PISMIS_TOPRAK` | — |
| | Çini (İznik-type stonepaste) | `04_CINI_VE_EL_YAPIMI_SERAMIK` | Turkish-relevant handmade ceramic; tests Turkish-language primary sources. |
| 04_METAL | Carbon / mild steel | `01_DEMIR_VE_CELIK` | — |
| | Aluminium | `03_ALUMINYUM` | — |
| | Brass | `05_PIRINC_VE_BRONZ` | — |
| 05_CAM… | Tempered glass | `02_TEMPERLI_VE_LAMINE_CAM` | — |
| | Laminated glass | `02_TEMPERLI_VE_LAMINE_CAM` | Kept, although it shares a subcategory with tempered. The overlap is itself a finding. |
| | Mirror | `05_AYNA_VE_AYNA_YUZEYLERI` | — |
| 06_KUMAS… | Linen | `01_DOGAL_LIFLI_KUMASLAR` | — |
| | Polyester upholstery fabric | `02_SENTETIK…` / `03_DOSEMELIK…` | Fits two subcategories (fibre axis vs use axis). |
| | Velvet | `06_ORGULU_VE_DOKULU…` / `03_DOSEMELIK…` | Velvet is a construction (pile), not a fibre. Tests the taxonomy axes. |
| 07_DERI… | Full-grain leather | `01_DOGAL_DERI` | — |
| | Nubuck / suede | `02_SUET_VE_NUBUK` | — |
| | PU synthetic leather | `04_SENTETIK_DERI` | — |
| 08_DOGAL_LIF… | Rattan | `01_RATTAN_VE_KAMIS` | — |
| | Bamboo | `02_BAMBU` | — |
| | Cork | `03_MANTAR` | — |
| 09_PLASTIK… | Acrylic / PMMA | `01_AKRILIK_PLEKSI` | — |
| | Polycarbonate | `02_POLIKARBONAT` | — |
| | Rigid PVC foam sheet | `03_PVC_VE_VINIL` | Narrowed from "PVC". Flexible vinyl overlaps with synthetic leather and coated fabrics; rigid foam board is the common DIY/furniture sheet. |
| 10_BETON… | Concrete | `01_BETON_VE_CIMENTO…` | — |
| | Gypsum plaster | `02_ALCI_VE_ALCI_URUNLERI` | — |
| | Microcement | `05_MIKROCIMENTO…` | — |
| 11_BOYA… | Furniture / wood paint | `02_MOBILYA_VE_AHSAP_BOYALARI` | — |
| | Water-based PU varnish | `03_VERNIK_VE_LAKE` | — |
| | Oil / hardwax-oil finish | `04_YAG_MUM_VE_CILALAR` | — |
| 12_YARDIMCI… | PVAc wood adhesive | `01_TUTKAL_VE_YAPISTIRICILAR` | — |
| | Epoxy | `02_EPOKSI_VE_RECINELER` | — |
| | Silicone sealant | `03_SILIKON_MASTIK…` | — |

**Total:** 36 materials.

---

## 2. Output 1 — Master material research matrix

**Legend:**
- **Y** = at least one credible source found in this round.
- **P** = partial, only Tier C/D, or only product-specific.
- **N** = none found in this round.
- "Strong sources" counts the entries in the source inventory at Tier A/B.
- **Visual ID potential:** H = high, M = medium, L = low, from a normal photo.

| Family | Material | Strong src | Inst./gen. | Mfr tech. | Props | Care | Safety | Sust. | Visual src | Visual ID | Major gaps | Next priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Solid oak | 3 | Y | N | Y | P | Y | N | Y | M (species needs end grain) | Furniture-scale care; EU/TR species context | Read FPL Ch. 4/16; add EU source |
| 01 | Plywood | 3 | Y | P | Y | N | P | N | P | M (edge) | Furniture-grade plywood (core quality, EU grading); edge imagery | Find EU/decorative plywood source |
| 01 | MDF | 4 | Y | N | Y | N | Y (partly dated) | N | P | M (edge) | Current UK/EU dust limits; emission classes; resin variants | Verify current exposure limits; EU formaldehyde classes |
| 02 | Marble | 4 | Y | N | Y | Y | N | N | Y | M (vs quartz/porcelain look-alikes) | Etch vs stain imagery; Turkish marble context | Read NSI DSDM marble + care |
| 02 | Travertine | 3 | Y | N | Y (reqs only) | Y | N | N | P | M-H (pores) | Filled vs unfilled care; property values (paywalled) | Read NSI travertine chapter |
| 02 | Eng. quartz | 4 | Y | Y | P | Y | Y | N | P | L (mimics marble) | Heat limit (disputed); consumer-level silica risk | Resolve heat claim with manufacturer TDS |
| 03 | Porcelain | 4 | Y | Y | Y (definition) | N | N | N | N | L-M (edge/body) | Care; glazed vs through-body ID | Read TCNA doc; add care source |
| 03 | Terracotta | 3 | P (architectural scope) | P | N | P | N | N | P | M | Floor-tile care from an independent source | Search TR/EU tile institute sources |
| 03 | Çini | 3 | Y (academic, TR) | P | P | N | N | N | P | L (body invisible) | Composition disagreement; care | Read El-Cezeri paper; find conservation source |
| 04 | Carbon steel | 3 | Y | N | P | N | Y | N | N | M | Interior furniture finishes and care | Find powder-coat/clear-coat guidance |
| 04 | Aluminium | 3 | Y (AAMA) | Y | P | Y | N | N | P | L-M | Non-anodized finishes | Read AAC bulletin |
| 04 | Brass | 4 | Y | Y | P | Y | N | N | Y | M | Lead in brass; lacquered vs unlacquered ID | Search lead-in-brass sources |
| 05 | Tempered | 3 | Y (GANA) | Y | P | P | P | N | Y | L (intact) | Standards EN 12150 / ASTM C1048 | Access standard summaries |
| 05 | Laminated | 3 | P | Y | P | N | N | N | P | L (edge only) | EVA/SGP interlayers | Read Saflex compatibility doc |
| 05 | Mirror | 3 | Y (GANA) | Y | N | P | N | N | P | H (is a mirror) / L (backing quality) | Desilvering causes from an authoritative source | Read AGC guide |
| 06 | Linen | 2 | P | N | P (fibre) | N | N | P | P | L (fibre content) | Fabric-level performance | Find textile institute data |
| 06 | Polyester upholst. | 3 | Y | N | Y (test methods) | N | Y (UK fire) | Y | N | L | Fabric-level care; TR/EU fire rules | Check EU/TR upholstery fire rules |
| 06 | Velvet | 2 | P | Y | P | Y | N | N | P | H (pile) / L (fibre) | Cleaning codes provenance | Verify cleaning-code origin |
| 07 | Full-grain | 4 | Y | N | P | Y (museum ctx) | N | P (LWG) | Y | M (surface) / H (cut edge) | In-use upholstery care from an independent source | Find leather technology centre guidance |
| 07 | Nubuck/suede | 2 | Y (definitions) | N | N | N | N | N | N | M | Everything beyond definition | Low priority until use case |
| 07 | PU synthetic | 4 | Y | Y | Y (hydrolysis) | N | Y (EU chem.) | N | P | M (cut edge) | Care; PU vs PVC ID | Read ACT coated-fabric guideline |
| 08 | Rattan | 2 | Y (INBAR) | N | P | N (only D) | N | P | P | M (vs PE rattan: L) | Care; natural vs synthetic rattan | Search INBAR rattan properties; PE rattan |
| 08 | Bamboo | 3 | Y | N | P | N | N | P | P | M | Product-form split (culm vs panel vs scrimber) | Scope by product form |
| 08 | Cork | 3 | Y (academic) | Y | Y | N | N | P | N | M | APCOR; care of cork surfaces | Reach APCOR publications |
| 09 | Acrylic | 3 | Y (academic) | Y | Y | Y | P | N | P | L (vs PC) | Cleaning-solvent disagreement | Read Röhm cleaning PDF |
| 09 | Polycarbonate | 3 | N | Y | Y | P | N | N | N | L (vs acrylic) | Independent source | Find a polymer handbook reference |
| 09 | PVC foam | 3 | Y (CAMEO) | Y | P | N | Y | N | P | M | Care; indoor emissions | Read FOREX guide |
| 10 | Concrete | 3 | Y (OSHA) | N | N | P | Y | N | P | M | Interior sealing from PCA/ACI | Search PCA/ACI interior concrete |
| 10 | Gypsum plaster | 2 | Y (GA, board) | Y | P | N | N | N | N | M | Wet-plaster moisture limits; repair | Read BG White Book |
| 10 | Microcement | 3 | **N** | Y | P | P | N | N | N | M | **Any independent source** | Search standards (e.g. EN 13813 classing), independent tests |
| 11 | Furniture paint | 4 | Y | N | P | N | Y (lead, VOC) | Y (VOC reg.) | P | — | Adhesion over existing finishes; product TDS | Collect 1–2 representative TDS |
| 11 | WB PU varnish | 3 | Y | Y | P | P | N | N | P | L | Modern waterborne vs 1987 data | Read FPL Ch. 16 |
| 11 | Oil / hardwax | 4 | Y | Y | P | Y | Y | N | P | L | Repairability claims (spot repair) | Read Osmo PI + FPL Ch. 16 |
| 12 | PVAc | 2 | Y (IVK) | P | P | — | N | N | N | — | FPL Ch. 10 adhesives; heat/creep | Read IVK PDF; FPL Ch. 10 |
| 12 | Epoxy | 2 | Y (academic) | Y | P | — | Y | N | P | — | Food-contact claims; UV yellowing | Read WEST manual |
| 12 | Silicone | 3 | Y (ASTM) | Y | P | N | N | N | N | L | Mould in joints; removal/renewal | Read Dow guide |

---

## 3. Output 4 — Knowledge gap map

**Consistently well documented (Tier A/B found for most families):**
- identity and definitions;
- basic composition;
- hazards during **fabrication** (dust, fumes, silica, cement alkalinity, welding fume, epoxy sensitisation, oily rags);
- chemical compatibility between auxiliary materials and substrates.

**Poorly documented:**
- **domestic care** of finished surfaces (terracotta, rattan, nubuck, velvet, concrete, microcement, mirror edges);
- **repairability** (spot repair, when to replace);
- **visual identification** from normal photos;
- condition/damage imagery.

**Families relying heavily on manufacturer sources:**
- 09 plastics (acrylic, polycarbonate, PVC foam);
- 10 microcement (entirely);
- 11 coatings (TDS level);
- 12 adhesives and sealants;
- 05 laminated glass and mirror (interlayer and backing makers).

**Where independent institutional sources are strong:**
- wood and panels (USDA FPL);
- stone (NSI, BGS, ASTM);
- porcelain definition (ISO, ANSI/TCNA);
- leather terminology (ISO, LWG) and conservation (CCI);
- copper alloys (CDA, CCI, GSA);
- bamboo/rattan (INBAR);
- textiles test framework (ACT, ISO 12945);
- safety regulators (HSE, OSHA, NIOSH, Safe Work Australia, EPA, ECHA).

**Where independent sources are weak:**
- microcement;
- terracotta floor tiles;
- furniture-grade plywood;
- interior steel finishes;
- polycarbonate;
- velvet and linen at fabric level;
- rattan care.

**Dimensions repeating across nearly every family:**
- moisture behaviour;
- cleaning do's and don'ts (often *which cleaner damages it*);
- surface finish/treatment options;
- fabrication hazards;
- compatibility (with sealants, adhesives, cleaners, coatings);
- "product-specific vs general" caveats.

**Highly material-specific dimensions:**

| Dimension | Materials |
|---|---|
| Acid etching | calcareous stone |
| Hydrolysis | PU-coated fabrics |
| Spontaneous breakage | tempered glass |
| Edge delamination | laminated glass |
| Desilvering | mirror |
| Crazing | acrylic |
| Pile crush | velvet |
| Tyloses | oak identification |
| Silica | engineered stone |
| Self-heating rags | drying oils |
| Formaldehyde | UF-bonded panels |

**Visual distinguishability:**
- *Plausible from a photo:* wood grain class, travertine (pores), mirror, velvet (pile), brass vs chrome-like finishes, rattan weave (but not natural vs PE).
- *Visually ambiguous:*
  - acrylic vs polycarbonate;
  - engineered quartz vs marble-look porcelain vs marble;
  - tempered vs annealed (intact);
  - linen vs linen-look polyester;
  - full-grain vs embossed PU (surface);
  - porcelain vs ceramic;
  - PVC foam vs other white sheet.

**Maintenance information:**
- *Strong:* stone (NSI), anodized aluminium (AAMA), copper alloys (CCI/CDA), acrylic (Röhm), oil finish (Osmo), museum leather (CCI).
- *Weak or non-credible:* rattan, terracotta, nubuck, velvet cleaning codes, concrete surfaces, microcement.

**Repair information:**
- *Strong:* wood finishes (FPL Ch. 16 expected), oil finishes (recoat), brass (repolish/relacquer), acrylic (sanding and polishing guide).
- *Weak:* engineered quartz, porcelain, microcement, PU leather (hydrolysis is essentially non-repairable per the sources seen — **not verified**), laminated glass.

**Sustainability data:**
- *Measurable:* polyester (Textile Exchange market data), VOC (regulated limits), bamboo/cork (academic, INBAR).
- *Mostly promotional:* linen body claims, "eco" microcement, cork marketing.
- *Not reached this round:* EPD/LCA documents for any material. This is a gap.

**Market/cost information that dates quickly:**
- fibre market shares (2024 data);
- regulatory status (Australia's engineered stone ban; US hazard alert updated 2026; REACH entries);
- occupational exposure limits (the MDF example shows superseded MEL values still circulating);
- product lines and TDS versions.

No price data was collected, by design.

**Safety issues recurring across families:**
1. Respirable dust — wood/MDF, crystalline silica (engineered stone, also natural stone, concrete).
2. Skin sensitisation and irritation — epoxy, wet cement, some adhesives.
3. Fumes and vapours — welding, PVC thermoforming, solvents/VOC.
4. Fire — oily rags, upholstery flammability.
5. Legacy hazards in reuse and upcycling — lead paint on old furniture.

The reuse/upcycling risk is especially relevant to SESTIA's transformation use case.

---

## 4. Output 5 — `_INBOX` download shortlist

**Rules applied:**
- Only freely published documents are listed. Paywalled standards are excluded.
- Where only a mirror copy was found, the official copy should be located first.
- Proposed filenames are descriptive suggestions, not a naming rule.

**Default destination:** `02_KUTUPHANE/02_MALZEMELER/_INBOX/`. The cross-family placement question is noted in §7.2.

**Nothing has been downloaded.**

| # | Proposed local filename | Source title | URL | Organization | Family | Material(s) | Type | Why preserve | Found. / Suppl. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `FPL_GTR282_2021_Ch04_Moisture_Relations.pdf` | Wood Handbook Ch. 4 | https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_04_fpl_gtr282.pdf | USDA FPL | 01 | oak (all wood) | handbook | Public domain; moisture behaviour underpins wood care and repair | Foundational |
| 2 | `FPL_GTR282_2021_Ch11_Wood_Composites.pdf` | Wood Handbook Ch. 11 | https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_11_fpl_gtr282.pdf | USDA FPL | 01 | plywood, MDF | handbook | Compares panel types from one source | Foundational |
| 3 | `FPL_GTR282_2021_Ch13_Drying_Dimensional_Change.pdf` | Wood Handbook Ch. 13 | https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_13_fpl_gtr282.pdf | USDA FPL | 01 | wood | handbook | Movement and dimensional change | Supplementary |
| 4 | `FPL_GTR282_2021_Ch16_Finishing_Wood.pdf` | Wood Handbook Ch. 16 | https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/chapter_16_fpl_gtr282.pdf | USDA FPL | 11 (cross 01) | paint, varnish, oil | handbook | Authoritative finish behaviour and failure modes | Foundational |
| 5 | `FPL_1987_Feist_Protecting_Wood_From_Humidity.pdf` | Protecting Wood from Humidity | https://www.fpl.fs.usda.gov/documnts/pdf1987/feist87a.pdf | USDA FPL | 11 | finishes | research article | Comparative moisture-barrier data (dated 1987) | Supplementary. **P1:** not acquired (403). Actually a Fine Woodworking 1987 article by FPL authors. |
| 6 | `NSI_2022_Dimension_Stone_Design_Manual.pdf` | Dimension Stone Design Manual | official via NSI resource library (mirror: republicelite.com) | Natural Stone Institute | 02 | marble, travertine, quartz-based stone | handbook | Industry reference for stone types, finishes, care | Foundational |
| 7 | `NIOSH_2026-101_Silica_Countertop_Hazard_Alert.pdf` | OSHA/NIOSH Hazard Alert (countertops) | https://www.cdc.gov/niosh/publications/numbered/2026-101.html | NIOSH / OSHA | 02 | engineered quartz, natural stone | hazard alert | Current authoritative silica guidance | Foundational (**time-sensitive**) |
| 8 | `TCNA_Porcelain_in_the_Ceramic_Tile_Industry.pdf` | Porcelain in the Ceramic Tile Industry | https://tcnatile.com/wp-content/uploads/2022/08/Porcelain-in-the-Ceramic-Tile-Industry.pdf | TCNA | 03 | porcelain | technical guide | Porcelain definition and certification | Foundational |
| 9 | `ElCezeri_Tas_Cini_Silis_Oranlari.pdf` | Farklı Silis Oranlarının Taş Çini Özelliklerine Etkisi | https://dergipark.org.tr/en/pub/ecjse/article/949223 | El-Cezeri (DergiPark) | 03 | çini | academic paper | Rare Turkish primary research | Foundational (for çini) |
| 10 | `CDA_A1350_Clear_Organic_Finishes_Copper_Alloys.pdf` | Clear Organic Finishes for Copper and Copper Alloys | https://www.copper.org/publications/pub_list/pdf/a1350.pdf | Copper Development Assoc. | 04 | brass | technical guide | Lacquering and tarnish protection | Supplementary |
| 11 | `AAC_2024_Specifying_Anodized_Finishes.pdf` | Specifying Anodized Finishes | https://www.anodizing.org/wp-content/uploads/2024/09/specifying-anodized-finishes.pdf | Aluminum Anodizers Council | 04 | aluminium | technical bulletin | Anodized finish basics | Supplementary |
| 12 | `AGC_2018_Mirox_Installation_Guide_v3.pdf` | Mirox Installation Guide v3.0 | https://www.agc-yourglass.com/sites/default/files/technical_documents/original/IG_Mirox_V03_EN.pdf | AGC Glass Europe | 05 (cross 12) | mirror | installation guide | Adhesive compatibility with mirror backing (product-specific) | Supplementary |
| 13 | `Eastman_Saflex_Sealant_Compatibility.pdf` | Sealant Compatibility — Saflex Structural | (see source inventory) | Eastman | 05 (cross 12) | laminated glass, silicone | compatibility guide | Documents sealant–interlayer conflicts | Supplementary |
| 14 | `ACT_Performance_Guidelines_Abrasion.pdf` (+ overview) | ACT Performance Guidelines | https://contracttextiles.org/wp-content/uploads/2016/12/act_abrasion_011615.pdf | Assoc. for Contract Textiles | 06 (cross 07) | all upholstery fabrics | guideline | Shared durability vocabulary and test methods | Foundational |
| 15 | `TextileExchange_2025_Materials_Market_Report.pdf` | Materials Market Report 2025 | https://textileexchange.org/app/uploads/2025/09/Materials-Market-Report-2025.pdf | Textile Exchange | 06 | polyester, linen | market / sustainability report | Measurable fibre data (**time-sensitive**) | Supplementary |
| 16 | `LWG_List_of_Definitions_v1.1.pdf` | LWG List of Definitions | https://www.leatherworkinggroup.com/fileadmin/uploads/lwg/Knowledge/LWG_List_of_Definitions_v1.1.pdf | Leather Working Group | 07 | leather types | glossary | Terminology backbone for leather | Foundational |
| 17 | `INBAR_Bamboo_Post-Harvest_Treatment.pdf` (confirm exact file) | Post-Harvest Bamboo Treatment… / TR 26 | https://www.inbar.int/wp-content/uploads/2020/05/1489455793.pdf | INBAR | 08 | bamboo | technical report | Durability and treatment from an intergovernmental body | Foundational |
| 18 | `Cork_A_Strategic_Material_PMC3990040.pdf` | Cork: a strategic material | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3990040/ | peer-reviewed | 08 | cork | academic review | Independent property overview | Foundational |
| 19 | `Rohm_PLEXIGLAS_211-13_Cleaning.pdf` + `Rohm_PLEXIGLAS_311-5_Fabricating_Tips.pdf` | PLEXIGLAS cleaning; fabricating tips | (see source inventory) | Röhm | 09 | acrylic | maintenance + fabrication guide | Care and processing (product-specific) | Foundational (for acrylic) |
| 20 | `Exolon_Makrolon_Technical_Manual.pdf` | Makrolon Technical Manual | https://www.exolongroup.com/index.php/fuseaction/download/lrn_file/mf0261_e_170828.pdf | Exolon Group | 09 | polycarbonate | technical manual | Only strong PC source found | Supplementary |
| 21 | `3A_FOREX_Processing_Guidelines.pdf` | FOREX processing guidelines | (see source inventory) | 3A Composites | 09 | PVC foam | fabrication guide | Processing and hazards | Supplementary |
| 22 | `OSHA_3351_Portland_Cement_Skin.pdf` | Preventing Skin Problems from Working with Portland Cement | https://www.osha.gov/sites/default/files/publications/OSHA-3351-portland-cement.pdf | OSHA | 10 | concrete, microcement (cement-based) | safety guide | Alkaline burn hazard | Foundational (safety) |
| 23 | `BritishGypsum_WhiteBook_Plaster_Systems_2025.pdf` | White Book — Plaster systems | https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf | British Gypsum | 10 | gypsum plaster | installation guide | Most detailed plaster source found (product-specific) | Supplementary |
| 24 | `Osmo_Polyx-Oil_Original_PI.pdf` | Polyx-Oil Original Product Information | https://www.osmo.com/fileadmin/media/pim_assets/pim_file_36247.pdf | Osmo | 11 | hardwax oil | TDS | Representative oil-finish TDS | Supplementary |
| 25 | `IVK_2017_Interpretation_EN204_EN205.pdf` | Interpretation of DIN EN 204/205 | https://www.klebstoffe.com/wp-content/uploads/2020/04/Interpretation_DIN_EN_204-205_EN.pdf | IVK | 12 | PVAc | technical guide | Authoritative D1–D4 interpretation | Foundational |
| 26 | `WEST_SYSTEM_2025_User_Manual.pdf` + `WEST_SYSTEM_Epoxy_Safety.pdf` | User Manual; Epoxy Safety | (see source inventory) | WEST SYSTEM | 12 | epoxy | manual + safety | De facto reference for DIY epoxy work | Supplementary |
| 27 | `Dow_07_92_00_Joint_Sealant_Guide_Spec.pdf` | Joint Sealant guide specification | https://www.dow.com/documents/63/63-6205-01-architectural-specifications-section-07-92-00.pdf | Dow | 12 | silicone | specification | Stone staining and compatibility (product-specific) | Supplementary |

**Web captures (not files) worth recording as links rather than downloads:**
- ACT hydrolysis page; CCI leather page; CCI Notes 9/3 (brass);
- Vitro NiS page; SATRA leather ID article; ESFRS linseed oil page;
- HSE welding fume bulletin; Safe Work Australia engineered-stone page;
- EPA DIY lead page.

These are regulatory or short web pages. They change over time, so a dated link is more honest than a stale local copy.

**Observation on volume:** 27 shortlist items for 36 materials. At least 8 of them are cross-family: items 4, 7, 12, 13, 14, 22 and 26 inherently cross families, and the FPL chapters serve both 01 and 11. See §7.2.

---

## 5. Output 6 — NotebookLM research-pack plan

NotebookLM is a comparison tool, not a source. Provenance stays with the original documents.

| Pack | Purpose | Materials | Documents | Why together | Key questions | Expected output |
|---|---|---|---|---|---|---|
| **P1 Wood, panels and finishes** | Compare solid wood with engineered panels, and link them to finishes | oak, plywood, MDF, paint, WB PU, oil | FPL Ch. 4, 11, 13, 16; Feist 1987; Osmo PI; Minwax WB PU TDS; BWF MDF guide (if retrievable) | One authority (FPL) plus product TDS lets general-vs-product claims be separated | How do MDF and plywood differ in moisture response and edge behaviour? Which finishes block vapour and which do not? What do TDS claim that FPL does not support? Fastening differences? | Claim table (claim → source → general/product), plus a research note per panel type |
| **P2 Calcareous stone and engineered quartz** | Care, sealing, heat and safety across natural and engineered stone | marble, travertine, engineered quartz | NSI DSDM chapters; NSI care pages; NIOSH 2026-101; Safe Work Australia page (capture); Wilsonart and Cambria care | Needed to resolve the heat-limit disagreement and to separate appearance from behaviour | Which cleaners are unsafe for which stone? What does "sealing" do and not do? What heat guidance is actually documented? What silica risk exists for DIY cutting vs an installed surface? | Care-and-risk comparison table with the disagreements preserved |
| **P3 Glass, mirror and compatibility** | Adhesive/sealant compatibility with glass products | tempered, laminated, mirror, silicone | GANA installation doc; AGC Mirox guide; Eastman Saflex compatibility; Dow joint sealant spec; Vitro NiS page | The same compatibility question appears from both the substrate side and the sealant side | Which cure chemistries are documented as harmful to PVB edges and mirror backings? What installation practices cause edge failure? | Compatibility matrix (substrate × sealant/adhesive type × source) |
| **P4 Upholstery surfaces** | Durability, care and identification of fabrics and leathers | linen, polyester, velvet, full-grain, nubuck/suede, PU synthetic | ACT guidelines + hydrolysis; ISO 12945-4 summary; LWG definitions; ISO 15115 preview; CCI leather; SATRA leather ID; James Dunlop velvet; UK FFR guide; Textile Exchange 2025 | These materials compete for the same use (seating), and users compare them directly | Which performance metrics transfer across fabrics and leathers? What cleaning guidance exists beyond Tier D? How can real vs synthetic leather be told apart? How do museum-care and in-use care differ? | Upholstery comparison sheet, plus an identification-cue list |
| **P5 Fabrication and reuse safety (cross-family)** | Collect the recurring hazards that DIY transformation triggers | all families | HSE welding fume; OSHA cement; NIOSH silica; wood-dust guidance; EPA lead-safe DIY; ESFRS oily rags; WEST epoxy safety; FOREX processing (dust/vapour) | Safety repeats across families; one pack prevents inconsistent warnings | Which hazards arise from *cutting, sanding, heating or finishing* each material? Which advice is jurisdiction-specific? Which figures are time-sensitive? | Hazard × activity × material table with jurisdiction and date |

**Not recommended yet:**
- Packs for 08 natural fibres, 09 plastics and 10 microcement.
- The first two lack enough strong documents.
- For microcement, every document would be manufacturer-authored, so a comparison mostly reproduces marketing positions.

---

## 6. Search query bank

| Query pattern (examples used) | Result quality | Notes |
|---|---|---|
| `<official doc id> chapter <n> <topic> pdf` — `fplgtr282 chapter 16 finishing wood pdf` | **Excellent** | Knowing a document's ID or name is the fastest path to primary PDFs |
| `<industry association> <material> technical bulletin / standard` — `Composite Panel Association MDF technical bulletin ANSI A208.2` | Very good | Returns association pages and standard metadata |
| `<standard number> <definition term>` — `ISO 13006 EN 14411 BIa water absorption` | Very good | Good for definitional claims |
| `<regulator> <hazard> <material>` — `HSE welding fume mild steel 2019`, `Safe Work Australia engineered stone ban` | Very good | Watch dates and jurisdiction |
| `<conservation institute> <material> care` — `Canadian Conservation Institute leather` | Very good | Strong independent care guidance, but museum context |
| `<brand> <product> technical data sheet pdf` — `Osmo Polyx-Oil technical data sheet pdf` | Good (Tier B) | Often distributor-hosted mirrors; find the official host |
| `<material> sealant compatibility technical guide` | Good | Surfaces interlayer and backing makers' documents |
| `<material> care maintenance guide` | **Poor** | Dominated by Tier D retailers and blogs (terracotta, rattan, velvet) |
| `<material> cracking problems` | **Poor** | Installer marketing (microcement) |
| `"<material>" scientific study durability journal` | Mixed | Useful when literature exists (PMMA, cork); empty for microcement |
| Turkish: `<konu> teknik özellikler makale` → DergiPark | Good | DergiPark returns primary academic sources; government pages are cultural rather than technical |
| `<material A> vs <material B> identification cross section` | Mixed | Found SATRA and research papers for leather; nothing for plywood or MDF edges |

**Patterns that consistently returned high-quality technical material:**
1. named document or standard ID;
2. association or regulator name plus topic;
3. conservation institute plus material.

Generic "care guide" and "problems" queries should be avoided or filtered, e.g. with `allowed_domains`.

---

## 7. Output 7 — Architecture / workflow observations

These are observations only. None is a rule, and nothing was implemented.

### 7.1 Category structure

- **OBSERVATION:** Subcategory axes are mixed within families.
  - In 06, `01_DOGAL_LIFLI…` and `02_SENTETIK…` are *fibre* axes, `03_DOSEMELIK…` is a *use* axis, and `06_ORGULU_VE_DOKULU…` is a *construction* axis. Polyester upholstery and velvet each fit two subcategories.
  - Tempered and laminated glass share one subcategory.
  - PU synthetic leather (07) overlaps coated fabrics (06) and PVC/vinyl (09).
- **INFERENCE:** Placement of a real source or material will sometimes be ambiguous inside a family, even when the family is clear.
- **POSSIBLE IMPLICATION:** The later taxonomy review may need either a stated axis per family, or an explicit way to note secondary subcategories. The existing `related_domains` works at category level, not subcategory level.

- **OBSERVATION:** Strong sources are frequently family-spanning:
  - the FPL handbook covers 01 and 11;
  - compatibility documents cover 05 and 12;
  - safety documents span many families.
- **INFERENCE:** Sources map to families many-to-many; knowledge files will usually map to one.
- **POSSIBLE IMPLICATION:** Source records and knowledge files may need different placement logic.

### 7.2 `_INBOX`

- **OBSERVATION:** Round 1 would bring about 27 files for 36 materials into `02_MALZEMELER/_INBOX`, and many belong to more than one family.
- **INFERENCE:**
  - One category-level `_INBOX` is practical at this volume.
  - Family-level `_INBOX` folders would force duplication or an arbitrary choice for cross-family documents.
- **POSSIBLE IMPLICATION:** There is no evidence yet for deeper inboxes. What the volume does suggest is a need to record *what a raw file is and which materials it serves* (a source record), independent of folder location.

- **OBSERVATION:** Several "sources" are regulatory or short web pages that change: Safe Work Australia, HSE bulletins, the NIOSH alert updated 2026.
- **INFERENCE:** A downloaded copy can silently become stale.
- **POSSIBLE IMPLICATION:** The workflow may need to treat "dated link + access date" as a valid kind of preserved source, alongside files.

### 7.3 `01_ARASTIRMA`

- **OBSERVATION:**
  - Definitional claims (porcelain ≤ 0.5% absorption; D1–D4 exist; full-grain definition) were consistent across one authoritative source and its echoes.
  - Performance, care and safety-threshold claims produced disagreements: quartz heat, acrylic solvents, leather dressings, çini composition, MDF exposure limits.
- **INFERENCE:**
  - One authoritative source is usually enough for definitions and classifications.
  - Cross-source comparison is needed for care, heat/chemical limits, durability and any claim made by a party with a commercial interest.
- **POSSIBLE IMPLICATION:** Not every source needs a research note. Research notes are most useful per *comparison question* (per pack), not per document.

### 7.4 Metadata

- **OBSERVATION:** The schema's Material type-specific fields map reasonably well onto dimensions that recurred in real sources:
  - `fiziksel_ozellikler`, `dayaniklilik`, `islenebilirlik`, `nem_ve_isi_davranisi`, `bakim`, `guvenlik_notu`, `maliyet_notu`.
  - Two dimensions recurred strongly and have no matching field: **compatibility** (sealants, adhesives, cleaners, coatings vs substrate) and **visual identification cues**.
- **INFERENCE:** These two may be structural knowledge needs rather than prose, because they are relations between materials — e.g. "acetoxy silicone → harms → calcareous stone, copper alloys, PVB edges".
- **POSSIBLE IMPLICATION:**
  - Compatibility may be better expressed as relations between records than as a field.
  - This round does **not** justify new fields. The existing type-specific fields are also unused in current frontmatter, so body text remains the practical home for now.

### 7.5 Source tracking

- **OBSERVATION:** Several properties of sources recurred and mattered:
  - **Verification level** — read vs identified. Most sources in this round are only identified.
  - **Scope** — product-specific vs general.
  - **Jurisdiction** — UK, US, AU, EU.
  - **Time-sensitivity** — regulations, limits, market data.
  - **Hosting** — official vs third-party mirror. NSI DSDM, APA E30, GANA and AAMA were found only as mirrors.
  - **Access** — free, paywalled or preview.
- **INFERENCE:** None of these is captured by the current `sources: []` list of citation strings.
- **POSSIBLE IMPLICATION:** `KAYNAK_VE_ATIF_STANDARDI.md` (to be written) is where these descriptors may belong. This research used them as descriptors only.

### 7.6 Quality

- **OBSERVATION:** The conflict types that actually appeared were:

| Conflict type | Example |
|---|---|
| Context | museum vs in-use leather care |
| Denominator | "<2% of users" vs "12% of ACD cases" for epoxy |
| Commercial interest | quartz heat; microcement cracking |
| Outdated values | MDF MELs |
| Product-specific vs general | Röhm solvent guidance |
| Scope mismatch | architectural terracotta vs floor tiles; US structural plywood vs furniture plywood |
| Historical / recipe variation | İznik composition |

- **INFERENCE:** Most disagreements dissolve once the context is recorded. Silently choosing one would produce wrong advice in the other context.
- **POSSIBLE IMPLICATION:** The quality standard may need to require that conditions (context, product, jurisdiction, date) travel with a claim.

### 7.7 Templates

- **OBSERVATION — sections that appeared for nearly every material:**
  - identity and variants;
  - composition/structure;
  - moisture;
  - heat;
  - surface treatment options;
  - cleaning (including "what damages it");
  - fabrication hazards;
  - compatibility;
  - visual identification cues and limits;
  - sources with scope notes.
- **OBSERVATION — sections that applied only to some material classes:**

| Section | Applies to |
|---|---|
| Corrosion / patina | metals |
| Acid sensitivity | calcareous stone |
| Hydrolysis | coated fabrics |
| Pile / pilling | textiles |
| Breakage behaviour | glass |
| Formaldehyde / emissions | panels, coatings |
| Curing chemistry | adhesives, sealants, finishes |
| Sealing / impregnation | porous stone, terracotta, concrete |

- **INFERENCE:** A minimum Material template would have a small universal core plus optional class-specific blocks.
- **POSSIBLE IMPLICATION:** The template should be designed from this list *after* at least one pack has been worked through.

### 7.8 Tooling

- **OBSERVATION:** PDF documents could not be read in this environment. That blocked verification of about half of the strongest sources.
- **INFERENCE:** The `_INBOX → 01_ARASTIRMA` step depends on being able to read PDFs.
- **POSSIBLE IMPLICATION:** Before Round 2, decide how PDFs will be read: a local extraction tool, NotebookLM, or manual reading. This is a practical prerequisite, not an architecture change.

---

## 8. Final synthesis

**A. What source ecosystem does SESTIA need for material knowledge?**
A layered ecosystem, not one kind of source:
1. A few **public institutional handbooks and standards summaries** for identity, structure and behaviour — e.g. FPL, NSI, TCNA/ISO, LWG/ISO, INBAR.
2. **Regulators and safety bodies** for hazards, recorded with jurisdiction and date — HSE, OSHA/NIOSH, Safe Work Australia, EPA, ECHA.
3. **Conservation institutes** for independent care and aging knowledge — CCI, Historic England, CAMEO.
4. **Manufacturer TDS, SDS and installation guides** for product-level care, compatibility and processing, always marked product-specific.
5. **Reference image collections** for identification — BGS, the Wood Database, CAMEO, research datasets.

Tier D sources are useful only for vocabulary and consumer context.

**B. Which source types delivered the highest value?**
- Public-domain government handbooks (the FPL Wood Handbook).
- Industry-association technical guides (NSI, ACT, CDA, TCNA, IVK).
- Conservation-institute notes (CCI).
- Regulator hazard pages.
- For plastics and auxiliaries, manufacturer technical manuals were the only strong sources.

**C. Easiest families to research reliably:**
- wood and panels (01);
- natural stone (02, except the engineered-stone heat question);
- metals — copper alloys and aluminium (04);
- leather terminology (07);
- porcelain definition (03).

**D. Hardest families:**
- microcement (10) — no independent source;
- terracotta floor tile (03);
- natural fibres and woven materials — rattan care (08);
- textiles at fabric level — velvet, linen (06);
- polycarbonate (09);
- interior steel finishes (04).

**E. Information that consistently required manufacturer documentation:**
- application parameters (coverage, drying, recoat);
- cleaning agents permitted for a specific product;
- adhesive and sealant compatibility with specific substrates and interlayers;
- fabrication parameters for plastics;
- microcement system build-ups;
- heat guidance for engineered surfaces.

**F. Information better supported by institutional or professional sources:**
- definitions and classification;
- moisture behaviour of wood;
- acid sensitivity of calcareous stone;
- conservation-grade care (leather, copper alloys);
- test frameworks (ACT, ISO 12945);
- all health and safety hazards.

**G. Visual references that were genuinely useful for recognition:**
- end-grain imagery (oak tyloses);
- cut-edge or cross-section comparisons (leather vs synthetic);
- breakage patterns (tempered vs laminated);
- documented reference stone samples (BGS);
- standardized condition scales (ISO 12945 pilling grades).

These were all found at collection or document level and still need to be viewed. Interior and product "beauty shots" had no identification value.

**H. Information needs that appear universal across materials:**
- identity and variants;
- moisture behaviour;
- heat behaviour;
- cleaning, including what damages it;
- surface treatment options;
- fabrication hazards;
- compatibility;
- visual identification cues **and their limits**;
- a product-specific vs general flag on claims.

**I. Strongly material-specific needs:**
- acid etching (calcareous stone);
- hydrolysis (PU coatings);
- nickel sulfide breakage (tempered glass);
- edge delamination (laminated glass);
- desilvering (mirror);
- crazing (acrylic);
- pile crush (velvet);
- silica (engineered stone);
- self-heating rags (drying oils);
- formaldehyde (UF panels);
- lead paint (old painted furniture — reuse context);
- tyloses (oak identification).

**J. What the next research round should focus on:**
1. **Read before widening:** extract and verify the shortlisted PDFs, starting with packs P1 and P2. Nothing in this round is yet claim-ready.
2. **Close the independent-source gaps** where SESTIA users will act: terracotta floor-tile care, microcement (any standard or independent test), furniture-grade plywood, interior steel finishes, rattan care, natural vs PE rattan.
3. **Add EU and Turkish context:** EU emission and fire rules for panels and upholstery; Turkish stone and çini sources; TSE equivalents where they exist.
4. **Reach sustainability evidence:** at least one EPD/LCA per family, where one exists.
5. **Visual round:** open and vet the candidate collections, and specifically look for edge, cross-section and damage imagery.

---

## 9. Source Verification Round 1 — status

Round 1 is frozen as source discovery. The sections above are left as written. Verification results are recorded per pack, in separate files.

| Pack | Status | Record | Acquired to `_INBOX` | Result in brief |
|---|---|---|---|---|
| **P1 Wood, panels and finishes** | Done (2026-09-25) | `MALZEME_ARASTIRMASI_01_DOGRULAMA_P1.md` | 6 of 8: FPL Ch. 4, 11, 13, 16; Osmo PI; Minwax TDS (a different product than listed). **Not acquired:** Feist 1987 (403), BWF MDF guide (500). | 37 claims checked. 27 verified (8 of them narrowed). 5 corrected: Feist provenance; oily-rag scope includes urethane/alkyd; FPL excludes furniture finishing; Minwax product misidentified; Minwax TDS internally inconsistent. 1 gap partly closed (furniture plywood = HP-1 class). 4 still open. |
| P2 Calcareous stone and engineered quartz | Not started | — | — | — |
| P3 Glass, mirror and compatibility | Not started | — | — | — |
| P4 Upholstery surfaces | Not started | — | — | — |
| P5 Fabrication and reuse safety | Not started | — | — | — |

**Effect on the Round 1 matrix (§2):** For oak, plywood, MDF and the three finishes, "Props" and "Inst./gen." are now backed by read text (VER R) rather than index summaries. The "Care" gaps for the wood products stand, because FPL does not cover furniture finishing.

## 10. What this round did not do

- **Structure and data:** no taxonomy, folder, numbering or metadata changes; no knowledge files created; no registry, index or retrieval work.
- **Files:** no downloads into any `_INBOX`.
- **Sources:** no Tier D source used as the foundation for a technical claim. Where only Tier D existed, the gap is recorded instead.
