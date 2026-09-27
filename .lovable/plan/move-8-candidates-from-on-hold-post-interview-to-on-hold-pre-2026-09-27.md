# Move 8 candidates from "on hold post interview" to "on hold pre interview"

## What I found

All eight candidates exist in the Fall 2026 round and are currently at status `on_hold_post_interview`:

- Marcello Nora — marcello.nora@studbocconi.it
- Pietro Tracanzan — pietro.tracanzan@studbocconi.it
- Ulrik Nordang — ulrik.nordang@studbocconi.it
- Zayn Jabbar — zayn.jabbar@studbocconi.it
- Ouyang Sun — ouyang.sun@studbocconi.it
- Matteo D'Anna — matteo.danna@studbocconi.it
- Fabrizio Cassinelli Toledo Ocampo — fabrizio.cassinelli@studbocconi.it
- Ludovico Valier — ludovico.valier@studbocconi.it

## What I'll do

1. Update the `status` column of these 8 rows in `applications` from `on_hold_post_interview` to `on_hold_pre_interview`, matched by email address (exact, one row each).
2. No emails are triggered by this change — moving between "on hold" stages sends nothing automatic.
3. Verify afterwards by re-reading the 8 rows and confirming each shows `on_hold_pre_interview`.

## Notes

- Nothing else on the applications is touched (division, notes, interview bookings stay as they are).
- The change is reversible the same way if needed.
