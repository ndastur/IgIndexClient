import * as IGClient from '../../../ig-client/ig-client'
import * as Slack from '../../../ig-client/slack-lib'

export default async (req) => {
    const { next_run } = await req.json();
    console.log("Received event! Next invocation at:", next_run)

    await SentimentFetch();
}

async function SentimentFetch() {
    await IGClient.LoginAsync(process.env.IG_UN,
        IGClient.base64ToPlainPassword( process.env.IG_PW ),
        process.env.IG_API_KEY);

    const symbols = 'US500,USTECH,WALL,FT100,DE30,CL,FR40,SI,NG,GC,GBPJPY,GBPUSD';

    var data = await IGClient.GetSentiment(symbols);

    // console.log(`Client sentiment ${new Date().toISOString()}`);
    
    var slackField = '\`\`\`\n';
    data.clientSentiments.forEach(e => {
      var line = `${e.marketId.padStart(10)}:\t Long: ${e.longPositionPercentage.toString().padStart(3)}  Short: ${e.shortPositionPercentage.toString().padStart(3)}`;
      console.log(line);
      slackField += `${e.marketId.padStart(10)}: L:${e.longPositionPercentage.toString().padStart(3)} S:${e.shortPositionPercentage.toString().padStart(3)}\n`;
    });
    console.log('----------------------------------------------------------\n');
    slackField += '\`\`\`\n';

    Slack.setWebhookUrl(process.env.SLACK_WEBHOOK);
    await Slack.send(`Client sentiment ${new Date().toISOString()}`,
    Slack.makeFieldBlock('mrkdwn', slackField),
    );
}