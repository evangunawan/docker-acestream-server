const fs = require('fs').promises;
const axios = require('axios').default;
const inquirer = require('inquirer');
const crypto = require('crypto');
const express = require('express');
const { networkInterfaces } = require('os');

const SERVER_PORT = 6878;
const EXTERNAL_SERVE_PORT = 8025;

async function _fetchNetworkInterfaces() {
  const nets = networkInterfaces();
  const results = Object.create({}); // Or just '{}', an empty object

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  return results;
}

async function _checkServerConnection() {
  try {
    const request = (
      await axios.get(
        `http://127.0.0.1:${SERVER_PORT}/webui/api/service?method=get_version`
      )
    ).data;

    if (!request.result) {
      return null;
    }
    return request['result'];
  } catch (err) {
    // console.log('ERR: ' + err);
    throw new Error(err);
  }
}

async function _getStreamURL(streamPid) {
  try {
    const streamSid = crypto.createHash('sha1').update(streamPid).digest('hex');
    const streamRequest = (
      await axios.get(
        `http://127.0.0.1:${SERVER_PORT}/ace/getstream?format=json&sid=${streamSid}&id=${streamPid}`
      )
    ).data;
    console.log(streamRequest);
    const aceResponse = streamRequest.response;
    return aceResponse;
  } catch (err) {
    throw new Error(err);
  }
}

async function _createPlaylistFile(serveIP, playbackURL) {
  // const urlLastId = playbackURL.split('/')[playbackURL.split('/').length - 1];
  const urlChildren = playbackURL.split(`127.0.0.1:${SERVER_PORT}/`)[1];
  const remoteURL = `http://${serveIP}:${SERVER_PORT}/${urlChildren}`;
  await fs.writeFile(
    __dirname + '/static/playlist.m3u8',
    `#EXTM3U
#EXTINF:0,acestream
#EXTVLCOPT:network-caching=1000
${remoteURL}
`,
    'utf-8'
  );
}

async function _createProgressBroadcaster(statsUrl, interval) {
  setInterval(async () => {
    const data = (await axios.get(statsUrl)).data?.response;
    if (data) {
      console.log(
        `[Stats] status: ${data.status} | Peers ${data.peers} | Up: ${data.speed_up} | Down: ${data.speed_down}`
      );
    }
  }, interval || 2000);
}

async function _createPlaylistServer() {
  const app = express(); // better instead
  app.use(express.static('static'));

  app.listen(EXTERNAL_SERVE_PORT, () =>
    console.log(`Server listening on port: ${EXTERNAL_SERVE_PORT}`)
  );
}

async function main() {
  try {
    const connected = await _checkServerConnection();
    console.log(`Server connected with version ${connected.version}`);

    const networkInterfaces = await _fetchNetworkInterfaces();
    const defaultNetworkIP =
      networkInterfaces[Object.keys(networkInterfaces)[0]][0];

    const promptResult = await inquirer.prompt([
      { name: 'stream_id_manual', message: 'Input Ace Stream ID: ' },
      {
        name: 'broadcast_ip',
        message: 'Input Broadcast IP: ',
        default: defaultNetworkIP,
      },
    ]);
    const streamId = promptResult['stream_id_manual'];

    // Get the stream playback URL
    console.log('Getting stream playback URL...');
    const streamDetails = await _getStreamURL(streamId);
    const { stat_url, playback_url, command_url } = streamDetails;

    await _createPlaylistFile(promptResult['broadcast_ip'], playback_url);

    await _createPlaylistServer();
    _createProgressBroadcaster(stat_url);
  } catch (err) {
    console.log(err);
  }
}

main();
