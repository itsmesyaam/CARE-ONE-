begin;
select plan(1);

select ok(true, 'pgTAP runner is connected and operational');

select * from finish();
rollback;
