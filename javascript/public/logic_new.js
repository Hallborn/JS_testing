function totalEventFetch() {
  //const fetchUrl = urls[using_url].totalEvent({ anomaly: anomaly, start: start.getTime(), stop: stop.getTime(), database: database, measurement: measurement })
  const fetchUrl = "http://localhost:8086/query?db=test&q=select+*+from+value"
  const p = fetch(fetchUrl)
    .then(classResponse => classResponse.json())
    .then((classData) => 
    {   
        console.log(classData.results[0].series[0].values)
        myFunction(classData.results[0].series[0].values);
    })
    .catch(error => console.error(`Something wrong with fetching total events of class ${String(anomaly)}: ${error}`));
  return p;
}

function myFunction(para) {
    var x = document.createElement("DIV");
    var t = document.createTextNode(para.toString());
    x.appendChild(t);
    document.body.appendChild(x);

}

totalEventFetch()