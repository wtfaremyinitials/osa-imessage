const {send, sendFile} = require('./index');

// send('+15109175552', 'Hullo Wurld');

sendFile('+15109175552', '/Users/elliotaplant/Desktop/Nicole.mov')
  .catch(console.error);
