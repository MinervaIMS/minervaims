## Goal

Update the Long-Short Equity Fund performance table with the uploaded CSV, extending it backward to 2018, and set the inception-date caption to 3 December 2018.

## Data changes (fund_performance_years, fund = 'long-short')

Add new rows:
- **2018** — ITD +6.6%, no monthly data, YTD +6.6%, Vol +12.6%, Sharpe blank
- **2019** — ITD +5.8%, full monthly series (Jan -4.3% … Dec +0.4%), YTD -0.8%, Vol +5.9%, Sharpe -0.10
- **2020** — ITD -7.6%, full monthly series (Jan -2.4% … Dec +1.0%), YTD -12.7%, Vol +6.0%, Sharpe -2.28

Update existing rows:
- **2021** — ITD +6.7%, full monthly series from the file (Jan -4.4% … Dec +6.9%, replacing the current partial Nov/Dec-only row), YTD +15.5%, Vol +6.7%, Sharpe 2.10
- **2022** — ITD +27.6% (was 29.1%); monthly returns, YTD, Vol, Sharpe unchanged
- **2023** — ITD +28.3% (was 29.8%); rest unchanged
- **2024** — ITD +44.8% (was 46.5%); rest unchanged
- **2025** — ITD +56.4% (was 58.3%); rest unchanged
- **2026** — ITD +51.0% (was 52.8%), YTD -3.5%, Vol +3.1%, Sharpe -1.47; existing Jan–Mar monthly returns kept

All values normalised to the site's format (comma decimals from the CSV converted to dots, signed percentages for monthly/YTD).

## Caption change

`src/pages/FundDetail.tsx` (Long-Short block, footnote 1): change "Inception = 21/11/2021" to "Inception = 03/12/2018".

## Notes

The public fund page and the workspace Funds Performances screen both read this table, so both reflect the change automatically. No schema change is needed.
