var fs = require('fs');
var path = require('path');

var changeCase = require('change-case');

var directories = require('../utils/directories');

module.exports = function (app, express) {
    // Load each files in the docs directory
    directories.loadDirSync(__dirname + '/../views/docs', ['includes'], function (filePath) {
        // Doc's subfolders like api
        var filePathFolders = filePath.match(new RegExp('/views/docs/(.+)/.+\\.jade'));
        // Filename without ext
        var filename = path.basename(filePath, '.jade');
        
        var urlPath = '';
        var viewPath = '';

        var route = function (filePath, views) {
            return function (req, res) {
                res.render('docs/' + viewPath, {
                    updatedAt: fs.statSync(filePath).mtime
                });
            };
        };

        if (filePathFolders) {
            urlPath = viewPath = filePathFolders[1] + '/';
        }

        // Camel cased to dash separated string
        urlPath += changeCase.paramCase(filename);
        viewPath += filename;

        app.get('/docs/' + urlPath, route(filePath, viewPath));

        if (urlPath === 'flow') {
            app.get('/docs', route(filePath, viewPath));
        }
    });
};