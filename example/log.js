var imessage = require('..')

imessage.listen().on('message', (msg) => {
    console.log(msg)
})
