/* Doesn't return anything
   Bound to window object or loaded as Jquery plugin */
require('retinajs');
require('bootstrapPopover');

var ajaxSetup = require('../app/ajaxSetup');
var FileUpload = require('../app/classes/FileUpload');
var fieldUsedBy = require('../app/fieldUsedBy');

module.exports = {
    ajaxSetup: ajaxSetup,
    FileUpload: FileUpload,
    fieldUsedBy: fieldUsedBy
};