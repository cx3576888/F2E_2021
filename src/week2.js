import L from '../node_modules/leaflet/dist/leaflet';

const mymap = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(mymap);

const marker = L.marker([51.5, -0.09]).addTo(mymap);

const circle = L.circle([51.508, -0.11], {
  color: 'red',
  fillColor: '#f03',
  fillOpacity: 0.5,
  radius: 500
}).addTo(mymap);

const polygon = L.polygon([
  [51.509, -0.08],
  [51.503, -0.06],
  [51.51, -0.047],
]).addTo(mymap);

marker.bindPopup('<b>Hello world!</b><br>I am a popup.').openPopup();
circle.bindPopup('I am a circle.');
polygon.bindPopup('I am a polygon');

const popup = L.popup()
  .setLatLng([51.5, -0.09])
  .setContent('I am a standalone popup.')
  .openOn(mymap);

const clickedPopup = L.popup();

function onMapClick(e) {
  clickedPopup
    .setLatLng(e.latlng)
    .setContent('You clicked the map at ' + e.latlng.toString())
    .openOn(mymap);
}

mymap.on('click', onMapClick);