{
    "assertions": [ //assertions
        {
            "issuer": "@openssf/i_trust",
            "issuerSpecificID": "sc-2023-05-15-001",
            "claim": 1,
            "comment": "Package has good security practices",
            "subject": {
                "pkg": {
                    "name": "express",
                    "range": ">=5.0.0"
                }
            }
        },
        {
            "issuer": "@express/i_trust",
            "issuerSpecificID": "1",
            "claim": -1,//could split into confidence+dispute/endorse
            "comment": "vulnerability in lodash as used by express is not affecting it",
            "subject": {
                "dependency": {
                    "dependent": {
                        "name": "express"
                    },
                    "pkg": {
                        "name": "lodash",
                        "range": "3.4.1"
                    }
                },
                "flaw": {
                    // "cwe":"CWE-123",
                    "ghsa": "GHSA-p6mc-m468-83gw",
                    "url": "https://github.com/advisories/GHSA-p6mc-m468-83gw"
                }
            }
        },
        {
            "issuer": "@npmjs/i_trust",
            "issuerSpecificID": "npm-audit-2023-06-01-002",
            "claim": -1,
            "comment": "Disputing the assertion",
            "subject": {
                "assertion": {
                    "issuer": "@openssf/i_trust",
                    "issuerSpecificID": "sc-2023-05-15-001"
                }
            }
        },
        {
            "issuer": "@express/i_trust",
            "issuerSpecificID": "1",
            "claim": {
                type: "dispute", // dispute, endorse, -1 +1
                //optionally narrow the claim down to specific fields
                "comment": "vulnerability in lodash as used by express is not affecting it",
                scope: ["pkg.range", "criticality"]
                // can't decide on the name
                // properties: ["pkg.range"]
                // specifics: ["criticality"]
                // target: ["flaw", "criticality"]
                // aspects: ["flaw", "criticality"] 
                // fields: ["flaw", "criticality"]
                // attributes: ["flaw", "criticality"]
                // concerns: ["flaw", "criticality"]
                // components: ["flaw", "criticality"]
                // elements: ["flaw", "criticality"]
                // subset: ["flaw", "criticality"]
            },
            
            "subject": {
                "pkg": {
                    "name": "lodash",
                    "range": "3.4.1"
                },
                "flaw": {
                    "ghsa": "GHSA-p6mc-m468-83gw",
                    "url": "https://github.com/advisories/GHSA-p6mc-m468-83gw"
                },
                "criticality": "high"
                // recommendation: ignore, update, 
                // criticality could also go here or on the top level depending on whether we want to use it to identify or claim 
            }
        }
    ]
}