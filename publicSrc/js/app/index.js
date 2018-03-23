/* Doesn't return anything
   Bound to window object or loaded as Jquery plugin */
require('bootstrapCollapse');
require('bootstrapTooltip');
require('bootstrapPopover');
require('bootstrapAlert');
require('jquery.mmenu');
require('retinajs');
require('hideshowpassword');
//require('highcharts');

/* Custom modules */
var ajaxSetup = require('./ajaxSetup');
var alertSetup = require('./alertSetup');
var cookieBanner = require('./cookieBanner');
var header = require('./header');
var footer = require('./footer');
var inputPlaceholder = require('./inputPlaceholder');
var firstInputFocus = require('./firstInputFocus');
var FileUpload = require('./classes/FileUpload');
var fieldUsedBy = require('./fieldUsedBy');
var clientAuthorizations = require('./clientAuthorizations');
var sweetAlertLoader = require('./sweetalertLoader');
var togglePasswordVisibility = require('./togglePasswordVisibility');
var authorizedClientsSocialTipsy = require('./authorizedClientsSocialTipsy');
var authorizedClientsEntitiesTypeCat = require('./authorizedClientsEntitiesTypeCat');
var recaptcha = require('./recaptcha');
var clientStats = require('./clientStatistics');

module.exports = {
    ajaxSetup: ajaxSetup,
    alertSetup: alertSetup,
    sweetAlertLoader: sweetAlertLoader,
    cookieBanner: cookieBanner,
    header: header,
    footer: footer,
    inputPlaceholder: inputPlaceholder,
    firstInputFocus: firstInputFocus,
    FileUpload: FileUpload,
    fieldUsedBy: fieldUsedBy,
    clientAuthorizations: clientAuthorizations,
    togglePasswordVisibility: togglePasswordVisibility,
    authorizedClientsSocialTipsy: authorizedClientsSocialTipsy,
    authorizedClientsEntitiesTypeCat: authorizedClientsEntitiesTypeCat,
    recaptcha: recaptcha,
    clientStats: clientStats
};