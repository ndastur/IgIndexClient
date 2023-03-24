#!/usr/bin/env node

require('dotenv').config()
const minimist = require('minimist'),
  axios = require('axios'),
  slack = require('./slack-lib');

const API_KEY = process.env.API_KEY || '';

let useDemo = false;
let useSlack = false;
let urlEndpoint = '';
const IG_UN = process.env.IG_UN || '';
const IG_PW = Buffer.from(process.env.IG_PW || '', 'base64').toString('ascii');
let LoginTokens = {};
var LOOP = 0;

// Setup keystroke events
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else {
    if(key.name === 'q') {
      LOOP = 0;
      process.exit();
    }
    if(key.name === 'up') {
      LOOP++;
      console.info(`LOOP now set to: ${LOOP} seconds.`);
      return;
    }
    if(key.name === 'down') {
      LOOP--;
      console.info(`LOOP now set to: ${LOOP} seconds.`);
      return;
    }
    console.log(`You pressed the "${str}" key`);
    console.log();
    console.log(key);
    console.log();
  }
});

// Login to platform
async function Login(username, password, api_key) {
  try {
    const loginData = {
      "identifier": IG_UN,
      "password": IG_PW,
      "encryptedPassword": null
    };
    //console.log(loginData);

    var res = await axios.post(urlEndpoint + '/session', loginData, {
      headers: {
        "X-IG-API-KEY": API_KEY
      }
    });

    var json = await res.data;
    //console.log(json);
    console.info(`Logged into: ${json.currentAccountId}`);

    //console.log(res.headers);
    var tokens = {
      cst: res.headers.cst,
      "x-security-token": res.headers['x-security-token']
    };

    return tokens;
  }
  catch(e) {
    console.error(e);
  }
}

async function GetIGRest(path, query) {
  try {
    const headers = {
      "X-IG-API-KEY": API_KEY,
      "cst": LoginTokens.cst,
      "x-security-token": LoginTokens['x-security-token']
    };

    var res = await axios.get(urlEndpoint + `/${path}/` + query, {
      headers
    });

    var json = await res.data;
    //console.log(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }

}

async function GetSentiment(symbol) {
  try {
    var symbolQuery = (symbol.includes(',')) ? '?marketIds=' + encodeURIComponent(symbol) : symbol;
    var json = await GetIGRest('clientsentiment', symbolQuery);
    //console.log(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }
}

// Get Market Detail from EPIC code
// e.g IX.D.FTSE.DAILY.IP
async function GetMarketDetailEpic(epic) {
  try {
    var symbolQuery = (symbol.includes(',')) ? '?epics=' + encodeURIComponent(epic) : epic;
    var json = await GetIGRest('markets', symbolQuery);
    //console.log(json);
    return json;
  }
  catch(e) {
    console.error(e);
  }
}

async function GetMarketIdFromEpic(epic) {
  try {
    var symbolQuery = (epic.includes(',')) ? '?epics=' + encodeURIComponent(epic) : epic;
    var json = await GetIGRest('markets', symbolQuery);
    if (epic.includes(',')) {
      var marketIds = json.marketDetails.map(function (element) {
        return {
          name: element.instrument.name,
          epic: element.instrument.epic,
          marketId: element.instrument.marketId
        }
      });
      console.log(marketIds);
      return marketIds;
    }
    else {
      var d = {
        name: element.instrument.name,
        epic: element.instrument.epic,
        marketId: element.instrument.marketId
      }
      console.log(d);
      return d;
    }
  }
  catch(e) {
    console.error(e);
  }
}

async function GetMarketIdsFromWatchlist(watchlistId) {
  try {
    var watchlistJson = await GetIGRest('watchlists', watchlistId);
    var epics = watchlistJson.markets.map(function(e){
      return e.epic;
    });
    console.log(epics.join(','));

    var marketIds = await GetMarketIdFromEpic(epics.join(','));
    console.log(marketIds);
  }
  catch(e) {
    console.error(e);
  }
}

function printHelp(scriptName) {
  console.log(`Usage .${scriptName} [options]`)
  console.log('Note ABLY_KEY environment variable needs to be set to an API key')
  console.log(' -h Help')
  console.log(' --demo Use the demo gateway')
  console.log(' -f --function [quote|sentiment|market|epic2id|watchlist2ids] The function to exec')
  console.log(' -i --instrument symbol, symbol CSV or watchlist ID')
  console.log(' -l x --loop=x repeat every x seconds');
  console.log(' -s send to slack');
  console.log(' --webhook Slack webhook URL')
  console.log(' --verbose')
}

async function sleep(seconds) {
  return new Promise((resolve) =>setTimeout(resolve, seconds * 1000));
}

// ASYNC MAIN
( async () => {
  const scriptName = process.argv[0];
  let args = minimist(process.argv.slice(2), {
      alias: {
          h: 'help',
      }
  });
  //console.log(args);

  if(args.help) {
      printHelp(__filename);
      return;
  }

  urlEndpoint = `https://${(useDemo?'demo-':'')}api.ig.com/gateway/deal`;
  console.log(`Using URL endpoint: ${urlEndpoint}`);

  LoginTokens = await Login();

  const execFunction = args.function || args.f || '';
  const instrumentSymbol = args.instrument || args.i || '';

  useSlack = args.s || false;

  if(execFunction === '' || instrumentSymbol === '') {
    console.log('You must specify at least a function and an instrument')
    return;
  }

  LOOP = args.loop || args.l || -1;
  do {
    switch(execFunction) {
        case 'quote':
            break;
        case 'sentiment':
            var data = await GetSentiment(instrumentSymbol);
            console.log(`Client sentiment ${new Date().toISOString()}`);
            var slackField = '\`\`\`\n';
            data.clientSentiments.forEach(e => {
              var line = `${e.marketId.padStart(10)}:\t Long:\t${e.longPositionPercentage} \t Short:\t${e.shortPositionPercentage}`;
              console.log(line);
              slackField += `${e.marketId.padStart(10)}: L: ${e.longPositionPercentage.toString().padStart(3)} S:${e.shortPositionPercentage.toString().padStart(3)}\n`;
            });
            console.log('----------------------------------------------------------\n');
            slackField += '\`\`\`\n';

            if(useSlack) {
              slack.setWebhookUrl(args.webhook);
              await slack.send(`Client sentiment ${new Date().toISOString()}`,
                slack.makeFieldBlock('mrkdwn', slackField),
              );
            }

            break;
        case 'epic2id':
          var data = await GetMarketIdFromEpic(instrumentSymbol);
          break;
        case 'watchlist2ids':
          var data = await GetMarketIdsFromWatchlist(instrumentSymbol);
          break;
        default:
          console.log('You must supply a function and instrument ...');
          printHelp(scriptName.substr(scriptName.lastIndexOf('/')));
        }
        if(LOOP > 0) {
          await sleep(LOOP);
        }
        else {
          console.log(`loop was ${LOOP}`);
        }
    } while(LOOP > 0)

    console.info('While exited ...');
    //return;
    process.exit();
})();
