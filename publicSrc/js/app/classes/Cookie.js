module.exports = Cookie;

function Cookie (name) {
    this.name = name;
}

Cookie.create = function (name, value, expiresIn) {
    var date = new Date();
    var expires = '';
    // Domain without subdomains
    var domain = '.' + window.location
                             .hostname
                             .split('.')
                             .slice(-2)
                             .join('.');
    
    // Expires in days
    date.setTime(date.getTime() + (expiresIn * 24 * 60 * 60 * 1000)); 
    
    expires = date.toGMTString(); 

    document.cookie = name + '=' + value 
                    + ';expires=' + expires 
                    + ';domain=' + domain 
                    + ';path=/'; 
};

Cookie.prototype.value = function () {
    var nameEQ = this.name + '=';
    var ca = document.cookie.split(';');
    
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }

    return undefined;
};