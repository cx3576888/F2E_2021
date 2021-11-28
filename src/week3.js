import jsSHA from 'jssha';
import axios from 'axios';
import { createApp } from '@vue/runtime-dom';
import { createApp } from '../node_modules/vue/dist/vue.esm-browser';

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

const allCitys = [
  { id: 1, value: 'Taipei', label: '臺北市' },
  { id: 2, value: 'NewTaipei', label: '新北市' },
  { id: 3, value: 'Taoyuan', label: '桃園市' },
  { id: 4, value: 'Taichung', label: '臺中市' },
  { id: 5, value: 'Tainan', label: '臺南市' },
  { id: 6, value: 'Kaohsiung', label: '高雄市' },
  { id: 7, value: 'Keelung', label: '基隆市' },
  { id: 8, value: 'Hsinchu', label: '新竹市' },
  { id: 9, value: 'HsinchuCounty', label: '新竹縣' },
  { id: 10, value: 'MiaoliCounty', label: '苗栗縣' },
  { id: 11, value: 'ChanghuaCounty', label: '彰化縣' },
  { id: 12, value: 'NantouCounty', label: '南投縣' },
  { id: 13, value: 'YunlinCounty', label: '雲林縣' },
  { id: 14, value: 'ChiayiCounty', label: '嘉義縣' },
  { id: 15, value: 'Chiayi', label: '嘉義市' },
  { id: 16, value: 'PingtungCounty', label: '屏東縣' },
  { id: 17, value: 'YilanCounty', label: '宜蘭縣' },
  { id: 18, value: 'HualienCounty', label: '花蓮縣' },
  { id: 19, value: 'TaitungCounty', label: '臺東縣' },
  { id: 20, value: 'KinmenCounty', label: '金門縣' },
  { id: 21, value: 'PenghuCounty', label: '澎湖縣' },
  { id: 22, value: 'LienchiangCounty', label: '連江縣' },
];

const getList = function (city, includeContain, searchStr) {
  const url = `/Route/City/${city}`;
  const params = {
    $filter: `${includeContain ? 'contains' : 'startsWith'}(RouteName/Zh_tw, '${searchStr}')`,
    $orderby: 'RouteName/Zh_tw asc',
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
  RouteName.Zh_tw
  DepartureStopNameZh
  DestinationStopNameZh
  TicketPriceDescriptionZh // for detail page
  SubRoutes.SubRouteName.Zh_tw
  SubRoutes.Direction // [0:'去程',1:'返程',2:'迴圈',255:'未知'] 
  SubRoutes.FirstBusTime
  SubRoutes.LastBusTime
  SubRoutes.HolidayFirstBusTime // for detail page
  SubRoutes.HolidayLastBusTime // for detail page
}

const getStops = function (city, routeName) {
  const url = `/StopOfRoute/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
  Stops.StopUID
  Stops.StopName.Zh_tw
  Stops.StopSequence // may not use
  Stops.StopPosition.PositionLon
  Stops.StopPosition.PositionLat
}

const getTimes = function (city, routeName) {
  const url = `/EstimatedTimeOfArrival/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
  StopUID
  StopName.Zh_tw
  PlateNumb // 車牌號碼 [値為値為-1時，表示目前該站位無車輛行駛] // response都沒看到這個欄位
  Direction // [0:'去程',1:'返程',2:'迴圈',255:'未知'] 
  // 去返程(該方向指的是此車牌車輛目前所在路線的去返程方向，非指站站牌所在路線的去返程方向，使用時請加值業者多加注意)
  StopStatus // [0:'正常',1:'尚未發車',2:'交管不停靠',3:'末班車已過',4:'今日未營運']
  EstimateTime //到站時間預估(秒) 
  // 當StopStatus値為2~4或PlateNumb値為-1時，EstimateTime値為null;
  // 當StopStatus値為1時，EstimateTime値多數為null，僅部分路線因有固定發車時間，故EstimateTime有値;
  // 當StopStatus値為0時，EstimateTime有値。
  UpdateTime // 本平台資料更新時間(ISO8601格式:yyyy-MM-ddTHH:mm:sszzz)
}


const getDetail = function (city, routeName) {
  const url = `/Route/City/${city}/${routeName}`;
  const params = {
    $filter: `RouteName/Zh_tw eq '${routeName}'`,
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
  FirstBusTime
  LastBusTime
  HolidayFirstBusTime
  HolidayLastBusTime
  TicketPriceDescriptionZh
  OperatorName.Zh_tw
  OperatorID
}

const getOperator = function (city) {
  const url = `/Operator/City/${city}`;
  const params = {
    $format: 'JSON',
  };
  return busApi.get(url, { params: params });
  OperatorName.Zh_tw
  OperatorID
  OperatorPhone
  OperatorUrl
}

const app = createApp({
  data() {
    return {
      isSearchPage: true,
    };
  },
});
app.mount('#app');


