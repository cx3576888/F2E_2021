import jsSHA from 'jssha';
import axios from 'axios';
import { createApp } from 'vue/dist/vue.esm-browser';

const cityOpts = [
  { value: 'Taipei', label: '臺北市' },
  { value: 'NewTaipei', label: '新北市' },
  { value: 'Taoyuan', label: '桃園市' },
  { value: 'Taichung', label: '臺中市' },
  { value: 'Tainan', label: '臺南市' },
  { value: 'Kaohsiung', label: '高雄市' },
  { value: 'Keelung', label: '基隆市' },
];
const pageStatus = {};

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

const tourismApi = axios.create({
  baseURL: 'https://ptx.transportdata.tw/MOTC/v2/Tourism',
  headers: getAuthorizationHeader(),
});

const getData = function (topic, cityLabel, perPage) {
  const city = cityOpts.find(c => c.label === cityLabel).value;
  const url = `/${topic.url}/${city}`;
  pageStatus[url] ? pageStatus[url]++ : pageStatus[url] = 1;
  tourismApi.get(url, {
    params: {
      $skip: (pageStatus[url] - 1) * perPage,
      $top: perPage,
      $filter: 'Picture/PictureUrl1 ne null',
      $format: 'JSON',
    }
  }).then(response => {
    if (!response.data.length) {
      pageStatus[url] = 0;
    }
    topic.dataArr = response.data;
  })
}

const app = {
  data() {
    return {
      citySelected: {},
      cityOpts: cityOpts,
      showCity: false,
      monthSelected: {},
      monthOpts: [
        { value: '1', label: '一月' }, { value: '2', label: '二月' }, { value: '3', label: '三月' },
        { value: '4', label: '四月' }, { value: '5', label: '五月' }, { value: '6', label: '六月' },
        { value: '7', label: '七月' }, { value: '8', label: '八月' }, { value: '9', label: '九月' },
        { value: '10', label: '十月' }, { value: '11', label: '十一月' }, { value: '12', label: '十二月' },
      ],
      showMonth: false,
      searchString: '',
      topics: [
        {
          id: 0,
          label: '旅宿',
          value: 'hotels',
          url: 'Hotel',
          moreClass: 'more more-hotels',
          dataArr: [],
        },
        {
          id: 1,
          label: '餐飲',
          value: 'foods',
          url: 'Restaurant',
          moreClass: 'more more-foods',
          dataArr: [],
        },
        {
          id: 2,
          label: '活動',
          value: 'activities',
          url: 'Activity',
          moreClass: 'more more-activities',
          dataArr: [],
        },
        {
          id: 3,
          label: '收藏',
          value: 'liked',
          dataArr: [],
        }
      ],
      showing: ['hotels', 'foods', 'activities'],
      showingLiked: false,
    };
  },
  mounted() {
    this.citySelected = '臺中市';
    this.monthSelected = '未定';
    this.search();
  },
  computed: {
    topicsShown() {
      return this.topics.filter(t => this.showing.includes(t.value));
    }
  },
  methods: {
    changeToShow(show) {
      this.showingLiked = (show === 'liked');
      switch (show) {
        case 'all':
          this.showing = ['hotels', 'foods', 'activities'];
          break;
        default:
          this.showing = [show];
          break;
      }
    },
    showCities() {
      this.showCity = true;
    },
    selectCity(opt) {
      this.citySelected = opt.label;
      this.showCity = false;
    },
    showMonths() {
      this.showMonth = true;
    },
    selectMonth(opt) {
      this.monthSelected = opt.label;
      this.showMonth = false;
    },
    search() {
      const perPage = this.showing.length === 1 ? 12 : 6
      for (let i = 0; i < 3; i++) {
        const targetTopic = this.topics[i];
        getData(targetTopic, this.citySelected, perPage);
      }
    },
    moreClicked(topic) {
      const targetTopic = this.topics[topic.id];
      const perPage = this.showing.length === 1 ? 12 : 6
      getData(targetTopic, this.citySelected, perPage);
    },
    getArea(data, topic) {
      switch (topic.value) {
        case 'hotels':
          const address = data.Address;
          const idx1 = address.indexOf('市');
          const idx2 = address.indexOf('區');
          const area = `${address.substring(0, idx1 + 1)} ${address.substring(idx1 + 1, idx2 + 1)}`;
          return area;
        case 'foods':
          return data.City;
        case 'activities':
          return data.Location;
      }
    },
    toggleLike(data) {
      data.liked = !data.liked;
      if (data.liked) {
        this.topics[3].dataArr.push(data);
      }
      if (!data.liked) {
        const toRemove = this.topics[3].dataArr.findIndex(d => d.ID === data.ID);
        this.topics[3].dataArr.splice(toRemove, 1);
      }
    },
  }
};

createApp(app).mount('#app');
