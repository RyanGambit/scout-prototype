# Scout AI Retrofit App — v3.1 Multi-Site Calibration

## v3.1 — Multi-Site Validation & Calibration (Feb 27 2026)

### Six-Building Validation Suite
Tested against 6 diverse Ontario building profiles: 55 King (office), 100 Adelaide (Toronto tower), Waterloo Rec Centre (municipal), Weber St Plaza (small retail), 185 Northfield (industrial), 88 Queen (mixed-use). All 156 checks pass.

### Critical Calibration Fixes

#### CT ITC Basis — Conservative CRA Interpretation
- **Before**: Only equipment-allocated grants deducted from CT ITC basis (per-equipment map)
- **After**: ALL accumulated government grants deducted from CT-eligible equipment pool
- **Impact**: 55 King CT ITC now $132K (was $145K, v4 target $130K ✓)
- **Why**: CRA requires reduction of capital cost by *all* government assistance on same project

#### IESO Prescriptive — LED Only (Conservative)
- **Before**: Prescriptive claimed both LED ($50/fixture) + Solar ($860/kW-AC) = double-counted
- **After**: LED fixtures only; solar allocation goes through IESO Custom channel
- **Impact**: 55 King Prescriptive now $35K (was $207K including solar)

#### IESO Custom — Excludes LED Measures
- **Before**: Custom summed ALL kWh saved including LED
- **After**: Filters out LED measures (claimed via Prescriptive), caps at 50% of non-LED costs
- **Impact**: Prevents overlap between Custom + Prescriptive streams

#### Instant Discounts — Mutual Exclusion
- **Before**: Instant Discounts ($75/fixture) claimed ALONGSIDE Prescriptive ($50/fixture)
- **After**: If Prescriptive already claims LED, Instant Discounts disabled to prevent double-counting
- **Impact**: Eliminates $53K phantom incentive on 55 King

#### Federal Carbon Charge — Eliminated April 2025
- **Before**: Projected $110-170/tonne through 2030 for all provinces
- **After**: $0 for backstop provinces (ON, AB, SK, etc.) from 2025+. BC and QC retain provincial systems
- **Impact**: Carbon avoidance row in pro forma now $0 for Ontario buildings (conservative)

#### Energy Escalation — 2% Default
- **Before**: 3%/yr energy cost escalation
- **After**: 2%/yr per v4 verified model
- **Impact**: More conservative 20-year savings projections

#### Cap Rate Default — 7%
- **Before**: Financial engine defaulted to 5% cap rate
- **After**: Default 7% per v4 model (realistic for non-core Ontario CRE)

#### Trigger Matching — Heat Pump Aliases
- **Before**: Trigger "Heat Pump" only matched literal "heat pump" in measure name
- **After**: Alias map includes ASHP, VRF, Geothermal, Mini-Split, Ground-Source
- **Impact**: CIB Public/Private now correctly eligible for buildings with non-literal HP names

#### CIB Equipment Target
- **Before**: Empty equipmentTarget[] on CIB programs → ID-based fallback never matched
- **After**: equipmentTarget includes ['heatpump', 'solar'] for both CIB Private and Public

#### Municipal Pro Forma — 100% CIB Debt
- **Before**: 15% equity / 85% debt assumed for all building types
- **After**: Municipal buildings use 0% equity / 100% CIB debt at 2.0% (vs 2.75% private)

#### Water Programs — Free Service Type
- **Before**: W.E.T. and Toronto Capacity Buyback typed as 'Grant' with $0 → filtered as ineligible
- **After**: Typed as 'Free Service' (includes free water audits/fixtures)

### 55 King v4 Calibration Results
| Program | v3.1 Output | v4 Target | Delta |
|---------|------------|-----------|-------|
| IESO Custom | $63K | $65K | -$2K ✓ |
| IESO Prescriptive | $35K | $35K | $0 ✓ |
| Enbridge Custom | $28K | $28K | $0 ✓ |
| CT ITC (30%) | $132K | $130K | +$2K ✓ |
| Core 4 Total | $257K | $258K | -$1K ✓ |
| CT ITC Basis | $439K | $435K | +$4K ✓ |

### Files Modified
- `data/incentives.ts` — CT ITC basis, IESO mutual exclusion, trigger aliases, CIB targets, water programs
- `data/financialEngine.ts` — Energy escalation 2%, cap rate 7%
- `data/carbonPricing.ts` — Federal charge eliminated, BC/QC retained
- `test-harness.ts` — 6-building validation suite (156 checks)

---

# Scout AI Retrofit App — v3.0 Full Dataset Alignment

## Summary

Comprehensive upgrade aligning the Scout app with **Scout Full Dataset v6** (27 programs) and **55 King St E Retrofit Financial Model v4** (verified financials). All data modules, calculations, and UI components updated to match reference documents exactly.

---

## KEY CORRECTIONS (v2 → v3)

### Data Corrections
- **Gas usage**: 145,000 → **40,000 m³/yr** (demoBuilding.ts — verified from Enbridge account)
- **Cap rate**: 5.0% → **7.0%** (FinancingView + demoBuilding — confirmed with owner)
- **IESO Custom rate**: $0.10/kWh → **$0.20/kWh** + $1,800/kW (incentives.ts)
- **Enbridge Custom rate**: $0.30/m³ → **$0.25/m³** first 400K (incentives.ts)
- **Asset value**: $2.34M → **$886K** (7% cap rate, not 5%)
- **Carbon charge**: Eliminated April 2025 — no forward carbon cost in financials

### Incentive Programs: 14 → 27
**Added 13 programs from v6 dataset:**
- #3: IESO Small Business (up to $5.5K direct install)
- #4: IESO EBCx (up to $150K, min 750K kWh/yr)
- #6: IESO Instant Discounts ($30-140/fixture, zero paperwork)
- #7: IESO XLerate (up to $15M, $300/MWh, industrial)
- #9: Enbridge Prescriptive DCV ($5K-$12K)
- #10: Enbridge DDP (point-of-sale HVAC discounts)
- #11: Enbridge P4P (3-year performance-based)
- #13: CE ITC 15% (non-taxable entities, awaiting Royal Assent)
- #16: CIB Public Building Retrofits (MUSH direct)
- #18: CMHC MLI Select (95% LTV, 50yr amortization)
- #19: NRCan ISO 50001 (60% cost share, max $40K)
- #20: BDC Green Building Loan (100% project costs)
- #21-27: Municipal programs (Toronto ERL, ZEVIP, ChargeON, W.E.T., etc.)

**Enhanced stacking engine:**
- City-level eligibility filtering
- Sector restriction checks (private/MUSH/industrial/municipal)
- Minimum electricity threshold enforcement
- Intake status tracking (open/confirm/closed)
- Annual electricity consumption parameter

### New: 9-Lever Business Case Framework (businessCase.ts)
From 55 King v4 Section 5 — nine independently verifiable levers:
1. L1: Incentive Cash Stack ($258K)
2. L2: CIB Low-Interest Financing ($195-282K over 20yr)
3. L3: Energy Bill Savings ($304K, 2% escalated)
4. L4: Solar PV Net Metering ($583K, 2% escalated)
5. L5: Submetering — NOI Protection (structural, NOT additive)
6. L6: Green Premium ($365K conservative, $430K base)
7. L7: Vacancy Improvement ($537K base case only)
8. L8: Regulatory Risk ($0 for non-Toronto — qualitative only)
9. L9: Lifecycle Alignment ($159K net incremental)
- Conservative total: ~$1,705K | Base case: ~$2,394K
- Amortizing interest savings calculation (monthly compounding)
- Occupancy-adjusted rent premium
- Sequential L6/L7 dependency modeling

### New: Application Workflow (applicationWorkflow.ts)
From 55 King v4 Section 6:
- 5-phase sequenced roadmap (Phase 0-4)
- Critical path identification (red indicators)
- Pre-approval warning system (disqualification prevention)
- Lender package checklist (11 documents)
- Key contacts directory
- Timing badges for incentive display (upfront/post-completion/tax-filing/ongoing/point-of-sale)

### Component Updates

**FinancingView.tsx:**
- Cap rate corrected to 7% (was hardcoded 5%)
- Added `city` and `annualElecKwh` to incentive stack params
- New collapsible 9-Lever Business Case panel with per-lever details
- New Application Roadmap panel with phase-by-phase workflow
- Lender document checklist integrated
- Imports for businessCase.ts and applicationWorkflow.ts

**ActionsView.tsx:**
- Split incentive analysis enhanced with v4 L5 reframing
- Dynamic green lease premium calculation (4% × rent × occupancy × cap rate)
- Submetering reframed as NOI protection (not additive cash flow)
- Timing badges imported for incentive display

**types.ts:**
- Added to BuildingData: `city`, `capRate`, `rentPerSqft`, `occupancy`

**demoBuilding.ts:**
- Gas usage: 145,000 → 40,000 m³/yr
- Added: city='Waterloo', capRate=0.07, rentPerSqft=18, occupancy=0.85
- Asset value recalculated at 7% cap rate
- Executive summary updated to match v4 figures

---

## Files Changed
| File | Lines | Status |
|------|-------|--------|
| data/incentives.ts | 1,053 | **REWRITTEN** (was 445) |
| data/businessCase.ts | 270 | **NEW** |
| data/applicationWorkflow.ts | 310 | **NEW** |
| data/demoBuilding.ts | 350 | **MODIFIED** |
| components/FinancingView.tsx | 680 | **MODIFIED** |
| components/ActionsView.tsx | 310 | **MODIFIED** |
| types.ts | 85 | **MODIFIED** |
| CHANGELOG.md | — | **UPDATED** |

---

## Reference Documents
- Scout Full Dataset v6 (27 programs, 9 levers, bankability framework)
- 55 King St E Retrofit Financial Model v4 CORRECTED (verified financials)

---

# Scout AI Retrofit App — v2.0 Comprehensive Upgrade

## Summary

Holistic improvement of the Scout mockup to produce high-quality, accurate financial outputs for **any building**, not just the demo case study. All calculation engines are now reusable and data-driven.

---

## Changes by File

### NEW: `data/incentives.ts` — Complete Rewrite
- **14 real Ontario programs** (was 8 generic placeholders)
- Programs include: IESO Custom, IESO Prescriptive, IESO EPP, Enbridge Custom, CT ITC, CIB Growth Retrofit, FCM GMF, Class 43.1 CCA, Efficiency Capital, LDC Demand Response, CleanBC, TEQ, ERA
- Each incentive now includes: `timing` (upfront/post-completion/tax-filing/ongoing), `claimDelay`, `complexity`, `stackable`, `equipmentTarget[]`, `rateType`, `rateValue`, `rateUnit`
- **`calculateIncentiveStack()` engine**: Allocates grants to specific equipment, calculates CT ITC basis reduction (grants on same equipment reduce eligible base), excludes LED from CT ITC, separates upfront vs delayed, calculates bridge financing cost

### NEW: `data/carbonPricing.ts`
- Federal carbon backstop schedule: $65 (2023) → $170 (2030), flat thereafter
- Quebec Cap & Trade system (~$35/t with 5% annual growth)
- BC carbon tax (tracks/exceeds federal)
- Provincial utility rates (electricity + gas)
- Provincial electricity emission factors
- Functions: `getCarbonPriceForYear()`, `getCarbonChargePerM3()`, `projectCarbonCosts()`, `getUtilityRates()`

### NEW: `data/financialEngine.ts`
- **Amortizing debt calculator** (monthly compounding mortgage formula)
- **CIB vs commercial comparison** (year-by-year interest savings that decrease over time)
- **20-year pro forma generator** with: escalating energy savings, actual carbon schedule, solar degradation, submetering NOI, CT ITC refund in Year 1
- **NPV sensitivity table** (5-10% discount rates)
- **IRR calculator** (Newton's method)
- Helper formatters: `formatCurrency()`, `formatPercent()`

### NEW: `data/demoBuilding.ts`
- 55 King St E, Kitchener complete seed data
- 7 verified measures with real costs
- Pre-built SimulationContext, Scenario, ActionPlan
- AI insight text for demo mode

### MODIFIED: `components/FinancingView.tsx` — Major Rewrite
- Uses `financialEngine.ts` for all calculations (amortizing debt, not flat!)
- Bridge financing warning banner when CT ITC is delayed
- Upfront vs Delayed incentive breakdown
- Claim timing and complexity badges on each incentive
- Separate CIB rate and commercial benchmark sliders
- NPV sensitivity table (6 discount rates)
- Expandable 20-year pro forma detail table
- Capital stack summary with Day-1 financed amount
- CIB lifetime savings display (amortizing total)

### MODIFIED: `components/SimulationView.tsx`
- Uses `carbonPricing.ts` instead of inline hardcoded values
- Uses `getUtilityRates()` for province-specific electricity and gas rates
- Uses `calculateIncentiveStack()` for accurate incentive totals
- Cost of Inaction graph uses actual federal carbon schedule (not linear ramp)
- Incentive badges on measures show program names and rate units

### MODIFIED: `App.tsx`
- **"Load Demo" button** on landing page — loads 55 King St E with all verified data
- Demo sets Maturity Level 3 and opens Financing tab
- No Gemini API call required for demo
- Carbon price initialization uses `getCarbonPriceForYear()` for correct current-year price
- Default discount rate changed from 5% to 7.5% (standard WACC proxy for Canadian commercial RE)

### MODIFIED: `components/ActionsView.tsx`
- Uses new incentive engine for eligible incentive filtering
- **Split Incentive Analysis panel** for multi-tenant buildings: shows NOI leakage without submetering, NOI recovery with submetering, green lease premium potential
- Real incentive data passed to AI action plan generator

### MODIFIED: `components/PathwaysView.tsx`
- Carbon price uses `getCarbonPriceForYear()` instead of flat $80
- Discount rate defaults to 7.5%

---

## Key Financial Corrections

| Item | Mockup v1 | v2.0 |
|------|-----------|------|
| Debt math | Flat annual interest | Monthly-compounding amortization |
| CIB lifetime savings | $367K (flat) | ~$239K (amortizing) |
| CT ITC timing | Day 0 | Year 1 (T2 filing) |
| CT ITC basis | Pooled at 40% of CapEx | Equipment-specific, grant-reduced |
| LED in CT ITC | Included | Excluded (not clean tech) |
| Carbon price | Flat $80 or $95 | Actual federal schedule by year |
| Discount rate | 5% | 7.5% (WACC proxy) |
| Utility rates | Flat $0.15/kWh, $0.50/m³ | Province-specific from module |
| Incentives | 8 generic programs | 14 real Ontario programs |
| Bridge financing | Not modeled | $CT_ITC × commercial_rate × 12mo |

---

## Architecture: How New Buildings Get Accurate Outputs

The improvement is **not just for the demo**. Every new building searched through the Gemini API now benefits from:

1. **Carbon pricing**: `getCarbonPriceForYear(year, province)` returns the correct price for any province and year
2. **Utility rates**: `getUtilityRates(province)` returns province-specific electricity and gas rates
3. **Incentive stacking**: `calculateIncentiveStack()` dynamically calculates available incentives based on measures, province, GHG reduction, organization type
4. **Amortizing debt**: `calculateAmortizingSchedule()` and `generateProForma()` produce accurate financial projections
5. **NPV sensitivity**: `calculateNpvSensitivity()` shows project viability across discount rates

The demo building is simply a pre-loaded example of these same engines running with verified inputs.
