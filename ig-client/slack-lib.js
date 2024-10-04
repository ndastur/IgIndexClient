import axios from 'axios';

var WebhookUrl = '';
var Username = '';
var IconUrl = 'https://ui-avatars.com/api/?rounded=true&name=T&color=1111ff';

export const setWebhookUrl = (webhookUrl)  => {
    WebhookUrl = webhookUrl;
};

export const setUsername = (name)  => {
    Username = name;
}

export const setIconUrl = (url)  => {
    IconUrl = url;
};

export const makeTextBlock = (type, text) => {
    type = type || 'plain_text'; // other option is mrkdn
    return {
        type: "section",
        text: {
            type: type,
            text: text
        }
    }
};

export const makeFieldBlock = (type, ...texts) => {
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
};

export const send = async (message, ...blocks) => {
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
};
