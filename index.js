var fs = require('fs');
var osa = require('osa');
var uuid = require('node-uuid').v1();
var spawn = require('child_process').spawn;
var mkfifo = require('mkfifo').mkfifoSync;
var execSync = require('exec-sync');

var EventEmitter = require("events").EventEmitter;

var PHONE_REGEX = /'^\+\d{10}$'/;
var EMAIL_REGEX = /^\S+@\S+$/; // simple email regex

var user = execSync('whoami');

var SCRIPT_PATH = '/Users/' + user + '/Library/Application Scripts/com.apple.iChat/osa-imessage-' + uuid + '.scpt';
var FIFO_PATH   = '/tmp/osa-imessage-' + uuid + '.fifo';

var listenScript = fs.readFileSync('./lib/events.scpt');

var len = 108-72;
for(var i=0; i<len; i++)
    listenScript[68+i] = uuid.charCodeAt(i);

var newMessages = new EventEmitter();

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

var startFIFORead = function() {
    var proc = spawn('tail', ['-f', FIFO_PATH]);

    proc.stdout.on('data', function(data) {
        data = JSON.parse(data+'');
        newMessages.emit('received', data);
    });
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

iMessage.listen = function() {
    mkfifo(FIFO_PATH, 0755);

    var fd = fs.openSync(SCRIPT_PATH, 'w');
    fs.writeSync(fd, listenScript, 0, listenScript.length);
    fs.closeSync(fd);
    // register with Messages.app

    startFIFORead();

    return newMessages;
};

iMessage.unlisten = function() {
    // unregister with Messages.app
    fs.unlinkSync(FIFO_PATH);
    fs.unlinkSync(SCRIPT_PATH);
};

module.exports = iMessage;
