-- Field Day — vertical enrollment status
--
-- Supports the "Coming Soon" waitlist for School/Work: joining the waitlist
-- writes a vertical_enrollments row with status = 'waitlist' instead of
-- 'active', so interest is captured without implying the vertical is live.
alter table vertical_enrollments
  add column status text not null default 'active';

alter table vertical_enrollments
  add constraint vertical_enrollments_status_check
  check (status in ('active', 'waitlist'));
