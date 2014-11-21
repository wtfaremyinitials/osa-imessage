var osa = require('osa');

var PHONE_REGEX = /'^\+\d{10}$'/;
var EMAIL_REGEX = /^\S+@\S+$/; // simple email regex

var noop = function(){};

var parse = function(input) {
    if(typeof(input) == 'undefined')
        return '';
    else if(typeof(input) == 'object')
        return input;
    else if(input.match(PHONE_REGEX) || input.match(EMAIL_REGEX))
        return { handle: input };
    else
        return { name: input };
    return '';
};

var iMessage = {};

iMessage.send = function(message, to, cb) {
    var recipient = parse(to);
    cb = cb || function(){};

    osa(function(message, recipient) {
        var Messages = Application('Messages');
        recipient = Messages.buddies.whose(recipient)[0];

        Messages.send(message, { to: recipient });

        return {
            name:   recipient.name(),
            handle: recipient.handle()
        };
    }, message, recipient, cb);
};

iMessage.getContact = function(input, cb) {
    var search = parse(input);
    cb = cb || function(){};

    osa(function(search) {
        var Messages = Application('Messages');
        found = Messages.buddies.whose(search)[0];

        return {
            name:   found.name(),
            handle: found.handle()
        };
    }, search, cb);
};

module.exports = iMessage;
