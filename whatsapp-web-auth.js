const fs = require('fs');
const { Client, Location } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: true, 
//Install latest version of google chrome and set path to binary here
//if chromium that comes with puppeteer does not work.
//               executablePath: '/usr/bin/chromium-browser',
//               args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            }, session: sessionCfg });

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
            process.exit(1);
        } else {
            process.exit(0);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    process.exit(1);
});
