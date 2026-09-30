-- Append inside security_lockdown.sql's transaction and finish with ROLLBACK.
-- Fixture rows exist only in the transaction; no emails, uploads or API calls.
INSERT INTO public.tenants(id,slug,name) OVERRIDING SYSTEM VALUE VALUES
 (-930001,'flock-audit-fixture-a','Audit fixture A'),
 (-930002,'flock-audit-fixture-b','Audit fixture B');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('00000000-0000-4000-8000-000000930001','flock-audit-fixture@example.invalid','{}');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000930001","role":"authenticated","email":"flock-audit-fixture@example.invalid"}',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.profiles(id,tenant_id,display_name,role,stamp_count)
 VALUES ('00000000-0000-4000-8000-000000930001',-930001,'Audit fan','admin',9999);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='fan' AND stamp_count=0)
 THEN RAISE EXCEPTION 'profile insert escalation not blocked'; END IF;
 BEGIN
   INSERT INTO public.posts(tenant_id,author_id,content,feed_type,is_pinned)
   VALUES(-930001,auth.uid(),'fixture','community',true);
   RAISE EXCEPTION 'fan pinning not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.posts(tenant_id,author_id,content,feed_type)
   VALUES(-930002,auth.uid(),'fixture','community');
   RAISE EXCEPTION 'cross-tenant post not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM signup_ip FROM public.profiles LIMIT 0;
   RAISE EXCEPTION 'signup IP read not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM checkin_code FROM public.shows LIMIT 0;
   RAISE EXCEPTION 'check-in code read not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,owner_id)
   VALUES('media','logos/-930001/logo.png',auth.uid()::text);
   RAISE EXCEPTION 'fan branding upload not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name,owner_id)
   VALUES('media','avatars/-930002/'||auth.uid()::text||'.png',auth.uid()::text);
   RAISE EXCEPTION 'cross-tenant upload not blocked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Allowed fan operations should continue working.
INSERT INTO public.posts(tenant_id,author_id,content,feed_type)
 VALUES(-930001,auth.uid(),'allowed fixture','community');
INSERT INTO storage.objects(bucket_id,name,owner_id)
 VALUES('media','avatars/-930001/'||auth.uid()::text||'.png',auth.uid()::text);
UPDATE public.profiles SET role='admin', stamp_count=9999 WHERE id=auth.uid();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='fan' AND stamp_count=0)
 THEN RAISE EXCEPTION 'profile update escalation not blocked'; END IF;
END $$;
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES
 ('media','logos/-930001/existing.png','00000000-0000-4000-8000-000000930003'),
 ('media','avatars/-930002/cross-tenant.png','00000000-0000-4000-8000-000000930001');
SET LOCAL ROLE authenticated;
DO $$ DECLARE changed integer; BEGIN
 UPDATE storage.objects SET metadata='{"audit":true}' WHERE name='logos/-930001/existing.png';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 0 THEN RAISE EXCEPTION 'other owner overwrite allowed'; END IF;
 UPDATE storage.objects SET metadata='{"audit":true}' WHERE name='avatars/-930002/cross-tenant.png';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 0 THEN RAISE EXCEPTION 'cross-tenant overwrite allowed'; END IF;
 UPDATE storage.objects SET metadata='{"audit":true}' WHERE name='avatars/-930001/'||auth.uid()::text||'.png';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 1 THEN RAISE EXCEPTION 'own avatar update blocked'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.posts(id,tenant_id,author_id,content,feed_type,is_exclusive)
 VALUES('00000000-0000-4000-8000-000000930002',-930001,'00000000-0000-4000-8000-000000930001','exclusive fixture','community',true);
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.posts WHERE id='00000000-0000-4000-8000-000000930002')
 THEN RAISE EXCEPTION 'exclusive posts publicly readable'; END IF;
END $$;
RESET ROLE;
SELECT 'behavioral RLS checks passed; fixtures rolled back' validation;
ROLLBACK;
