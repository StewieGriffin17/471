exports.dashboard = (req, res) => {
    res.render('admin/dashboard', { title: 'Admin Dashboard', layout: 'admin/layout' });
};

// Doctor Management
exports.listDoctors = async (req, res) => {
    const doctors = await Doctor.find();
    res.render('admin/doctors', { title: 'Doctors', doctors, layout: 'admin/layout' });
};

exports.addDoctorForm = (req, res) => {
    res.render('admin/add_doctor', { title: 'Add Doctor', layout: 'admin/layout' });
};

exports.addDoctor = async (req, res) => {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.redirect('/admin/doctors');
};

exports.editDoctorForm = async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    res.render('admin/edit_doctor', { title: 'Edit Doctor', doctor, layout: 'admin/layout' });
};

exports.editDoctor = async (req, res) => {
    // Convert availableDays from comma-separated string to array
    if (req.body.availableDays && typeof req.body.availableDays === 'string') {
        req.body.availableDays = req.body.availableDays.split(',').map(day => day.trim());
    }
    await Doctor.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/admin/doctors');
};

exports.deleteDoctor = async (req, res) => {
    await Doctor.findByIdAndDelete(req.params.id);
    res.redirect('/admin/doctors');
};

// Home Service Management
exports.listHomeServices = async (req, res) => {
    const homeServices = await HomeServiceRequest.find();
    res.render('admin/homeservices', { title: 'Home Services', homeServices, layout: 'admin/layout' });
};

exports.updateHomeServiceStatus = async (req, res) => {
    await HomeServiceRequest.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect('/admin/homeservice');
};

// Appointment Management
exports.listAppointments = async (req, res) => {
    const appointments = await Appointment.find().populate('doctorId');
    res.render('admin/appointments', { title: 'Appointments', appointments, layout: 'admin/layout' });
};

exports.deleteAppointment = async (req, res) => {
    await Appointment.findByIdAndDelete(req.params.id);
    res.redirect('/admin/appointments');
};

// Donation Request Management
exports.listRequests = async (req, res) => {
    const db = getPrimaryDB();
    const requests = await db.collection('requests').find().toArray();
    res.render('admin/requests', { title: 'Donation Requests', requests, layout: 'admin/layout' });
};

exports.addRequestForm = (req, res) => {
    res.render('admin/add_request', { title: 'Add Donation Request', layout: 'admin/layout' });
};

exports.addRequest = async (req, res) => {
    const db = getPrimaryDB();
    const request = {
        patientName: req.body.patientName,
        type: req.body.type,
        specific: req.body.specific,
        urgency: req.body.urgency,
        requiredDate: req.body.requiredDate,
        details: req.body.details,
        contactPerson: req.body.contactPerson,
        contactPhone: req.body.contactPhone,
        location: req.body.location,
        postedDate: new Date()
    };
    await db.collection('requests').insertOne(request);
    res.redirect('/admin/requests');
};

exports.editRequestForm = async (req, res) => {
    const db = getPrimaryDB();
    const request = await db.collection('requests').findOne({ _id: new ObjectId(req.params.id) });
    res.render('admin/edit_request', { title: 'Edit Donation Request', request, layout: 'admin/layout' });
};

exports.editRequest = async (req, res) => {
    const db = getPrimaryDB();
    const request = {
        patientName: req.body.patientName,
        type: req.body.type,
        specific: req.body.specific,
        urgency: req.body.urgency,
        requiredDate: req.body.requiredDate,
        details: req.body.details,
        contactPerson: req.body.contactPerson,
        contactPhone: req.body.contactPhone,
        location: req.body.location,
    };
    await db.collection('requests').updateOne({ _id: new ObjectId(req.params.id) }, { $set: request });
    res.redirect('/admin/requests');
};

exports.deleteRequest = async (req, res) => {
    const db = getPrimaryDB();
    await db.collection('requests').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/admin/requests');
};

// Donor Management
exports.listDonors = async (req, res) => {
    const db = getPrimaryDB();
    const donors = await db.collection('donors').find().toArray();
    res.render('admin/donors', { title: 'Donors', donors, layout: 'admin/layout' });
};

exports.addDonorForm = (req, res) => {
    res.render('admin/add_donor', { title: 'Add Donor', layout: 'admin/layout' });
};

exports.addDonor = async (req, res) => {
    const db = getPrimaryDB();
    const donor = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        dob: req.body.dob,
        bloodGroup: req.body.bloodGroup,
        donationType: req.body.donationType,
        organType: req.body.organType,
        location: req.body.location,
        availability: req.body.availability,
        medicalInfo: req.body.medicalInfo,
        registeredDate: new Date()
    };
    await db.collection('donors').insertOne(donor);
    res.redirect('/admin/donors');
};

exports.editDonorForm = async (req, res) => {
    const db = getPrimaryDB();
    const donor = await db.collection('donors').findOne({ _id: new ObjectId(req.params.id) });
    res.render('admin/edit_donor', { title: 'Edit Donor', donor, layout: 'admin/layout' });
};

exports.editDonor = async (req, res) => {
    const db = getPrimaryDB();
    const donor = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        dob: req.body.dob,
        bloodGroup: req.body.bloodGroup,
        donationType: req.body.donationType,
        organType: req.body.organType,
        location: req.body.location,
        availability: req.body.availability,
        medicalInfo: req.body.medicalInfo,
    };
    await db.collection('donors').updateOne({ _id: new ObjectId(req.params.id) }, { $set: donor });
    res.redirect('/admin/donors');
};

exports.deleteDonor = async (req, res) => {
    const db = getPrimaryDB();
    await db.collection('donors').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/admin/donors');
};