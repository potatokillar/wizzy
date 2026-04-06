create table if not exists audit_events (
  event_id text primary key,
  timestamp text not null,
  account_id text not null,
  account_name text not null,
  proposal_id text not null,
  correlation_id text not null,
  source text not null,
  symbol text not null,
  market_type text not null,
  intent text not null,
  mode text not null,
  decision text not null,
  reason_code text,
  reason_human text,
  risk_snapshot_json text not null,
  execution_snapshot_json text,
  payload_json text not null
);

create index if not exists idx_audit_events_proposal_id on audit_events (proposal_id);
create index if not exists idx_audit_events_correlation_id on audit_events (correlation_id);
