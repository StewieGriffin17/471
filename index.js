const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { connectPrimaryDB, getPrimaryDB, connectSecondaryDB } = require('./config/database');
const { ObjectId } = require('mongodb');

const session = require('express-session');
const flash = require('connect-flash'); // Add this line

const { auth } = require('express-openid-connect');
require('dotenv').config()

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASEURL,
  clientID: process.env.CLIENTID,
  issuerBaseURL: process.env.ISSUER,
};

const app = express();
const port = process.env.PORT;

// For parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}));

// Connect flash middleware
app.use(flash()); // Add this line

// Serve static files
app.use(express.static('public'));
app.use('/react-app', express.static('public/react-app'));
app.use('/vue-app', express.static('public/vue-app'));


// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('layout', 'layout');

// IMPORTANT: Auth middleware MUST be here, before your routes
app.use(auth(config));

// Middleware to make session and oidc available to all templates

app.use((req, res, next) => {

    res.locals.session = req.session;

    res.locals.oidc = req.oidc;
    res.locals.error = req.flash('error'); // Make flash error messages available in templates

    next();

});



// Middleware to check if user is authenticated

function isAuthenticated(req, res, next) {

    if (req.oidc && req.oidc.isAuthenticated()) {

        return next();

    }

    res.redirect('/login');

}



// Routes

const aorboRoutes = require('./routes/aorbo');

app.use('/api/aorbo', isAuthenticated, aorboRoutes);



const niazamiRoutes = require('./routes/niazami');



app.use('/api/niazami', niazamiRoutes);















const adminRoutes = require('./routes/admin');







// Middleware to explicitly bypass Auth0 for admin routes as per user's request







app.use('/admin', (req, res, next) => {







    // If the user is already authenticated via Auth0 (normal user), let it pass







    // Otherwise, this bypasses any Auth0 auth/redirect for admin routes.







    // This is a school project and security is not a concern as per user.







    next();







});







app.use('/admin', adminRoutes);









app.get('/', (req, res) => {

  res.oidc.login({

    returnTo: '/home',

    authorizationParams: {

      redirect_uri: `${process.env.BASEURL}/callback`,

    },

  });

});



app.get('/react-app', (req, res) => {

    res.sendFile(__dirname + '/public/react-app/doctor.html');

});



app.get('/vue-app', (req, res) => {

    res.sendFile(__dirname + '/public/vue-app/index.html');

});



app.get('/home', isAuthenticated, (req, res) => {

    res.render('home', { title: 'Home' });

});



app.get('/requests/post', isAuthenticated, (req, res) => {

  res.render('requests/post', { title: 'Post a Request' });

});



app.get('/donors/register', isAuthenticated, (req, res) => {

  res.render('donors/register', { title: 'Become a Donor' });

});



app.get('/requests', isAuthenticated, async (req, res) => {

  const db = getPrimaryDB();

  const requests = await db.collection('requests').find().toArray();

  res.render('requests/list', { title: 'All Requests', requests });

});



app.post('/requests', isAuthenticated, async (req, res) => {

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

  res.redirect('/requests');

});



app.get('/donors', isAuthenticated, async (req, res) => {

  const db = getPrimaryDB();

  const donors = await db.collection('donors').find().toArray();

  res.render('donors/list', { title: 'All Donors', donors });

});



app.post('/donors', isAuthenticated, async (req, res) => {

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

  res.redirect('/donors');

});



app.get('/view-requests', isAuthenticated, (req, res) => {

  res.redirect('/requests');

});



app.get('/view-donors', isAuthenticated, (req, res) => {

  res.redirect('/donors');

});



// Start server after DB connection

Promise.all([connectPrimaryDB(), connectSecondaryDB()]).then(() => {

    app.listen(port, () => {

        console.log(`Server running on http://localhost:${port}`);

    });

});
