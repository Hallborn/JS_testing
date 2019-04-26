//import { InfluxDB } from 'influx';
console.log("hello"); 
alert("This alert box was called with the onload event");


var Influx = require('influx');

var influx = new InfluxDB(
{
host: 'localhost',   
database: 'statistics',    
port:8086
});
//export defaultinflux;


//fetch('http://localhost:8086/query?pretty=true)')
//.then()