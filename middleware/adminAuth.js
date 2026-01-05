const { auth } = require('express-openid-connect');


module.exports = (req, res, next) => {
    // This check ensures that a regular user is logged in via Auth0 before attempting admin access.
    if (!req.oidc || !req.oidc.isAuthenticated()) {
        console.log("No regular user session (Auth0) found. Redirecting to user login.");
        // This '/login' path will likely trigger Auth0's login process.
        return res.redirect('/login');
    }

    // If an admin session already exists, grant access
    if (req.session.isAdmin) {
        console.log("Admin session found. Granting access.");
        return next();
    }

    // If a POST request is made to /admin/login, attempt to authenticate the admin password
    if (req.method === 'POST' && req.path === '/admin/login') {
        const hardcodedPassword = "imadmin";
        const enteredPassword = req.body.password;

        if (enteredPassword === hardcodedPassword) {
            req.session.isAdmin = true; // Set the admin flag in the session
            console.log("Admin password correct. Setting admin session and redirecting to dashboard.");
            return res.redirect('/admin/dashboard'); // Redirect to the admin dashboard
        } else {
            console.log("Incorrect admin password entered.");
            // Store a flash message for displaying errors on the login page
            // Assuming 'connect-flash' is set up for 'req.flash'
            req.flash('error', 'Incorrect admin password.');
            return res.redirect('/admin'); // Redirect back to the admin login page
        }
    }

    // For any GET request to '/admin' or other admin paths without an active admin session,
    // show the admin login form.
    // This also handles the initial access to '/admin'.
    if (req.path === '/admin' || req.path === '/admin/') {
        console.log("Admin session not found for GET request. Rendering admin login page.");
        return res.render('admin/login', {
            error: req.flash('error')
        }); // Render the admin login view
    }

    // If none of the above conditions are met, it means an unauthorized attempt to access
    // a protected admin route without having gone through the admin login process.
    console.log("Unauthorized access attempt to admin panel. Redirecting to admin login.");
    req.flash('error', 'Unauthorized access to admin panel.');
    res.redirect('/admin');
};
