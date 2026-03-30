-- Supabase SQL Editor에서 실행하세요

create table if not exists businesses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null default '',
  region text not null default '서울',
  address text not null default '',
  phone text not null default '',
  website text,
  instagram text,
  youtube text,
  email text,
  email_verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists email_campaigns (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists crm_status (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  status text not null default 'contacted' check (status in ('contacted', 'replied', 'meeting', 'contracted')),
  updated_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_businesses_category on businesses(category);
create index if not exists idx_businesses_email on businesses(email);
create index if not exists idx_email_campaigns_status on email_campaigns(status);
create index if not exists idx_email_campaigns_business on email_campaigns(business_id);
create index if not exists idx_crm_status_business on crm_status(business_id);
create index if not exists idx_crm_status_status on crm_status(status);

-- RLS (Row Level Security) 비활성화 (서비스 키 사용 시)
alter table businesses enable row level security;
alter table email_campaigns enable row level security;
alter table crm_status enable row level security;

-- 서비스 키로 모든 작업 허용
create policy "Allow all for service role" on businesses for all using (true);
create policy "Allow all for service role" on email_campaigns for all using (true);
create policy "Allow all for service role" on crm_status for all using (true);
