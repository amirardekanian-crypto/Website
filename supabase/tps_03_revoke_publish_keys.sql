-- Applied 2026-10-02 with the Supabase MCP (migration revoke_course_and_testing_publish_keys).
-- The private tps-content and assess-content repos are retired. Lessons, tests and both app shells now live in the
-- Website repo and in the tps_content / assess_content rows, so nothing publishes with a secret any more.
-- Content changes after this are SQL through the Supabase MCP (re-hash `version` on every row you touch):
--   version = left(encode(sha256(convert_to(body::text,'UTF8')),'hex'),16)
-- To publish with a token again, insert a new sha256(token) row into the publish_keys table and re-grant execute.
delete from public.tps_publish_keys;
delete from public.assess_publish_keys;
revoke execute on function public.tps_publish(text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.assess_publish(text, text, jsonb, text) from public, anon, authenticated;
