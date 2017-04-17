osa-imessage
====

![](https://img.shields.io/npm/dm/osa-imessage.svg)
![](https://img.shields.io/npm/v/osa-imessage.svg)
![](https://img.shields.io/npm/l/osa-imessage.svg)

> Send and receive iMessages through nodejs

Installation
===

**Requires OSX 10.10 Yosemite**

```bash
npm install osa-imessage
```

Usage
====

**Send a message**
```js
var imessage = require('osa-imessage')

imessage.send('+15555555555', 'Hello World!')
```

**Receive messages**
```js
var imessage = require('osa-imessage')

imessage.listen().on('message', (msg) => {
    console.log(`'${msg.text}' from ${msg.handle}`)
})
```

API
===

### Send a message

`send(handle, text) -> Promise`

Sends a message to the specified handle.

**handle**

Type: `string`

The user to send the message to, in the form of an email address or a
phone number in the format `+1555555555`.

**text**

Type: `string`

The content of the message to be sent.

**return**

Type: `Promise<>`

A promise that resolves when the message is sent, and rejects if the
message fails to send.

### Receive messages

`listen([interval]) -> EventEmitter`

Begins polling the local iMessage database for new messages.

**interval**

Type: `number`

The rate at which the database is polled for new messages. Defaults to the minimum of `1000 ms`.

**return**

Type: [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter)

An event emitter with that listeners can be attached to. Currently it only has the `message` event.

Example message event
```js
{
    text: 'Hello, world!',
    handle: '+15555555555',
    date: new Date('2017-04-11T02:02:13.000Z'),
    fromMe: false,
    guid: 'F79E08A5-4314-43B2-BB32-563A2BB76177'
}
```

### Get a handle for a given name

`handleForName(name) -> Promise<handle>`

**name**

Type: `string`

The full name of the desired contact, as displayed in `Messages.app`.

**return**

Type: `Promise<string>`

A promise that resolves with the `handle` of the contact, or rejects if nobody was found.
