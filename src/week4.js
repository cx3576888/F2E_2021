import axios from "axios";
import { createApp, ref, onMounted } from "vue/dist/vue.esm-browser";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

function getData() {
  const url = 'https://raw.githubusercontent.com/hexschool/2021-ui-frontend-job/master';
  return Promise.all([
    axios.get(`${url}/frontend_data.json`),
    axios.get(`${url}/ui_data.json`)
  ]);
}

const multiSelectQues = [
  'first_job-content', 'first_job-position', 'first_job-skill', 'first_job-render', 'first_job-software', 'works-window'
];

const exceptions = [
  { start: '任務指派工具（Trello', end: 'Asana...）' },
  { start: 'UI Prototype 或設計稿標示工具（Adobe XD', end: 'Figma）' },
  { start: '測試（Unit Test', end: 'E2E Test）' },
];

function organize(datas) {
  const ret = {};
  datas.forEach(data => {
    addProperty(data, ret);
  });
  return ret;
}

function addProperty(data, ret, prefix) {
  for (const prop in data) {
    if (typeof data[prop] === 'object') {
      addProperty(data[prop], ret, prop)
    } else {
      const key = prefix ? `${prefix}-${prop}` : prop;
      const value = data[prop];
      if (!ret.hasOwnProperty(key)) {
        ret[key] = [];
      }
      if (multiSelectQues.includes(key)) {
        const valueArr = value.split(', ');
        valueArr.forEach(v => {
          const isException = exceptions.find(e => e.start === v);
          const isExceptionEnd = exceptions.find(e => e.end === v);
          if (isException) {
            v = `${isException.start}, ${isException.end}`;
          }
          if (isExceptionEnd) {
            return;
          }
          if (!ret[key].includes(v)) {
            ret[key].push(v)
          }
        });
      } else {
        if (!ret[key].includes(value)) {
          ret[key].push(value)
        }
      }
    }
  }
}

const defaults = {
  job: 'ui',
  factors: ['gender'],
  type: 'line',
};
const app = createApp({
  setup() {
    const initDone = ref(false);
    const selected = ref({
      data: {},
      type: defaults.type,
    });
    const myChart = ref({});

    const jobs = ref([
      { id: 0, value: 'fe', label: '前端工程師' },
      { id: 1, value: 'ui', label: 'UI設計師' },
    ]);
    jobs.value.forEach(j => j.checked = (j.value === defaults.job));

    const factors = ref([]);
    factors.value.push({ id: 0, value: 'gender', label: '性別' });
    factors.value.push({ id: 1, value: 'age', label: '年齡' });
    factors.value.push({ id: 2, value: 'education', label: '學歷' });
    factors.value.push({ id: 3, value: 'major', label: '科系' });
    factors.value.forEach(f => f.checked = defaults.factors.includes(f.value));

    const types = ref([
      { id: 0, value: 'pie', label: '圓餅圖' },
      { id: 1, value: 'bar', label: '長條圖' },
      { id: 2, value: 'line', label: '折線圖' },
    ]);

    const changeData = () => {
      setTimeout(() => {
        if (jobs.value[0].checked && jobs.value[1].checked) {
          selected.value.data = allData;
        }
        if (jobs.value[0].checked && !jobs.value[1].checked) {
          selected.value.data = feData;
        }
        if (!jobs.value[0].checked && jobs.value[1].checked) {
          selected.value.data = uiData;
        }
        if (!jobs.value[0].checked && !jobs.value[1].checked) {
          selected.value.data = null;
        }
        destroyChart(myChart.value);
        initDone.value = false;
        myChart.value = initChart(selected.value, initDoneCb);
      });
    }

    const changeType = (type) => {
      if (!initDone.value) {
        return;
      }
      selected.value.type = type.value;
      destroyChart(myChart.value);
      initDone.value = false;
      myChart.value = initChart(selected.value, initDoneCb);
    }

    let feData = {};
    let uiData = {};
    let allData = {};
    onMounted(() => {
      getData()
        .then(results => {
          feData = organize(results[0].data);
          uiData = organize(results[1].data);
          allData = organize(results[0].data.concat(results[1].data));
          changeData();
        });
    });

    function initDoneCb() {
      initDone.value = true;
    }

    return {
      selected,
      jobs,
      factors,
      types,
      initDone,
      changeData,
      changeType,
    }
  }
});
app.mount('#app');

function destroyChart(chart) {
  if (chart.destroy) {
    chart.destroy();
  }
}

function initChart(selected, callback) {
  console.log(selected.data);
  return new Chart(
    document.querySelector('#myChart'),
    {
      type: selected.type,
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July'],
        datasets: [{
          label: 'My first dataset',
          backgroundColor: 'pink',
          borderColor: 'lightblue',
          data: [0, 10, 5, 2, 20, 30, 45],
        }],
      },
      options: {
        animation: {
          onComplete: () => {
            callback();
          },
        },
      },
    }
  )
}
