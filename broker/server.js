/*
 * 'displays' are monitors or chromecast devices
 * 'screens' are things that might be cast to a display
 */

// See these functions? They're hard-coding a bunch of fixed lists. That's
// not a feature. Rather they are meant to wrap calls to the chromecast API via
// the 'server' component which knows about all the displays it can see and
// can do some introspection.

// A list of possible screens to send and their named labels
var config = require("./config.js");

var screens_get_screens = function() {
    return config.screens;
};

// What screen is currently being shown on a given display?

var display_get_screen = function(display) {
    return "foo";
};

// The list of available displays
var displays_get_displays = function() {
    return ['mauipinwale'];
};

var displays_get_details = function(callback) {

    var details = {};

    details['screens'] = screens_get_screens();
    details['displays'] = displays_get_displays();
    details['showing'] = {};

    for (var i in details['displays']) {
        var display = details['displays'][i];
        var screen = display_get_screen(display);

        details['showing'][display] = screen;
    }

    if (callback) {
        callback(details);
    }
};

// Okay. The actual socket.io broker daemon thingy.
var io = require('socket.io').listen(9999);
io.sockets.on('connection', function (socket) {

    // What it says on the tin. Not sure if there's a way to do this
    // from the client libraries or what... (20131101/straup)

    socket.on('relay', function (data) {
        ctx = 'relay';

        if (data['context']) {
            ctx = data['context'];
            delete data['context'];
        }

        broadcast(ctx, data);
    });

    // displays

    socket.on('displays', function (data) {
        var action = data['action'];

        if (action == 'get_details'){
            var callback = function(displays) {
                socket.emit('displays', { 'action': 'send_details', 'displays': displays });
            };

            var displays = displays_get_details(callback);
        } else if (action == 'send_message') {

            var display = data['display'];
            var msg = data['message'];
            var msg_id = data['message_id'];

            var callback = function(display) {
                broadcast('sender', {'action': 'message', 'message': msg, 'message_id': msg_id, 'receiver': display});
                broadcast('displays', {'action': 'sent_message', 'display': display, 'message_id': msg_id});
            };

            callback(display);
        } else if (action == 'send_screen') {
            var screens = screens_get_screens();

            var msg_id = data['message_id'];
            var display = data['display'];
            var screen = data['screen'];

            var url = screens[screen];

            console.log("SEND SCREEN " + screen + " WITH URL " + url + " TO " + display);

            var callback = function(display) {

                broadcast('sender', {'action': 'url', 'message': url, 'message_id': msg_id, 'receiver': display});
                broadcast('displays', {'action': 'sent_screen', 'display': display, 'message_id': msg_id});
            };

            callback(display);
        } else {
            console.log("Unexpected action: " + data['action']);
        }
    });

    // screens

    socket.on('screens', function (data) {
        var action = data['action'];

        if (action == 'get_list') {
            socket.emit('screens', {'action': 'send_list', 'screens': [] });
        }
    });

    // http://stackoverflow.com/questions/7352164/update-all-clients-using-socket-io

    var broadcast = function(ctx, details) {
        // io.sockets.emit(ctx, details);
        socket.broadcast.emit(ctx, details);
    };
});
