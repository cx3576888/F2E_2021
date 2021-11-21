import jsSHA from 'jssha';
import axios from 'axios';
import { createApp } from 'vue/dist/vue.esm-browser';
import L from '../node_modules/leaflet/dist/leaflet';

// https://github.com/ptxmotc/Sample-code/blob/master/Node.js/sample.js
const getAuthorizationHeader = function () {
  const AppID = 'da4c52a5c3144c54a69a6d4f40697fb6';
  const AppKey = 'w2jtXxrjCFl2wN5RWmJO6HOjM38';

  const GMTString = new Date().toGMTString();
  const ShaObj = new jsSHA('SHA-1', 'TEXT');
  ShaObj.setHMACKey(AppKey, 'TEXT');
  ShaObj.update('x-date: ' + GMTString);
  const HMAC = ShaObj.getHMAC('B64');
  const Authorization = `hmac username="${AppID}", algorithm="hmac-sha1", headers="x-date", signature="${HMAC}"`;

  return { 'Authorization': Authorization, 'X-Date': GMTString };
}

const bikeApi = axios.create({
  baseURL: 'https://ptx.transportdata.tw/MOTC/v2/Bike',
  headers: getAuthorizationHeader(),
});

const getStations = function (by) {
  let url;
  const params = {
    $top: 5,
    $format: 'JSON',
  };
  if (by.city) {
    url = `/Station/${by.city}`;
  } else {
    url = `/Station/NearBy`;
    params.$spatialFilter = `nearby(${by.lat},${by.lng},${by.distance})`;
  }
  return bikeApi.get(url, { params: params });
}

const getAvailability = function (by) {
  let url;
  const params = {
    $top: 5,
    $format: 'JSON',
  };
  if (by.city) {
    url = `/Availability/${by.city}`;
  } else {
    url = `/Availability/NearBy`;
    params.$spatialFilter = `nearby(${by.lat},${by.lng},${by.distance})`;
  }
  return bikeApi.get(url, { params: params });
}

function getUserLocation() {
  const p = new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // console.log('user position:', position);
        resolve(position);
      },
      (err) => {
        console.log('get user position error', err);
        reject(err);
      }
    )
  });
  return p;
}

const icons = prepareIcons();
const blueIcon = icons.blue;
const grayIcon = icons.gray;
const markers = {};
const app = createApp({
  data() {
    return {
      map: {},
      currPosition: {
        lat: null,
        lng: null,
      },
      isBorrow: true,
      showDetail: false,
      name: {},
      address: {},
      updateTime: '',
      status: {},
      available: {},
    };
  },
  mounted() {
    getUserLocation()
      .then((position) => {
        this.currPosition.lat = position.coords.latitude;
        this.currPosition.lng = position.coords.longitude;
      })
      .catch((err) => {
        console.log('use Taipei City Hall Stataion as default user location');
        this.currPosition.lat = 25.0408578889;
        this.currPosition.lng = 121.567904444;
      })
      .finally(() => {
        this.map = constructMap(this.currPosition);
      })
  },
  methods: {
    toggleBorrow() {
      this.isBorrow = !this.isBorrow;
      markStations(this.map, this.isBorrow, this);
    },
  },
});
app.mount('#app');

function constructMap(currPosition) {
  map = L.map('map', {
    center: currPosition,
    zoom: 17,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  return map;
}

function prepareIcons() {
  const bearIcon = L.Icon.extend({
    options: {
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      popupAnchor: [0, -60]
    }
  });
  return {
    blue: new bearIcon({ iconUrl: require('../assets/bear-blue.png') }),
    gray: new bearIcon({ iconUrl: require('../assets/bear-gray.png') }),
  };
}

function markStations(map, isBorrow, vueObj) {
  const byParam = {
    lat: map.getCenter().lat,
    lng: map.getCenter().lng,
    distance: 1000,
  };
  Promise.all([getStations(byParam), getAvailability(byParam)])
    .then(([stations, avails]) => {
      stations.data.forEach(st => {
        markers[st.StationUID] = L.marker([st.StationPosition.PositionLat, st.StationPosition.PositionLon], {
          icon: isBorrow ? blueIcon : grayIcon,
        })
          .addTo(map)
          .on('click', function (evt) {
            showStationDetails(evt, st, vueObj);
          });
      });

      avails.data.forEach(st => {
        const stMarker = markers[st.StationUID];
        if (stMarker) {
          stMarker
            .bindTooltip(isBorrow ? '' + st.AvailableRentBikes : '' + st.AvailableReturnBikes, {
              permanent: true,
              direction: 'center',
              offset: [-3, -33],
              className: isBorrow ? 'borrow-num' : 'return-num',
            })
            .openTooltip()
            .on('click', function (evt) {
              showAvailableDetails(evt, st, vueObj);
            });
        } else {
          console.log('no marker for ', st.StationUID)
        }
      })
    })
}

function showStationDetails(evt, st, vueObj) {
  vueObj.showDetail = true;
  vueObj.name = st.StationName;
  vueObj.address = st.StationAddress;
  vueObj.updateTime = timeFormat(st.UpdateTime);
}

function showAvailableDetails(evt, st, vueObj) {
  vueObj.status = updateStatus(st.ServiceStatus);
  vueObj.available.borrow = st.AvailableRentBikes;
  vueObj.available.return = st.AvailableReturnBikes;
}

function timeFormat(time) {
  const idx1 = time.indexOf('T');
  const idx2 = time.indexOf('+');
  return time.substring(0, idx1) + ' ' + time.substring(idx1 + 1, idx2);
}

function updateStatus(statusId) {
  const ret = {};
  switch (statusId) {
    case 0:
      ret.text = '停止營運';
      ret.color = 'ball-red';
      break;
    case 1:
      ret.text = '正常營運';
      ret.color = 'ball-blue';
      break;
    case 2:
      ret.text = '暫停營運';
      ret.color = 'ball-yellow';
      break;
  }
  return ret;
}

/*
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
*/
