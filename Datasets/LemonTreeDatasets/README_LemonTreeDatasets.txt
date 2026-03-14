LemonTreeDatasets.zip — Data Dictionary
========================================
 
Structure
---------
LemonTreeDatasets.zip
├── ACS/
│   ├── NJ/
│   │   ├── acs_poverty_nj.csv
│   │   ├── acs_snap_nj.csv
│   │   ├── acs_income_nj.csv
│   │   ├── acs_race_nj.csv
│   │   └── acs_merged_nj.csv
│   └── NY/
│       ├── acs_poverty_ny.csv
│       ├── acs_snap_ny.csv
│       ├── acs_income_ny.csv
│       ├── acs_race_ny.csv
│       └── acs_merged_ny.csv
├── USDA_FoodAccess/
│   ├── nj-food-access-usda.csv
│   └── ny-food-access-usda.csv
└── README_LemonTreeDatasets.txt
 
 
ACS Data (ACS/)
---------------
Source: US Census Bureau, American Community Survey 5-Year Estimates (2018-2022)
Granularity: Census tract
Coverage: All tracts in New Jersey (NJ/) and New York (NY/)
Join key: GEOID (11-digit FIPS string: state + county + tract)
 
Files (same structure in both NJ/ and NY/ folders):
 
acs_poverty_[state].csv
  Table: C17002 (Poverty Status in the Past 12 Months)
  Columns:
    GEOID                  — 11-digit census tract identifier
    NAME                   — tract name
    state_name             — New Jersey or New York
    poverty_universe_total — total population for whom poverty status is determined
    below_50pct_poverty    — population with income below 50% of poverty threshold
    50_to_99pct_poverty    — population with income between 50-99% of poverty threshold
 
acs_snap_[state].csv
  Table: B22003 (Receipt of Food Stamps/SNAP in the Past 12 Months)
  Columns:
    GEOID              — 11-digit census tract identifier
    NAME               — tract name
    state_name         — New Jersey or New York
    total_households   — total household count in tract
    snap_households    — households receiving SNAP benefits
 
acs_income_[state].csv
  Table: B19013 (Median Household Income in the Past 12 Months)
  Columns:
    GEOID                    — 11-digit census tract identifier
    NAME                     — tract name
    state_name               — New Jersey or New York
    median_household_income  — median household income (2022 inflation-adjusted USD)
 
acs_race_[state].csv
  Table: B03002 (Hispanic or Latino Origin by Race)
  Columns:
    GEOID               — 11-digit census tract identifier
    NAME                — tract name
    state_name          — New Jersey or New York
    race_total          — total population
    white_non_hispanic  — white alone, not Hispanic or Latino
    black_alone         — Black or African American alone
    asian_alone         — Asian alone
    hispanic_latino     — Hispanic or Latino of any race
 
acs_merged_[state].csv
  All four tables above joined on GEOID. Contains all columns from above.
  Additional derived columns:
    poverty_rate_pct  — (below_50pct_poverty + 50_to_99pct_poverty) / poverty_universe_total * 100
    snap_rate_pct     — snap_households / total_households * 100
 
 
USDA Food Access Data (USDA_FoodAccess/)
-----------------------------------------
Source: USDA Economic Research Service, Food Access Research Atlas (2019)
Granularity: Census tract
Coverage: All tracts in New Jersey and New York
Join key: CensusTract (11-digit integer — zero-pad to 11 chars to match ACS GEOID)
 
Files:
  nj-food-access-usda.csv  — New Jersey tracts only
  ny-food-access-usda.csv  — New York tracts only
 
Key columns:
  CensusTract           — 11-digit census tract FIPS code
  State                 — state name
  County                — county name
  Urban                 — 1 = urban tract, 0 = rural tract
  Pop2010               — total population (2010 Census)
  LILATracts_1And10     — 1 = low income AND low access (1-mile urban / 10-mile rural) — primary food desert flag
  LILATracts_halfAnd10  — 1 = low income AND low access (0.5-mile urban / 10-mile rural threshold)
  LILATracts_Vehicle    — 1 = low income AND low vehicle access to supermarket
  LowIncomeTracts       — 1 = tract meets USDA low income definition (poverty rate >= 20% or median family income <= 80% of area median)
  HUNVFlag              — 1 = 100+ households with no vehicle and low supermarket access
  PovertyRate           — tract poverty rate (%)
  MedianFamilyIncome    — tract median family income (USD)
  LATracts_half         — 1 = low access at 0.5-mile distance threshold
  LATracts1             — 1 = low access at 1-mile distance threshold
  LATracts10            — 1 = low access at 10-mile distance threshold
  LATracts20            — 1 = low access at 20-mile distance threshold
  LAPOP1_10             — population count with low access (1-mile urban / 10-mile rural)
  LALOWI1_10            — low income population count with low access (1-mile urban / 10-mile rural)
  TractSNAP             — total SNAP-authorized households in tract
  TractBlack            — Black population count
  TractWhite            — White population count
  TractAsian            — Asian population count
  TractHispanic         — Hispanic population count
  TractHUNV             — households with no vehicle count
  TractKids             — population under 18
  TractSeniors          — population 65 and older
  TractLOWI             — low income population count
 
 
Joining ACS and USDA
---------------------
ACS GEOID format:  "34001010100"  (string, 11 digits)
USDA CensusTract:   34001010100   (integer)
 
To join in Python:
  usda_df["GEOID"] = usda_df["CensusTract"].astype(str).str.zfill(11)
  merged = acs_df.merge(usda_df, on="GEOID", how="left")
 
To join in SQL:
  ON LPAD(CAST(usda.CensusTract AS VARCHAR), 11, '0') = acs.GEOID