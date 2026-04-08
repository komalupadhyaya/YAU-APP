const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/orgController");

// Organization CRUD routes
router.post('/', organizationController.createOrganization);
router.get('/', organizationController.getAllOrganizations);
router.get('/:id', organizationController.getOrganizationById);
router.put('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

// Sports management routes
router.post('/:id/sports', organizationController.addSport);
router.put('/:id/sports/:sportName', organizationController.updateSport);
router.delete('/:id/sports/:sportName', organizationController.removeSport);

// Division management routes
router.post('/:id/sports/:sportName/divisions', organizationController.addDivision);
router.delete('/:id/sports/:sportName/divisions/:division', organizationController.removeDivision);

// ==================== BULK DELETE ROUTES (USE WITH CAUTION) ====================
router.delete('/bulk/all-organizations', organizationController.deleteAllOrganizations);
router.delete('/bulk/all-age-groups', organizationController.deleteAllAgeGroups);
router.delete('/bulk/all-data', organizationController.deleteAllData);


module.exports = router;

module.exports = router;
