var fs = require('fs')
var osa = require('osa2')

// TODO: Check macOS version

// Instead of doing something reasonable, Apple stores dates as the number of
// seconds since 01-01-2001 00:00:00 GMT. DATE_OFFSET is the offset in seconds
// between their epoch and unix time
var DATE_OFFSET = 978307200

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
        throw new Error('sqlite3 optional dependency required to receive messages')
    }
}

// Gets the proper handle string for a contact with the given name
function handleForName(name) {
    return osa((name) => {
        var Messages = Application('Messages')
        return Messages.buddies.whose({ name: name })[0].handle()
    })(name)
} 

// Sends a message to the given handle
function send(handle, message) {
    return osa((handle, message) => {
        var Messages = Application('Messages')
        var buddy = Messages.buddies.whose({ handle: handle })[0]
        Messages.send(message, { to: buddy })
    })(handle, message)
}

var emitter = null
function listen() {
    // If listen has already been run, return the existing emitter
    if (emitter != null) {
        return emitter
    }

    // Create an EventEmitter
    var emitter = new (require('events').EventEmitter)()

    // Set up the database
    var sqlite = requireSqlite() 
    var db = new sqlite.Database(
        process.env.HOME + '/Library/Messages/chat.db',
        sqlite.OPEN_READONLY
    )

    var last = appleTimeNow()

    var intv = setInterval(() => {
        var query = `
            SELECT guid, id as handle, text, date, date_read, is_from_me
            FROM message
            JOIN handle ON message.handle_id = handle.ROWID
            WHERE date >= ${last}
        `

        db.each(query, (err, row) => {
            if (err) {
                clearInterval(intv)
                emitter.emit('error', err)
                console.error([
                    'sqlite3 returned an error while polling for new message!',
                    'bailing out of poll routine for safety. new messages will',
                    'not be detected'
                ].join('\n'))
            }

            emitter.emit('message', {
                guid: row.guid,
                text: row.text,
                handle: row.handle,
                fromMe: !!row.is_from_me,
                date: fromAppleTime(row.date),
                dateRead: fromAppleTime(row.date_read)
            })  
        })

        last = appleTimeNow()
    }, 1000)

    return emitter
}

module.exports = { send, listen, handleForName }
