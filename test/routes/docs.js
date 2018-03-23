var path = require('path');
var changeCase = require('change-case');

var directories = require('../../utils/directories');

var testStaticPage = require('../../testUtils/tests/staticPage');

testStaticPage('/docs');

directories.loadDirSync(__dirname + '/../../views/docs', ['includes'], function (filePath) {
    // Doc's subfolders like api
    var filePathFolders = filePath.match(new RegExp('/views/docs/(.+)/.+\\.jade'));
    // Filename without ext
    var filename = path.basename(filePath, '.jade');
    
    var urlPath = '';

    if (filePathFolders) {
        urlPath = filePathFolders[1] + '/';
    }

    // Camel cased to dash separated string
    urlPath += changeCase.paramCase(filename);

    // Camel cased to dash separated string
    testStaticPage('/docs/' + urlPath);
});