"use strict";

let config 	= require("../config");
let logger 	= require("../core/logger");

let C 			= require("../core/constants");
let tokgen 		= require("../libs/tokgen");

let crypto 		= require("crypto");
let async 		= require("async");
let passport 	= require("passport");
let express 	= require("express");

let response 	= require("../core/response");
let mailer 		= require("../libs/mailer");

let User 		= require("../models/user");
let Guest 	= require("../models/guest");

/**
 * Check what social API are configured. We only show
 * this social buttons on login # signup pages
 */
function checkAvailableSocialAuth() {
	// set social options
	let social = {};

	if (config.authKeys) {
		if (config.authKeys.google && config.authKeys.google.clientID)
			social.google = true;

		if (config.authKeys.facebook && config.authKeys.facebook.clientID)
			social.facebook = true;

		if (config.authKeys.github && config.authKeys.github.clientID)
			social.github = true;

		if (config.authKeys.twitter && config.authKeys.twitter.clientID)
			social.twitter = true;
	}

	if (Object.keys(social).length > 0)
		return social;

	return null;
}

function guestList() {
	
	console.log('function finished');
}

module.exports = function(app, db) {

	// Login page
	app.get("/login", function(req, res) {
		if (req.user != null) {
			return res.redirect("/");
		}

		res.render("account/login", {
			socialAuth: checkAvailableSocialAuth()
		});
	});

	// Logout
	app.get("/logout", function(req, res) {
		req.logout();
		req.session.destroy();
		res.redirect("/");
	});

	app.post("/signup", function(req, res){
		console.log(req.body);
		let guest = new Guest({
			"guestName": req.body.guestName,
			"numOfGuest":req.body.numberTaggingAlong
		});
		guest.save(function(err, guest){
			if(err){
				res.render("/signup");
			} else {
				res.render("mail/passwordLessLogin");

			}
		});
	});

	app.get("/signup", function(req, res) {
		if (config.features.disableSignUp === true)
			return res.redirect("/login");

		res.render("account/signup", {
			socialAuth: checkAvailableSocialAuth()
		});

	});	

	app.get("/guestList", function(req, res){
		Guest.find({}, function(err, guests){
			var totalGuest = 0;
			for(var i = 0; i < guests.length; i++){
				totalGuest += guests[i].numOfGuest;
			}
			console.log(totalGuest);
			res.render("account/guestList", {
				data: guests,
				total: totalGuest
			});
		});
	});

	// User registration
	// app.post("/signup", function(req, res) {
	// 	if (config.features.disableSignUp === true)
	// 		return res.redirect("/");

	// 	req.assert("name", req.t("NameCannotBeEmpty")).notEmpty();
	// 	req.assert("email", req.t("EmailCannotBeEmpty")).notEmpty();
	// 	req.assert("email", req.t("EmailIsNotValid")).isEmail();
	// 	req.sanitize("email").normalizeEmail({ remove_dots: false });

	// 	//req.assert("username", req.t("UsernameCannotBeEmpty")).notEmpty();
		
	// 	if (!req.body.username)
	// 		req.body.username = req.body.email;

	// 	req.sanitize("passwordless").toBoolean();
	// 	let passwordless = req.body.passwordless === true;
	// 	if (!passwordless) {
	// 		req.assert("password", req.t("PasswordCannotBeEmpty")).notEmpty();
	// 		req.assert("password", req.t("PasswordTooShort")).len(6);
	// 	}

	// 	let errors = req.validationErrors();

	// 	if (errors) {
	// 		req.flash("error", errors);
	// 		return res.redirect("/signup");
	// 	}

	// 	async.waterfall([

	// 		function generateVerificationToken(done) {
	// 			if (config.features.verificationRequired) {
	// 				crypto.randomBytes(25, function(err, buf) {
	// 					done(err, err ? null : buf.toString("hex"));
	// 				});
	// 			} else {
	// 				done(null, null);
	// 			}
	// 		},

	// 		function passwordlessToken(token, done) {
	// 			if (passwordless) {
	// 				crypto.randomBytes(25, function(err, buf) {
	// 					done(err, token, err ? null : buf.toString("hex"));
	// 				});
	// 			}
	// 			else
	// 				done(null, token, req.body.password);
	// 		},

	// 		function createUser(token, password, done) {

	// 			let user = new User({
	// 				fullName: req.body.name,
	// 				email: req.body.email,
	// 				username: req.body.username,
	// 				password: password,
	// 				passwordLess: passwordless,
	// 				roles: [C.ROLE_USER],
	// 				provider: "local"
	// 			});

	// 			if (token) {
	// 				user.verified = false;
	// 				user.verifyToken = token;
	// 			} else {
	// 				user.verified = true;
	// 			}

	// 			user.save(function(err, user) {
	// 				if (err && err.code === 11000) {
	// 					let field = err.message.split(".$")[1];
	// 					field = field.split(" dup key")[0];
	// 					field = field.substring(0, field.lastIndexOf("_"));						
	// 					if (field == "email")
	// 						req.flash("error", { msg: req.t("EmailIsExists") });
	// 					else 
	// 						req.flash("error", { msg: req.t("UsernameIsExists") });
	// 				}
	// 				done(err, user);
	// 			});
	// 		},

	// 		function sendEmail(user, done) {
	// 			if (user.verified) {
	// 				// Send welcome email
	// 				let subject = req.t("mailSubjectWelcome", config);

	// 				res.render("mail/welcome", {
	// 					name: user.fullName
	// 				}, function(err, html) {
	// 					if (err)
	// 						return done(err);

	// 					mailer.send(user.email, subject, html, function(err, info) {
	// 						//if (err)
	// 						//	req.flash("error", { msg: "Unable to send email to " + user.email});

	// 						done(null, user);
	// 					});
	// 				});	

	// 			} else {
	// 				// Send verification email
	// 				let subject = req.t("mailSubjectActivate", config);

	// 				res.render("mail/accountVerify", {
	// 					name: user.fullName,
	// 					validateLink: "http://" + req.headers.host + "/verify/" + user.verifyToken
	// 				}, function(err, html) {
	// 					if (err)
	// 						return done(err);

	// 					mailer.send(user.email, subject, html, function(err, info) {
	// 						if (err)
	// 							req.flash("error", { msg: req.t("UnableToSendEmail", user) });
	// 						else
	// 							req.flash("info", { msg: req.t("emailSentVerifyLink")});


	// 						done(err, user);
	// 					});
	// 				});					
	// 			}
	// 		}

	// 	], function(err, user) {
	// 		if (err) {
	// 			logger.error(err);
	// 			return res.redirect("back");
	// 		}

	// 		if (user.verified) {
	// 			req.login(user, function(err) {
	// 				if (err)
	// 					logger.error(err);

	// 				return res.redirect("/");
	// 			});
	// 		}
	// 		else
	// 			res.redirect("/login");
	// 	});
	// });


	// Verify account
	app.get("/verify/:token", function(req, res) {
		if (req.isAuthenticated())
			return res.redirect("/");
		
		async.waterfall([

			function checkToken(done) {
				User			
					.findOne({ verifyToken: req.params.token })
					.exec( (err, user) => {
						if (err) 
							return done(err);

						if (!user) {
							req.flash("error", { msg: req.t("AccountVerificationExpired") });
							return done("Verification is invalid!");
						}

						user.verified = true;
						user.verifyToken = undefined;
						user.lastLogin = Date.now();

						user.save(function(err) {
							if (err) {
								req.flash("error", { msg: req.t("UnableModifyAccountDetails") });
								return done(err);
							}

							done(null, user);
						});
					});			
			},

			function sendWelcomeEmailToUser(user, done) {
				let subject = req.t("mailSubjectWelcome", config);

				res.render("mail/welcome", {
					name: user.fullName
				}, function(err, html) {
					if (err)
						return done(err);

					mailer.send(user.email, subject, html, function(err, info) {
						//if (err)
						//	req.flash("error", { msg: "Unable to send email to " + user.email});

						done(null, user);
					});
				});	
			},

			function loginUser(user, done) {
				req.login(user, function(err) {
					done(err, user);
				});				
			}

		], function(err) {
			if (err) {
				logger.error(err);
				return res.redirect("/signup");
			}

			res.redirect("/");
		});
	});	

	// Passwordless login
	app.get("/passwordless/:token", function(req, res) {
		if (req.isAuthenticated())
			return res.redirect("/");
		
		async.waterfall([

			function checkToken(done) {
				User			
					.findOne({ passwordLessToken: req.params.token })
					.exec( (err, user) => {
						if (err) 
							return done(err);

						if (!user) {
							req.flash("error", { msg: req.t("PasswordlessTokenExpired") });
							return done("Token is invalid!");
						}

						user.passwordLessToken = undefined;
						if (!user.verified) {
							user.verified = true;
							user.verifyToken = undefined;
						}
						user.lastLogin = Date.now();

						user.save(function(err) {
							if (err) {
								req.flash("error", { msg: req.t("UnableModifyAccountDetails") });
								return done(err);
							}

							done(null, user);
						});
					});			
			},

			function loginUser(user, done) {
				req.login(user, function(err) {
					done(err, user);
				});				
			}

		], function(err) {
			if (err) {
				logger.error(err);
				return res.redirect("/login");
			}

			res.redirect("/");
		});
	});	

	// Forgot password
	app.get("/forgot", function(req, res) {
		if (req.isAuthenticated())
			return res.redirect("/");
		
		res.render("account/forgot");
	});	

	// Forgot password
	app.post("/forgot", function(req, res) {
		req.assert("email", req.t("EmailIsNotValid")).isEmail();
		req.assert("email", req.t("EmailCannotBeEmpty")).notEmpty();
		req.sanitize("email").normalizeEmail({ remove_dots: false });
		
		let errors = req.validationErrors();
		if (errors) {
			req.flash("error", errors);
			return res.redirect("back");
		}	

		async.waterfall([

			function generateToken(done) {
				crypto.randomBytes(25, function(err, buf) {
					done(err, err ? null : buf.toString("hex"));
				});
			},

			function getUserAndSaveToken(token, done) {
				User.findOne({ email: req.body.email }, function(err, user) {
					if (!user) {
						req.flash("error", { msg: req.t("EmailNotAssociatedToAccount", req.body) });
						return done(`Email address ${req.body.email} is not registered!`);
					}

					// Check that the user is not disabled or deleted
					if (user.status !== 1) {
						req.flash("error", { msg: req.t("UserDisabledOrDeleted")});
						return done(req.t("UserDisabledOrDeleted"));
					}

					user.resetPasswordToken = token;
					user.resetPasswordExpires = Date.now() + 3600000; // expire in 1 hour
					user.save(function(err) {
						done(err, token, user);
					});					
				});
			},

			function sendResetEmailToUser(token, user, done) {
				let subject = req.t("mailSubjectResetPassword", config);

				res.render("mail/passwordReset", {
					name: user.fullName,
					resetLink: "http://" + req.headers.host + "/reset/" + token
				}, function(err, html) {
					if (err)
						return done(err);
					
					mailer.send(user.email, subject, html, function(err, info) {
						if (err)
							req.flash("error", { msg: req.t("UnableToSendEmail", user) });
						else
							req.flash("info", { msg: req.t("emailSentPasswordResetLink", user) });

						done(err);
					});
				});
			}

		], function(err) {
			if (err)
				logger.error(err);

			res.redirect("back");
		});
	});	



	// Reset password
	app.get("/reset/:token", function(req, res, next) {
		if (req.isAuthenticated())
			return res.redirect("/");
		
		User
			.findOne({ resetPasswordToken: req.params.token })
			.where("resetPasswordExpires").gt(Date.now())
			.exec((err, user) => {
				if (err) 
					return next(err);

				if (!user) {
					req.flash("error", { msg: req.t("PasswordResetTokenExpired") });
					return res.redirect("/forgot");
				}

				res.render("account/reset");
			});
	});

	// Reset password
	app.post("/reset/:token", function(req, res, next) {
		req.assert("password", req.t("PasswordTooShort")).len(6);
		req.assert("confirm", req.t("PasswordNotMatched")).equals(req.body.password);

		const errors = req.validationErrors();
		if (errors) {
			req.flash("error", errors);
			return res.redirect("back");
		}

		async.waterfall([

			function checkTokenAndExpires(done) {
				User			
					.findOne({ resetPasswordToken: req.params.token })
					.where("resetPasswordExpires").gt(Date.now())
					.exec( (err, user) => {
						if (err) 
							return done(err);

						if (!user) {
							req.flash("error", { msg: req.t("PasswordResetTokenExpired") });
							return done("Password reset token is invalid or has expired.");
						}

						// Clear passwordless flag, if the user change password
						if (user.passwordLess)
							user.passwordLess = false;

						user.password = req.body.password;
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;
						user.lastLogin = Date.now();

						user.save(function(err) {
							if (err) 
								return done(err);
							
							req.login(user, function(err) {
								done(err, user);
							});
						});
					});			
			},

			function sendPasswordChangeEmailToUser(user, done) {
				let subject = req.t("mailSubjectPasswordChanged", config);

				res.render("mail/passwordChange", {
					name: user.fullName
				}, function(err, html) {
					if (err)
						return done(err);

					mailer.send(user.email, subject, html, function(err, info) {
						if (err)
							req.flash("error", { msg: req.t("UnableToSendEmail", user) });
						else
							req.flash("info", { msg: req.t("PasswordChanged")});

						done(err);
					});
				});
			}

		], function(err) {
			if (err) {
				logger.error(err);
				return res.redirect("back");
			}

			res.redirect("/");
		});
	});

	// Generate API key
	app.get("/generateAPIKey", function(req, res) {
		if (!req.isAuthenticated())
			return response.json(res, null, response.UNAUTHORIZED);
		
		User
			.findById(req.user.id)
			.exec((err, user) => {
				if (err) 
					return response.json(res, null, response.SERVER_ERROR);

				if (!user) {
					return response.json(res, null, response.NOT_FOUND, req.t("InvalidUser"));
				}

				user.apiKey = tokgen();

				user.save((err) => {
					if (err) 
						return response.json(res, null, response.SERVER_ERROR);

					return response.json(res, user);
				});

			});
	});	

	// Unlink social account
	app.get("/unlink/:provider", function(req, res) {
		if (!req.isAuthenticated())
			return response.json(res, null, response.UNAUTHORIZED);

		if (!req.params.provider || ["facebook", "twitter", "google", "github"].indexOf(req.params.provider) === -1)
			return response.json(res, null, response.BAD_REQUEST, req.t("InvalidOAuthProvider"));

		User
			.findById(req.user.id)
			.exec((err, user) => {
				if (err) 
					return response.json(res, null, response.SERVER_ERROR);

				if (!user) {
					return response.json(res, null, response.NOT_FOUND, req.t("InvalidUser"));
				}

				user.socialLinks[req.params.provider] = undefined;

				user.save((err) => {
					if (err) 
						return response.json(res, null, response.SERVER_ERROR);

					return response.json(res, user);
				});

			});		
	});		
};
