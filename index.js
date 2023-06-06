const fs = require('fs');
const Parser = require('rss-parser');
const { exec } = require('child_process');
require('dotenv').config();
const fetch = require("node-fetch");

const webhook = process.env.WEBHOOK_URL

const ACCOUNTS = fs.readFileSync("accounts.txt").toString().split("\n")

const checkInterval = 5 * 61 * 1000; // 5 minutes and 5 seconds
const sentIdsMap = new Map();

const sendLinkToDiscord = async (link, username) => {
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      body: JSON.stringify({
        "content": `${link} - ${username}`,
        "embeds": null,
        "attachments": []
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to send link to Discord.');
    }
    await new Promise(resolve => setTimeout(resolve, 3000)); // 1-second delay before sending the next link
  } catch (error) {
    console.error(error);
  }
};

const extractLastNumber = (link) => {
  const parts = link.split('/');
  const lastPart = parts[parts.length - 1];
  const number = parseInt(lastPart);
  return isNaN(number) ? null : number;
};

const parseRSS = (stdout) => {
  const parser = new Parser();
  return parser.parseString(stdout);
};

const executeCommand = async (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

const processAccount = async (account) => {
    console.log(`${account} is checking...`)
  try {
    const command = `./nitter-rss-linux-amd64 ${account}`;
    const stdout = await executeCommand(command);
    const parsedRSS = await parseRSS(stdout);

    if (!parsedRSS.items || parsedRSS.items.length === 0) {
      return; // No new items, exit early
    }

    const usernameFile = `username_${account}.txt`;
    let lastId = null;

    if (fs.existsSync(usernameFile)) {
      const fileContent = fs.readFileSync(usernameFile, 'utf8');
      lastId = parseInt(fileContent);
    }

    for (const item of parsedRSS.items) {
      const id = extractLastNumber(item.link);
      if (id && id > lastId) {
        if (!sentIdsMap.has(account)) {
          sentIdsMap.set(account, new Set());
        }
        const sentIds = sentIdsMap.get(account);
        if (!sentIds.has(id)) {
          sendLinkToDiscord(item.link, account);
          sentIds.add(id);
          lastId = id;
        }
      }
    }

    fs.writeFileSync(usernameFile, lastId.toString());
  }catch (error) {
    console.error(error);
  }
};

const main = async () => {
  for (const account of ACCOUNTS) {
    await processAccount(account);
  }
};

const startChecking = () => {
  setInterval(() => {
    main();
  }, checkInterval);
};

main(); // Initial execution
startChecking(); // Start checking periodically
