-- ทุก 15 นาที: purge pairing codes ที่หมดอายุ
select cron.schedule(
    'purge-pairing-codes',
    '*/15 * * * *',
    $$ select public.purge_expired_pairing_codes(); $$
);

-- ทุกวันตอนตี 3: purge result events เก่ากว่า 30 วัน
select cron.schedule(
    'purge-old-result-events',
    '0 3 * * *',
    $$ select public.purge_old_result_events(); $$
);

-- ทุกชั่วโมง: purge provision log เก่ากว่า 48 ชม.
select cron.schedule(
    'purge-old-provision-log',
    '0 * * * *',
    $$ select public.purge_old_provision_log(); $$
);