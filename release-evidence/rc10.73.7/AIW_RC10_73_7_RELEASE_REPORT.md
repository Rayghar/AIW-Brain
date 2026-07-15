# AIW rc.10.73.7 Release Report

Generated: 2026-07-15T14:18:41.716Z

Production accepted: **false**

## Acquisition outcome

Exactly 47 governed repositories produced 47 processing-complete immutable manifests. There are 0 failed repositories, 0 controlled stops and 0 missing manifests; 23 repositories remain review-required because security or licence evidence must not be silently promoted. No repository code was executed.

| Measure | Count |
|---|---:|
| Complete governed tree files | 186219 |
| Governed eligible files | 106350 |
| Accepted files | 105802 |
| Rejected files | 254 |
| Policy exclusions | 79869 |
| Security-quarantined files | 294 |
| Processing failures | 0 |
| Unprocessed files | 0 |
| Bounded evidence passages | 147239 |
| Initial deterministic candidate claims | 315621 |

Safe source files are held in content-addressed local snapshots. Quarantined objects remain restricted and are excluded from the release distribution. All deterministic claims and semantic-foundation outputs remain candidate-only. This release establishes acquisition and semantic-transformation foundations; it does not claim full knowledge conversion.

## Complete repository results

| Connector | Repository | Immutable commit | Tree | Eligible | Accepted | Quarantined | Failures | Status |
|---|---|---|---:|---:|---:|---:|---:|---|
| `GH-APACHE-CAMEL` | `apache/camel` | `c29ea1effbdfe5d963075292c2b5068ec1f8f099` | 39338 | 2883 | 2807 | 74 | 0 | complete-review-required |
| `GH-ARC42` | `arc42/arc42-template` | `8dff0d9b1f9640684df8c3bbcdc2ee45f989ca0f` | 705 | 21 | 21 | 0 | 0 | complete |
| `GH-ARCHITECTURE-CATALOG` | `ea-toolkit/architecture-catalog` | `1efa7ea08a8139dc07bcef1834d6964b5fcfd1dc` | 449 | 2 | 2 | 0 | 0 | complete |
| `GH-ARCHUNIT` | `TNG/ArchUnit` | `31ac54b1ebdc67d6268ca8a03b59e62308cf15fc` | 1694 | 832 | 824 | 8 | 0 | complete-review-required |
| `GH-ARDALIS-CLEAN-ARCH` | `ardalis/CleanArchitecture` | `a064d0b369b719ba03da71da1560d208d7e02e03` | 548 | 134 | 134 | 0 | 0 | complete |
| `GH-ASYNCAPI` | `asyncapi/spec` | `e59928aee75a566a3f96d8cad78a9a92ea96f829` | 103 | 32 | 31 | 1 | 0 | complete-review-required |
| `GH-AWESOME-ANTIPATTERN` | `fauzisho/awesome-antipattern` | `562dbf4d0206d91630fae0a56ff05db9027fac8c` | 3 | 1 | 1 | 0 | 0 | complete |
| `GH-AWESOME-DESIGN-PATTERNS` | `DovAmir/awesome-design-patterns` | `9006287f27e720000cc8763ae4cd150789b8571d` | 3 | 1 | 1 | 0 | 0 | complete |
| `GH-AWESOME-SCALABILITY` | `binhnguyennus/awesome-scalability` | `c9ca9f248d4dbbde63a8460188f6324f00f34ddd` | 10 | 1 | 1 | 0 | 0 | complete |
| `GH-AWESOME-SOFTWARE-ARCH` | `mehdihadeli/awesome-software-architecture` | `3b79c49e3f00460d1205918b2eff309a6b38b06b` | 313 | 305 | 305 | 0 | 0 | complete |
| `GH-AWESOME-SYSTEM-DESIGN-RESOURCES` | `ashishps1/awesome-system-design-resources` | `25724090f7dd7746129b7194b55504f9d06f86ed` | 26 | 1 | 1 | 0 | 0 | complete |
| `GH-AWS-SAAS-EKS` | `aws-samples/aws-saas-factory-eks-reference-architecture` | `add9bd7c5b252a37b6b359013eaf42c56a574dc0` | 312 | 1 | 1 | 0 | 0 | complete |
| `GH-AWS-SERVERLESS-PATTERNS` | `aws-samples/serverless-patterns` | `cb0fc7315a5aef82f68f9fe33b02d529abb0fd2a` | 13516 | 8216 | 8102 | 93 | 0 | complete-review-required |
| `GH-AWS-SOLUTIONS-CONSTRUCTS` | `awslabs/aws-solutions-constructs` | `76b8fdd90033b30f040ca99708b31e75d7433a0e` | 5388 | 347 | 343 | 3 | 0 | complete-review-required |
| `GH-AZURE-RESOURCE-MODULES` | `Azure/ResourceModules` | `0342b24f9439a62a349ad90f4258b3304b4523d9` | 655 | 245 | 244 | 1 | 0 | complete-review-required |
| `GH-BACKSTAGE` | `backstage/backstage` | `1109abcbdc53cf171a21dce4b4710b3e4ac363bd` | 11851 | 471 | 471 | 0 | 0 | complete |
| `GH-C4-PLANTUML` | `plantuml-stdlib/C4-PlantUML` | `1edfb8a878baaa821e54cf423a070c792e8677c6` | 122 | 51 | 51 | 0 | 0 | complete |
| `GH-CNA-QUALITY-MODEL` | `r0light/cna-quality-model` | `8f9d5cb7cc884d35644b9a2995d3dff9d25bdf12` | 173 | 17 | 17 | 0 | 0 | complete |
| `GH-CNCF-LANDSCAPE-GRAPH` | `cncf/landscape-graph` | `dbe77e1d56ec1b9cf0816026c58ccbf149dcbbd0` | 313 | 16 | 15 | 0 | 0 | complete-review-required |
| `GH-CNCF-TAG-SECURITY` | `cncf/tag-security` | `5fb87f474808e02e7786d7c5548e65ffc1a6e29e` | 820 | 135 | 133 | 2 | 0 | complete-review-required |
| `GH-CONTEXT-MAP-DISCOVERY` | `ContextMapper/context-map-discovery` | `623b7ab6bf33d04e470a3ffc6c77882a8d11caf8` | 105 | 80 | 80 | 0 | 0 | complete |
| `GH-CONTEXT-MAPPER-DSL` | `ContextMapper/context-mapper-dsl` | `995f486a9cdecb6946257d5c7b6d98ada2978124` | 997 | 210 | 208 | 2 | 0 | complete-review-required |
| `GH-DDD-CREW` | `ddd-crew/ddd-starter-modelling-process` | `722a000cc6618d40b818c95cf853be8aea5e8652` | 45 | 6 | 5 | 0 | 0 | complete-review-required |
| `GH-DEVELOPER-ROADMAP` | `nilbuild/developer-roadmap` | `a01f6c44797056d22d22a8874bfb3e7e1ff2832f` | 12497 | 10366 | 10366 | 0 | 0 | complete |
| `GH-FINOS-AI-RA` | `finos/ai-reference-architecture-library` | `bb8ed13f69ec42842e598cbe57b95ba3476f5384` | 27 | 19 | 18 | 1 | 0 | complete-review-required |
| `GH-FINOS-CALM` | `finos/architecture-as-code` | `b3e50665ec543f12614557d8db520c5531d656c2` | 2965 | 368 | 359 | 0 | 0 | complete-review-required |
| `GH-GCP-CLOUD-FOUNDATION-FABRIC` | `GoogleCloudPlatform/cloud-foundation-fabric` | `276623922f0b511d1625e0e1783e12efb94edfc0` | 2966 | 1743 | 1703 | 40 | 0 | complete-review-required |
| `GH-GCP-MICROSERVICES-DEMO` | `GoogleCloudPlatform/microservices-demo` | `9a4616e77f0f9cbcbecaf27d711c38890dda1404` | 363 | 235 | 227 | 4 | 0 | complete-review-required |
| `GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT` | `GoogleCloudPlatform/software-delivery-blueprint` | `4d29c4e3c67e76ad1c5edfdf1b607cf0419c6a8f` | 317 | 1 | 1 | 0 | 0 | complete |
| `GH-IBM-CLOUD-NATIVE-PATTERNS` | `IBM/cloud-native-patterns` | `e0b6292292623da1a812d1aa9c040776e7a0185a` | 40 | 3 | 3 | 0 | 0 | complete |
| `GH-ITATM-REFARCH` | `it-at-m/refarch` | `ad98664690b0bb60920432451e68390ac73d9610` | 295 | 254 | 250 | 4 | 0 | complete-review-required |
| `GH-JAVA-DESIGN-PATTERNS` | `iluwatar/java-design-patterns` | `b55fc2bcb5f8e1c4b884bca0a38d402d19fe467c` | 3627 | 2044 | 2042 | 2 | 0 | complete-review-required |
| `GH-JMOLECULES` | `xmolecules/jmolecules` | `20d2636beba2e3cb8f0a9b62c07e3606c49da84f` | 115 | 73 | 73 | 0 | 0 | complete |
| `GH-JQASSISTANT` | `jQAssistant/jqassistant` | `07912d0eb3d23720490357c8a05b28195377d8ff` | 2047 | 1598 | 1591 | 7 | 0 | complete-review-required |
| `GH-K8S-PATTERNS` | `k8spatterns/examples` | `cf7c93f70878d6067a52f12eee7fb397e8987736` | 219 | 135 | 135 | 0 | 0 | complete |
| `GH-LIKEC4` | `likec4/likec4` | `5152f62edf2b1af2f5f3dcfc515b88678a48af08` | 7305 | 6774 | 6773 | 1 | 0 | complete-review-required |
| `GH-MESHERY` | `meshery/meshery` | `dffea472483e8f34a998928f81f3e91d274eb3a5` | 68929 | 66531 | 66295 | 40 | 0 | complete-review-required |
| `GH-MICROSOFT-AGENT-SKILLS` | `MicrosoftDocs/agent-skills` | `e03d6ea0dab78954ca902bad9f6556cafe772515` | 619 | 2 | 2 | 0 | 0 | complete |
| `GH-MICROSOFT-ARCH-CENTER` | `MicrosoftDocs/architecture-center` | `caf11b78405e42dfe52f887c5188e18cab003da5` | 2217 | 294 | 293 | 1 | 0 | complete-review-required |
| `GH-OAM-SPEC` | `oam-dev/spec` | `a64696e70e24bd4d0ad26705c8338c51a19f5163` | 39 | 21 | 21 | 0 | 0 | complete |
| `GH-OTEL-DEMO` | `open-telemetry/opentelemetry-demo` | `ac6715420c9309835f9f0a720dc65ea4bd69f7d4` | 580 | 468 | 460 | 8 | 0 | complete-review-required |
| `GH-SAP-ARCH-CENTER` | `SAP/architecture-center` | `4635f734f2f82c6497bc53d5cf972b5cbfec5e52` | 795 | 469 | 449 | 1 | 0 | complete-review-required |
| `GH-SERVICE-MESH-PATTERNS` | `service-mesh-patterns/service-mesh-patterns` | `b7f2477177c2a04d931195cf29a33dcd094efc4e` | 210 | 53 | 53 | 0 | 0 | complete |
| `GH-SPRING-MODULITH` | `spring-projects/spring-modulith` | `c4f6d51365bdb7f943327392a9cd4e828a58af0f` | 950 | 235 | 235 | 0 | 0 | complete |
| `GH-STRUCTURIZR-JAVA` | `structurizr/java` | `5783db719d701978e3a833bd5596736e69545121` | 1045 | 590 | 589 | 1 | 0 | complete-review-required |
| `GH-SYSTEM-DESIGN-101` | `ByteByteGoHq/system-design-101` | `b28380a4710c5ec9638ec037d4168e288f334cba` | 424 | 1 | 1 | 0 | 0 | complete |
| `GH-SYSTEM-DESIGN-PRIMER` | `donnemartin/system-design-primer` | `ae9bbd7b02d90b9866215de185217d33f39ab733` | 139 | 65 | 65 | 0 | 0 | complete |

## Architecture preservation

Detected whole-architecture artefacts: 91358. Cross-file candidate groups: 5253. Original formats, immutable revisions, paths, parser requirements, licensing posture and security disposition remain attached to every artefact record. Complete cross-file membership is stored once in the group index; each artefact retains its group identity, related-file count and bounded relationship preview.

## Verification and known drift

All 47 manifests and 106,096 content-addressed objects were independently verified against a 186,219-file denominator. Backend and frontend clean installs and builds passed. Current rc.10.73.7, release-integrity, dependency, security and browser gates passed. The historical rc.10.73.5 gate remains nonzero only for its three obsolete package-version equality checks; its source-withdrawal and authority-isolation checks pass. See `KNOWLEDGE_MANIFEST_DRIFT_RECONCILIATION.md`.

## Authority boundary

Product-runtime Sol execution was not fabricated. The runtime channel remains unconfigured; representative bounded evidence is prepared for rc.10.73.8. No claim promotion, scoring activation, hard constraint, Design Graph mutation, licence approval or production acceptance occurred.

## Release-closure storage posture

The raw acquisition vault is 5,367,402,297 bytes and is excluded from Git, frontend/backend application payloads, container contexts and FULLDIST. Runtime acceptance observed zero recursive raw-vault scans for ordinary retrieval, candidate/approved isolation, lazy evidence-ID object access and focused local timings within the engineering targets recorded in `KNOWLEDGE_RUNTIME_PERFORMANCE_RESULTS.json`.

Independent vault backup was explicitly deferred by the product owner at 2026-07-15T18:51:52.811Z. `backupCompleted=false`, `backupStatus=deferred-by-product-owner`, and the accepted risk is loss or corruption of the local raw acquisition vault. This is not a passed gate; the FULLDIST archive cannot recover the vault. No storage compaction was performed. The superseded Apache Camel snapshot remains preserved and non-authoritative, eligible only for future backup-first compaction.
