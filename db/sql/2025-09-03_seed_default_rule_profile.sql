-- Seed default rule profile for Westgard Rules
-- This provides enhanced rule set with metadata as a configurable profile

insert into rule_profiles (name, enabled_rules, created_by)
values (
  'Default Global (Enhanced)',
  '{
    "window_size_default": 12,
    "rules": {
      "1-3s": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level"
      },
      "1-2s": {
        "enabled": true,
        "severity": "warn",
        "required_levels": "1",
        "scope": "within_level"
      },
      "2-2s": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "either",
        "within_run_across_levels": true,
        "across_runs": true,
        "threshold_sd": 2,
        "window": 2
      },
      "4-1s": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level",
        "threshold_sd": 1,
        "window": 4
      },
      "3-1s": {
        "enabled": false,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level",
        "threshold_sd": 1,
        "window": 3
      },
      "R-4s": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "2",
        "scope": "across_levels",
        "within_run_across_levels": true,
        "across_runs": true,
        "delta_sd": 4
      },
      "10x": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level",
        "n": 10
      },
      "6x": {
        "enabled": false,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level",
        "n": 6
      },
      "Nx_ext": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "across_levels_or_time",
        "n_set": [8, 9, 10, 12],
        "window": 24
      },
      "7T": {
        "enabled": true,
        "severity": "fail",
        "required_levels": "1",
        "scope": "within_level",
        "n": 7
      },
      "2of3-2s": {
        "enabled": false,
        "severity": "fail",
        "required_levels": "3",
        "scope": "across_levels",
        "threshold_sd": 2,
        "window": 3
      }
    }
  }'::jsonb,
  (select id from users where role in ('qaqc','admin') order by created_at limit 1)
) 
on conflict (name) do update set
  enabled_rules = excluded.enabled_rules;

-- Create global binding for the default profile
insert into rule_profile_bindings (profile_id, scope_type)
select id, 'global' from rule_profiles where name='Default Global (Enhanced)'
on conflict do nothing;
