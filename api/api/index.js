const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const vision = require('@google-cloud/vision');

const app = express();

// LINE Botのアクセストークンとシークレットを設定
const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET',
};

const client = new Client(config);
const visionClient = new vision.ImageAnnotatorClient();

app.post('/api/line-webhook', middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'image') {
    const messageId = event.message.id;
    const messageContent = await client.getMessageContent(messageId);
    
    const chunks = [];
    for await (const chunk of messageContent) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const [result] = await visionClient.textDetection(buffer);
    const detections = result.textAnnotations;
    const items = detections.map(text => text.description);
    
    const replyText = items.length ? `読み取ったアイテム:\n${items.join('\n')}` : 'アイテムを認識できませんでした。';
    
    return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
  } else {
    return client.replyMessage(event.replyToken, { type: 'text', text: '画像を送信してください。' });
  }
}

module.exports = app;
