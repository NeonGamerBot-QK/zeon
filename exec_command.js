
const { Client } = require('ssh2');



module.exports = (config, command) => {
return new Promise((res, rej) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log('Client :: ready');
      conn.shell((err, stream) => {
        if (err) rej(err);
        stream.on('close', () => {
        //   console.log('Stream :: close');
          conn.end();
        }).on('data', (data) => {
            res(data)
        //   console.log('OUTPUT: ' + data);
        });
        stream.end(command+'\nexit\n');
      });
    }).connect(config);
})
}