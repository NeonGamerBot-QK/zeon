
const { Client } = require('ssh2');



module.exports = (config, command, logger) => {
return new Promise((res, rej) => {
  // console.log(config)
    const conn = new Client();
    conn.on('ready', () => {
     logger.info('Client :: ready');
      conn.shell((err, stream) => {
        if (err) rej(err);
        stream.on('close', () => {
         logger.info('Stream :: close');
         conn.end();
res();
        }).on('data', (data) => {
         logger.info('OUTPUT: ' + data);
        });
        stream.end(command+'\nexit\n');
      });
    }).connect(config);
})
}