const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


// No admin authentication middleware for school project purposes
// The user has requested to remove the admin middleware for demonstration purposes.

router.get('/', adminController.dashboard); // Handle /admin route

// All routes below this middleware will require admin authentication

// Doctor Management
router.get('/doctors', adminController.listDoctors);
router.get('/doctors/add', adminController.addDoctorForm);
router.post('/doctors', adminController.addDoctor);
router.get('/doctors/edit/:id', adminController.editDoctorForm);
router.post('/doctors/edit/:id', adminController.editDoctor);
router.post('/doctors/delete/:id', adminController.deleteDoctor);

// Home Service Management
router.get('/homeservices', adminController.listHomeServices);
router.post('/homeservices/update-status/:id', adminController.updateHomeServiceStatus);

// Appointment Management
router.get('/appointments', adminController.listAppointments);
router.post('/appointments/delete/:id', adminController.deleteAppointment);

// Donation Request Management
router.get('/requests', adminController.listRequests);
router.get('/requests/add', adminController.addRequestForm);
router.post('/requests', adminController.addRequest);
router.get('/requests/edit/:id', adminController.editRequestForm);
router.post('/requests/edit/:id', adminController.editRequest);
router.post('/requests/delete/:id', adminController.deleteRequest);

// Donor Management
router.get('/donors', adminController.listDonors);
router.get('/donors/add', adminController.addDonorForm);
router.post('/donors', adminController.addDonor);
router.get('/donors/edit/:id', adminController.editDonorForm);
router.post('/donors/edit/:id', adminController.editDonor);
router.post('/donors/delete/:id', adminController.deleteDonor);

module.exports = router;
