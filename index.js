const fs = require('fs')
const osa = require('osa2')
const ol = require('one-liner')
const assert = require('assert')
const debug = require('debug')('osa-imessage')

const versions = require('./macos_versions')
const currentVersion = require('macos-version')()

const messagesDb = require('./lib/messages-db.js')

if (versions.broken.includes(currentVersion)) {
    debug(
        ol(`This version of macOS \(${currentVersion}) is known to be
            incompatible with osa-imessage. Please upgrade either
            macOS or osa-imessage.`)
    )
    process.exit(1)
}

if (!versions.working.includes(currentVersion)) {
    debug(
        ol(`This version of macOS \(${currentVersion}) is currently
            untested with this version of osa-imessage. Proceed with
            caution.`)
    )
}

// Instead of doing something reasonable, Apple stores dates as the number of
// seconds since 01-01-2001 00:00:00 GMT. DATE_OFFSET is the offset in seconds
// between their epoch and unix time
const DATE_OFFSET = 978307200

// Gets the current Apple-style timestamp
function appleTimeNow() {
    return Math.floor(Date.now() / 1000) - DATE_OFFSET
}

// Transforms an Apple-style timestamp to a proper unix timestamp
function fromAppleTime(ts) {
    if (ts == 0) {
        return null
    }

    // unpackTime returns 0 if the timestamp wasn't packed
    if (unpackTime(ts) != 0) {
        ts = unpackTime(ts)
    }

    return new Date((ts + DATE_OFFSET) * 1000)
}

// Since macOS 10.13 High Sierra, some timestamps appear to have extra data
// packed. Dividing by 10^9 seems to get an Apple-style timestamp back.
function unpackTime(ts) {
    return Math.floor(ts / Math.pow(10, 9))
}

// Gets the proper handle string for a contact with the given name
function handleForName(name) {
    assert(typeof name == 'string', 'name must be a string')
    return osa(name => {
        const Messages = Application('Messages')
        return Messages.buddies.whose({ name: name })[0].handle()
    })(name)
}

// Sends a message to the given handle
function send(handle, message) {
    assert(typeof handle == 'string', 'handle must be a string')
    assert(typeof message == 'string', 'message must be a string')
    return osa((handle, message) => {
        const Messages = Application('Messages')

        let target

        try {
            target = Messages.buddies.whose({ handle: handle })[0]
        } catch (e) {}

        try {
            target = Messages.textChats.byId('iMessage;+;' + handle)()
        } catch (e) {}

        try {
            Messages.send(message, { to: target })
        } catch (e) {
            throw new Error(`no thread with handle '${handle}'`)
        }
    })(handle, message)
}

let emitter = null
let emittedMsgs = []
function listen() {
    // If listen has already been run, return the existing emitter
    if (emitter != null) {
        return emitter
    }

    // Create an EventEmitter
    emitter = new (require('events')).EventEmitter()

    let last = appleTimeNow()
    let bail = false

    async function check() {
        const query = `
            SELECT
                guid,
                id as handle,
                text,
                date,
                date_read,
                is_from_me,
                cache_roomnames
            FROM message
            LEFT OUTER JOIN handle ON message.handle_id = handle.ROWID
            WHERE date >= ${last - 5}
        `
        last = appleTimeNow()

        try {
            const db = await messagesDb.open()
            const messages = await db.all(query)
            messages.forEach(msg => {
                if (emittedMsgs[msg.guid]) return
                emittedMsgs[msg.guid] = true
                emitter.emit('message', {
                    guid: msg.guid,
                    text: msg.text,
                    handle: msg.handle,
                    group: msg.cache_roomnames,
                    fromMe: !!msg.is_from_me,
                    date: fromAppleTime(msg.date),
                    dateRead: fromAppleTime(msg.date_read),
                })
            })
            setTimeout(check, 1000)
        } catch (error) {
            bail = true
            emitter.emit('error', err)
            debug.error(
                ol(`sqlite returned an error while polling for new messages!
                    bailing out of poll routine for safety. new messages will
                    not be detected`)
            )
        }
    }

    if (bail) return
    check()

    return emitter
}

async function getRecentChats(limit = 10) {
    const db = await messagesDb.open()

    const query = `
        SELECT
            guid as id,
            chat_identifier as recipientId,
            service_name as serviceName,
            room_name as roomName,
            display_name as displayName
        FROM chat
        JOIN chat_handle_join ON chat_handle_join.chat_id = chat.ROWID
        JOIN handle ON handle.ROWID = chat_handle_join.handle_id
        ORDER BY handle.rowid DESC
        LIMIT ${limit};
    `

    const chats = await db.all(query)
    return chats
}

module.exports = { send, listen, handleForName, getRecentChats }
