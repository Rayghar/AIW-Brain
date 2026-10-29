// The roadmap (round 6, Contract S): plateaus, assignments and their readings. The rules are in public/roadmap-domain.js,
// because the browser loads only public/ (server.js serves it as the page root); this module re-exports them for the
// server and the suites, so there is one set of rules, not two.
export {PLATEAU_KINDS, PLATEAU_WORDS, ROADMAP_LIMITS, ROADMAP_COMMANDS, NO_PLATEAUS, PLATEAU_MARK_WORDS, roadmapOf, withRoadmap, plateausOf, plateauOf, roadmapObjects, applyRoadmapCommand, actionPlateau, asOf, plateauMarks, plateauSteps, registerRecordReadiness, recordReadinessRegistered, plateauReadiness, roadmapFindings, transitionSection, GROUP_BASES, MIGRATION_FIELDS, MIGRATION_LIMITS, groupPlacements, plateauGroups, migrationNeeds, migrationsOf} from '../public/roadmap-domain.js';
