import puppeteer from 'puppeteer';
import { GoogleSpreadsheet } from "google-spreadsheet"
import fs from 'fs';
import path from 'path';
import argsparser from "args-parser";

const args = argsparser(process.argv);



const delay = (time) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

const parse = async (user) => {
  const baseUrl = "http://karta.ksttrade.kz";
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
  });
  const page = await browser.newPage();


  await page.goto(baseUrl);

  // <Login
  await page.waitForSelector('input[name=Username]');
  await page.focus('input[name=Username]')
  await page.keyboard.type(user.login)
  await page.focus('input[name=Password]')
  await page.keyboard.type(user.pass)
  const loginButton = await page.waitForSelector('button[name=Login]');
  loginButton.click()
  // Login>


  await page.waitForSelector('body > div.container-fluid.body-content')
  await page.goto(baseUrl + '/cards')

  //Парсинг имеющихся карт
  const cardsTableRows = await page.$$('#cards > tbody > tr')
  const cards = [];

  for (const row of cardsTableRows) {
    let card = [];
    let cardNumberRow = await row.$$("td:nth-child(2) a")
    let href = await page.evaluate(el => el.getAttribute('href'), cardNumberRow[1]);
    let number = (await page.evaluate(el => el.innerText, cardNumberRow[0])).replaceAll(' ', '');

    await page.goto(baseUrl + href)
    await page.$$('#cards')


    let balanceTableRows = await page.$$('table:nth-child(1) tbody tr')

    //Парсинг таблицы баланса
    for (const brow of balanceTableRows) {
      let gasRow = await brow.$$("td")
      card.push({
        card: number,
        actual: (await page.evaluate(el => el.innerText, gasRow[0])).split('\n')[1].replace('Актуальность: ', ''),
        name: (await page.evaluate(el => el.innerText, gasRow[0])).split('\n')[0],
        balance: parseFloat(await page.evaluate(el => el.innerText, gasRow[1])),
      })
    }

    cards.push(card)

  }
  await browser.close();
  return cards;
};

function saveToJsonFile(filePath, data) {
  const jsonData = JSON.stringify(data, null, 2);

  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, jsonData);
  console.log(`JSON data saved to ${filePath}`);
}



const getData = async () => {
  if(!args['table-id']){
    console.log('Укажите идентификатор таблицы в качестве аргумента. --table-id=<id таблицы>')
    return;
  }
  const users = [{
    login: 'i.kitaygora@toyota-kostanay.kz',
    pass: '2wGwIgYD'
  }]

  let cards = []

  for (const user of users) {
    let cardsT = await parse(user);

    for (const cdata of cardsT) {
      for (const crd of cdata) {
        if(crd.balance>0){
          cards.push([crd.actual, crd.card, crd.name, crd.balance])
        }
      }
    }
  }

  if (!cards.length) {
    console.log('Данные отсутствуют');
    return;
  }

  const now = new Date();
  const formattedDate = now.toISOString().replace('T',' ').substring(0,19);

  cards[0].push(formattedDate)

  saveToJsonFile(`backlog/${formattedDate.replaceAll(':','.')}.json`, cards)

  //17eeO9eNJBAB0nYghpjMCo_ipNC53M_sLipt_VebCT8k
  const doc = new GoogleSpreadsheet(args['table-id']);

  await doc.useServiceAccountAuth({
    client_email: "ksttrade@my-project-1547447941836.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDPsWTZ1WKqr2Wk\npB2Td7C9kaEdv+pNppRghiYUlnURKnlL6om7yEdtRpaMooREza222RzfmOwIme7e\nNdXkmL6FqyXl6Hp0DgSBLsy6QtLN5XC2tq3MZ/J/EEfj0W3q4Q96CBBUdr81PDzX\nrXURX0Ytdby47DRhiOTiGdE+Ff431HwNo30DH52Y4pArOcR3Hanzu9TVWFAxSwaN\nuUGtIocaj6QzDj2hMJpq4zKORh0KazEWiJm8BV66mYik49kjb2ds3pL43tXzfMH7\nqZ6rRlb7JH9SZzEby1+qx+rlQ5yotOAV0s1Cab5Lpw01FLEguN3fA5xnm2J7Kvn+\n+WFJFjUjAgMBAAECggEAAnn9kmdiIH9diDdu6e1R+fbaMm4T8icW4k45qAS6V41d\nt9MtH0RUfHnHifBgT4oGd0CKHkqV0tmp0Aox/Wxb6xJshpIiZYLLIAjBNeLAZ/oc\nBjB+YFk0ps3WDGIT6uqIQPFB+w1kDEmccGxldEVYVKWrmgkysNptQhrHoMv4pYMk\ndAg5MqBvlm7tq+5UUevBjedwYsXmWw/+7sXucWDK0lYrXcZXGOV0xoBSzMpMIzqu\nlynVpaPRdpDU1cZN/vpiNy4WGH4TvIXUKgSc/alLBWicX0DD+uLJy4TuXCUXSnTN\ne+8G6kidougYo7TtZQzNV/wnWUzLcP6YtCefmyCriQKBgQDz37pwU+mcJDfe+6mr\nCw1A1ooEUGZljMEoaiPhA7QsWwDzbcTVy7/x9WMHr+dolzdPuaLcZFmDEolrgLwp\nHgug8kBSGq+57ymnBoOOT/HOLPzKifrt5uN8Ghw2g1mq7qs7Wy0Js2rMJPHtPkV2\nTTBs6l+os30KeBpsjSJOk3OgRQKBgQDaBR4lE3kd7GVo9c5CakAB9WG/3mJ3CmE/\ne+0tR6GLZCMccMN2co2RhC9Hm+mgklUgfMlaBxUoUCWUD1hSY3XhbxqfYJwL+FIs\nuRIg2RUpS/hNb0XiGhGfbRp4VTEQsZ2bt+9YVZ6VrMerR7cbIgo9cT1IBes/qbIH\nI1zvSQLaRwKBgQDWtwNqRKcov0alv4OpwYhAruNDWxpcjGnAUHsYcO9gIhubN+kW\np1ZvDLLNINWoY4LiYbn/OycIXPi6utRvizGH2eJBp5dSKDzO/tAzKzXlZfyHwqY4\ncZGWQVLXuBvpgEsobmUf5mTAKkMKs0nrF5jsPApO+QC9h/MT4crzzaT+1QKBgQCX\n0AZ8pMGqv4ih/L/CaX/mnTqSw0TnRXgQH7g41m87w9/bFv5UhVHk6RmPEJcvM5ZJ\nR/thUBtAdgakwcaroAxejOIJ5tjiUOjPsZNZAjCFEBx3tyr/VU2+KNfMwO2ohTWN\nUBg+92e1K5nhv89V+m8M98RHWa/FJeIMrGgzSzDMUwKBgGI/BmN+QMViUS4fWVbe\nj/i9T8NXi3YEJ3D+BqwGqc6bZ1LtBo76NDq1LxN8bnV4BL04dbpv3Leht1LhaNdH\nylf/ffLw2hp73vaei1rQJlyokKe6Zxr3yWpgi45To9OPuUtxqYmAeBbzLGFAXUnD\nLG23rdIONdE5ad5f0MRFFNTu\n-----END PRIVATE KEY-----\n",
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRows(cards);



}


getData();