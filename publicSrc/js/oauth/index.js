/* Doesn't return anything
   Bound to window object or 
   loaded as Jquery plugin */
require('retinajs');
require('bootstrapPopover');
require('hideshowpassword');

var ajaxSetup = require('../app/ajaxSetup');
var firstInputFocus = require('../app/firstInputFocus');
var inputPlaceholder = require('../app/inputPlaceholder');
var FileUpload = require('../app/classes/FileUpload');
var togglePasswordVisibility = require('../app/togglePasswordVisibility');
var learnMoreDialog = require('./learnMoreDialog');
var lightbox = require('./lightbox');
var authorize = require('./authorize');
var recaptcha = require('../app/recaptcha');
var isRegistered = require('./isRegistered');
var fieldUsedBy = require('../app/fieldUsedBy');

module.exports = {
    ajaxSetup: ajaxSetup,
    firstInputFocus: firstInputFocus,
    inputPlaceholder: inputPlaceholder,
    learnMoreDialog: learnMoreDialog,
    lightbox: lightbox,
    FileUpload: FileUpload,
    togglePasswordVisibility: togglePasswordVisibility,
    authorize: authorize,
    recaptcha: recaptcha,
    isRegistered: isRegistered,
    fieldUsedBy: fieldUsedBy
};