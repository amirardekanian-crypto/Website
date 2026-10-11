-- The live `public` schema as ONE JSON document: every table (columns, constraints, indexes, row-level security, policies, triggers, grants),
-- every function (full definition and who may run it), sequences, custom types and the extensions in use.
-- It is the input of scripts/restore/make_schema_snapshot.py, which turns it into supabase/schema_snapshot.sql.
--
-- How to run it (Claude, with the Supabase tool): execute this whole file as one query. The answer is far past what a chat shows, so the tool saves it to a
-- file and prints the path; give that path to make_schema_snapshot.py. Nothing here changes anything: it only reads the catalog.
-- Why a catalog query and not pg_dump: the project is on the free plan, there is no database password to give a local pg_dump, and the Supabase tool
-- can only run SQL.
with tbl as (select * from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p'))
select jsonb_build_object(
  'generated_from', jsonb_build_object('server_version', current_setting('server_version'), 'database', current_database()),
  'extensions', (select coalesce(jsonb_agg(jsonb_build_object('name', e.extname, 'schema', n.nspname) order by e.extname), '[]') from pg_extension e join pg_namespace n on n.oid = e.extnamespace),
  'types', (select coalesce(jsonb_agg(jsonb_build_object('name', t.typname, 'kind', t.typtype,
                'labels', (select jsonb_agg(en.enumlabel order by en.enumsortorder) from pg_enum en where en.enumtypid = t.oid)) order by t.typname), '[]')
              from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype in ('e', 'd') and t.typarray <> 0),
  'tables', (select jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
      'grants', (select jsonb_agg(jsonb_build_object('grantee', coalesce(r.rolname, 'PUBLIC'), 'priv', a.privilege_type) order by r.rolname nulls first, a.privilege_type)
                   from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a left join pg_roles r on r.oid = a.grantee),
      'columns', (select jsonb_agg(jsonb_build_object('name', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'notnull', a.attnotnull,
                    'default', pg_get_expr(d.adbin, d.adrelid), 'identity', a.attidentity::text, 'generated', a.attgenerated::text,
                    'collation', case when a.attcollation <> 0 and a.attcollation <> (select typcollation from pg_type where oid = a.atttypid) then (select collname from pg_collation where oid = a.attcollation) end) order by a.attnum)
                    from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
                   where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      'constraints', (select coalesce(jsonb_agg(jsonb_build_object('name', k.conname, 'type', k.contype::text, 'def', pg_get_constraintdef(k.oid), 'index', ic.relname) order by k.conname), '[]')
                        from pg_constraint k left join pg_class ic on ic.oid = k.conindid where k.conrelid = c.oid),
      'indexes', (select coalesce(jsonb_agg(jsonb_build_object('name', ic.relname, 'def', pg_get_indexdef(i.indexrelid),
                    'for_constraint', exists (select 1 from pg_constraint k2 where k2.conindid = i.indexrelid and k2.conrelid = c.oid)) order by ic.relname), '[]')
                    from pg_index i join pg_class ic on ic.oid = i.indexrelid where i.indrelid = c.oid),
      'policies', (select coalesce(jsonb_agg(jsonb_build_object('name', p.polname, 'cmd', p.polcmd::text, 'permissive', p.polpermissive,
                    'roles', (select jsonb_agg(coalesce(r.rolname, 'public')) from unnest(p.polroles) rid left join pg_roles r on r.oid = rid),
                    'using', pg_get_expr(p.polqual, p.polrelid), 'check', pg_get_expr(p.polwithcheck, p.polrelid)) order by p.polname), '[]')
                    from pg_policy p where p.polrelid = c.oid),
      'triggers', (select coalesce(jsonb_agg(jsonb_build_object('name', t.tgname, 'def', pg_get_triggerdef(t.oid)) order by t.tgname), '[]')
                    from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal)
    ) order by c.relname) from tbl c),
  'sequences', (select coalesce(jsonb_agg(jsonb_build_object('name', s.relname, 'type', format_type(q.seqtypid, null), 'start', q.seqstart, 'increment', q.seqincrement,
                    'min', q.seqmin, 'max', q.seqmax, 'cache', q.seqcache, 'cycle', q.seqcycle,
                    'owned_by', (select tc.relname || '.' || ta.attname from pg_depend d join pg_class tc on tc.oid = d.refobjid join pg_attribute ta on ta.attrelid = tc.oid and ta.attnum = d.refobjsubid
                                  where d.objid = s.oid and d.deptype in ('a', 'i') and d.refclassid = 'pg_class'::regclass limit 1),
                    'identity', exists (select 1 from pg_depend d where d.objid = s.oid and d.deptype = 'i')) order by s.relname), '[]')
                  from pg_class s join pg_sequence q on q.seqrelid = s.oid where s.relnamespace = 'public'::regnamespace),
  'functions', (select jsonb_agg(jsonb_build_object('name', p.proname, 'args', pg_get_function_identity_arguments(p.oid), 'def', pg_get_functiondef(p.oid),
                    'has_acl', p.proacl is not null,
                    'grants', (select coalesce(jsonb_agg(jsonb_build_object('grantee', coalesce(r.rolname, 'PUBLIC'), 'priv', a.privilege_type) order by r.rolname nulls first), '[]')
                                 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a left join pg_roles r on r.oid = a.grantee)) order by p.proname, pg_get_function_identity_arguments(p.oid))
                  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'),
  -- the one thing the product keeps OUTSIDE `public`: a trigger on the sign-in table that calls a public function (stage51: a first password is cleared once it has been used)
  'auth_triggers', (select coalesce(jsonb_agg(jsonb_build_object('table', 'auth.users', 'name', t.tgname, 'def', pg_get_triggerdef(t.oid)) order by t.tgname), '[]')
                      from pg_trigger t where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal),
  'other_routines', (select coalesce(jsonb_agg(jsonb_build_object('name', p.proname, 'kind', p.prokind::text)), '[]') from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind <> 'f'),
  'views', (select coalesce(jsonb_agg(c.relname), '[]') from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')),
  'schemas', (select coalesce(jsonb_agg(n.nspname order by n.nspname), '[]') from pg_namespace n where n.nspname not like 'pg\_%' and n.nspname <> 'information_schema')
) as catalog;
