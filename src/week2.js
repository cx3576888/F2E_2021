import L from '../node_modules/leaflet/dist/leaflet';

const mymap = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(mymap);

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

const LeafIcon = L.Icon.extend({
  options: {
    shadowUrl: require('../assets/leaf-shadow.png'),
    iconSize: [38, 95],
    shadowSize: [50, 64],
    iconAnchor: [10, 52],
    shadowAnchor: [-12, 22],
    popupAnchor: [10, -45]
  }
});

const greenIcon = new LeafIcon({ iconUrl: require('../assets/leaf-green.png') });
const redIcon = new LeafIcon({ iconUrl: require('../assets/leaf-red.png') });
const orangeIcon = new LeafIcon({ iconUrl: require('../assets/leaf-orange.png') });

L.marker([51.5, -0.09], { icon: greenIcon }).addTo(mymap).bindPopup('I am a green leaf.');
L.marker([51.495, -0.083], { icon: redIcon }).addTo(mymap).bindPopup('I am a red leaf.');
L.marker([51.49, -0.1], { icon: orangeIcon }).addTo(mymap).bindPopup('I am an orange leaf.');


const markerIcon = L.icon({
  iconUrl: require('../node_modules/leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('../node_modules/leaflet/dist/images/marker-shadow.png'),
  popupAnchor: [10, 0]
});
const marker = L.marker([51.5, -0.09], { icon: markerIcon }).addTo(mymap);
const marker2 = L.marker([51.495, -0.087], { icon: markerIcon }).addTo(mymap);
// const marker = L.marker([51.5, -0.09]).addTo(mymap); // this won't work because don't know where the png is after build
marker.bindPopup('<b>Hello world!</b><br>I am a popup.').openPopup();
marker2.bindPopup('I am a popup, too.');
