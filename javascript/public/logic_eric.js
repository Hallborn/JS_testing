let chartAnomaly = 0; // event type shown in chart
const CLASSLIST = ['Normal', 'Rain', 'Crane', 'Multipath', 'U-shape', 'Unknown'];
const CLASSCOLORS = ['#0FC373', '#0082F0', '#AF78D2', '#FF3232', '#FF8C0A', '#FAD22D'];

const intervalPicker = document.getElementById('intervalPicker');
const dayInMilliseconds = 24 * 60 * 60 * 1000;
let timeInterval = parseInt(intervalPicker.value); // time interval in days
let to = new Date(Date.now());
let from = new Date(Date.now() - timeInterval * dayInMilliseconds);
intervalPicker.addEventListener('change', () => {
  timeInterval = parseInt(intervalPicker.value);
  updateAll();
})

const dbPicker = document.getElementById('dbDropdown');
let databaseInfo = dbPicker.value.split(';');
dbPicker.addEventListener('change', () => {
  databaseInfo = dbPicker.value.split(';');
  updateAll();
});

const baseMapUrl = '/map?';

const urls = {
  backend: {
    anomalyFetch: (param) => { return `/api/db/fetch_anomaly?to=${param.stop}&from=${param.start}&database=${param.database}&measurement=${param.measurement}&anomaly=${param.anomaly}` },
    totalEvent: (param) => { return `/api/db/total_event?to=${param.stop}&from=${param.start}&database=${param.database}&measurement=${param.measurement}&anomaly=${param.anomaly}` },
    rxFetch: (param) => { return `/api/db/dash_rx_fetch?to=${param.stop}&from=${param.start}&database=${param.database}&measurement=${param.measurement}` },
    metaUrl: (param) => { return `/api/db/dash_meta?database=${param.database}&measurement=${param.measurement}&link_ids${param.linkIds}` }
  },
  direct: {
    anomalyFetch: (param) => { return `http://136.225.130.37:8086/query?db=${param.database}&q=SELECT+FIRST(decision)+FROM+${param.measurement}+WHERE+TIME>=${param.start}000000+AND+TIME<=${param.stop}000000+AND+decision=${String(param.anomaly)}+GROUP+BY+link_id` },
    totalEvent: (param) => { return `http://136.225.130.37:8086/query?db=${param.database}&q=SELECT+COUNT(decision)+FROM+${param.measurement}+WHERE+TIME>=${param.start}000000+AND+TIME<=${param.stop}000000+AND+decision=${String(param.anomaly)}+GROUP+BY+link_id` },
    rxFetch: (param) => { return `http://136.225.130.37:8086/query?db=${param.database}&q=SELECT+FIRST(rx)+FROM+${param.measurement}+WHERE+TIME>=${param.start}000000+AND+TIME<=${param.stop}000000+GROUP+BY+link_id` },
    metaUrl: (param) => { return `http://136.225.130.37:8086/query?db=${param.database}&q=SELECT+LAST(*)+FROM+${param.measurement}+WHERE+(${param.linkIds})+GROUP+BY+link_id'` }

    //totalEvent `http://136.225.130.37:8086/query?db=${database}&q=SELECT+COUNT(decision)+FROM+${measurement}+WHERE+TIME>=${start.getTime()}000000+AND+TIME<=${stop.getTime()}000000+AND+decision=${String(anomaly)}+GROUP+BY+link_id`
    //anomalyFetch: `http://136.225.130.37:8086/query?db=${database}&q=SELECT+FIRST(decision)+FROM+${measurement}+WHERE+TIME>=${start.getTime()}000000+AND+TIME<=${stop.getTime()}000000+AND+decision=${String(anomaly)}+GROUP+BY+link_id`
    //rxFetch: `http://136.225.130.37:8086/query?db=${database}&q=SELECT+FIRST(rx)+FROM+${measurement}+WHERE+TIME>=${param.start}000000+AND+TIME<=${param.stop}000000+GROUP+BY+link_id`
    //`http://136.225.130.37:8086/query?db=${databaseInfo[4]}&q=SELECT+LAST(*)+FROM+${databaseInfo[5]}+WHERE+(link_id='${idList[0]}'`;

  }
}

function authHeader() {
  // return authorization header with jwt token
  let user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { 'Authorization': 'Bearer ' + user.token };
  } else {
    return {};
  }
}
const using_url = "backend";

// get promise for number of anomaly links
function anomalyFetch(anomaly, start, stop, database, measurement) {
  const fetchUrl = urls[using_url].anomalyFetch({ start: start.getTime(), stop: stop.getTime(), anomaly: anomaly, database: database, measurement: measurement })
  console.log("Got user");
  console.log(JSON.parse(localStorage.getItem('user')));
  const p = fetch(fetchUrl, { headers: authHeader() })
    .then(classResponse => classResponse.json())
    .then(classData => {
      if (classData.results[0].hasOwnProperty('series')) {
        return classData.results[0].series.length
      } else {
        return 0;
      }
    })
    .catch(error => {
      console.error(`Something wrong with class fetch: ${error}`);
      window.location.replace("/login");
    });
  return p;
}

function rxFetch(start, stop, database, measurement) {
  const dataInfluxUrl = urls[using_url].rxFetch({ start: start.getTime(), stop: stop.getTime(), database: database, measurement: measurement })
  const p = fetch(dataInfluxUrl, { headers: authHeader() })
    .then(linkResponse => linkResponse.json())
    .then((linkData) => {
      if (linkData.results[0].hasOwnProperty('series')) {
        return linkData.results[0].series.length;
      } else {
        return 0;
      }
    })
    .catch(error => {
      console.error(`Something went wrong with data fetch: ${error}`);
      window.location.replace("/login");
    });
  return p;
}

// Put numbers on cards
function putNumbersOnCards() {
  const linkHeader = document.getElementById('linkHeading');
  rxFetch(from, to, databaseInfo[0], databaseInfo[1])
    .then((linkCount) => {
      let titleText = `${linkHeader.getElementsByClassName('title')[0].innerText.split(':')[0]}`;
      titleText = `${titleText}: ${linkCount}`;
      linkHeader.getElementsByClassName('title')[0].innerText = titleText;
    })
    .catch(error => console.error(`Something wrong when writing rx card: ${error}`));

  const classCards = [];
  classCards.push(document.getElementById('normalCard'));
  classCards.push(document.getElementById('rainCard'));
  classCards.push(document.getElementById('craneCard'));
  classCards.push(document.getElementById('multipathCard'));
  classCards.push(document.getElementById('uShapeCard'));
  classCards.push(document.getElementById('unknownCard'));

  // get data for current period
  const fetchPromises = [];
  for (let i = 0; i < classCards.length; i++) {
    fetchPromises.push(anomalyFetch(i, from, to, databaseInfo[2], databaseInfo[3]));
  }

  // get data for previous period
  const prevPromises = [];
  const prevIntervalFrom = new Date(from.getTime() - timeInterval * dayInMilliseconds);
  const prevIntervalTo = new Date(to.getTime() - timeInterval * dayInMilliseconds);
  for (let i = 0; i < classCards.length; i++) {
    prevPromises
      .push(anomalyFetch(i, prevIntervalFrom, prevIntervalTo, databaseInfo[2], databaseInfo[3]));
  }

  // write data to the cards
  Promise.all([Promise.all(fetchPromises), Promise.all(prevPromises)])
    .then((values) => {
      // current data
      for (let i = 0; i < classCards.length; i++) {
        classCards[i].getElementsByClassName('title')[0].innerText = `${classCards[i].getElementsByClassName('title')[0].innerText.split(':')[0]}: ${values[0][i]}`;
      }

      // previous period
      for (let i = 0; i < classCards.length; i++) {
        const change = values[0][i] / values[1][i];
        const percChange = Math.abs((change - 1) * 100).toFixed(1);
        if (change === Infinity) {
          classCards[i].getElementsByClassName('subtitle')[0].innerHTML = 'None previous period';
        } else if (change > 1) {
          classCards[i].getElementsByClassName('subtitle')[0].innerHTML = `<i class="icon icon-arrow-up"></i> ${percChange}%`;
        } else {
          classCards[i].getElementsByClassName('subtitle')[0].innerHTML = `<i class="icon icon-arrow-down"/></i> ${percChange}%`;
        }
      }
    })
    .catch(error => console.error(`something went wrong with updating cards ${error}`));
}

// fetch total events
function totalEventFetch(anomaly, start, stop, database, measurement) {
  const fetchUrl = urls[using_url].totalEvent({ anomaly: anomaly, start: start.getTime(), stop: stop.getTime(), database: database, measurement: measurement })
  const p = fetch(fetchUrl, { headers: authHeader() })
    .then(classResponse => classResponse.json())
    .then((classData) => {
      if (classData.results[0].hasOwnProperty('series')) {
        let classLinks = classData.results[0].series;
        // restructure array and remove excess data
        classLinks = classLinks.map((el) => {
          return { link_id: el.tags.link_id, count: el.values[0][1] };
        });
        // sort by count
        classLinks.sort((a, b) => b.count - a.count);
        return classLinks;
      } else { // no data
        return [];
      }
    })
    .catch(error => console.error(`Something wrong with fetching total events of class ${String(anomaly)}: ${error}`));
  return p;
}

// compute distance between points, see
// https://stackoverflow.com/a/21623206
function distance(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;    // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

// get frequency and hop length for links
function getMousoverData(idList) {
  if (idList == None || idList[0] == None) {
    return None
  }
  let linkIds = `link_id='${idList[0]}'`
  for (let i = 1; i < idList.length; i++) {
    linkIds = `${linkIds}+OR+link_id='${idList[i]}'`;
  }
  let metaUrl = urls[using_url].metaUrl({ linkIds: linkIds, database: databaseInfo[4], measurement: databaseInfo[5] })
  const p = fetch(metaUrl, { headers: authHeader() })
    .then(response => response.json())
    .then((data) => {
      let linkInfo = [];
      if (data.results[0].hasOwnProperty('series')) {
        const series = data.results[0].series;
        const colNames = series[0].columns
          .map(s => s.replace('last_', ''));
        linkInfo = series.map((el) => {
          const info = {};
          info.linkId = el.tags.link_id;
          info.frequency = el.values[0][colNames.indexOf('frequency')];
          info.hopLength = distance(
            el.values[0][colNames.indexOf('near_latitude')],
            el.values[0][colNames.indexOf('near_longitude')],
            el.values[0][colNames.indexOf('far_latitude')],
            el.values[0][colNames.indexOf('far_longitude')]
          );
          return info;
        });
      }
      return linkInfo;
    })
    .catch(err => {
      console.error(`Something went wrong when fetching metadata: ${err}`);
      //      window.location.replace("/login");
    });
  return p;
}

function addListData(linkBox) {
  const eventName = linkBox.parentElement.parentElement.textContent.toLowerCase().split(':')[0];
  const value = JSON.parse(linkBox.dataset.listdata);
  const length = 30;
  let topListText = `<b>Links with most ${eventName} events:</b>`;
  const list = linkBox.getElementsByClassName('list')[0];
  if (value.length > 0) {
    const dispLength = Math.min(length, value.length);
    for (let i = 0; i < dispLength; i++) {
      let hop_length_rounded = Math.round(value[i].hopLength * 100) / 100;
      if (databaseInfo[0] == 'link_db_new') { frequency_rounded = Math.round(value[i].frequency / 1000) / 1000; } //Different units in old and new db
      else { frequency_rounded = Math.round(value[i].frequency) / 1000; }
      const title = `Frequency: ${frequency_rounded} GHz, Hop Length: ${hop_length_rounded} km`;
      topListText = `${topListText} <br/><a href="${baseMapUrl}linkid=${value[i].link_id}&from=${from.getTime()}&to=${to.getTime()}" title="${title}">${i + 1}. ${value[i].link_id} - ${value[i].count}</a>`;
    }
    list.innerHTML = '';
    list.innerHTML = topListText;
  }
}

function addToplistToCards() {
  const classCards = [];
  classCards.push(document.getElementById('normalCard'));
  classCards.push(document.getElementById('rainCard'));
  classCards.push(document.getElementById('craneCard'));
  classCards.push(document.getElementById('multipathCard'));
  classCards.push(document.getElementById('uShapeCard'));
  classCards.push(document.getElementById('unknownCard'));

  const fetchPromises = [];
  for (let i = 0; i < classCards.length; i++) {
    fetchPromises.push(totalEventFetch(i, from, to, databaseInfo[2], databaseInfo[3]));
  }

  Promise.all(fetchPromises)
    .then((values) => {
      console.log("fetches resolved");
      for (let i = 0; i < classCards.length; i++) {
          /*getMousoverData(values[i].slice(0, 30).map(el => el.link_id))
            .then((info) => {
              console.log("getMouseover resolved");
              if (info != None) {
                let limit = Math.min(values[i].length, 30);
                for (let j = 0; j < limit; j++) {
                  const linkInfo = info.find(el => (el.linkId === values[i][j].link_id));
                  values[i][j].frequency = linkInfo.frequency;
                  values[i][j].hopLength = linkInfo.hopLength;
                }*/
                const box = classCards[i].getElementsByClassName('box')[0];
                box.dataset.listdata = JSON.stringify(values[i]);
                addListData(box);
              /*}
            });*/
        }
    })
    .catch(error => console.error(`something went wrong with updating cards`));
}

// create chart
const ctx = document.getElementById('anomalyChart').getContext('2d');
const anomalyChart = new Chart(ctx, {
  type: 'line',
  options: {
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
        },
      }],
    },
    elements: {
      line: {
        tension: 0, // disable smoothing
      },
    },
  },
});

// updates the plot
function updateChart() {
  const fetchPromises = [];
  for (let i = 0; i < CLASSLIST.length; i++) {
    fetchPromises.push([]);
  }
  const chartLabels = [];

  for (let i = 0; i < 7; i++) {
    const stop = new Date(Date.now() - i * timeInterval * dayInMilliseconds);
    const start = new Date(Date.now() - (i + 1) * timeInterval * dayInMilliseconds);
    chartLabels.push(stop.toDateString());
    for (let anomaly = 0; anomaly < CLASSLIST.length; anomaly++) {
      fetchPromises[anomaly]
        .push(anomalyFetch(anomaly, start, stop, databaseInfo[2], databaseInfo[3]));
    }
  }

  Promise.all(fetchPromises.map(x => Promise.all(x)))
    .then((values) => {
      anomalyChart.data.datasets = [];
      for (let anomaly = 0; anomaly < CLASSLIST.length; anomaly++) {
        anomalyChart.data.datasets.push({
          label: `# links with ${CLASSLIST[anomaly]} events`,
          data: values[anomaly].reverse(),
          backgroundColor: CLASSCOLORS[anomaly],
          borderColor: CLASSCOLORS[anomaly],
          borderWidth: 0,
          fill: false,
        });
      }
      anomalyChart.data.labels = chartLabels.reverse();
      anomalyChart.update();
    })
    .catch(error => console.error(`Failed in promise all in updateChart. Error: ${error}`));
}

function updateAll() {
  to = new Date(Date.now());
  from = new Date(Date.now() - timeInterval * dayInMilliseconds);

  const dateHeading = document.getElementById('dateHeading');
  dateHeading.children[0].innerHTML = `Data for links from ${from.toDateString()} to ${to.toDateString()}`;
  dateHeading.children[1].innerHTML = `Last update: ${to.toString()}`;
  putNumbersOnCards();
  addToplistToCards();
  updateChart();
}

// make buttons update chart
const cardButtons = [];
cardButtons.push($('#normalButton'));
cardButtons.push($('#rainButton'));
cardButtons.push($('#craneButton'));
cardButtons.push($('#multipathButton'));
cardButtons.push($('#uShapeButton'));
cardButtons.push($('#unknownButton'));

updateAll();
setInterval(updateAll, 300000);
