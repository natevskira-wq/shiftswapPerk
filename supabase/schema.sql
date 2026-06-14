-- ===========================================================================
-- ShiftSwap: The Deck — Supabase schema (tables · enums · RLS · seed)
-- All tables prefixed with swap_
-- Run this in your Supabase project: SQL Editor → paste → Run.
-- ===========================================================================

-- Clean re-runs ------------------------------------------------------------
drop table if exists swap_matches  cascade;
drop table if exists swap_offers   cascade;
drop table if exists swap_schedules cascade;
drop table if exists swap_ranks    cascade;
drop table if exists swap_agents   cascade;
drop type  if exists skill_tier    cascade;
drop type  if exists lang_code     cascade;
drop type  if exists shift_code    cascade;
drop type  if exists trade_kind    cascade;
drop type  if exists offer_status  cascade;
drop type  if exists match_status  cascade;

-- Enums --------------------------------------------------------------------
create type skill_tier   as enum ('GDS','GDS_ADV','GDS_NEST','SUP','SUP_DE','SUP_ES','SUP_FR');
create type lang_code    as enum ('EN','DE','ES','FR');
create type shift_code   as enum ('EARLY','DAWN','BRUNCH','MORNING','GRIND','GOLDEN','DUSK','OWL','JOKER','CROWN','BLADE','LEAVE');
create type trade_kind   as enum ('time','rest','bundle','rest-bundle');
create type offer_status as enum ('open','matched','completed','expired');
create type match_status as enum ('pending_rtm','approved','declined');

-- swap_agents ---------------------------------------------------------------
create table swap_agents (
  id        text primary key,
  name      text not null,
  emp       text unique not null,
  site      text not null,
  team      text not null,
  tier      skill_tier not null,
  lang      lang_code  not null,
  trades    integer not null default 0,
  flexible  boolean not null default false,
  created_at timestamptz not null default now()
);

-- swap_schedules ------------------------------------------------------------
create table swap_schedules (
  id        text primary key,
  agent_id  text not null references swap_agents(id) on delete cascade,
  week      smallint not null check (week in (1,2)),
  day       text not null,
  day_date  text not null,
  shift     shift_code not null,
  uploaded_at timestamptz not null default now(),
  unique (agent_id, week, day)
);
create index swap_schedules_lookup on swap_schedules (week, day, shift);

-- swap_offers (THE MARKET — realtime) ---------------------------------------
create table swap_offers (
  id        text primary key,
  kind      trade_kind not null,
  agent_id  text not null references swap_agents(id) on delete cascade,
  mine      boolean not null default false,
  day       text,
  date      text,
  offered   shift_code,
  want_type           shift_code[],
  want_rest_day       text,
  want_rest_date      text,
  work_shift          shift_code,
  bundle_cards        jsonb,
  want_rest_days_list text[],
  note      text,
  ts        text default 'now',
  status    offer_status not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index swap_offers_open on swap_offers (status);

-- swap_matches (sealed → awaiting RTM → approved/declined) -----------------
create table swap_matches (
  id                  text primary key,
  offer_id            text,
  offer               jsonb,
  my_card             jsonb,
  bundle_legs         jsonb,
  responder_agent_id  text references swap_agents(id) on delete set null,
  sealed_at           text,
  rtm_msg             text,
  status              match_status not null default 'pending_rtm',
  created_at          timestamptz not null default now()
);
create index swap_matches_status on swap_matches (status);

-- swap_ranks (reference ladder) ---------------------------------------------
create table swap_ranks (
  id              smallint primary key,
  rank_name       text not null,
  badge_emoji     text not null,
  trades_min      integer not null,
  trades_max      integer
);

-- Realtime -----------------------------------------------------------------
alter publication supabase_realtime add table swap_offers;
alter publication supabase_realtime add table swap_matches;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table swap_agents    enable row level security;
alter table swap_schedules enable row level security;
alter table swap_offers    enable row level security;
alter table swap_matches   enable row level security;
alter table swap_ranks     enable row level security;

create policy "read agents"     on swap_agents    for select using (true);
create policy "read schedules"  on swap_schedules for select using (true);
create policy "write schedules" on swap_schedules for all    using (true) with check (true);
create policy "read ranks"      on swap_ranks     for select using (true);

create policy "read offers"   on swap_offers for select using (true);
create policy "insert offers" on swap_offers for insert with check (true);
create policy "update offers" on swap_offers for update using (true) with check (true);
create policy "delete offers" on swap_offers for delete using (true);

create policy "read matches"   on swap_matches for select using (true);
create policy "insert matches" on swap_matches for insert with check (true);
create policy "update matches" on swap_matches for update using (true) with check (true);

-- ===========================================================================
-- SEED DATA
-- ===========================================================================

insert into swap_ranks (id, rank_name, badge_emoji, trades_min, trades_max) values
  (0,'New Recruit','🌱',0,0),
  (1,'Rookie Trader','🎴',1,2),
  (2,'Card Shark','🦈',3,5),
  (3,'Floor Broker','💼',6,10),
  (4,'Market Maker','📈',11,20),
  (5,'Exchange Royalty','👑',21,null);

insert into swap_agents (id,name,emp,site,team,tier,lang,trades,flexible) values
  ('a1','Abdelrahman Abdellateef','DXB-2041','Dubai HQ','Falcons','GDS','FR',4,false),
  ('a2','Yara Mansour','DXB-2199','Dubai HQ','Falcons','GDS','FR',23,true),
  ('a3','Tariq Bensalah','CAS-0451','Casablanca','Atlas','GDS','FR',6,false),
  ('a4','Karim Aziz','DXB-2050','Dubai HQ','Falcons','GDS','FR',2,false),
  ('a5','Amélie Roux','DXB-0710','Dubai HQ','Falcons','GDS_ADV','FR',15,false),
  ('a6','Sofia Navarro','CAS-0907','Casablanca','Atlas','SUP_ES','ES',7,false),
  ('a7','Lucía Romero','CAS-0688','Casablanca','Atlas','SUP_ES','ES',14,false),
  ('a8','Jonas Weber','AMM-3322','Amman Floor','Cedars','SUP_DE','DE',2,false),
  ('a9','Nadia Fischer','AMM-3098','Amman Floor','Cedars','SUP_DE','DE',9,false),
  ('a10','Felix Braun','AMM-3411','Amman Floor','Cedars','SUP_DE','DE',3,false),
  ('a11','Omar Khalil','CAI-1180','Cairo Hub','Scarabs','GDS','DE',12,true),
  ('a12','Hassan Reda','CAI-1442','Cairo Hub','Scarabs','GDS_NEST','FR',5,true);

insert into swap_schedules (id,agent_id,week,day,day_date,shift) values
  ('a1-w1-Mon','a1',1,'Mon','Jun 8','GOLDEN'),
  ('a1-w1-Tue','a1',1,'Tue','Jun 9','BRUNCH'),
  ('a1-w1-Wed','a1',1,'Wed','Jun 10','GOLDEN'),
  ('a1-w1-Thu','a1',1,'Thu','Jun 11','GOLDEN'),
  ('a1-w1-Fri','a1',1,'Fri','Jun 12','GOLDEN'),
  ('a1-w1-Sat','a1',1,'Sat','Jun 13','CROWN'),
  ('a1-w1-Sun','a1',1,'Sun','Jun 14','CROWN'),
  ('a2-w1-Mon','a2',1,'Mon','Jun 8','MORNING'),
  ('a2-w1-Tue','a2',1,'Tue','Jun 9','MORNING'),
  ('a2-w1-Wed','a2',1,'Wed','Jun 10','CROWN'),
  ('a2-w1-Thu','a2',1,'Thu','Jun 11','GOLDEN'),
  ('a2-w1-Fri','a2',1,'Fri','Jun 12','GOLDEN'),
  ('a2-w1-Sat','a2',1,'Sat','Jun 13','CROWN'),
  ('a2-w1-Sun','a2',1,'Sun','Jun 14','GRIND'),
  ('a3-w1-Mon','a3',1,'Mon','Jun 8','EARLY'),
  ('a3-w1-Tue','a3',1,'Tue','Jun 9','GOLDEN'),
  ('a3-w1-Wed','a3',1,'Wed','Jun 10','CROWN'),
  ('a3-w1-Thu','a3',1,'Thu','Jun 11','EARLY'),
  ('a3-w1-Fri','a3',1,'Fri','Jun 12','CROWN'),
  ('a3-w1-Sat','a3',1,'Sat','Jun 13','MORNING'),
  ('a3-w1-Sun','a3',1,'Sun','Jun 14','DUSK'),
  ('a4-w1-Mon','a4',1,'Mon','Jun 8','GRIND'),
  ('a4-w1-Tue','a4',1,'Tue','Jun 9','DUSK'),
  ('a4-w1-Wed','a4',1,'Wed','Jun 10','GRIND'),
  ('a4-w1-Thu','a4',1,'Thu','Jun 11','CROWN'),
  ('a4-w1-Fri','a4',1,'Fri','Jun 12','GRIND'),
  ('a4-w1-Sat','a4',1,'Sat','Jun 13','CROWN'),
  ('a4-w1-Sun','a4',1,'Sun','Jun 14','DUSK'),
  ('a5-w1-Mon','a5',1,'Mon','Jun 8','MORNING'),
  ('a5-w1-Tue','a5',1,'Tue','Jun 9','CROWN'),
  ('a5-w1-Wed','a5',1,'Wed','Jun 10','MORNING'),
  ('a5-w1-Thu','a5',1,'Thu','Jun 11','GOLDEN'),
  ('a5-w1-Fri','a5',1,'Fri','Jun 12','GOLDEN'),
  ('a5-w1-Sat','a5',1,'Sat','Jun 13','GRIND'),
  ('a5-w1-Sun','a5',1,'Sun','Jun 14','CROWN'),
  ('a6-w1-Mon','a6',1,'Mon','Jun 8','GRIND'),
  ('a6-w1-Tue','a6',1,'Tue','Jun 9','GRIND'),
  ('a6-w1-Wed','a6',1,'Wed','Jun 10','GOLDEN'),
  ('a6-w1-Thu','a6',1,'Thu','Jun 11','CROWN'),
  ('a6-w1-Fri','a6',1,'Fri','Jun 12','GOLDEN'),
  ('a6-w1-Sat','a6',1,'Sat','Jun 13','DUSK'),
  ('a6-w1-Sun','a6',1,'Sun','Jun 14','CROWN'),
  ('a7-w1-Mon','a7',1,'Mon','Jun 8','EARLY'),
  ('a7-w1-Tue','a7',1,'Tue','Jun 9','CROWN'),
  ('a7-w1-Wed','a7',1,'Wed','Jun 10','EARLY'),
  ('a7-w1-Thu','a7',1,'Thu','Jun 11','MORNING'),
  ('a7-w1-Fri','a7',1,'Fri','Jun 12','MORNING'),
  ('a7-w1-Sat','a7',1,'Sat','Jun 13','CROWN'),
  ('a7-w1-Sun','a7',1,'Sun','Jun 14','GRIND'),
  ('a8-w1-Mon','a8',1,'Mon','Jun 8','OWL'),
  ('a8-w1-Tue','a8',1,'Tue','Jun 9','OWL'),
  ('a8-w1-Wed','a8',1,'Wed','Jun 10','CROWN'),
  ('a8-w1-Thu','a8',1,'Thu','Jun 11','GRIND'),
  ('a8-w1-Fri','a8',1,'Fri','Jun 12','GRIND'),
  ('a8-w1-Sat','a8',1,'Sat','Jun 13','CROWN'),
  ('a8-w1-Sun','a8',1,'Sun','Jun 14','GOLDEN'),
  ('a9-w1-Mon','a9',1,'Mon','Jun 8','MORNING'),
  ('a9-w1-Tue','a9',1,'Tue','Jun 9','GOLDEN'),
  ('a9-w1-Wed','a9',1,'Wed','Jun 10','GOLDEN'),
  ('a9-w1-Thu','a9',1,'Thu','Jun 11','CROWN'),
  ('a9-w1-Fri','a9',1,'Fri','Jun 12','MORNING'),
  ('a9-w1-Sat','a9',1,'Sat','Jun 13','GRIND'),
  ('a9-w1-Sun','a9',1,'Sun','Jun 14','CROWN'),
  ('a10-w1-Mon','a10',1,'Mon','Jun 8','CROWN'),
  ('a10-w1-Tue','a10',1,'Tue','Jun 9','GRIND'),
  ('a10-w1-Wed','a10',1,'Wed','Jun 10','DUSK'),
  ('a10-w1-Thu','a10',1,'Thu','Jun 11','DUSK'),
  ('a10-w1-Fri','a10',1,'Fri','Jun 12','CROWN'),
  ('a10-w1-Sat','a10',1,'Sat','Jun 13','GOLDEN'),
  ('a10-w1-Sun','a10',1,'Sun','Jun 14','MORNING'),
  ('a11-w1-Mon','a11',1,'Mon','Jun 8','GRIND'),
  ('a11-w1-Tue','a11',1,'Tue','Jun 9','CROWN'),
  ('a11-w1-Wed','a11',1,'Wed','Jun 10','MORNING'),
  ('a11-w1-Thu','a11',1,'Thu','Jun 11','MORNING'),
  ('a11-w1-Fri','a11',1,'Fri','Jun 12','GRIND'),
  ('a11-w1-Sat','a11',1,'Sat','Jun 13','DUSK'),
  ('a11-w1-Sun','a11',1,'Sun','Jun 14','CROWN'),
  ('a12-w1-Mon','a12',1,'Mon','Jun 8','CROWN'),
  ('a12-w1-Tue','a12',1,'Tue','Jun 9','EARLY'),
  ('a12-w1-Wed','a12',1,'Wed','Jun 10','EARLY'),
  ('a12-w1-Thu','a12',1,'Thu','Jun 11','GRIND'),
  ('a12-w1-Fri','a12',1,'Fri','Jun 12','GOLDEN'),
  ('a12-w1-Sat','a12',1,'Sat','Jun 13','CROWN'),
  ('a12-w1-Sun','a12',1,'Sun','Jun 14','MORNING'),
  ('a1-w2-Mon','a1',2,'Mon','Jun 15','DAWN'),
  ('a1-w2-Tue','a1',2,'Tue','Jun 16','DAWN'),
  ('a1-w2-Wed','a1',2,'Wed','Jun 17','CROWN'),
  ('a1-w2-Thu','a1',2,'Thu','Jun 18','CROWN'),
  ('a1-w2-Fri','a1',2,'Fri','Jun 19','GOLDEN'),
  ('a1-w2-Sat','a1',2,'Sat','Jun 20','DUSK'),
  ('a1-w2-Sun','a1',2,'Sun','Jun 21','DUSK'),
  ('a2-w2-Mon','a2',2,'Mon','Jun 15','CROWN'),
  ('a2-w2-Tue','a2',2,'Tue','Jun 16','GRIND'),
  ('a2-w2-Wed','a2',2,'Wed','Jun 17','MORNING'),
  ('a2-w2-Thu','a2',2,'Thu','Jun 18','MORNING'),
  ('a2-w2-Fri','a2',2,'Fri','Jun 19','CROWN'),
  ('a2-w2-Sat','a2',2,'Sat','Jun 20','GOLDEN'),
  ('a2-w2-Sun','a2',2,'Sun','Jun 21','GOLDEN'),
  ('a3-w2-Mon','a3',2,'Mon','Jun 15','GRIND'),
  ('a3-w2-Tue','a3',2,'Tue','Jun 16','GRIND'),
  ('a3-w2-Wed','a3',2,'Wed','Jun 17','EARLY'),
  ('a3-w2-Thu','a3',2,'Thu','Jun 18','CROWN'),
  ('a3-w2-Fri','a3',2,'Fri','Jun 19','EARLY'),
  ('a3-w2-Sat','a3',2,'Sat','Jun 20','CROWN'),
  ('a3-w2-Sun','a3',2,'Sun','Jun 21','DUSK'),
  ('a4-w2-Mon','a4',2,'Mon','Jun 15','CROWN'),
  ('a4-w2-Tue','a4',2,'Tue','Jun 16','MORNING'),
  ('a4-w2-Wed','a4',2,'Wed','Jun 17','GRIND'),
  ('a4-w2-Thu','a4',2,'Thu','Jun 18','DUSK'),
  ('a4-w2-Fri','a4',2,'Fri','Jun 19','GRIND'),
  ('a4-w2-Sat','a4',2,'Sat','Jun 20','CROWN'),
  ('a4-w2-Sun','a4',2,'Sun','Jun 21','DUSK'),
  ('a5-w2-Mon','a5',2,'Mon','Jun 15','GOLDEN'),
  ('a5-w2-Tue','a5',2,'Tue','Jun 16','MORNING'),
  ('a5-w2-Wed','a5',2,'Wed','Jun 17','CROWN'),
  ('a5-w2-Thu','a5',2,'Thu','Jun 18','MORNING'),
  ('a5-w2-Fri','a5',2,'Fri','Jun 19','GOLDEN'),
  ('a5-w2-Sat','a5',2,'Sat','Jun 20','GRIND'),
  ('a5-w2-Sun','a5',2,'Sun','Jun 21','CROWN'),
  ('a6-w2-Mon','a6',2,'Mon','Jun 15','CROWN'),
  ('a6-w2-Tue','a6',2,'Tue','Jun 16','GOLDEN'),
  ('a6-w2-Wed','a6',2,'Wed','Jun 17','GOLDEN'),
  ('a6-w2-Thu','a6',2,'Thu','Jun 18','GRIND'),
  ('a6-w2-Fri','a6',2,'Fri','Jun 19','DUSK'),
  ('a6-w2-Sat','a6',2,'Sat','Jun 20','CROWN'),
  ('a6-w2-Sun','a6',2,'Sun','Jun 21','GRIND'),
  ('a7-w2-Mon','a7',2,'Mon','Jun 15','MORNING'),
  ('a7-w2-Tue','a7',2,'Tue','Jun 16','EARLY'),
  ('a7-w2-Wed','a7',2,'Wed','Jun 17','CROWN'),
  ('a7-w2-Thu','a7',2,'Thu','Jun 18','EARLY'),
  ('a7-w2-Fri','a7',2,'Fri','Jun 19','MORNING'),
  ('a7-w2-Sat','a7',2,'Sat','Jun 20','GRIND'),
  ('a7-w2-Sun','a7',2,'Sun','Jun 21','CROWN'),
  ('a8-w2-Mon','a8',2,'Mon','Jun 15','GRIND'),
  ('a8-w2-Tue','a8',2,'Tue','Jun 16','CROWN'),
  ('a8-w2-Wed','a8',2,'Wed','Jun 17','OWL'),
  ('a8-w2-Thu','a8',2,'Thu','Jun 18','OWL'),
  ('a8-w2-Fri','a8',2,'Fri','Jun 19','CROWN'),
  ('a8-w2-Sat','a8',2,'Sat','Jun 20','GRIND'),
  ('a8-w2-Sun','a8',2,'Sun','Jun 21','GOLDEN'),
  ('a9-w2-Mon','a9',2,'Mon','Jun 15','CROWN'),
  ('a9-w2-Tue','a9',2,'Tue','Jun 16','MORNING'),
  ('a9-w2-Wed','a9',2,'Wed','Jun 17','MORNING'),
  ('a9-w2-Thu','a9',2,'Thu','Jun 18','GOLDEN'),
  ('a9-w2-Fri','a9',2,'Fri','Jun 19','CROWN'),
  ('a9-w2-Sat','a9',2,'Sat','Jun 20','DUSK'),
  ('a9-w2-Sun','a9',2,'Sun','Jun 21','GRIND'),
  ('a10-w2-Mon','a10',2,'Mon','Jun 15','DUSK'),
  ('a10-w2-Tue','a10',2,'Tue','Jun 16','CROWN'),
  ('a10-w2-Wed','a10',2,'Wed','Jun 17','MORNING'),
  ('a10-w2-Thu','a10',2,'Thu','Jun 18','CROWN'),
  ('a10-w2-Fri','a10',2,'Fri','Jun 19','DUSK'),
  ('a10-w2-Sat','a10',2,'Sat','Jun 20','MORNING'),
  ('a10-w2-Sun','a10',2,'Sun','Jun 21','GOLDEN'),
  ('a11-w2-Mon','a11',2,'Mon','Jun 15','CROWN'),
  ('a11-w2-Tue','a11',2,'Tue','Jun 16','GRIND'),
  ('a11-w2-Wed','a11',2,'Wed','Jun 17','GRIND'),
  ('a11-w2-Thu','a11',2,'Thu','Jun 18','CROWN'),
  ('a11-w2-Fri','a11',2,'Fri','Jun 19','MORNING'),
  ('a11-w2-Sat','a11',2,'Sat','Jun 20','MORNING'),
  ('a11-w2-Sun','a11',2,'Sun','Jun 21','DUSK'),
  ('a12-w2-Mon','a12',2,'Mon','Jun 15','EARLY'),
  ('a12-w2-Tue','a12',2,'Tue','Jun 16','CROWN'),
  ('a12-w2-Wed','a12',2,'Wed','Jun 17','GOLDEN'),
  ('a12-w2-Thu','a12',2,'Thu','Jun 18','EARLY'),
  ('a12-w2-Fri','a12',2,'Fri','Jun 19','CROWN'),
  ('a12-w2-Sat','a12',2,'Sat','Jun 20','GRIND'),
  ('a12-w2-Sun','a12',2,'Sun','Jun 21','MORNING');

insert into swap_offers (id,kind,agent_id,mine,day,date,offered,want_type,want_rest_day,want_rest_date,work_shift,bundle_cards,want_rest_days_list,note,ts,status) values
  ('o1','time','a3',false,'Mon','Jun 8','EARLY',ARRAY['GRIND']::shift_code[],NULL,NULL,NULL,NULL,NULL,'Early start''s not for me — want a 9-to-6 this Monday instead.','1h','open'),
  ('o2','time','a2',false,'Wed','Jun 10','MORNING',ARRAY['OWL']::shift_code[],NULL,NULL,NULL,NULL,NULL,'Happy to flip to the night Owl this Wednesday.','30m','open'),
  ('o3','time','a4',false,'Sat','Jun 13','DUSK',ARRAY['GOLDEN']::shift_code[],NULL,NULL,NULL,NULL,NULL,'Want to finish a touch earlier Saturday.','3h','open'),
  ('o4','time','a3',false,'Tue','Jun 9','GOLDEN',ARRAY['EARLY','MORNING']::shift_code[],NULL,NULL,NULL,NULL,NULL,'Morning person stuck on a late Tuesday — help!','8h','open'),
  ('o5','time','a2',false,'Thu','Jun 11','MORNING',ARRAY['GOLDEN']::shift_code[],NULL,NULL,NULL,NULL,NULL,'Prefer a later start this Thursday.','5h','open'),
  ('o6','rest','a2',false,'Wed','Jun 10','CROWN',NULL,'Fri','Jun 12','GOLDEN',NULL,NULL,'Swap my Wednesday off for a Friday off — chasing a long weekend.','2h','open'),
  ('o7','rest','a4',false,'Sat','Jun 13','CROWN',NULL,'Sun','Jun 14','MORNING',NULL,NULL,'Need Sunday off for family — I''ll cover your Sunday in return.','6h','open'),
  ('o8','rest','a3',false,'Mon','Jun 8','CROWN',NULL,'Tue','Jun 9','EARLY',NULL,NULL,'Want to move my day off to Tuesday this week.','1d','open'),
  ('o9','bundle','a3',false,NULL,NULL,NULL,ARRAY['GRIND']::shift_code[],NULL,NULL,NULL,'[{"day":"Mon","date":"Jun 8","shift":"EARLY"},{"day":"Tue","date":"Jun 9","shift":"GOLDEN"}]'::jsonb,NULL,'Bundle-swapping Mon + Tue — I need The Grind (09:00–18:00) on both days.','4h','open'),
  ('o10','rest-bundle','a4',false,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[{"day":"Thu","date":"Jun 11","shift":"CROWN"},{"day":"Sat","date":"Jun 13","shift":"CROWN"}]'::jsonb,ARRAY['Fri','Sun']::text[],'Swapping both my days off — want the weekend instead.','2h','open');
