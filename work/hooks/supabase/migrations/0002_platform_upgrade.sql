-- Multi-platform upgrade: briefs.platform widens beyond LinkedIn-only, and each
-- brief now records the ad format (single_image, carousel, rsa, ...), which
-- drives the character constraints applied at generation time.

alter table public.briefs alter column platform drop default;
alter table public.briefs add constraint briefs_platform_check
  check (platform in ('linkedin_ads', 'meta_ads', 'google_ads', 'reddit_ads'));

alter table public.briefs add column ad_format text not null default 'single_image';
alter table public.briefs alter column ad_format drop default;
