![osa-imessage](https://raw.githubusercontent.com/wtfaremyinitials/osa-imessage/master/resources/logowithtext.png)

osa-imessage
====

![](https://img.shields.io/npm/dm/osa-imessage.svg)
![](https://img.shields.io/npm/v/osa-imessage.svg)
![](https://img.shields.io/npm/l/osa-imessage.svg)

> Send ~~and receive~~  iMessages through node

Installation
===

**Requires OSX 10.10 Yosemite.**

```bash
npm install osa-imessage
```

Usage
====

## Sending messages

**Send a message to a phone number:**
```js
var messages = require('osa-imessage');

messages.send('Hello World!', '+15555555555', callback);
```

**Send a message to a contact:**
```js
var messages = require('osa-imessage');

messages.send('Hello World!', 'Johnny Appleseed', callback);
```

**Send a message to an iCloud account:**
```js
var messages = require('osa-imessage');

messages.send('Hello World!', 'john@icloud.com', callback);
```

## Receiving messages

Apple broke the API I was using for this ¯\\_(ツ)_/¯
