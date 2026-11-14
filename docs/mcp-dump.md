# MCP dump via the app

Pulled from the live app (https://flytbase-crm.vercel.app) at 2026-11-14T11:22:17.613348+00:00. Book as of 2026-11-14T10:58:28.170267+00:00. Processed app output, not raw MCP responses.

## Pipeline health
```json
{
 "now": "2026-11-14T11:22:17.613348+00:00",
 "stale": false,
 "reachable": true,
 "last_good_poll": "2026-11-14T11:21:49.706601+00:00",
 "last_error": null,
 "pending_calls": 4,
 "resync_at": "2026-11-14T11:10:20.249673+00:00",
 "changes": 14,
 "fetched": [
  {
   "tool": "get_all_paperwork",
   "args": {
    "account": "A"
   },
   "fetched_at": "2026-11-14T11:16:21.495792+00:00",
   "age_s": 356
  },
  {
   "tool": "get_all_paperwork",
   "args": {
    "account": "B"
   },
   "fetched_at": "2026-11-14T10:58:28.170267+00:00",
   "age_s": 1429
  },
  {
   "tool": "get_all_paperwork",
   "args": {
    "account": "K"
   },
   "fetched_at": "2026-11-14T10:49:27.846064+00:00",
   "age_s": 1970
  },
  {
   "tool": "get_file",
   "args": {
    "id": "flight_log_by_plant"
   },
   "fetched_at": "2026-11-14T11:07:25.016327+00:00",
   "age_s": 893
  },
  {
   "tool": "get_file",
   "args": {
    "id": "flight_log_force_month"
   },
   "fetched_at": "2026-11-14T11:08:31.537129+00:00",
   "age_s": 826
  },
  {
   "tool": "get_flytbase_team",
   "args": {},
   "fetched_at": "2026-11-14T11:17:28.292165+00:00",
   "age_s": 289
  },
  {
   "tool": "get_my_accounts",
   "args": {},
   "fetched_at": "2026-11-14T11:13:00.181259+00:00",
   "age_s": 557
  },
  {
   "tool": "get_signals",
   "args": {},
   "fetched_at": "2026-11-14T11:21:49.706601+00:00",
   "age_s": 28
  },
  {
   "tool": "whoami",
   "args": {},
   "fetched_at": "2026-11-14T11:11:53.240649+00:00",
   "age_s": 624
  }
 ]
}
```

## What changed
```json
{
 "n": 14,
 "changed": true
}
```

## Book (five questions per account)

### Account A: Eastern Counties Police Alliance

#### A q1
```json
{
 "currency": "GBP",
 "paperwork_loaded": true,
 "bands": {
  "on_contract": [
   {
    "id": "a_renewal",
    "title": "Renew the alliance contract (35 docks)",
    "value": 350000,
    "currency": "GBP",
    "receipts": [
     {
      "id": "a_renewal",
      "kind": "deal"
     },
     {
      "id": "A/contract.txt",
      "kind": "record"
     },
     {
      "id": "A/profile.json",
      "kind": "record"
     },
     {
      "id": "rc_appetite_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "rc_appetite_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "km_usage_1",
      "kind": "fact",
      "status": "verified"
     },
     {
      "id": "km_value_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "flight_log_force_month",
      "kind": "file"
     }
    ],
    "renewal_risk": true,
    "term_ends": "2027-02-28",
    "stage": "identified",
    "blocker": null
   }
  ],
  "backed_upside": [
   {
    "id": "a_training",
    "title": "Operator training for new pilots",
    "value": 45000,
    "currency": "GBP",
    "receipts": [
     {
      "id": "a_training",
      "kind": "offer"
     },
     {
      "id": "karen_mbeki",
      "kind": "stakeholder"
     }
    ],
    "pitch_to": "Insp. Karen Mbeki"
   }
  ],
  "unbacked": [
   {
    "id": null,
    "title": "Framework tender, up to 300 docks",
    "value": null,
    "currency": "GBP",
    "receipts": [
     {
      "id": "A/deal_history.json",
      "kind": "record"
     },
     {
      "id": "rc_tender_0",
      "kind": "fact",
      "status": "told"
     }
    ],
    "blocker": null,
    "note": "Rhys Calder's account only. No specification, timetable or evaluation method on file."
   },
   {
    "id": null,
    "title": "Stadium project, 30 docks",
    "value": null,
    "currency": "GBP",
    "receipts": [
     {
      "id": "A/deal_history.json",
      "kind": "record"
     },
     {
      "id": "rc_stadium_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "rc_stadium_3",
      "kind": "fact",
      "status": "told"
     }
    ],
    "blocker": null,
    "note": "Rhys Calder's account only. Nothing in writing from Westmere or the alliance."
   }
  ],
  "unpriced": [
   {
    "id": "a_tarn",
    "title": "Tarn Valley and Norwold go live",
    "value": null,
    "currency": "GBP",
    "receipts": [
     {
      "id": "a_tarn",
      "kind": "deal"
     },
     {
      "id": "rc_appetite_2",
      "kind": "fact",
      "status": "told"
     }
    ],
    "stage": "identified",
    "blocker": null
   },
   {
    "id": "a_westmere",
    "title": "Scale Westmere's fleet",
    "value": null,
    "currency": "GBP",
    "receipts": [
     {
      "id": "a_westmere",
      "kind": "deal"
     },
     {
      "id": "km_value_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "flight_log_force_month",
      "kind": "file"
     }
    ],
    "stage": "identified",
    "blocker": null
   }
  ]
 },
 "totals": {
  "on_contract": {
   "by_currency": {
    "GBP": 350000
   },
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    },
    {
     "id": "A/contract.txt",
     "kind": "record"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    },
    {
     "id": "rc_appetite_0",
     "kind": "fact",
     "status": "claim"
    },
    {
     "id": "rc_appetite_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "km_usage_1",
     "kind": "fact",
     "status": "verified"
    },
    {
     "id": "km_value_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "flight_log_force_month",
     "kind": "file"
    }
   ]
  },
  "backed_upside": {
   "by_currency": {
    "GBP": 45000
   },
   "receipts": [
    {
     "id": "a_training",
     "kind": "offer"
    },
    {
     "id": "karen_mbeki",
     "kind": "stakeholder"
    }
   ]
  },
  "unbacked": {
   "by_currency": {},
   "receipts": []
  }
 },
 "claims": {
  "pairs": [
   {
    "claim": {
     "id": "rc_appetite_0",
     "text": "All four forces are keen.",
     "said_by": "Rhys Calder",
     "status": "claim",
     "learned_at_minute": 33
    },
    "later": [
     {
      "id": "rc_appetite_2",
      "text": "Only Westmere and Metro Central fly operationally. Tarn Valley has never flown a live mission and Norwold only trains.",
      "said_by": "Rhys Calder",
      "status": "told",
      "learned_at_minute": 33
     }
    ],
    "label": "same topic (by id)",
    "struck_through": false,
    "receipts": [
     {
      "id": "rc_appetite_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "rc_appetite_2",
      "kind": "fact",
      "status": "told"
     }
    ]
   },
   {
    "claim": {
     "id": "rc_stadium_0",
     "text": "Westmere's stadium project is a 30-dock opportunity.",
     "said_by": "Rhys Calder",
     "status": "claim",
     "learned_at_minute": 49
    },
    "later": [
     {
      "id": "rc_stadium_3",
      "text": "The stadium idea came from one superintendent's chat with the stadium operator. No funding, no event-day policing plan, and approval is needed before the specification locks.",
      "said_by": "Rhys Calder",
      "status": "told",
      "learned_at_minute": 66
     }
    ],
    "label": "same topic (by id)",
    "struck_through": false,
    "receipts": [
     {
      "id": "rc_stadium_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "rc_stadium_3",
      "kind": "fact",
      "status": "told"
     }
    ]
   }
  ],
  "unpaired": [
   {
    "claim": {
     "id": "rc_funding_0",
     "text": "The alliance has the budget.",
     "said_by": "Rhys Calder",
     "status": "claim",
     "learned_at_minute": 50
    },
    "label": "claim, nothing on file backs it",
    "receipts": [
     {
      "id": "rc_funding_0",
      "kind": "fact",
      "status": "claim"
     }
    ]
   }
  ]
 }
}
```

#### A q2
```json
{
 "loaded": true,
 "deals": [
  {
   "deal": "a_renewal",
   "title": "Renew the alliance contract (35 docks)",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "the alliance office",
       "title": null,
       "person_named": false,
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "paid_invoices": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "amounts_missing": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "gap": "Schedule 2 (split and billing addresses) not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/invoices.json",
         "kind": "record"
        },
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Rhys Calder",
       "key": "A:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 9,
       "last_sign_in": "2026-10-21",
       "stands": "warm",
       "stakeholder": "rhys_calder",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "rhys_calder",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": "Insp. Karen Mbeki",
       "key": "A:U02",
       "role": "unit administrator",
       "sign_ins_last_90_days": 62,
       "last_sign_in": "2026-11-10",
       "stands": "neutral",
       "stakeholder": "karen_mbeki",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "karen_mbeki",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 21,
       "sign_ins_last_90_days": 579,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "force",
       "usage_file": "flight_log_force_month",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_force_month",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "gap",
     "entries": [],
     "gap": "no open blocker or request on file"
    }
   },
   "voices": [
    {
     "who": "Rhys Calder",
     "stands": "warm",
     "stakeholder": "rhys_calder",
     "available": true,
     "backing": "on file",
     "claims": [
      "rc_appetite_0"
     ],
     "receipts": [
      {
       "id": "rhys_calder",
       "kind": "stakeholder"
      },
      {
       "id": "rc_appetite_2",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "km_value_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    },
    {
     "who": "Insp. Karen Mbeki",
     "stands": "neutral",
     "stakeholder": "karen_mbeki",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "karen_mbeki",
       "kind": "stakeholder"
      },
      {
       "id": "km_usage_1",
       "kind": "fact",
       "status": "verified"
      }
     ]
    }
   ]
  },
  {
   "deal": "a_tarn",
   "title": "Tarn Valley and Norwold go live",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "the alliance office",
       "title": null,
       "person_named": false,
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "paid_invoices": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "amounts_missing": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "gap": "Schedule 2 (split and billing addresses) not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/invoices.json",
         "kind": "record"
        },
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Rhys Calder",
       "key": "A:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 9,
       "last_sign_in": "2026-10-21",
       "stands": "warm",
       "stakeholder": "rhys_calder",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "rhys_calder",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": "Insp. Karen Mbeki",
       "key": "A:U02",
       "role": "unit administrator",
       "sign_ins_last_90_days": 62,
       "last_sign_in": "2026-11-10",
       "stands": "neutral",
       "stakeholder": "karen_mbeki",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "karen_mbeki",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 21,
       "sign_ins_last_90_days": 579,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "force",
       "usage_file": "flight_log_force_month",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_force_month",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "gap",
     "entries": [],
     "gap": "no open blocker or request on file"
    }
   },
   "voices": [
    {
     "who": "Rhys Calder",
     "stands": "warm",
     "stakeholder": "rhys_calder",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "rhys_calder",
       "kind": "stakeholder"
      },
      {
       "id": "rc_appetite_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    }
   ]
  },
  {
   "deal": "a_westmere",
   "title": "Scale Westmere's fleet",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "the alliance office",
       "title": null,
       "person_named": false,
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "paid_invoices": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "amounts_missing": [
        "INV-26-0311",
        "INV-26-0312",
        "INV-26-0313",
        "INV-26-0314"
       ],
       "gap": "Schedule 2 (split and billing addresses) not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/invoices.json",
         "kind": "record"
        },
        {
         "id": "A/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Rhys Calder",
       "key": "A:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 9,
       "last_sign_in": "2026-10-21",
       "stands": "warm",
       "stakeholder": "rhys_calder",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "rhys_calder",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": "Insp. Karen Mbeki",
       "key": "A:U02",
       "role": "unit administrator",
       "sign_ins_last_90_days": 62,
       "last_sign_in": "2026-11-10",
       "stands": "neutral",
       "stakeholder": "karen_mbeki",
       "available": true,
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        },
        {
         "id": "karen_mbeki",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 21,
       "sign_ins_last_90_days": 579,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "A/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "force",
       "usage_file": "flight_log_force_month",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_force_month",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "gap",
     "entries": [],
     "gap": "no open blocker or request on file"
    }
   },
   "voices": [
    {
     "who": "Rhys Calder",
     "stands": "warm",
     "stakeholder": "rhys_calder",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "rhys_calder",
       "kind": "stakeholder"
      },
      {
       "id": "km_value_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    }
   ]
  }
 ],
 "flight_log": {
  "file": "flight_log_force_month",
  "entity_kind": "force",
  "dropped": [
   {
    "line": 8,
    "reason": "exact duplicate"
   },
   {
    "line": 26,
    "reason": "blank re-sent row"
   }
  ],
  "missing": [
   {
    "force": "Metro Central",
    "month": "2026-07"
   }
  ],
  "dock_map": null,
  "rows": [
   {
    "force": "Westmere",
    "month": "2026-05",
    "line": 2,
    "docks_installed": 18,
    "docks_with_live_flights": 16,
    "live_missions": 128,
    "training_flights": 6
   },
   {
    "force": "Westmere",
    "month": "2026-06",
    "line": 3,
    "docks_installed": 18,
    "docks_with_live_flights": 12,
    "live_missions": 72,
    "training_flights": 4
   },
   {
    "force": "Westmere",
    "month": "2026-07",
    "line": 4,
    "docks_installed": 18,
    "docks_with_live_flights": 11,
    "live_missions": 44,
    "training_flights": 7
   },
   {
    "force": "Westmere",
    "month": "2026-08",
    "line": 5,
    "docks_installed": 18,
    "docks_with_live_flights": 11,
    "live_missions": 44,
    "training_flights": 5
   },
   {
    "force": "Westmere",
    "month": "2026-09",
    "line": 6,
    "docks_installed": 18,
    "docks_with_live_flights": 16,
    "live_missions": 144,
    "training_flights": 3
   },
   {
    "force": "Westmere",
    "month": "2026-10",
    "line": 7,
    "docks_installed": 18,
    "docks_with_live_flights": 14,
    "live_missions": 126,
    "training_flights": 8
   },
   {
    "force": "Metro Central",
    "month": "2026-05",
    "line": 9,
    "docks_installed": 9,
    "docks_with_live_flights": 6,
    "live_missions": 30,
    "training_flights": 3
   },
   {
    "force": "Metro Central",
    "month": "2026-06",
    "line": 10,
    "docks_installed": 9,
    "docks_with_live_flights": 7,
    "live_missions": 35,
    "training_flights": 2
   },
   {
    "force": "Metro Central",
    "month": "2026-08",
    "line": 11,
    "docks_installed": 9,
    "docks_with_live_flights": 8,
    "live_missions": 56,
    "training_flights": 2
   },
   {
    "force": "Metro Central",
    "month": "2026-09",
    "line": 12,
    "docks_installed": 9,
    "docks_with_live_flights": 7,
    "live_missions": 28,
    "training_flights": 2
   },
   {
    "force": "Metro Central",
    "month": "2026-10",
    "line": 13,
    "docks_installed": 9,
    "docks_with_live_flights": 3,
    "live_missions": 21,
    "training_flights": 4
   },
   {
    "force": "Tarn Valley",
    "month": "2026-05",
    "line": 14,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Tarn Valley",
    "month": "2026-06",
    "line": 15,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Tarn Valley",
    "month": "2026-07",
    "line": 16,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Tarn Valley",
    "month": "2026-08",
    "line": 17,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Tarn Valley",
    "month": "2026-09",
    "line": 18,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Tarn Valley",
    "month": "2026-10",
    "line": 19,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 0
   },
   {
    "force": "Norwold",
    "month": "2026-05",
    "line": 20,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 5
   },
   {
    "force": "Norwold",
    "month": "2026-06",
    "line": 21,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 5
   },
   {
    "force": "Norwold",
    "month": "2026-07",
    "line": 22,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 6
   },
   {
    "force": "Norwold",
    "month": "2026-08",
    "line": 23,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 3
   },
   {
    "force": "Norwold",
    "month": "2026-09",
    "line": 24,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 5
   },
   {
    "force": "Norwold",
    "month": "2026-10",
    "line": 25,
    "docks_installed": 4,
    "docks_with_live_flights": 0,
    "live_missions": 0,
    "training_flights": 2
   }
  ],
  "receipts": [
   {
    "id": "flight_log_force_month",
    "kind": "file"
   }
  ]
 },
 "gaps": [
  {
   "deal": "a_renewal",
   "role": "could_block",
   "why": "no open blocker or request on file"
  },
  {
   "deal": "a_tarn",
   "role": "could_block",
   "why": "no open blocker or request on file"
  },
  {
   "deal": "a_westmere",
   "role": "could_block",
   "why": "no open blocker or request on file"
  },
  {
   "deal": "a_renewal",
   "role": "pays",
   "why": "Schedule 2 (split and billing addresses) not on file"
  },
  {
   "deal": "a_renewal",
   "role": "uses",
   "why": "names not on file"
  },
  {
   "deal": "a_tarn",
   "role": "pays",
   "why": "Schedule 2 (split and billing addresses) not on file"
  },
  {
   "deal": "a_tarn",
   "role": "uses",
   "why": "names not on file"
  },
  {
   "deal": "a_westmere",
   "role": "pays",
   "why": "Schedule 2 (split and billing addresses) not on file"
  },
  {
   "deal": "a_westmere",
   "role": "uses",
   "why": "names not on file"
  }
 ]
}
```

#### A q3
```json
{
 "loaded": true,
 "moves": [
  {
   "kind": "renewal",
   "action": "Clear what blocks Renew the alliance contract (35 docks): name the signer or settle the open blocker",
   "why_now": "Renewal term ends 2027-02-28, 106 days left; signer is not a named person",
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    },
    {
     "id": "A/contract.txt",
     "kind": "record"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ],
   "level": "amber",
   "deal": {
    "id": "a_renewal",
    "title": "Renew the alliance contract (35 docks)"
   },
   "turns_bad_on": "2026-11-30",
   "with": "not on file",
   "rank": 1,
   "owner": "the CSM (you)",
   "due": "2026-11-20",
   "due_basis": "5 business days, held before 2026-11-30",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Clear what blocks Renew the alliance contract (35 docks): name the signer or settle the open blocker. Owner: the CSM (you). Due: 2026-11-20 (5 business days, held before 2026-11-30). Deal: a_renewal. Why now: Renewal term ends 2027-02-28, 106 days left; signer is not a named person. Records: a_renewal, A/contract.txt, A/profile.json, A/profile.json."
   }
  },
  {
   "kind": "cold",
   "action": "Reply to Insp. Karen Mbeki",
   "why_now": "Insp. Karen Mbeki: email of 2026-08-11 has no reply, 95 days",
   "receipts": [
    {
     "id": "A/emails/2026-08-11_karen_batteries.txt",
     "kind": "record"
    },
    {
     "id": "karen_mbeki",
     "kind": "stakeholder"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ],
   "level": null,
   "deal": null,
   "turns_bad_on": "2026-08-25",
   "with": "Insp. Karen Mbeki",
   "rank": 2,
   "owner": "the CSM (you)",
   "due": "2026-11-20",
   "due_basis": "5 business days; turn date 2026-08-25 already passed",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Reply to Insp. Karen Mbeki. Owner: the CSM (you). Due: 2026-11-20 (5 business days; turn date 2026-08-25 already passed). Deal: not on file. Why now: Insp. Karen Mbeki: email of 2026-08-11 has no reply, 95 days. Records: A/emails/2026-08-11_karen_batteries.txt, karen_mbeki, A/profile.json."
   }
  },
  {
   "kind": "stuck",
   "action": "Assign an owner to FB-10412",
   "why_now": "FB-10412 (Document request) is open with no owner since 2026-06-29",
   "receipts": [
    {
     "id": "FB-10412",
     "kind": "ticket"
    },
    {
     "id": "A/tickets.json",
     "kind": "record"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ],
   "level": null,
   "deal": null,
   "turns_bad_on": "not on file",
   "with": "not on file",
   "rank": 3,
   "owner": "the CSM (you)",
   "due": "2026-11-20",
   "due_basis": "5 business days; no turn date on file",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Assign an owner to FB-10412. Owner: the CSM (you). Due: 2026-11-20 (5 business days; no turn date on file). Deal: not on file. Why now: FB-10412 (Document request) is open with no owner since 2026-06-29. Records: FB-10412, A/tickets.json, A/profile.json."
   }
  }
 ],
 "candidates": 6
}
```

#### A q4
```json
{
 "today": "2026-11-14",
 "loaded": true,
 "signals_loaded": true,
 "items": [
  {
   "kind": "renewal",
   "level": "amber",
   "deal": "a_renewal",
   "text": "Renewal term ends 2027-02-28, 106 days left; signer is not a named person",
   "turns_bad_on": "2026-11-30",
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    },
    {
     "id": "A/contract.txt",
     "kind": "record"
    },
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ],
   "days_left": 106,
   "term_ends": "2027-02-28"
  },
  {
   "kind": "cold",
   "level": null,
   "deal": null,
   "text": "Insp. Karen Mbeki: email of 2026-08-11 has no reply, 95 days",
   "turns_bad_on": "2026-08-25",
   "receipts": [
    {
     "id": "A/emails/2026-08-11_karen_batteries.txt",
     "kind": "record"
    },
    {
     "id": "karen_mbeki",
     "kind": "stakeholder"
    }
   ],
   "days_waiting": 95,
   "dated": "2026-08-11",
   "who": "Insp. Karen Mbeki"
  },
  {
   "kind": "stuck",
   "level": null,
   "deal": null,
   "text": "FB-10412 (Document request) is open with no owner since 2026-06-29",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "FB-10412",
     "kind": "ticket"
    },
    {
     "id": "A/tickets.json",
     "kind": "record"
    }
   ],
   "ticket": "FB-10412",
   "dated": "2026-06-29"
  },
  {
   "kind": "usage_drop",
   "level": null,
   "deal": null,
   "text": "Metro Central: docks with live flights 8 in 2026-08, 3 in 2026-10",
   "turns_bad_on": "already down (2026-10)",
   "receipts": [
    {
     "id": "flight_log_force_month",
     "kind": "file"
    }
   ],
   "force": "Metro Central"
  },
  {
   "kind": "signal",
   "level": null,
   "deal": null,
   "text": "Eastern Counties: Rhys Calder is moving on: Rhys Calder has emailed to say he leaves the drone programme in January. No successor is named. Every call on file before the handover was with him alone.",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "champion_leaves",
     "kind": "signal"
    },
    {
     "id": "A/emails/2026-11-17_rhys_moving.txt",
     "kind": "record"
    }
   ],
   "dated": "2026-11-17"
  },
  {
   "kind": "signal",
   "level": null,
   "deal": null,
   "text": "Eastern Counties: Westmere needs an answer before a public event: Insp. Karen Mbeki has written directly, and logged a ticket, ahead of a large public event on 5 December. She wants two things settled in writing this week: dates for training more operators before the day, and who answers if a dock fails on the day. Nobody has replied.",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "urgent_request",
     "kind": "signal"
    },
    {
     "id": "A/emails/2026-11-18_karen_event.txt",
     "kind": "record"
    },
    {
     "id": "A/requests.csv",
     "kind": "record"
    }
   ],
   "dated": "2026-11-18"
  }
 ],
 "gaps": []
}
```

#### A q5
```json
{
 "loaded": true,
 "gaps": [
  {
   "kind": "profile",
   "text": "A named contact at Metro Central, Tarn Valley or Norwold.",
   "deals": [
    {
     "id": "a_tarn",
     "title": "Tarn Valley and Norwold go live",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    },
    {
     "id": "a_tarn",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "The alliance procurement lead. She attended the pilot review call on 16 Dec 2025; her name was not written down.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "Any finance contact, at the alliance or at a force.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "Which dock sits at which force. The install sheets were not copied into this record.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "power",
   "text": "could_block: no open blocker or request on file",
   "deals": [
    {
     "id": "a_renewal",
     "title": "Renew the alliance contract (35 docks)",
     "value": 350000,
     "currency": "GBP"
    }
   ],
   "value_at_stake": 350000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "could_block: no open blocker or request on file",
   "deals": [
    {
     "id": "a_tarn",
     "title": "Tarn Valley and Norwold go live",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_tarn",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "could_block: no open blocker or request on file",
   "deals": [
    {
     "id": "a_westmere",
     "title": "Scale Westmere's fleet",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_westmere",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "pays: Schedule 2 (split and billing addresses) not on file",
   "deals": [
    {
     "id": "a_renewal",
     "title": "Renew the alliance contract (35 docks)",
     "value": 350000,
     "currency": "GBP"
    }
   ],
   "value_at_stake": 350000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "a_renewal",
     "title": "Renew the alliance contract (35 docks)",
     "value": 350000,
     "currency": "GBP"
    }
   ],
   "value_at_stake": 350000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "pays: Schedule 2 (split and billing addresses) not on file",
   "deals": [
    {
     "id": "a_tarn",
     "title": "Tarn Valley and Norwold go live",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_tarn",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "a_tarn",
     "title": "Tarn Valley and Norwold go live",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_tarn",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "pays: Schedule 2 (split and billing addresses) not on file",
   "deals": [
    {
     "id": "a_westmere",
     "title": "Scale Westmere's fleet",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_westmere",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "a_westmere",
     "title": "Scale Westmere's fleet",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_westmere",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "unpriced",
   "text": "No value on file for Tarn Valley and Norwold go live",
   "deals": [
    {
     "id": "a_tarn",
     "title": "Tarn Valley and Norwold go live",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_tarn",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "unpriced",
   "text": "No value on file for Scale Westmere's fleet",
   "deals": [
    {
     "id": "a_westmere",
     "title": "Scale Westmere's fleet",
     "value": null,
     "currency": "GBP"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "a_westmere",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "file",
   "text": "Flight log has no row for Metro Central in 2026-07",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "flight_log_force_month",
     "kind": "file"
    }
   ]
  },
  {
   "kind": "claim",
   "text": "Only a claim, nothing backs it: The alliance has the budget.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "Rhys Calder",
   "receipts": [
    {
     "id": "rc_funding_0",
     "kind": "fact",
     "status": "claim"
    }
   ]
  }
 ]
}
```

### Account B: Aldermoor Industrial Group

#### B q1
```json
{
 "currency": "EUR",
 "paperwork_loaded": true,
 "bands": {
  "on_contract": [
   {
    "id": "b_renewal",
    "title": "Renew the Aldermoor contract (14 docks)",
    "value": 140000,
    "currency": "EUR",
    "receipts": [
     {
      "id": "b_renewal",
      "kind": "deal"
     },
     {
      "id": "B/contract.txt",
      "kind": "record"
     },
     {
      "id": "B/profile.json",
      "kind": "record"
     },
     {
      "id": "sr_roll_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "sr_roll_2",
      "kind": "fact",
      "status": "verified"
     },
     {
      "id": "ba_use_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "nr_cost_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "jt_prem_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "nr_evidence_2",
      "kind": "fact",
      "status": "told"
     }
    ],
    "renewal_risk": true,
    "term_ends": "2027-01-31",
    "stage": "qualified",
    "blocker": {
     "text": "Finance cannot verify the savings the programme claims",
     "status": "open"
    }
   }
  ],
  "backed_upside": [
   {
    "id": "b_reporting",
    "title": "Flight-log reporting by plant for finance and the insurer",
    "value": 70000,
    "currency": "EUR",
    "receipts": [
     {
      "id": "b_reporting",
      "kind": "offer"
     },
     {
      "id": "nadia_rahman",
      "kind": "stakeholder"
     }
    ],
    "pitch_to": "Nadia Rahman"
   }
  ],
  "unbacked": [
   {
    "id": "b_idle",
    "title": "Bring the idle plants into regular patrol",
    "value": 180000,
    "currency": "EUR",
    "receipts": [
     {
      "id": "b_idle",
      "kind": "deal"
     },
     {
      "id": "sr_roll_2",
      "kind": "fact",
      "status": "verified"
     },
     {
      "id": "ba_other_1",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "ba_use_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "sr_plants_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "sr_repl_2",
      "kind": "fact",
      "status": "told"
     }
    ],
    "stage": "qualified",
    "blocker": {
     "text": "The network project will cut the docks off, and nobody owns adoption",
     "status": "open"
    }
   },
   {
    "id": "b_sister",
    "title": "Case study for the 40-plant sister company",
    "value": 1200000,
    "currency": "EUR",
    "receipts": [
     {
      "id": "b_sister",
      "kind": "deal"
     },
     {
      "id": "sr_case_3",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "jt_prem_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "nr_evidence_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "sr_roll_2",
      "kind": "fact",
      "status": "verified"
     },
     {
      "id": "nr_sister_1",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     }
    ],
    "stage": "qualified",
    "blocker": {
     "text": "Every number rests on an unverified spreadsheet",
     "status": "open"
    }
   }
  ],
  "unpriced": [
   {
    "id": "b_insurance",
    "title": "Protect and extend the insurance discount",
    "value": null,
    "currency": "EUR",
    "receipts": [
     {
      "id": "b_insurance",
      "kind": "deal"
     },
     {
      "id": "jt_prem_2",
      "kind": "fact",
      "status": "told"
     },
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     }
    ],
    "stage": "identified",
    "blocker": null
   }
  ]
 },
 "totals": {
  "on_contract": {
   "by_currency": {
    "EUR": 140000
   },
   "receipts": [
    {
     "id": "b_renewal",
     "kind": "deal"
    },
    {
     "id": "B/contract.txt",
     "kind": "record"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "sr_roll_0",
     "kind": "fact",
     "status": "claim"
    },
    {
     "id": "sr_roll_2",
     "kind": "fact",
     "status": "verified"
    },
    {
     "id": "ba_use_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "nr_cost_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "jt_prem_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "nr_evidence_2",
     "kind": "fact",
     "status": "told"
    }
   ]
  },
  "backed_upside": {
   "by_currency": {
    "EUR": 70000
   },
   "receipts": [
    {
     "id": "b_reporting",
     "kind": "offer"
    },
    {
     "id": "nadia_rahman",
     "kind": "stakeholder"
    }
   ]
  },
  "unbacked": {
   "by_currency": {
    "EUR": 1380000
   },
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    },
    {
     "id": "sr_roll_2",
     "kind": "fact",
     "status": "verified"
    },
    {
     "id": "ba_other_1",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "ba_use_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "sr_plants_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "sr_repl_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "b_sister",
     "kind": "deal"
    },
    {
     "id": "sr_case_3",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "jt_prem_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "nr_evidence_2",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "sr_roll_2",
     "kind": "fact",
     "status": "verified"
    },
    {
     "id": "nr_sister_1",
     "kind": "fact",
     "status": "told"
    },
    {
     "id": "flight_log_by_plant",
     "kind": "file"
    }
   ]
  }
 },
 "claims": {
  "pairs": [
   {
    "claim": {
     "id": "sr_roll_0",
     "text": "Thirteen of fifteen plants are flying.",
     "said_by": "Stefan Roy",
     "status": "claim",
     "learned_at_minute": 6
    },
    "later": [
     {
      "id": "sr_roll_2",
      "text": "Four plants fly regularly. Nine only log test flights. Plant 15 has no dock.",
      "said_by": "Stefan Roy",
      "status": "verified",
      "verified_by": "flight_log_by_plant",
      "learned_at_minute": 6
     }
    ],
    "label": "same topic (by id)",
    "struck_through": true,
    "receipts": [
     {
      "id": "sr_roll_0",
      "kind": "fact",
      "status": "claim"
     },
     {
      "id": "sr_roll_2",
      "kind": "fact",
      "status": "verified"
     }
    ]
   }
  ],
  "unpaired": [
   {
    "claim": {
     "id": "sr_roi_0",
     "text": "ROI is proven, about 1.2 million euros a year saved.",
     "said_by": "Stefan Roy",
     "status": "claim",
     "learned_at_minute": 8
    },
    "label": "claim, nothing on file backs it",
    "receipts": [
     {
      "id": "sr_roi_0",
      "kind": "fact",
      "status": "claim"
     }
    ]
   }
  ]
 }
}
```

#### B q2
```json
{
 "loaded": true,
 "deals": [
  {
   "deal": "b_renewal",
   "title": "Renew the Aldermoor contract (14 docks)",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "title": "group head of security",
       "person_named": true,
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/contract.txt",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        },
        {
         "id": "B/calls/2026-01-08_order_call.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": "group security",
       "paid_invoices": [
        "INV-26-0204"
       ],
       "amounts_missing": [],
       "gap": null,
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/invoices.json",
         "kind": "record"
        },
        {
         "id": "B/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "key": "B:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 0,
       "last_sign_in": "2026-05-12",
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 16,
       "sign_ins_last_90_days": 345,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "plant",
       "usage_file": "flight_log_by_plant",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_by_plant",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "text": "Finance cannot verify the savings the programme claims",
       "stands": "not on file",
       "receipts": [
        {
         "id": "b_renewal",
         "kind": "deal"
        }
       ]
      },
      {
       "who": "Group finance (shared mailbox)",
       "text": "Asked for the renewal quote to show the cost for each plant. Not followed up before the handover.",
       "request": "(none)",
       "status": "Open",
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/requests.csv",
         "kind": "record"
        },
        {
         "id": "B/emails/2026-10-08_finance_mailbox.txt",
         "kind": "record"
        }
       ]
      }
     ]
    }
   },
   "voices": [
    {
     "who": "Stefan Roy",
     "stands": "warm",
     "stakeholder": "stefan_roy",
     "available": true,
     "backing": "on file",
     "claims": [
      "sr_roll_0"
     ],
     "receipts": [
      {
       "id": "stefan_roy",
       "kind": "stakeholder"
      },
      {
       "id": "sr_roll_2",
       "kind": "fact",
       "status": "verified"
      }
     ]
    },
    {
     "who": "Beatriz Alonso",
     "stands": "neutral",
     "stakeholder": "beatriz_alonso",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "beatriz_alonso",
       "kind": "stakeholder"
      },
      {
       "id": "ba_use_2",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "nr_cost_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    },
    {
     "who": "Nadia Rahman",
     "stands": "guarded",
     "stakeholder": "nadia_rahman",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "nadia_rahman",
       "kind": "stakeholder"
      },
      {
       "id": "nr_evidence_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    }
   ]
  },
  {
   "deal": "b_idle",
   "title": "Bring the idle plants into regular patrol",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "title": "group head of security",
       "person_named": true,
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/contract.txt",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        },
        {
         "id": "B/calls/2026-01-08_order_call.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": "group security",
       "paid_invoices": [
        "INV-26-0204"
       ],
       "amounts_missing": [],
       "gap": null,
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/invoices.json",
         "kind": "record"
        },
        {
         "id": "B/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "key": "B:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 0,
       "last_sign_in": "2026-05-12",
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 16,
       "sign_ins_last_90_days": 345,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "plant",
       "usage_file": "flight_log_by_plant",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_by_plant",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "text": "The network project will cut the docks off, and nobody owns adoption",
       "stands": "not on file",
       "receipts": [
        {
         "id": "b_idle",
         "kind": "deal"
        }
       ]
      }
     ]
    }
   },
   "voices": [
    {
     "who": "Stefan Roy",
     "stands": "warm",
     "stakeholder": "stefan_roy",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "stefan_roy",
       "kind": "stakeholder"
      },
      {
       "id": "sr_roll_2",
       "kind": "fact",
       "status": "verified"
      },
      {
       "id": "sr_plants_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    },
    {
     "who": "Beatriz Alonso",
     "stands": "neutral",
     "stakeholder": "beatriz_alonso",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "beatriz_alonso",
       "kind": "stakeholder"
      },
      {
       "id": "ba_other_1",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "ba_use_2",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "sr_repl_2",
       "kind": "fact",
       "status": "told"
      }
     ]
    }
   ]
  },
  {
   "deal": "b_insurance",
   "title": "Protect and extend the insurance discount",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "title": "group head of security",
       "person_named": true,
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/contract.txt",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        },
        {
         "id": "B/calls/2026-01-08_order_call.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": "group security",
       "paid_invoices": [
        "INV-26-0204"
       ],
       "amounts_missing": [],
       "gap": null,
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/invoices.json",
         "kind": "record"
        },
        {
         "id": "B/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "key": "B:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 0,
       "last_sign_in": "2026-05-12",
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 16,
       "sign_ins_last_90_days": 345,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "plant",
       "usage_file": "flight_log_by_plant",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_by_plant",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "gap",
     "entries": [],
     "gap": "no open blocker or request on file"
    }
   },
   "voices": []
  },
  {
   "deal": "b_sister",
   "title": "Case study for the 40-plant sister company",
   "roles": {
    "decides": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "title": "group head of security",
       "person_named": true,
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/contract.txt",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        },
        {
         "id": "B/calls/2026-01-08_order_call.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "pays": {
     "status": "backed",
     "entries": [
      {
       "who": "group security",
       "paid_invoices": [
        "INV-26-0204"
       ],
       "amounts_missing": [],
       "gap": null,
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/invoices.json",
         "kind": "record"
        },
        {
         "id": "B/contract.txt",
         "kind": "record"
        }
       ]
      }
     ]
    },
    "uses": {
     "status": "backed",
     "entries": [
      {
       "who": "Stefan Roy",
       "key": "B:U01",
       "role": "account administrator",
       "sign_ins_last_90_days": 0,
       "last_sign_in": "2026-05-12",
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        }
       ]
      },
      {
       "who": null,
       "unnamed_logins": 16,
       "sign_ins_last_90_days": 345,
       "gap": "names not on file",
       "stands": "not on file",
       "receipts": [
        {
         "id": "B/users.json",
         "kind": "record"
        }
       ]
      },
      {
       "who": null,
       "usage_by": "plant",
       "usage_file": "flight_log_by_plant",
       "stands": "not on file",
       "receipts": [
        {
         "id": "flight_log_by_plant",
         "kind": "file"
        }
       ]
      }
     ]
    },
    "could_block": {
     "status": "backed",
     "entries": [
      {
       "who": null,
       "text": "Every number rests on an unverified spreadsheet",
       "stands": "not on file",
       "receipts": [
        {
         "id": "b_sister",
         "kind": "deal"
        }
       ]
      },
      {
       "who": "Stefan Roy",
       "text": "Asked for a case study for the sister company. Not started.",
       "request": "(none)",
       "status": "Open",
       "stands": "warm",
       "stakeholder": "stefan_roy",
       "available": true,
       "receipts": [
        {
         "id": "B/requests.csv",
         "kind": "record"
        },
        {
         "id": "B/emails/2026-09-22_stefan_case_study.txt",
         "kind": "record"
        },
        {
         "id": "stefan_roy",
         "kind": "stakeholder"
        }
       ]
      }
     ]
    }
   },
   "voices": [
    {
     "who": "Nadia Rahman",
     "stands": "guarded",
     "stakeholder": "nadia_rahman",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "nadia_rahman",
       "kind": "stakeholder"
      },
      {
       "id": "sr_case_3",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "nr_evidence_2",
       "kind": "fact",
       "status": "told"
      },
      {
       "id": "nr_sister_1",
       "kind": "fact",
       "status": "told"
      }
     ]
    },
    {
     "who": "Stefan Roy",
     "stands": "warm",
     "stakeholder": "stefan_roy",
     "available": true,
     "backing": "on file",
     "claims": [],
     "receipts": [
      {
       "id": "stefan_roy",
       "kind": "stakeholder"
      },
      {
       "id": "sr_roll_2",
       "kind": "fact",
       "status": "verified"
      }
     ]
    }
   ]
  }
 ],
 "flight_log": {
  "file": "flight_log_by_plant",
  "entity_kind": "plant",
  "dropped": [
   {
    "line": 21,
    "reason": "exact duplicate"
   }
  ],
  "missing": [
   {
    "plant": 12,
    "month": "2026-08"
   }
  ],
  "dock_map": {
   "1": {
    "dock": "AD-06",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "2": {
    "dock": "AD-11",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "3": {
    "dock": "AD-02",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "4": {
    "dock": "AD-04",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "5": {
    "dock": "AD-10",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "6": {
    "dock": "AD-03",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "7": {
    "dock": "AD-08",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "8": {
    "dock": "AD-09",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "9": {
    "dock": "AD-05",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "10": {
    "dock": "AD-13",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "11": {
    "dock": "AD-01",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "12": {
    "dock": "AD-12",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "13": {
    "dock": "AD-07",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   },
   "14": {
    "dock": "AD-14",
    "label": "matched by monthly flight counts",
    "receipts": [
     {
      "id": "flight_log_by_plant",
      "kind": "file"
     },
     {
      "id": "B/flights.csv",
      "kind": "record"
     },
     {
      "id": "B/devices.json",
      "kind": "record"
     }
    ]
   }
  },
  "rows": [
   {
    "plant": 1,
    "month": "2026-05",
    "line": 2,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 1,
    "month": "2026-06",
    "line": 3,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 1,
    "month": "2026-07",
    "line": 4,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 1,
    "month": "2026-08",
    "line": 5,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 4,
    "alerts_raised": 0
   },
   {
    "plant": 1,
    "month": "2026-09",
    "line": 6,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 1,
    "month": "2026-10",
    "line": 7,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-05",
    "line": 8,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-06",
    "line": 9,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-07",
    "line": 10,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-08",
    "line": 11,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 4,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-09",
    "line": 12,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 2,
    "month": "2026-10",
    "line": 13,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 3,
    "month": "2026-05",
    "line": 14,
    "dock_installed": true,
    "patrol_flights": 22,
    "test_flights": 0,
    "alerts_raised": 1
   },
   {
    "plant": 3,
    "month": "2026-06",
    "line": 15,
    "dock_installed": true,
    "patrol_flights": 18,
    "test_flights": 0,
    "alerts_raised": 3
   },
   {
    "plant": 3,
    "month": "2026-07",
    "line": 16,
    "dock_installed": true,
    "patrol_flights": 26,
    "test_flights": 0,
    "alerts_raised": 1
   },
   {
    "plant": 3,
    "month": "2026-08",
    "line": 17,
    "dock_installed": true,
    "patrol_flights": 21,
    "test_flights": 1,
    "alerts_raised": 2
   },
   {
    "plant": 3,
    "month": "2026-09",
    "line": 18,
    "dock_installed": true,
    "patrol_flights": 12,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 3,
    "month": "2026-10",
    "line": 19,
    "dock_installed": true,
    "patrol_flights": 17,
    "test_flights": 0,
    "alerts_raised": 3
   },
   {
    "plant": 4,
    "month": "2026-05",
    "line": 20,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 4,
    "month": "2026-06",
    "line": 22,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 4,
    "month": "2026-07",
    "line": 23,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 4,
    "month": "2026-08",
    "line": 24,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 4,
    "month": "2026-09",
    "line": 25,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 4,
    "month": "2026-10",
    "line": 26,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 5,
    "month": "2026-05",
    "line": 27,
    "dock_installed": true,
    "patrol_flights": 17,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 5,
    "month": "2026-06",
    "line": 28,
    "dock_installed": true,
    "patrol_flights": 27,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 5,
    "month": "2026-07",
    "line": 29,
    "dock_installed": true,
    "patrol_flights": 21,
    "test_flights": 0,
    "alerts_raised": 4
   },
   {
    "plant": 5,
    "month": "2026-08",
    "line": 30,
    "dock_installed": true,
    "patrol_flights": 16,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 5,
    "month": "2026-09",
    "line": 31,
    "dock_installed": true,
    "patrol_flights": 28,
    "test_flights": 0,
    "alerts_raised": 3
   },
   {
    "plant": 5,
    "month": "2026-10",
    "line": 32,
    "dock_installed": true,
    "patrol_flights": 22,
    "test_flights": 1,
    "alerts_raised": 4
   },
   {
    "plant": 6,
    "month": "2026-05",
    "line": 33,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 6,
    "month": "2026-06",
    "line": 34,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 6,
    "month": "2026-07",
    "line": 35,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 4,
    "alerts_raised": 0
   },
   {
    "plant": 6,
    "month": "2026-08",
    "line": 36,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 6,
    "month": "2026-09",
    "line": 37,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 6,
    "month": "2026-10",
    "line": 38,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 7,
    "month": "2026-05",
    "line": 39,
    "dock_installed": true,
    "patrol_flights": 26,
    "test_flights": 0,
    "alerts_raised": 5
   },
   {
    "plant": 7,
    "month": "2026-06",
    "line": 40,
    "dock_installed": true,
    "patrol_flights": 27,
    "test_flights": 0,
    "alerts_raised": 4
   },
   {
    "plant": 7,
    "month": "2026-07",
    "line": 41,
    "dock_installed": true,
    "patrol_flights": 27,
    "test_flights": 0,
    "alerts_raised": 1
   },
   {
    "plant": 7,
    "month": "2026-08",
    "line": 42,
    "dock_installed": true,
    "patrol_flights": 29,
    "test_flights": 0,
    "alerts_raised": 3
   },
   {
    "plant": 7,
    "month": "2026-09",
    "line": 43,
    "dock_installed": true,
    "patrol_flights": 28,
    "test_flights": 0,
    "alerts_raised": 2
   },
   {
    "plant": 7,
    "month": "2026-10",
    "line": 44,
    "dock_installed": true,
    "patrol_flights": 29,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 8,
    "month": "2026-05",
    "line": 45,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 8,
    "month": "2026-06",
    "line": 46,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 8,
    "month": "2026-07",
    "line": 47,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 4,
    "alerts_raised": 0
   },
   {
    "plant": 8,
    "month": "2026-08",
    "line": 48,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 8,
    "month": "2026-09",
    "line": 49,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 8,
    "month": "2026-10",
    "line": 50,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 9,
    "month": "2026-05",
    "line": 51,
    "dock_installed": true,
    "patrol_flights": 14,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 9,
    "month": "2026-06",
    "line": 52,
    "dock_installed": true,
    "patrol_flights": 17,
    "test_flights": 1,
    "alerts_raised": 1
   },
   {
    "plant": 9,
    "month": "2026-07",
    "line": 53,
    "dock_installed": true,
    "patrol_flights": 24,
    "test_flights": 0,
    "alerts_raised": 4
   },
   {
    "plant": 9,
    "month": "2026-08",
    "line": 54,
    "dock_installed": true,
    "patrol_flights": 29,
    "test_flights": 0,
    "alerts_raised": 2
   },
   {
    "plant": 9,
    "month": "2026-09",
    "line": 55,
    "dock_installed": true,
    "patrol_flights": 13,
    "test_flights": 0,
    "alerts_raised": 3
   },
   {
    "plant": 9,
    "month": "2026-10",
    "line": 56,
    "dock_installed": true,
    "patrol_flights": 19,
    "test_flights": 0,
    "alerts_raised": 4
   },
   {
    "plant": 10,
    "month": "2026-05",
    "line": 57,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 10,
    "month": "2026-06",
    "line": 58,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 10,
    "month": "2026-07",
    "line": 59,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 10,
    "month": "2026-08",
    "line": 60,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 10,
    "month": "2026-09",
    "line": 61,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 10,
    "month": "2026-10",
    "line": 62,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 4,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-05",
    "line": 63,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-06",
    "line": 64,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-07",
    "line": 65,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-08",
    "line": 66,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-09",
    "line": 67,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 11,
    "month": "2026-10",
    "line": 68,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 12,
    "month": "2026-05",
    "line": 69,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 12,
    "month": "2026-06",
    "line": 70,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 12,
    "month": "2026-07",
    "line": 71,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 12,
    "month": "2026-09",
    "line": 72,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 12,
    "month": "2026-10",
    "line": 73,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-05",
    "line": 74,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-06",
    "line": 75,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-07",
    "line": 76,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 2,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-08",
    "line": 77,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-09",
    "line": 78,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 3,
    "alerts_raised": 0
   },
   {
    "plant": 13,
    "month": "2026-10",
    "line": 79,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 1,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-05",
    "line": 80,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-06",
    "line": 81,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-07",
    "line": 82,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-08",
    "line": 83,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-09",
    "line": 84,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 14,
    "month": "2026-10",
    "line": 85,
    "dock_installed": true,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-05",
    "line": 86,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-06",
    "line": 87,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-07",
    "line": 88,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-08",
    "line": 89,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-09",
    "line": 90,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   },
   {
    "plant": 15,
    "month": "2026-10",
    "line": 91,
    "dock_installed": false,
    "patrol_flights": 0,
    "test_flights": 0,
    "alerts_raised": 0
   }
  ],
  "receipts": [
   {
    "id": "flight_log_by_plant",
    "kind": "file"
   }
  ]
 },
 "gaps": [
  {
   "deal": "b_insurance",
   "role": "could_block",
   "why": "no open blocker or request on file"
  },
  {
   "deal": "b_renewal",
   "role": "uses",
   "why": "names not on file"
  },
  {
   "deal": "b_idle",
   "role": "uses",
   "why": "names not on file"
  },
  {
   "deal": "b_insurance",
   "role": "uses",
   "why": "names not on file"
  },
  {
   "deal": "b_sister",
   "role": "uses",
   "why": "names not on file"
  }
 ]
}
```

#### B q3
```json
{
 "loaded": true,
 "moves": [
  {
   "kind": "renewal",
   "action": "Clear what blocks Renew the Aldermoor contract (14 docks): name the signer or settle the open blocker",
   "why_now": "Renewal term ends 2027-01-31, 78 days left; open blocker",
   "receipts": [
    {
     "id": "b_renewal",
     "kind": "deal"
    },
    {
     "id": "B/contract.txt",
     "kind": "record"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ],
   "level": "red",
   "deal": {
    "id": "b_renewal",
    "title": "Renew the Aldermoor contract (14 docks)"
   },
   "turns_bad_on": "2026-11-02",
   "with": "not on file",
   "rank": 1,
   "owner": "the CSM (you)",
   "due": "2026-11-17",
   "due_basis": "2 business days (red); turn date 2026-11-02 already passed",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Clear what blocks Renew the Aldermoor contract (14 docks): name the signer or settle the open blocker. Owner: the CSM (you). Due: 2026-11-17 (2 business days (red); turn date 2026-11-02 already passed). Deal: b_renewal. Why now: Renewal term ends 2027-01-31, 78 days left; open blocker. Records: b_renewal, B/contract.txt, B/profile.json, B/profile.json."
   }
  },
  {
   "kind": "stuck",
   "action": "Clear the blocker on Bring the idle plants into regular patrol",
   "why_now": "Open blocker: The network project will cut the docks off, and nobody owns adoption",
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ],
   "level": null,
   "deal": {
    "id": "b_idle",
    "title": "Bring the idle plants into regular patrol"
   },
   "turns_bad_on": "not on file",
   "with": "not on file",
   "rank": 2,
   "owner": "the CSM (you)",
   "due": "2026-11-20",
   "due_basis": "5 business days; no turn date on file",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Clear the blocker on Bring the idle plants into regular patrol. Owner: the CSM (you). Due: 2026-11-20 (5 business days; no turn date on file). Deal: b_idle. Why now: Open blocker: The network project will cut the docks off, and nobody owns adoption. Records: b_idle, B/profile.json."
   }
  },
  {
   "kind": "stuck",
   "action": "Clear the blocker on Case study for the 40-plant sister company",
   "why_now": "Open blocker: Every number rests on an unverified spreadsheet",
   "receipts": [
    {
     "id": "b_sister",
     "kind": "deal"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ],
   "level": null,
   "deal": {
    "id": "b_sister",
    "title": "Case study for the 40-plant sister company"
   },
   "turns_bad_on": "not on file",
   "with": "not on file",
   "rank": 3,
   "owner": "the CSM (you)",
   "due": "2026-11-20",
   "due_basis": "5 business days; no turn date on file",
   "draft_note": {
    "kind": "next_step",
    "text": "Next step: Clear the blocker on Case study for the 40-plant sister company. Owner: the CSM (you). Due: 2026-11-20 (5 business days; no turn date on file). Deal: b_sister. Why now: Open blocker: Every number rests on an unverified spreadsheet. Records: b_sister, B/profile.json."
   }
  }
 ],
 "candidates": 9
}
```

#### B q4
```json
{
 "today": "2026-11-14",
 "loaded": true,
 "signals_loaded": true,
 "items": [
  {
   "kind": "renewal",
   "level": "red",
   "deal": "b_renewal",
   "text": "Renewal term ends 2027-01-31, 78 days left; open blocker",
   "turns_bad_on": "2026-11-02",
   "receipts": [
    {
     "id": "b_renewal",
     "kind": "deal"
    },
    {
     "id": "B/contract.txt",
     "kind": "record"
    },
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ],
   "days_left": 78,
   "term_ends": "2027-01-31"
  },
  {
   "kind": "cold",
   "level": null,
   "deal": null,
   "text": "Beatriz Alonso: email of 2026-09-18 has no reply, 57 days",
   "turns_bad_on": "2026-10-02",
   "receipts": [
    {
     "id": "B/emails/2026-09-18_beatriz_alerts.txt",
     "kind": "record"
    },
    {
     "id": "beatriz_alonso",
     "kind": "stakeholder"
    }
   ],
   "days_waiting": 57,
   "dated": "2026-09-18",
   "who": "Beatriz Alonso"
  },
  {
   "kind": "cold",
   "level": null,
   "deal": null,
   "text": "Group Finance (shared mailbox), Aldermoor Industrial Group: email of 2026-10-08 has no reply, 37 days",
   "turns_bad_on": "2026-10-22",
   "receipts": [
    {
     "id": "B/emails/2026-10-08_finance_mailbox.txt",
     "kind": "record"
    }
   ],
   "days_waiting": 37,
   "dated": "2026-10-08",
   "who": "Group Finance (shared mailbox), Aldermoor Industrial Group"
  },
  {
   "kind": "stuck",
   "level": null,
   "deal": "b_renewal",
   "text": "Open blocker: Finance cannot verify the savings the programme claims",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "b_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "stuck",
   "level": null,
   "deal": "b_idle",
   "text": "Open blocker: The network project will cut the docks off, and nobody owns adoption",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "stuck",
   "level": null,
   "deal": "b_idle",
   "text": "Deadline has no date: Stefan's deputy leaves, and the rollout know-how with him unless it is written down first.",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "stuck",
   "level": null,
   "deal": "b_sister",
   "text": "Open blocker: Every number rests on an unverified spreadsheet",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "b_sister",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "usage_drop",
   "level": null,
   "deal": null,
   "text": "Plant 2: patrol + test flights 4 in 2026-08, 2 in 2026-10",
   "turns_bad_on": "already down (2026-10)",
   "receipts": [
    {
     "id": "flight_log_by_plant",
     "kind": "file"
    }
   ],
   "plant": 2
  },
  {
   "kind": "usage_drop",
   "level": null,
   "deal": null,
   "text": "Plant 6: patrol + test flights 3 in 2026-08, 1 in 2026-10",
   "turns_bad_on": "already down (2026-10)",
   "receipts": [
    {
     "id": "flight_log_by_plant",
     "kind": "file"
    }
   ],
   "plant": 6
  },
  {
   "kind": "usage_drop",
   "level": null,
   "deal": null,
   "text": "Plant 13: patrol + test flights 3 in 2026-08, 1 in 2026-10",
   "turns_bad_on": "already down (2026-10)",
   "receipts": [
    {
     "id": "flight_log_by_plant",
     "kind": "file"
    }
   ],
   "plant": 13
  },
  {
   "kind": "signal",
   "level": null,
   "deal": null,
   "text": "Aldermoor: three docks that fly most nights have stopped: New weekly usage for Aldermoor, 2 to 29 November. Three docks that flew most nights flew nothing in the last two weeks. All three stayed online. No ticket has been raised and nobody at the customer has said anything.",
   "turns_bad_on": "not on file",
   "receipts": [
    {
     "id": "usage_drop",
     "kind": "signal"
    },
    {
     "id": "B/usage_weekly.csv",
     "kind": "record"
    }
   ],
   "dated": "2026-11-30"
  }
 ],
 "gaps": []
}
```

#### B q5
```json
{
 "loaded": true,
 "gaps": [
  {
   "kind": "profile",
   "text": "Stefan Roy's deputy, who led the rollout on the customer's side. Referred to by role in every note; no name or contact details recorded.",
   "deals": [
    {
     "id": "b_sister",
     "title": "Case study for the 40-plant sister company",
     "value": 1200000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 1200000,
   "unpriced_deals": 0,
   "who_could_fill": "Stefan Roy",
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "b_sister",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "Anyone in group finance. One unsigned email came from a shared finance mailbox in October 2026.",
   "deals": [
    {
     "id": "b_renewal",
     "title": "Renew the Aldermoor contract (14 docks)",
     "value": 140000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 140000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "b_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "Anyone in group IT.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "A named contact at any plant other than Plant 7.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "profile",
   "text": "Which dock sits at which plant. The install list stayed with the customer.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    }
   ]
  },
  {
   "kind": "power",
   "text": "could_block: no open blocker or request on file",
   "deals": [
    {
     "id": "b_insurance",
     "title": "Protect and extend the insurance discount",
     "value": null,
     "currency": "EUR"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_insurance",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "b_renewal",
     "title": "Renew the Aldermoor contract (14 docks)",
     "value": 140000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 140000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_renewal",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "b_idle",
     "title": "Bring the idle plants into regular patrol",
     "value": 180000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 180000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "b_insurance",
     "title": "Protect and extend the insurance discount",
     "value": null,
     "currency": "EUR"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_insurance",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "power",
   "text": "uses: names not on file",
   "deals": [
    {
     "id": "b_sister",
     "title": "Case study for the 40-plant sister company",
     "value": 1200000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 1200000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_sister",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "unpriced",
   "text": "No value on file for Protect and extend the insurance discount",
   "deals": [
    {
     "id": "b_insurance",
     "title": "Protect and extend the insurance discount",
     "value": null,
     "currency": "EUR"
    }
   ],
   "value_at_stake": null,
   "unpriced_deals": 1,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_insurance",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "deadline",
   "text": "Deadline has no date: Stefan's deputy leaves, and the rollout know-how with him unless it is written down first.",
   "deals": [
    {
     "id": "b_idle",
     "title": "Bring the idle plants into regular patrol",
     "value": 180000,
     "currency": "EUR"
    }
   ],
   "value_at_stake": 180000,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "b_idle",
     "kind": "deal"
    }
   ]
  },
  {
   "kind": "file",
   "text": "Flight log has no row for plant 12 in 2026-08",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "not on file",
   "receipts": [
    {
     "id": "flight_log_by_plant",
     "kind": "file"
    }
   ]
  },
  {
   "kind": "claim",
   "text": "Only a claim, nothing backs it: ROI is proven, about 1.2 million euros a year saved.",
   "deals": [],
   "value_at_stake": null,
   "unpriced_deals": 0,
   "who_could_fill": "Stefan Roy",
   "receipts": [
    {
     "id": "sr_roi_0",
     "kind": "fact",
     "status": "claim"
    }
   ]
  }
 ]
}
```

## Activity (173 items, as of 2026-11-14T10:58:28.170267+00:00)

| Date | Acct | Kind | Id | Title | Summary |
|---|---|---|---|---|---|
| 2026-11-30 | B | signal | B:signal:usage_drop | Aldermoor: three docks that fly most nights have stopped | New weekly usage for Aldermoor, 2 to 29 November. Three docks that flew most nights flew nothing in the last two weeks. All three stayed online. No ticket has been raised and nobody at the customer has said anything. |
| 2026-11-18 | A | signal | A:signal:urgent_request | Eastern Counties: Westmere needs an answer before a public event | Insp. Karen Mbeki has written directly, and logged a ticket, ahead of a large public event on 5 December. She wants two things settled in writing this week: dates for training more operators before the day, and who answers if a dock fails on the day. Nobody has replied. |
| 2026-11-17 | A | signal | A:signal:champion_leaves | Eastern Counties: Rhys Calder is moving on | Rhys Calder has emailed to say he leaves the drone programme in January. No successor is named. Every call on file before the handover was with him alone. |
| 2026-11-02 | B | email | B:email:41 | Your term ends in 90 days | FlytBase notifications (automatic) to Account administrators (group security): Your current term ends on 2027-01-31. It does not renew automatically. Your customer success manager will be in touch. |
| 2026-10-31 | A | email | A:email:55 | Your term ends in 120 days | FlytBase notifications (automatic) to Account administrators (Rhys Calder): Your current term ends on 2027-02-28. It does not renew automatically. Your customer success manager will be in touch. |
| 2026-10-28 | A | email | A:email:54 | Renewal, term ends 28 February | Sam (FlytBase) to Rhys Calder:  |
| 2026-10-20 | A | call | A:call:17 | Check-in | Rhys Calder chased the stadium quote; none has been issued. Sam asked to speak to Insp. Mbeki about the stadium; Rhys Calder said he would set that up. Renewal: Sam to write with the term dates. |
| 2026-10-14 | B | email | B:email:40 | After yesterday's call | Sam (FlytBase) to Stefan Roy: Stefan, To confirm where we are. A case study needs the working behind the savings figure and someone at a plant willing to be quoted. I have not replied to the email from your finance mailbox; tell me if you would rather I did. Sam |
| 2026-10-13 | B | call | B:call:12 | Check-in | Stefan Roy chased the case study for the sister company. Sam: blocked on the savings breakdown and a plant willing to be quoted. The finance mailbox email and the Plant 11 dock were raised. |
| 2026-10-08 | B | request | B:request:2 | (none): Group finance (shared mailbox) | Asked for the renewal quote to show the cost for each plant. Not followed up before the handover. Status: Open; owner: none. |
| 2026-10-08 | B | email | B:email:39 | Renewal quote, drone docks | Group Finance (shared mailbox) to Sam (FlytBase):  |
| 2026-10-06 | B | email | B:email:38 | A dock is offline | FlytBase notifications (automatic) to Account administrators (group security): A dock on your account has not connected for six hours. See the devices page. |
| 2026-10-06 | A | call | A:call:16 | Check-in | Rhys Calder raised Westmere's stadium project as a 30-dock opportunity and asked for a quote. No quote issued. |
| 2026-10-03 | B | email | B:email:37 | Your term ends in 120 days | FlytBase notifications (automatic) to Account administrators (group security): Your current term ends on 2027-01-31. It does not renew automatically. Your customer success manager will be in touch. |
| 2026-10-02 | A | email | A:email:53 | Stadium | Rhys Calder to Sam (FlytBase):  |
| 2026-09-29 | B | email | B:email:36 | A dock is offline | FlytBase notifications (automatic) to Account administrators (group security): A dock on your account has not connected for six hours. See the devices page. |
| 2026-09-25 | A | email | A:email:52 | RE: One page for the board | Rhys Calder to Sam (FlytBase): Just what I needed. Rhys |
| 2026-09-25 | A | email | A:email:51 | One page for the board | Sam (FlytBase) to Rhys Calder: Rhys, The one page you asked for is attached. Totals only, as I cannot split by force: 35 docks installed; flights by month May to August: 172, 118, 99, 110. Sam |
| 2026-09-23 | A | call | A:call:15 | Check-in | Ten-minute call. The software update of 16 September went through on every dock. Rhys Calder asked for a one-page summary of the programme for the board: docks and flights. Sam can give totals but cannot split by force without the dock list. |
| 2026-09-22 | B | request | B:request:3 | (none): Stefan Roy | Asked for a case study for the sister company. Not started. Status: Open; owner: none. |
| 2026-09-22 | B | email | B:email:35 | A dock is offline | FlytBase notifications (automatic) to Account administrators (group security): A dock on your account has not connected for six hours. See the devices page. |
| 2026-09-22 | B | email | B:email:34 | Case study | Stefan Roy to Sam (FlytBase):  |
| 2026-09-20 | B | email | B:email:33 | FB-10944 is closed. How did we do? | FlytBase notifications (automatic) to Beatriz Alonso, Plant 7: Your request FB-10944 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-09-18 | B | ticket | B:ticket:FB-10944 | FB-10944: Who gets the alerts at night | Closed; requester Beatriz Alonso, Plant 7; assignee Support desk |
| 2026-09-18 | B | request | B:request:1 | FB-10944: Beatriz Alonso, Plant 7 | Asked whether night alerts can go to more than one person. Sent the settings guide. Status: Closed; owner: Support desk. |
| 2026-09-18 | B | email | B:email:32 | We have your request FB-10944 | FlytBase notifications (automatic) to Beatriz Alonso, Plant 7: Your request "Who gets the alerts at night" has been logged as FB-10944. The support desk answers tickets in order of arrival, in business hours. |
| 2026-09-18 | B | email | B:email:31 | Who gets the alerts at night (FB-10944) | Beatriz Alonso to Support desk (FlytBase):  |
| 2026-09-15 | B | call | B:call:11 | Check-in | Short call. Sam raised ticket FB-10903: the dock at Plant 11 goes offline for days at a time and the support desk is waiting for the customer's side to look at the plant's network link. Stefan Roy said to leave it with him. He said he would write about a case study. |
| 2026-09-14 | B | email | B:email:30 | A dock is offline | FlytBase notifications (automatic) to Account administrators (group security): A dock on your account has not connected for six hours. See the devices page. |
| 2026-09-11 | B | email | B:email:29 | FB-10903: the network link at Plant 11 | Support desk (FlytBase) to Group security office: Hello, The dock at Plant 11 is healthy when connected. The plant's network link drops. Could your IT team look at the link? Support desk |
| 2026-09-10 | B | ticket | B:ticket:FB-10903 | FB-10903: Dock goes offline for days at a time | Pending customer; requester Aldermoor Plant 11; assignee Support desk |
| 2026-09-10 | B | request | B:request:0 | FB-10903: Aldermoor Plant 11 | Dock goes offline for days at a time. The network link at the plant drops. Waiting for the customer's IT team to look at the link. Status: Pending customer; owner: Support desk. |
| 2026-09-10 | B | email | B:email:28 | We have your request FB-10903 | FlytBase notifications (automatic) to Aldermoor Plant 11: Your request "Dock goes offline for days at a time" has been logged as FB-10903. The support desk answers tickets in order of arrival, in business hours. |
| 2026-09-09 | B | email | B:email:27 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (group security): Your docks will be updated overnight on 2026-09-16. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-09-09 | A | email | A:email:50 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (Rhys Calder): Your docks will be updated overnight on 2026-09-16. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-09-09 | A | call | A:call:14 | Check-in | Follow-up to Sam's email of 3 September about docks that have not flown. Rhys Calder would raise it at the programme board in October and did not want the forces called. Sam pointed out that unused docks would come up at renewal. |
| 2026-09-08 | B | email | B:email:26 | A dock is offline | FlytBase notifications (automatic) to Account administrators (group security): A dock on your account has not connected for six hours. See the devices page. |
| 2026-09-03 | A | email | A:email:49 | Docks that have not flown | Sam (FlytBase) to Rhys Calder:  |
| 2026-08-26 | B | email | B:email:25 | Alert list | Sam (FlytBase) to Stefan Roy: Stefan, After yesterday: could you send the list of who receives the alerts at each plant? Sam |
| 2026-08-25 | B | call | B:call:10 | Check-in | Sam asked for the list of who receives alerts at each plant. Not received. Stefan Roy: the plants handle alerts. |
| 2026-08-25 | A | email | A:email:48 | FB-10781 is closed. How did we do? | FlytBase notifications (automatic) to Metro Central operations: Your request FB-10781 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-08-21 | A | ticket | A:ticket:FB-10781 | FB-10781: Export format of flight reports | Closed; requester Metro Central operations; assignee Support desk |
| 2026-08-21 | A | request | A:request:3 | FB-10781: Metro Central operations | Question about the export format of flight reports. Answered. Status: Closed; owner: Support desk. |
| 2026-08-21 | A | email | A:email:47 | We have your request FB-10781 | FlytBase notifications (automatic) to Metro Central operations: Your request "Export format of flight reports" has been logged as FB-10781. The support desk answers tickets in order of arrival, in business hours. |
| 2026-08-19 | A | call | A:call:13 | Check-in | First call after Rhys Calder's leave. The July usage summary had not been sent. Tender: specification still being finalised. Sam mentioned the Westmere training session of 2 August and Insp. Mbeki's email about batteries. |
| 2026-08-17 | A | email | A:email:46 | Back | Rhys Calder to Sam (FlytBase): Sam, back from leave. Wednesday is still fine for our call. Rhys |
| 2026-08-14 | A | email | A:email:45 | Your message has been added to FB-10412 | FlytBase notifications (automatic) to A contact at one of the forces (details with the support desk): Your message has been added to FB-10412. The support desk answers tickets in order of arrival, in business hours. |
| 2026-08-11 | A | request | A:request:4 | (none): Insp. Karen Mbeki | Email about batteries on two docks not lasting a night shift. No reply on file. Status: Open; owner: none. |
| 2026-08-11 | A | email | A:email:44 | Batteries on two docks | Insp. Karen Mbeki to Sam (FlytBase):  |
| 2026-08-02 | A | email | A:email:43 | FB-10650 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10650 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-07-28 | A | ticket | A:ticket:FB-10650 | FB-10650: Training for new operators | Closed; requester Westmere drone unit; assignee Customer success |
| 2026-07-28 | A | request | A:request:2 | FB-10650: Westmere drone unit | Asked for training for new operators. One session run. Status: Closed; owner: Customer success. |
| 2026-07-28 | A | email | A:email:42 | We have your request FB-10650 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Training for new operators" has been logged as FB-10650. The support desk answers tickets in order of arrival, in business hours. |
| 2026-07-22 | A | call | A:call:12 | Check-in | Rhys Calder announced a framework tender for up to 300 docks. Sam asked who is writing the specification and about the open document request in the support queue. |
| 2026-07-19 | A | email | A:email:41 | FB-10577 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10577 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-07-16 | B | email | B:email:24 | The number | Stefan Roy to Sam (FlytBase):  |
| 2026-07-15 | A | ticket | A:ticket:FB-10577 | FB-10577: Lid sensor fault on Dock 7 | Closed; requester Westmere drone unit; assignee Field team |
| 2026-07-15 | A | request | A:request:1 | FB-10577: Westmere drone unit | Lid sensor fault on Dock 7. Engineer visit, fixed. Status: Closed; owner: Field team. |
| 2026-07-15 | A | email | A:email:40 | A dock is offline | FlytBase notifications (automatic) to Account administrators (Rhys Calder): A dock on your account has not connected for six hours. See the devices page. |
| 2026-07-15 | A | email | A:email:39 | We have your request FB-10577 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Lid sensor fault on Dock 7" has been logged as FB-10577. The support desk answers tickets in order of arrival, in business hours. |
| 2026-07-14 | B | call | B:call:9 | Check-in | Stefan Roy quoted a savings figure of about 1.2 million euros a year and said thirteen of fifteen plants are flying. Sam asked for the breakdown. |
| 2026-07-09 | A | email | A:email:38 | Something big coming | Rhys Calder to Sam (FlytBase):  |
| 2026-07-02 | A | email | A:email:37 | RE: June usage summary | Rhys Calder to Sam (FlytBase): Thanks, Sam. Rhys |
| 2026-07-01 | B | email | B:email:23 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (group security): Your docks will be updated overnight on 2026-07-08. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-07-01 | A | email | A:email:36 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (Rhys Calder): Your docks will be updated overnight on 2026-07-08. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-07-01 | A | email | A:email:35 | June usage summary | Sam (FlytBase) to Rhys Calder: Rhys, June: 118 flights; 23 of the 35 docks flew at least once. Chart attached. Sam |
| 2026-06-30 | A | call | A:call:11 | Check-in | June numbers previewed. A small number of docks do most of the flying. Sam asked what would help the others start; Rhys Calder said not to push. Rhys Calder away 3 to 14 August. |
| 2026-06-29 | A | ticket | A:ticket:FB-10412 | FB-10412: Document request | Open; requester A contact at one of the forces (details with the support desk); assignee none |
| 2026-06-29 | A | request | A:request:0 | FB-10412: A contact at one of the forces (details with the support desk) | Document request. The requester has chased. No reply sent. Status: Open; owner: none. |
| 2026-06-29 | A | email | A:email:34 | We have your request FB-10412 | FlytBase notifications (automatic) to A contact at one of the forces (details with the support desk): Your request "Document request" has been logged as FB-10412. The support desk answers tickets in order of arrival, in business hours. |
| 2026-06-23 | A | email | A:email:33 | FB-10396 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10396 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-06-22 | A | ticket | A:ticket:FB-10396 | FB-10396: Aircraft would not take off in light rain: is that expected? | Closed; requester Westmere drone unit; assignee Support desk |
| 2026-06-22 | A | email | A:email:32 | We have your request FB-10396 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Aircraft would not take off in light rain: is that expected?" has been logged as FB-10396. The support desk answers tickets in order of arrival, in business hours. |
| 2026-06-18 | A | email | A:email:31 | FB-10385 is closed. How did we do? | FlytBase notifications (automatic) to Alliance programme office: Your request FB-10385 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-06-17 | A | ticket | A:ticket:FB-10385 | FB-10385: Two view-only logins for the programme office | Closed; requester Alliance programme office; assignee Support desk |
| 2026-06-17 | A | email | A:email:30 | We have your request FB-10385 | FlytBase notifications (automatic) to Alliance programme office: Your request "Two view-only logins for the programme office" has been logged as FB-10385. The support desk answers tickets in order of arrival, in business hours. |
| 2026-06-16 | A | call | A:call:10 | Check-in | Short call. Rhys Calder asked for two view-only logins for the programme office (raised as a ticket and done) and copies of the paid invoices for an audit (sent by Accounts). Sam mentioned the overnight software update on 8 July. |
| 2026-06-15 | B | email | B:email:22 | FB-10372 is closed. How did we do? | FlytBase notifications (automatic) to Group security office: Your request FB-10372 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-06-15 | B | email | B:email:21 | RE: Clips for the board | Stefan Roy to Sam (FlytBase): Good. These will do. Stefan |
| 2026-06-15 | B | email | B:email:20 | Clips for the board | Sam (FlytBase) to Stefan Roy: Stefan, Four clips from night patrols are attached. Sam |
| 2026-06-12 | B | ticket | B:ticket:FB-10372 | FB-10372: Clips of night patrols for the board | Closed; requester Group security office; assignee Customer success |
| 2026-06-12 | B | email | B:email:19 | We have your request FB-10372 | FlytBase notifications (automatic) to Group security office: Your request "Clips of night patrols for the board" has been logged as FB-10372. The support desk answers tickets in order of arrival, in business hours. |
| 2026-06-11 | B | call | B:call:8 | Check-in | Stefan Roy asked for footage clips for a board presentation. Sam raised that most of the flying comes from a handful of docks. Stefan Roy: thirteen of fifteen plants are flying. |
| 2026-06-05 | A | email | A:email:29 | FB-10350 is closed. How did we do? | FlytBase notifications (automatic) to Metro Central operations: Your request FB-10350 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-06-03 | A | ticket | A:ticket:FB-10350 | FB-10350: Map layer slow to load | Closed; requester Metro Central operations; assignee Support desk |
| 2026-06-03 | A | email | A:email:28 | We have your request FB-10350 | FlytBase notifications (automatic) to Metro Central operations: Your request "Map layer slow to load" has been logged as FB-10350. The support desk answers tickets in order of arrival, in business hours. |
| 2026-06-03 | A | email | A:email:27 | Dock list by force | Sam (FlytBase) to Rhys Calder: Rhys, As discussed yesterday: could you send the list of which dock is at which force? Then I can split the chart the way the board wants. Sam |
| 2026-06-02 | A | call | A:call:9 | Check-in | May usage summary discussed. Rhys Calder wanted a chart by force for the board; Sam does not hold which dock is at which force. Rhys Calder said he would send the list. A fair number of docks had not flown in May; Rhys Calder: early days. |
| 2026-06-01 | A | email | A:email:26 | RE: May usage summary | Rhys Calder to Sam (FlytBase): Perfect. The board loves a chart. Rhys |
| 2026-06-01 | A | email | A:email:25 | May usage summary | Sam (FlytBase) to Rhys Calder: Rhys, May in one line: 172 flights across the 35 docks; 26 of the 35 flew at least once. Chart attached. Sam |
| 2026-05-22 | B | email | B:email:18 | Install list, for the deputy head of security | Sam (FlytBase) to Group security office: Hello, I have taken over the account from our rollout lead. Stefan suggested I ask through this office for a copy of the install list. Sam |
| 2026-05-21 | B | call | B:call:7 | Intro call | Sam's first call as CSM. Stefan Roy described the rollout as a success. Sam asked for the install list; Stefan Roy said his deputy has it. Sam to write to the deputy. |
| 2026-05-20 | A | email | A:email:24 | FB-10304 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10304 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-05-19 | A | call | A:call:8 | Intro call | Sam's first call as CSM. Rhys Calder asked that everything go through him. Contacts at the other three forces were not offered. |
| 2026-05-18 | B | email | B:email:17 | FB-10301 is closed. How did we do? | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request FB-10301 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-05-14 | A | ticket | A:ticket:FB-10304 | FB-10304: Live video lags at night on one dock | Closed; requester Westmere drone unit; assignee Support desk |
| 2026-05-14 | A | email | A:email:23 | We have your request FB-10304 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Live video lags at night on one dock" has been logged as FB-10304. The support desk answers tickets in order of arrival, in business hours. |
| 2026-05-13 | B | ticket | B:ticket:FB-10301 | FB-10301: Dock lid slow to open after heavy rain | Closed; requester A plant operator (plant not recorded); assignee Support desk |
| 2026-05-13 | B | email | B:email:16 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (group security): Your docks will be updated overnight on 2026-05-20. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-05-13 | B | email | B:email:15 | We have your request FB-10301 | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request "Dock lid slow to open after heavy rain" has been logged as FB-10301. The support desk answers tickets in order of arrival, in business hours. |
| 2026-05-13 | A | email | A:email:22 | Planned overnight software update | FlytBase notifications (automatic) to Account administrators (Rhys Calder): Your docks will be updated overnight on 2026-05-20. A dock that is flying or offline is updated when it is next idle and online. Nothing is needed from you. |
| 2026-05-06 | A | ticket | A:ticket:FB-10284 | FB-10284: Password reset for two operators | Closed; requester Westmere drone unit; assignee Support desk |
| 2026-05-06 | A | email | A:email:21 | FB-10284 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10284 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-05-06 | A | email | A:email:20 | We have your request FB-10284 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Password reset for two operators" has been logged as FB-10284. The support desk answers tickets in order of arrival, in business hours. |
| 2026-04-29 | B | email | B:email:14 | FB-10261 is closed. How did we do? | FlytBase notifications (automatic) to Group security office: Your request FB-10261 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-04-28 | A | call | A:call:7 | Installation close call | All 35 docks installed and commissioned by 24 April 2026. Every dock flew a commissioning flight. No tasking plan was shared for any force. Account passes to customer success in May. |
| 2026-04-27 | B | ticket | B:ticket:FB-10261 | FB-10261: Footage export for a board presentation | Closed; requester Group security office; assignee Support desk |
| 2026-04-27 | B | email | B:email:13 | We have your request FB-10261 | FlytBase notifications (automatic) to Group security office: Your request "Footage export for a board presentation" has been logged as FB-10261. The support desk answers tickets in order of arrival, in business hours. |
| 2026-04-24 | B | email | B:email:12 | Install list | The rollout lead (FlytBase) to Group security office: Hello, Could we have a copy of the install list: which dock is at which plant, who was trained and what was set up? Rollout lead |
| 2026-04-23 | B | call | B:call:6 | Rollout close call | 14 docks installed. Patrol schedules only at the plants that asked. The install list stayed with the deputy; a copy was asked for and not received. |
| 2026-04-22 | A | email | A:email:19 | FB-10248 is closed. How did we do? | FlytBase notifications (automatic) to Metro Central operations: Your request FB-10248 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-04-21 | A | ticket | A:ticket:FB-10248 | FB-10248: How to schedule a training flight | Closed; requester Metro Central operations; assignee Support desk |
| 2026-04-21 | A | email | A:email:18 | We have your request FB-10248 | FlytBase notifications (automatic) to Metro Central operations: Your request "How to schedule a training flight" has been logged as FB-10248. The support desk answers tickets in order of arrival, in business hours. |
| 2026-04-10 | A | email | A:email:17 | FB-10220 is closed. How did we do? | FlytBase notifications (automatic) to Alliance programme office: Your request FB-10220 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-04-09 | B | email | B:email:11 | FB-10217 is closed. How did we do? | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request FB-10217 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-04-09 | A | ticket | A:ticket:FB-10220 | FB-10220: A photograph of each installed dock, for the programme board | Closed; requester Alliance programme office; assignee Field team |
| 2026-04-09 | A | email | A:email:16 | We have your request FB-10220 | FlytBase notifications (automatic) to Alliance programme office: Your request "A photograph of each installed dock, for the programme board" has been logged as FB-10220. The support desk answers tickets in order of arrival, in business hours. |
| 2026-04-08 | B | ticket | B:ticket:FB-10217 | FB-10217: Patrol did not start: aircraft battery below the launch level | Closed; requester A plant operator (plant not recorded); assignee Support desk |
| 2026-04-08 | B | email | B:email:10 | We have your request FB-10217 | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request "Patrol did not start: aircraft battery below the launch level" has been logged as FB-10217. The support desk answers tickets in order of arrival, in business hours. |
| 2026-04-02 | A | email | A:email:15 | FB-10195 is closed. How did we do? | FlytBase notifications (automatic) to Westmere drone unit: Your request FB-10195 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-03-30 | A | ticket | A:ticket:FB-10195 | FB-10195: Replacement propellers | Closed; requester Westmere drone unit; assignee Field team |
| 2026-03-30 | A | email | A:email:14 | We have your request FB-10195 | FlytBase notifications (automatic) to Westmere drone unit: Your request "Replacement propellers" has been logged as FB-10195. The support desk answers tickets in order of arrival, in business hours. |
| 2026-03-27 | B | email | B:email:9 | FB-10185 is closed. How did we do? | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request FB-10185 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-03-26 | B | ticket | B:ticket:FB-10185 | FB-10185: How to change the patrol start time | Closed; requester A plant operator (plant not recorded); assignee Support desk |
| 2026-03-26 | B | email | B:email:8 | We have your request FB-10185 | FlytBase notifications (automatic) to A plant operator (plant not recorded): Your request "How to change the patrol start time" has been logged as FB-10185. The support desk answers tickets in order of arrival, in business hours. |
| 2026-03-24 | A | call | A:call:6 | Installation check-in | 19 of 35 docks installed. Two docks failed the commissioning check the first time and passed after a second visit. Training given at each install. |
| 2026-03-18 | A | ticket | A:ticket:FB-10167 | FB-10167: Dock failed the commissioning check: camera calibration | Closed; requester FlytBase field team; assignee Field team |
| 2026-03-17 | B | call | B:call:5 | Rollout check-in | 8 of 14 docks installed. At two plants the signal at the agreed dock position was weak on install day; the deputy said he would take it up with each plant. |
| 2026-03-12 | B | ticket | B:ticket:FB-10151 | FB-10151: Weak signal at the dock position on install day, two plants | Closed; requester FlytBase rollout lead; assignee Support desk |
| 2026-03-04 | A | ticket | A:ticket:FB-10132 | FB-10132: Dock failed the commissioning check: door seal | Closed; requester FlytBase field team; assignee Field team |
| 2026-03-01 | A | invoice | A:invoice:INV-26-0314 | INV-26-0314: First year, part 4 of 4 | Paid, amount not on file |
| 2026-03-01 | A | invoice | A:invoice:INV-26-0313 | INV-26-0313: First year, part 3 of 4 | Paid, amount not on file |
| 2026-03-01 | A | invoice | A:invoice:INV-26-0312 | INV-26-0312: First year, part 2 of 4 | Paid, amount not on file |
| 2026-03-01 | A | invoice | A:invoice:INV-26-0311 | INV-26-0311: First year, part 1 of 4 | Paid, amount not on file |
| 2026-03-01 | A | email | A:email:13 | Invoice INV-26-0314 | FlytBase notifications (automatic) to Billing contact, per Schedule 2: Invoice for the first year, part 4 of 4, is attached. |
| 2026-03-01 | A | email | A:email:12 | Invoice INV-26-0313 | FlytBase notifications (automatic) to Billing contact, per Schedule 2: Invoice for the first year, part 3 of 4, is attached. |
| 2026-03-01 | A | email | A:email:11 | Invoice INV-26-0312 | FlytBase notifications (automatic) to Billing contact, per Schedule 2: Invoice for the first year, part 2 of 4, is attached. |
| 2026-03-01 | A | email | A:email:10 | Invoice INV-26-0311 | FlytBase notifications (automatic) to Billing contact, per Schedule 2: Invoice for the first year, part 1 of 4, is attached. |
| 2026-02-27 | B | email | B:email:7 | FB-10121 is closed. How did we do? | FlytBase notifications (automatic) to Group security office: Your request FB-10121 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-02-27 | A | email | A:email:9 | FB-10120 is closed. How did we do? | FlytBase notifications (automatic) to Alliance programme office: Your request FB-10120 has been closed. Two questions on how it went: a short survey is linked here. |
| 2026-02-26 | B | ticket | B:ticket:FB-10121 | FB-10121: An operator login for each plant as it goes live | Closed; requester Group security office; assignee Support desk |
| 2026-02-26 | B | email | B:email:6 | We have your request FB-10121 | FlytBase notifications (automatic) to Group security office: Your request "An operator login for each plant as it goes live" has been logged as FB-10121. The support desk answers tickets in order of arrival, in business hours. |
| 2026-02-26 | A | ticket | A:ticket:FB-10120 | FB-10120: Operator logins for the first units to be installed | Closed; requester Alliance programme office; assignee Support desk |
| 2026-02-26 | A | email | A:email:8 | We have your request FB-10120 | FlytBase notifications (automatic) to Alliance programme office: Your request "Operator logins for the first units to be installed" has been logged as FB-10120. The support desk answers tickets in order of arrival, in business hours. |
| 2026-02-20 | A | email | A:email:7 | RE: Install schedule | Rhys Calder to The onboarding lead (FlytBase): Fine. The programme office will send an escort for each date. Rhys |
| 2026-02-19 | A | email | A:email:6 | Install schedule | The onboarding lead (FlytBase) to Rhys Calder: Rhys, The schedule for March and April is attached. We need site access on each date. Onboarding lead |
| 2026-02-17 | A | call | A:call:5 | Installation kick-off | Installation planned for March and April 2026. Site access goes through the programme office, which sends an escort on each install day. Operators are trained at each install. |
| 2026-02-13 | B | email | B:email:5 | RE: Install schedule | Group security office to The rollout lead (FlytBase): Dates agreed. The deputy head of security will be on site for each install. Group security office |
| 2026-02-12 | B | ticket | B:ticket:FB-10085 | FB-10085: Survey sheet for dock positions, for the customer's plant visits | Closed; requester FlytBase rollout lead; assignee Support desk |
| 2026-02-11 | B | email | B:email:4 | Install schedule | The rollout lead (FlytBase) to Group security office: Hello, The schedule for the 14 installs is attached. Rollout lead |
| 2026-02-10 | B | call | B:call:4 | Rollout kick-off | Rollout planned for February to April 2026. The deputy goes to each plant, agrees the dock position with the plant manager and trains one operator. Each plant's network is the customer's to arrange. |
| 2026-02-01 | B | invoice | B:invoice:INV-26-0204 | INV-26-0204: First year, 14 docks, less the trial fee credit | Paid, 128000 EUR |
| 2026-02-01 | B | email | B:email:3 | Invoice INV-26-0204 | FlytBase notifications (automatic) to Group security (billing contact): Your invoice for the first year is attached. |
| 2026-01-21 | A | email | A:email:5 | Order form signed: next steps | Achal Negi (FlytBase) to Rhys Calder: Rhys, Thank you for the signed order form. Our onboarding lead will write to you about installation dates. Accounts has your invoicing instructions. Achal |
| 2026-01-16 | B | email | B:email:2 | Order form signed: next steps | Achal Negi (FlytBase) to Stefan Roy: Stefan, Thank you for the signed order form. Our rollout lead will write to your office about install dates. Achal |
| 2026-01-13 | A | call | A:call:4 | Order call | Order agreed in outline: 35 docks, one order placed by the alliance office for the four forces. The alliance office instructed that it be invoiced in four parts. Rhys Calder supplied the dock numbers and sites. The procurement lead was not on the call. |
| 2026-01-08 | B | call | B:call:3 | Order call | Order agreed in outline: 14 docks, 140,000 a year, signed by Stefan Roy from the group security budget. Stefan Roy asked again for a savings figure in the order form; declined. |
| 2025-12-16 | A | call | A:call:3 | Pilot review call | Pilot reviewed. The alliance office will place one order for all four forces. The procurement lead asked to be kept informed; no owner was recorded for that. |
| 2025-12-11 | B | call | B:call:2 | Trial review call | Trial reviewed. 14 docks wanted. The deputy will lead the rollout. Open at the end: who at each plant acts on what a patrol finds, and each plant's network. |
| 2025-11-05 | A | email | A:email:4 | Yesterday's training | Insp. Karen Mbeki to A solutions engineer (FlytBase): Thank you for yesterday's session. It was what the new starters needed. Karen Mbeki |
| 2025-10-21 | A | call | A:call:2 | Pilot mid-point call | Mid-point of the pilot. Two docks needed an engineer visit in the first month; both fixed. The unit was using the docks most days. A second training session was asked for and run on 4 November. |
| 2025-10-07 | B | call | B:call:1 | Trial kick-off | Trial started: 2 docks at two plants, October to December 2025. Stefan Roy's deputy runs it day to day on the customer's side. |
| 2025-10-06 | B | invoice | B:invoice:INV-25-1012 | INV-25-1012: Trial fee, 2 docks | Paid, 12000 EUR |
| 2025-09-17 | A | email | A:email:3 | RE: Pilot: your six docks are live | Insp. Karen Mbeki to A solutions engineer (FlytBase): Thank you. We will start using them on tomorrow's late shift. Karen Mbeki |
| 2025-09-16 | A | email | A:email:2 | Pilot: your six docks are live | A solutions engineer (FlytBase) to Insp. Karen Mbeki: Inspector, All six docks passed their checks yesterday and are live. For the pilot, call me directly if anything breaks. |
| 2025-09-15 | A | invoice | A:invoice:INV-25-0914 | INV-25-0914: Pilot fee, 6 docks | Paid, 30000 GBP |
| 2025-09-12 | B | email | B:email:1 | RE: Trial proposal | Stefan Roy to Achal Negi (FlytBase): Agreed. My deputy will run it on our side. Stefan |
| 2025-09-09 | B | email | B:email:0 | Trial proposal | Achal Negi (FlytBase) to Stefan Roy: Stefan, The trial proposal is attached: 2 docks at two plants, October to December. Achal |
| 2025-09-02 | A | call | A:call:1 | Pilot scoping call | Pilot agreed: 6 docks at Westmere, 15 September to 12 December 2025, at sites chosen by Insp. Mbeki. Success was described as the unit using the docks and footage for the board; no other measure was set. |
| 2025-08-19 | B | call | B:call:0 | Enquiry call | First call. Group security wants automated night patrols of the fence line at the group's plants. A trial at two plants was agreed in outline. |
| 2025-07-15 | A | email | A:email:1 | RE: Pilot proposal | Rhys Calder to Achal Negi (FlytBase): Achal, the programme office is happy to proceed. Westmere will host. I will introduce the inspector who runs their drone unit. Rhys |
| 2025-07-08 | A | email | A:email:0 | Pilot proposal | Achal Negi (FlytBase) to Rhys Calder: Rhys, The pilot proposal is attached: 6 docks at Westmere for three months. Achal |
| 2025-06-24 | A | call | A:call:0 | Enquiry call | First call. The alliance office runs a joint drone programme for four county forces and wants docks. A pilot was asked for before any larger purchase, hosted by Westmere's drone unit. |

## People
```json
{
 "state": "ok",
 "as_of": "2026-11-14T10:58:28.170267+00:00",
 "people": [
  {
   "id": "A:karen_mbeki",
   "account": "A",
   "name": "Insp. Karen Mbeki",
   "title": "Drone unit inspector, Westmere",
   "org": "Eastern Counties Police Alliance",
   "side": "customer",
   "role_tags": [
    "uses"
   ],
   "standing": "neutral",
   "deals": [
    "a_renewal",
    "a_tarn",
    "a_westmere"
   ],
   "receipts": [
    {
     "id": "karen_mbeki",
     "kind": "stakeholder"
    },
    {
     "id": "A/users.json",
     "kind": "record"
    },
    {
     "id": "A/mail_log.json",
     "kind": "record"
    },
    {
     "id": "A/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "A:rhys_calder",
   "account": "A",
   "name": "Rhys Calder",
   "title": "Alliance drone programme lead",
   "org": "Eastern Counties Police Alliance",
   "side": "customer",
   "role_tags": [
    "uses"
   ],
   "standing": "warm",
   "deals": [
    "a_renewal",
    "a_tarn",
    "a_westmere"
   ],
   "receipts": [
    {
     "id": "rhys_calder",
     "kind": "stakeholder"
    },
    {
     "id": "A/users.json",
     "kind": "record"
    },
    {
     "id": "A/mail_log.json",
     "kind": "record"
    },
    {
     "id": "A/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "A:achal_negi",
   "account": "A",
   "name": "Achal Negi",
   "title": "Director of Business Development",
   "org": "FlytBase",
   "side": "flytbase",
   "role_tags": [],
   "standing": null,
   "deals": [],
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    },
    {
     "id": "A/mail_log.json",
     "kind": "record"
    },
    {
     "id": "A/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "A:sam",
   "account": "A",
   "name": "Sam",
   "title": "Customer Success Manager (previous CSM on accounts A and B, May to November 2026; has moved teams)",
   "org": "FlytBase",
   "side": "flytbase",
   "role_tags": [],
   "standing": null,
   "deals": [],
   "receipts": [
    {
     "id": "A/profile.json",
     "kind": "record"
    },
    {
     "id": "A/mail_log.json",
     "kind": "record"
    },
    {
     "id": "A/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "B:beatriz_alonso",
   "account": "B",
   "name": "Beatriz Alonso",
   "title": "Plant manager, Plant 7",
   "org": "Aldermoor Industrial Group",
   "side": "customer",
   "role_tags": [],
   "standing": "neutral",
   "deals": [
    "b_idle",
    "b_renewal"
   ],
   "receipts": [
    {
     "id": "beatriz_alonso",
     "kind": "stakeholder"
    },
    {
     "id": "B/mail_log.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "B:nadia_rahman",
   "account": "B",
   "name": "Nadia Rahman",
   "title": "Group finance controller",
   "org": "Aldermoor Industrial Group",
   "side": "customer",
   "role_tags": [],
   "standing": "guarded",
   "deals": [
    "b_renewal",
    "b_sister"
   ],
   "receipts": [
    {
     "id": "nadia_rahman",
     "kind": "stakeholder"
    }
   ]
  },
  {
   "id": "B:owen_fitch",
   "account": "B",
   "name": "Owen Fitch",
   "title": "Group IT infrastructure lead",
   "org": "Aldermoor Industrial Group",
   "side": "customer",
   "role_tags": [],
   "standing": "neutral",
   "deals": [],
   "receipts": [
    {
     "id": "owen_fitch",
     "kind": "stakeholder"
    }
   ]
  },
  {
   "id": "B:stefan_roy",
   "account": "B",
   "name": "Stefan Roy",
   "title": "Group head of security",
   "org": "Aldermoor Industrial Group",
   "side": "customer",
   "role_tags": [
    "could_block",
    "decides",
    "uses"
   ],
   "standing": "warm",
   "deals": [
    "b_idle",
    "b_insurance",
    "b_renewal",
    "b_sister"
   ],
   "receipts": [
    {
     "id": "stefan_roy",
     "kind": "stakeholder"
    },
    {
     "id": "B/contract.txt",
     "kind": "record"
    },
    {
     "id": "B/calls/2026-01-08_order_call.txt",
     "kind": "record"
    },
    {
     "id": "B/users.json",
     "kind": "record"
    },
    {
     "id": "B/requests.csv",
     "kind": "record"
    },
    {
     "id": "B/emails/2026-09-22_stefan_case_study.txt",
     "kind": "record"
    },
    {
     "id": "B/mail_log.json",
     "kind": "record"
    },
    {
     "id": "B/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "B:achal_negi",
   "account": "B",
   "name": "Achal Negi",
   "title": "Director of Business Development",
   "org": "FlytBase",
   "side": "flytbase",
   "role_tags": [],
   "standing": null,
   "deals": [],
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "B/mail_log.json",
     "kind": "record"
    },
    {
     "id": "B/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "B:sam",
   "account": "B",
   "name": "Sam",
   "title": "Customer Success Manager (previous CSM on accounts A and B, May to November 2026; has moved teams)",
   "org": "FlytBase",
   "side": "flytbase",
   "role_tags": [],
   "standing": null,
   "deals": [],
   "receipts": [
    {
     "id": "B/profile.json",
     "kind": "record"
    },
    {
     "id": "B/mail_log.json",
     "kind": "record"
    },
    {
     "id": "B/calls_index.json",
     "kind": "record"
    }
   ]
  },
  {
   "id": "B:support_desk",
   "account": "B",
   "name": "Support desk",
   "title": "Shared queue for tickets. Tickets with no assignee wait in the queue.",
   "org": "FlytBase",
   "side": "flytbase",
   "role_tags": [],
   "standing": null,
   "deals": [],
   "receipts": [
    {
     "id": "B/mail_log.json",
     "kind": "record"
    }
   ]
  }
 ]
}
```

## Notes written back
```json
{
 "notes": []
}
```
