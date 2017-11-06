const sqlite = require('sqlite')
const dbPath = `${process.env.HOME}/Library/Messages/chat.db`
const OPEN_READONLY = 1

let db
async function open() {
    if (db) return db
    db = await sqlite.open(dbPath, { mode: OPEN_READONLY })
    return db
}

let isClosing;
function cleanUp() {
    if (db && db.driver.open && !isClosing) {
        isClosing = true
        db.close()
    }
}
process.on('exit', cleanUp)
process.on('uncaughtException', cleanUp)

module.exports = {
    open,
}
