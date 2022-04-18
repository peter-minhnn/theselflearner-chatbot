const express = require('express');
const app = express();
var http = require('http').createServer(app);
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = 5000;

var io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});

var STATIC_CHANNELS = [];

var allowlist = ['http://localhost:3000', 'https://localhost:3000', 'https://www.tselflearner.com'];
var corsOptionsDelegate = function (req, callback) {
    var corsOptions;
    if (allowlist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
    } else {
        corsOptions = { origin: false } // disable CORS for this request
    }
    callback(null, corsOptions) // callback expects two parameters: error and options
}

app.use(cors(corsOptionsDelegate));
// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})


http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

io.on('connection', (socket) => { // socket object may be used to send specific messages to the new connected client
    console.log('new client connected');
    socket.emit('connection', null);
    socket.on('channel-join', id => {
        console.log('channel join', id);
        STATIC_CHANNELS.forEach(c => {
            if (c.id === id) {
                if (c.sockets.indexOf(socket.id) == (-1)) {
                    c.sockets.push(socket.id);
                    c.participants++;
                    io.emit('channel', c);
                }
            } else {
                let index = c.sockets.indexOf(socket.id);
                if (index != (-1)) {
                    c.sockets.splice(index, 1);
                    c.participants--;
                    io.emit('channel', c);
                }
            }
        });

        return id;
    });

    socket.on('send-message', message => {
        STATIC_CHANNELS.forEach(c => {
            if (c.id === message.channel_id) {
                if (!c.messages) {
                    c.messages = [message];
                } else {
                    c.messages.push(message);
                }
            }
        });
        io.emit('message', message);
    });

    socket.on('create-user-channel', message => {
        let obj = {
            name: message.senderName,
            participants: 0,
            id: message.channel_id,
            sockets: []
        }
        let index = STATIC_CHANNELS.findIndex(x => x.id === obj.id);
        if (index === -1) STATIC_CHANNELS.push(obj);
        io.emit('user-channel', STATIC_CHANNELS);
    });

    socket.on('disconnect', () => {
        STATIC_CHANNELS.forEach(c => {
            let index = c.sockets.indexOf(socket.id);
            if (index != (-1)) {
                c.sockets.splice(index, 1);
                c.participants--;
                io.emit('channel', c);
            }
        });
    });

});



/**
 * @description This methos retirves the static channels
 */
app.get('/getChannels', (req, res) => {
    res.status(200).send({
        channels: STATIC_CHANNELS
    })
});