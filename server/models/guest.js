"use strict";

let config    		= require("../config");
let logger    		= require("../core/logger");
let C 				= require("../core/constants");
let fs 				= require("fs");
let path 			= require("path");

let _ 				= require("lodash");
let crypto 			= require("crypto");
let bcrypt 			= require("bcrypt-nodejs");

let db	    		= require("../core/mongo");
let mongoose 		= require("mongoose");
let Schema 			= mongoose.Schema;
let hashids 		= require("../libs/hashids")("users");
let autoIncrement 	= require("mongoose-auto-increment");

let schemaOptions = {
	timestamps: true,
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	}
};

let validateLocalStrategyProperty = function(property) {
	return (this.provider !== "local" && !this.updated) || property.length;
};

let validateLocalStrategyPassword = function(password) {
	return this.provider !== "local" || (password && password.length >= 6);
};

let guestSchema = new Schema({
	guestName: {
		type: String,
		trim: true,
		"default": "dipen",
	},
    numOfGuest: {
        type: String,
        trim: true,
        "default": "jhanvi"
    }

}, schemaOptions);

/**
 * Virtual `code` field instead of _id
 */
guestSchema.virtual("code").get(function() {
	return this.encodeID();
});

/**
 * Auto increment for `_id`
 */
guestSchema.plugin(autoIncrement.plugin, {
	model: "guest",
	startAt: 1
});

/**
 * Password hashing
 */
guestSchema.pre("save", function(next) {
	let guest = this;
	if (!guest.isModified("password")) 
		return next();
	
	bcrypt.genSalt(10, function(err, salt) {
		bcrypt.hash(user.password, salt, null, function(err, hash) {
			guest.password = hash;
			next();
		});
	});
});

/**
 * Password compare
 */
guestSchema.methods.comparePassword = function(password, cb) {
	bcrypt.compare(password, this.password, function(err, isMatch) {
		cb(err, isMatch);
	});
};

/**
 * Virtual field for `avatar`.
 */
guestSchema.virtual("avatar").get(function() {
	// Load picture from profile
	if (this.profile && this.profile.picture)
		return this.profile.picture;

	// Generate a gravatar picture
	if (!this.email)
		return "https://gravatar.com/avatar/?s=64&d=wavatar";
	
	let md5 = crypto.createHash("md5").update(this.email).digest("hex");
	return "https://gravatar.com/avatar/" + md5 + "?s=64&d=wavatar";
});

/**
 * Encode `_id` to `code`
 */
guestSchema.methods.encodeID = function() {
	return hashids.encodeHex(this._id);
};

/**
 * Decode `code` to `_id`
 */
guestSchema.methods.decodeID = function(code) {
	return hashids.decodeHex(code);
};

/**
 * Pick is only some fields of object 
 * 
 * http://mongoosejs.com/docs/api.html#document_Document-toObject
 *
UserSchema.methods.pick = function(props, model) {
	return _.pick(model || this.toJSON(), props || [
		"code",
		"fullName",
		"email",
		"username",
		"roles",
		"lastLogin",
		"avatar"
	]);	
};

UserSchema.method('toJSON', function() {
    var user = this.toObject();
    delete user.salt;
    delete user.hash;
    delete user.__v;
    return user;
  });
*/

/*
UserSchema.methods.gravatar = function (size, defaults) {
	if (!size)
		size = 200;

	if (!defaults)
		defaults = 'wavatar';

	if (!this.email)
		return `https://gravatar.com/avatar/?s=${size}&d=${defaults}`;

	let md5 = crypto.createHash('md5').update(this.email).digest("hex");
	return `https://gravatar.com/avatar/${md5}?s=${size}&d=${defaults}`;
};*/

let Guest = mongoose.model("guest", guestSchema);

module.exports = Guest;
