const fs = require('fs')
const osa = require('osa2')
const ol = require('one-liner')
const assert = require('assert')

const versions = require('./macos_versions')
const currentVersion = require('macos-version')()

if (versions.broken.includes(currentVersion)) {
    console.error(
        ol(`This version of macOS \(${currentVersion}) is known to be
         incompatible with osa-imessage. Please upgrade either
         macOS or osa-imessage.`)
    )
    process.exit(1)
}

if (!versions.working.includes(currentVersion)) {
    console.warn(
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
function fromAppleTime(at) {
    if (at == 0) {
        return null
    }
    return new Date((at + DATE_OFFSET) * 1000)
}

// Attempt to require in optional dep sqlite with a more helpful error message
function requireSqlite() {
    try {
        return require('sqlite3')
    } catch (e) {
        throw new Error(
            'sqlite3 optional dependency required to receive messages'
        )
    }
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
let guids = []
function listen() {
    // If listen has already been run, return the existing emitter
    if (emitter != null) {
        return emitter
    }

    // Create an EventEmitter
    emitter = new (require('events').EventEmitter)()

    // Set up the database
    const sqlite = requireSqlite()
    const db = new sqlite.Database(
        process.env.HOME + '/Library/Messages/chat.db',
        sqlite.OPEN_READONLY
    )

    let last = appleTimeNow()
    let bail = false

    function check() {
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

        db.each(
            query,
            (err, row) => {
                if (err) {
                    bail = true
                    emitter.emit('error', err)
                    console.error(
                        ol(`sqlite3 returned an error while polling for new message!
                    bailing out of poll routine for safety. new messages will
                    not be detected`)
                    )
                }

                if (guids.indexOf(row.guid) != -1) {
                    return
                } else {
                    guids.push(row.guid)
                }

                emitter.emit('message', {
                    guid: row.guid,
                    text: row.text,
                    handle: row.handle,
                    group: row.cache_roomnames,
                    fromMe: !!row.is_from_me,
                    date: fromAppleTime(row.date),
                    dateRead: fromAppleTime(row.date_read),
                })
            },
            () => {
                if (bail) return
                setTimeout(check, 1000)
            }
        )
    }

    check()

    return emitter
}

module.exports = { send, listen, handleForName }
