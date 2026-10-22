Use `transactional-emails.ts` as the source for application email HTML; synchronize its responsive output to `auto_email_templates` because the database enqueue function sends the stored copy.
Use the booking row as the once-only marker for time-based interview reminders; cancelled bookings disappear, so old reminders cannot follow a candidate to a new slot.
Use the service-role attendance resolution view for member attendance counts so all readers share stable identity matching.
Keep workspace audit actions in the shared activity registry and audit direct client writes through database triggers to avoid missing or duplicate entries.
Keep pure operations-rule regression tests separate from supplied package files so archive replacements stay byte-exact.