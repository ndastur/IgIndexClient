#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config()
import * as IGClient from './ig-client.js';
import minimist from 'minimist';
import * as Slack from './slack-lib.js'

const API_KEY = process.env.IG_API_KEY || '';

let isVerbose = false;
let useDemo = false;
let useSlack = false;
let slackWebhook = '';
let urlEndpoint = '';
const IG_UN = process.env.IG_UN || '';
const IG_PW = Buffer.from(process.env.IG_PW || '', 'base64').toString('ascii');
var LOOP = 0;

function printHelp(scriptName) {
  console.log(`Usage .${scriptName} [options]`)
  console.log('Note ABLY_KEY environment variable needs to be set to an API key')
  console.log(' -h Help')
  console.log(' --demo Use the demo gateway')
  console.log(' -f --function [quote|sentiment|market|epic2id|watchlist2ids] The function to exec')
  console.log(' -i --instrument symbol, symbol CSV or watchlist ID')
  console.log('   Watchlists: "Weekend Markets", "Popular Markets", "Major Commodities", "Major FX", "Major Indices", "Major Shares", "Cryptocurrencies", "Digital 100s"');
  console.log(' -l x --loop=x repeat every x seconds');
  console.log(' --dblocal save to a local file based database');
  console.log(' -s send to slack');
  console.log(' --webhook Slack webhook URL')
  console.log(' -v --verbose')
}

async function sleep(seconds) {
  return new Promise((resolve) =>setTimeout(resolve, seconds * 1000));
}

function logVerbose(text) {
  if(isVerbose) console.log(text)
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

  isVerbose = args.v || args.verbose || false;

  urlEndpoint = `https://${(useDemo?'demo-':'')}api.ig.com/gateway/deal`;
  logVerbose(`Using URL endpoint: ${urlEndpoint}`);

  await IGClient.LoginAsync(IG_UN, IG_PW, API_KEY);

  const execFunction = args.function || args.f || '';
  const instrumentSymbol = args.instrument || args.i || '';

  useSlack = args.s || false;
  if(useSlack) {
    slackWebhook = args.webhook || process.env.SLACK_WEBHOOK || '';
    logVerbose(`Slack webhook set to: ${slackWebhook}`);
    if(!slackWebhook) {
      console.log('Set to send things to Slack but no webhook given in cmd line or ENV ...');
      useSlack = false;
    }
  }

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
            var data = await IGClient.GetSentiment(instrumentSymbol);
            console.log(`Client sentiment ${new Date().toISOString()}`);
            var slackField = '\`\`\`\n';
            data.clientSentiments.forEach(e => {
              var line = `${e.marketId.padStart(10)}:\t Long: ${e.longPositionPercentage.toString().padStart(3)}  Short: ${e.shortPositionPercentage.toString().padStart(3)}`;
              console.log(line);
              slackField += `${e.marketId.padStart(10)}: L:${e.longPositionPercentage.toString().padStart(3)} S:${e.shortPositionPercentage.toString().padStart(3)}\n`;
            });
            console.log('----------------------------------------------------------\n');
            slackField += '\`\`\`\n';

            if(useSlack) {
              Slack.setWebhookUrl(slackWebhook);
              await Slack.send(`Client sentiment ${new Date().toISOString()}`,
                Slack.makeFieldBlock('mrkdwn', slackField),
              );
            }

            if(args.dblocal) {
              //bdb.insertOne
              var ts = Date.now();

            }

            break;
        case 'epic2id':
          var data = await IGClient.GetMarketIdFromEpic(instrumentSymbol);
          break;
        case 'watchlist2ids':
          var data = await IGClient.GetMarketIdsFromWatchlist(instrumentSymbol);
          break;
        default:
          console.log('You must supply a function and instrument ...');
          printHelp(scriptName.substr(scriptName.lastIndexOf('/')));
        }
        if(LOOP > 0) {
          await sleep(LOOP);
        }
    } while(LOOP > 0)

    // Need to use exit, return doesn't seem to work
    process.exit();
})();
