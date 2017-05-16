const imessage = require('..')

imessage.listen().on('message', (msg) => {
    if (!msg.fromMe) {
        imessage.send(msg.handle, msg.text)
    }
})
