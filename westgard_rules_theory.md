{
  "concept": "Westgard Rules",
  "prereqs": {
    "chart": "Levey-Jennings",
    "lab_baseline": "Use lab-derived mean & SD from ≥20 measurements across 10–20 days; 2 control levels near medical decision limits"
  },
  "rules": {
    "12s": {"type":"warning","definition":"1 point outside ±2s","action":"inspect other rules"},
    "13s": {"type":"reject","definition":"1 point outside ±3s","detects":"random_error"},
    "R4s": {"type":"reject","definition":"+2s and −2s within same run (N≥2)","detects":"random_error"},
    "22s": {"type":"reject","definition":"two consecutive points beyond same ±2s","detects":"systematic_error"},
    "41s": {"type":"reject","definition":"four consecutive points beyond same ±1s","detects":"systematic_error"},
    "10x": {"type":"reject","definition":"ten consecutive points on same side of mean","detects":"systematic_error"}
  },
  "decision_flow": [
    "If no 12s → ACCEPT",
    "If 12s → check {13s, R4s, 22s, 41s, 10x}",
    "If any reject-rule true → REJECT & troubleshoot",
    "Else → ACCEPT (12s = false alarm)"
  ],
  "troubleshoot": {
    "random_error": ["air_bubbles","short_sample","bad_mix","power_glitch","contaminated_cup"],
    "systematic_error": ["lot_change_no_recal","reagent_deterioration","calibration_drift","optics_aging","temp_shift"]
  },
  "sigma_qc": {
    "sigma": "(TEa - |bias|) / CV",
    "policy": [
      {"range":"≥6","qc":"minimal, simple rule (13s)"},
      {"range":"3–6","qc":"moderate, selected multirules"},
      {"range":"<3","qc":"maximal, full multirule & higher frequency"}
    ]
  }
}
