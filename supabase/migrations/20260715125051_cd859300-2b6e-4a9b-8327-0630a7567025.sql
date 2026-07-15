UPDATE public.members
   SET user_id = NULL, account_status = 'to_redeem'
 WHERE id = 'd836fe67-e76d-43c6-b14d-c15def0bbb2c';

DELETE FROM public.user_roles WHERE user_id = 'd29222b8-26f2-490c-9f6e-9a42145f749c';
INSERT INTO public.user_roles (user_id, role, division)
VALUES ('d29222b8-26f2-490c-9f6e-9a42145f749c', 'member', NULL);