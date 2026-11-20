// The server's registration of the design package of applied mechanisms (rc44, wp2 slice S1; the lead's ruling J12 of
// 2026-11-19), the line of design-packages.js. The package registers itself where it is stated
// (public/adoption-package.js, which the browser's lazy entry imports too); the server adds the read upgrade to that
// same object here, before worker.js checks the packages when it starts, so that the upgrade (design §e.3) and the
// built-in skeletons it reads are in no client bundle: the browser upgrades no document. Whichever of the two modules
// a process imports first, the registered package is one object, and on the server it has its upgrade step.
import {ADOPTION_PACKAGE} from './public/adoption-package.js';
import {upgradeAdoptions} from './public/adoption-upgrade.js';
Object.assign(ADOPTION_PACKAGE,{
 upgrade:upgradeAdoptions,
 upgradeNote:'Guided designs that were applied are now kept as adoption records, each applied and not yet accepted by a second person.'
});
