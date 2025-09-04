-- Seed default rule profile for Westgard Rules
-- This provides the MVP rule set as a configurable profile

insert into rule_profiles (name, enabled_rules, created_by)
values (
  'Default Global (MVP)',
  '{
    "window_size_default": 12,
    "rules": {
      "1-3s": {"enabled": true,  "severity": "fail"},
      "1-2s": {"enabled": true,  "severity": "warn"},
      "2-2s": {"enabled": true},
      "R-4s": {"enabled": true, "within_run_across_levels": true, "across_runs": true, "delta_sd": 4},
      "4-1s": {"enabled": true, "threshold_sd": 1, "window": 4},
      "10x":  {"enabled": true, "n": 10},
      "7T":   {"enabled": true, "n": 7},
      "2of3-2s": {"enabled": false, "threshold_sd": 2, "window": 3},
      "3-1s":   {"enabled": false, "threshold_sd": 1, "window": 3},
      "6x":     {"enabled": false, "n": 6}
    }
  }'::jsonb,
  (select id from users where role in ('qaqc','admin') order by created_at limit 1)
) 
on conflict (name) do nothing;

-- Create global binding for the default profile
insert into rule_profile_bindings (profile_id, scope_type)
select id, 'global' from rule_profiles where name='Default Global (MVP)'
on conflict do nothing;
