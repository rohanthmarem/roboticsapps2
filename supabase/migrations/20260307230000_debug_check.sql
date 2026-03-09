-- Just a diagnostic query, will show as notices
do $$
declare
  r record;
  profile_count int;
  policy_count int;
begin
  -- Count profiles
  select count(*) into profile_count from public.profiles;
  raise notice 'Total profiles: %', profile_count;
  
  -- Show all profiles with roles
  for r in select id, email, role from public.profiles loop
    raise notice 'Profile: id=% email=% role=%', r.id, r.email, r.role;
  end loop;
  
  -- Count policies per table
  for r in select tablename, count(*) as cnt from pg_policies where schemaname = 'public' group by tablename order by tablename loop
    raise notice 'Policies on %: %', r.tablename, r.cnt;
  end loop;
  
  -- Check if RLS is enabled
  for r in select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname loop
    raise notice 'Table % RLS enabled: %', r.relname, r.relrowsecurity;
  end loop;
end $$;
