## Reset Riccardo's auth account for redeem testing

Delete Riccardo Colombo's auth login entirely so a fresh signup flow can be tested. The roster profile stays as-is (already `to_redeem` with `user_id = NULL`), so once the new signup confirms its email, `link_member_account` will claim the existing member row and restore the president role.

### Steps (single migration)

1. `DELETE FROM public.user_roles WHERE user_id = 'd29222b8-26f2-490c-9f6e-9a42145f749c'`
2. `DELETE FROM public.profiles WHERE id = 'd29222b8-26f2-490c-9f6e-9a42145f749c'`
3. `DELETE FROM auth.users WHERE id = 'd29222b8-26f2-490c-9f6e-9a42145f749c'`
4. Safety check: confirm the members row for Colombo still has `user_id IS NULL` and `account_status = 'to_redeem'` (no change if already true).

After this, `riccardo.colombo7@studbocconi.it` can sign up from scratch, receive the verification email, confirm, and the redeem flow will link him back to the president member row automatically.
