var mongoose = require('mongoose');

module.exports = function (csrfToken) {
    return {
        // Use unique value in order to distinguish 
        // between authorized clients on user profil page
        client_name: mongoose.Types.ObjectId().toString(),
        client_description: 'Bar is awesome', 
        // Upload hash. (Sha-1)
        file_url: '909f0c9b6de433b23a81fe89fac55fa7510bd83d',
        client_website: 'http://bar.com',
        client_facebook_username: 'bar_fb',
        client_twitter_username: 'bar_twi',
        client_instagram_username: 'bar_insta',
        authorize_test_accounts: 'true',
        _csrf: csrfToken
    };
};