require('dotenv').config()
const minimist = require('minimist'),
  axios = require('axios');

var WebhookUrl = '';
var Username = '';
var IconUrl = 'https://ui-avatars.com/api/?rounded=true&name=T&color=1111ff';

module.exports = {
    setWebhookUrl: (webhookUrl)  => {
      WebhookUrl = webhookUrl;
    },
    setUsername: (name)  => {
      Username = name;
    },
    setIconUrl: (url)  => {
      IconUrl = url;
    },

    makeTextBlock: (type, text) => {
        type = type || 'plain_text'; // other option is mrkdn
        return {
            type: "section",
            text: {
                type: type,
                text: text
            }
        }
    },

    makeFieldBlock: (type, ...texts) => {
        type = type || 'plain_text'; // other option is mrkdn
        var fields = [];
        texts.forEach((text) => fields.push(
            {
                "type": type,
                "text": text
            }
            ));

        return {
            type: "section",
            fields: fields
        }
    },

    send: async (message, ...blocks) => {
        const payload = {
            "text": message,
            username: Username,
            icon_url: IconUrl,
            "blocks": [...blocks]
        };

        try {
            await axios({
                method: "post",
                url: WebhookUrl,
                data: JSON.stringify(payload)
            });
        }
        catch(error) {
            console.log(error);
        }
    },
}