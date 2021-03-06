import jsSHA from 'jssha';
import axios from 'axios';
import { createApp, ref, onMounted, computed } from '../node_modules/vue/dist/vue.esm-browser';
import L from 'leaflet';

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

const busApi = axios.create({
  baseURL: 'https://ptx.transportdata.tw/MOTC/v2/Bus',
  headers: getAuthorizationHeader(),
});

const getOperators = function (city) {
  const url = `/Operator/City/${city}`;
  const params = {
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
}

const getList = function (city, includeContain, searchStr) {
  const url = `/Route/City/${city}`;
  const params = {
    $filter: `${includeContain ? 'contains' : 'startsWith'}(RouteName/Zh_tw, '${searchStr}')`,
    $orderby: 'RouteName/Zh_tw asc',
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
}

const getDetail = function (city, routeName) {
  const url = `/Route/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
}

const getStops = function (city, routeName) {
  const url = `/StopOfRoute/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
}

const getTimes = function (city, routeName) {
  const url = `/EstimatedTimeOfArrival/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $orderby: 'StopID asc',
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
}

let map;
let currPosition = {
  lat: 25.0408578889,
  lng: 121.567904444,
};
const app = createApp({
  setup() {
    // search page or detail page
    const isSearchPage = ref(true);
    function seeDetail(routeName) {
      initDetail(routeName);
    }
    function goToSearchPage() {
      isSearchPage.value = true;
    }

    // city selection
    const showAllCities = ref(false);
    const allCities = ref([
      { id: 1, value: 'Taipei', label: '?????????', defaultShow: true, selected: true },
      { id: 2, value: 'NewTaipei', label: '?????????' },
      { id: 3, value: 'Taoyuan', label: '?????????' },
      { id: 4, value: 'Taichung', label: '?????????', defaultShow: true },
      { id: 5, value: 'Tainan', label: '?????????', defaultShow: true },
      { id: 6, value: 'Kaohsiung', label: '?????????', defaultShow: true },
      { id: 7, value: 'Keelung', label: '?????????' },
      { id: 8, value: 'Hsinchu', label: '?????????' },
      { id: 9, value: 'HsinchuCounty', label: '?????????' },
      { id: 10, value: 'MiaoliCounty', label: '?????????' },
      { id: 11, value: 'ChanghuaCounty', label: '?????????' },
      { id: 12, value: 'NantouCounty', label: '?????????' },
      { id: 13, value: 'YunlinCounty', label: '?????????' },
      { id: 14, value: 'ChiayiCounty', label: '?????????' },
      { id: 15, value: 'Chiayi', label: '?????????' },
      { id: 16, value: 'PingtungCounty', label: '?????????' },
      { id: 17, value: 'YilanCounty', label: '?????????' },
      { id: 18, value: 'HualienCounty', label: '?????????' },
      { id: 19, value: 'TaitungCounty', label: '?????????' },
      { id: 20, value: 'KinmenCounty', label: '?????????' },
      { id: 21, value: 'PenghuCounty', label: '?????????' },
      { id: 22, value: 'LienchiangCounty', label: '?????????' },
      { id: -1, value: 'others', label: '??????', defaultShow: true, otherSelected: false },
    ]);
    let selectedCity = allCities.value[0];
    const cities = computed(() => allCities.value.filter(c => c.defaultShow));
    const otherCities = computed(() => allCities.value.filter(c => !c.defaultShow));
    function selectCity(city, selectOtherCity) {
      const clickOthers = city.id === -1;
      allCities.value.forEach(c => c.selected = false);
      city.selected = true;
      if (clickOthers) {
        showAllCities.value = !showAllCities.value;
        if (!city.otherSelected) {
          selectedCity = {};
          doSearch();
        }
      } else {
        if (selectedCity.id === city.id) {
          return;
        }
        showAllCities.value = false;
        selectedCity = city;
        doSearch();
        storeOperators();
      }
      const otherBtn = allCities.value[allCities.value.length - 1];
      if (selectOtherCity) {
        otherBtn.otherSelected = true;
        otherBtn.selected = true;
        otherBtn.label = city.label;
      }
      if (!selectOtherCity && !clickOthers) {
        otherBtn.otherSelected = false;
        otherBtn.label = '??????';
      }
    }
    const operatorsData = {};
    function storeOperators() {
      if (!operatorsData.hasOwnProperty(selectedCity.value)) {
        getOperators(selectedCity.value)
          .then(response => {
            response.data.forEach(opr => {
              const key = opr.OperatorID;
              operatorsData[key] = opr;
            });
            operatorsData[selectedCity.value] = 'done';
          })
      }
    }

    // search string and results
    let searchDebounce;
    const searchString = ref('');
    const searchResults = ref([]);
    function inputChanged() {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        doSearch();
      }, 1000);
    }
    function doSearch() {
      if (!selectedCity.value || !searchString.value) {
        return;
      }
      getList(selectedCity.value, false, searchString.value)
        .then(response => {
          response.data.forEach(bus => {
            bus.firstLast = resultTimeFormat(bus.SubRoutes[0]);
          });
          searchResults.value = response.data;
        })
    }

    // detail page
    const detail = ref({});
    const stops = ref([]);
    const stopsNow = computed(() => {
      const dirMatch = detail.value.isGoBus ? 0 : 1;
      const dirStops = stops.value.find(bus => bus.Direction === dirMatch).Stops;
      return dirStops.sort((a, b) => a.StopSequence - b.StopSequence);
    });
    function toggleIsGo(isGo) {
      detail.value.isGoBus = isGo;
    }
    function initDetail(routeName) {
      Promise.all([
        getDetail(selectedCity.value, routeName),
        getStops(selectedCity.value, routeName),
        getTimes(selectedCity.value, routeName),
      ])
        .then(([detailResponse, stopsResponse, timesResponse]) => {
          detail.value = detailResponse.data[0];
          detail.value.CityZh = allCities.value.find(c => c.value === detail.value.City).label;
          detail.value.dataTime = updatedTimeFormat(timesResponse.data[0].UpdateTime);
          detail.value.isGoBus = true;
          detail.value.firstLast = detailTimeFormat(detail.value.SubRoutes[0], false);
          detail.value.holidayFirstLast = detailTimeFormat(detail.value.SubRoutes[0], true);
          const operatorInfo = operatorsData[detail.value.Operators[0].OperatorID];
          detail.value.operatorTel = operatorInfo.OperatorPhone;

          stops.value = stopsResponse.data;
          stops.value.forEach(dir => {
            dir.Stops.forEach(st => {
              const timeInfo = timesResponse.data.find(t => t.StopUID === st.StopUID);
              for (const key in timeInfo) {
                if (!st.hasOwnProperty(key)) {
                  st[key] = timeInfo[key];
                }
              }
              const displayProps = getStatusDisplay(st);
              st.StopStatusZh = displayProps.display;
              st.statusClass = displayProps.classNames;
            });
          });
          isSearchPage.value = false;

          setTimeout(() => {
            constructMap();
          }, 500);
        })
    }
    onMounted(() => {
      storeOperators();
    });
    return {
      isSearchPage,
      seeDetail,
      goToSearchPage,

      showAllCities,
      cities,
      otherCities,
      selectCity,

      searchString,
      searchResults,
      inputChanged,

      detail,
      stopsNow,
      toggleIsGo,
    };
  }
});
app.mount('#app');

function constructMap() {
  map = L.map('map', {
    center: currPosition,
    zoom: 17,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// helper functions
function resultTimeFormat(subRoute) {
  const first = subRoute.FirstBusTime;
  const last = subRoute.LastBusTime;
  if (!first || !last) {
    return '????????????????????????';
  } else {
    return `${first.slice(0, 2)}:${first.slice(2, 4)} - ${last.slice(0, 2)}:${last.slice(2, 4)}`;
  }
}

function updatedTimeFormat(time) {
  const idx = time.indexOf('T');
  return time.slice(idx + 1, idx + 9);
}

function detailTimeFormat(subRoute, holiday) {
  const first = holiday ? subRoute.FirstBusTime : subRoute.HolidayFirstBusTime;
  const last = holiday ? subRoute.LastBusTime : subRoute.HolidayLastBusTime;
  if (!first || !last) {
    return '?????????';
  } else {
    return `${first}~${last}`;
  }
}

function getStatusDisplay(stop) {
  let display;
  let classNames = ['stop-status'];
  switch (stop.StopStatus) {
    case 0:
      const sec = stop.EstimateTime;
      if (sec <= 90) {
        display = '?????????';
        classNames.push('stop-status-ing');
      } else if (sec <= 150) {
        display = '????????????';
        classNames.push('stop-status-soon');
      } else {
        display = `${Math.floor(sec / 60)} ??????`;
        classNames.push('stop-status-wait');
      }
      break;
    case 1:
      display = '????????????';
      classNames.push('stop-status-no');
      break;
    case 2:
      display = '???????????????';
      classNames.push('stop-status-no');
      break;
    case 3:
      display = '???????????????';
      classNames.push('stop-status-no');
      break;
    case 4:
      display = '???????????????';
      classNames.push('stop-status-no');
      break;
  }
  return { display, classNames };
}