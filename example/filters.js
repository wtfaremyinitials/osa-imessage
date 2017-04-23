var imessage = require('..')

var ee = imessage.listen()

ee.on('!me', (msg) => {
    console.log(`Message not from me: ${msg.text}`)
})

ee.on('+15555555555', (msg) => {
    console.log(`Message in thread with +15555555555: ${msg.text}`)
})

ee.on('+15555555555!me', (msg) => {
    console.log(`Message from +15555555555: ${msg.text}`)
})
