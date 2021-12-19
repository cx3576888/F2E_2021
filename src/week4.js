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

const chinese = {
  age: '年齡',
  company: {
    prefix: '目前公司',
    area: '公司位置',
    industry: '產業類型',
    industry_message: '產業簽到區',
    job_tenure: '工作年資',
    people: '相同職位人數',
    salary: '年薪範圍',
    salary_score: '薪水滿意度',
    scale: '公司規模人數',
    score: '產業滿意度',
    work: '工作型態',
  },
  education: '學歷',
  first_job: {
    prefix: '第一份工作',
    content: '工作內容',
    leave: '離職原因',
    position: '被要求非前端工程師的技能',
    render: '接觸到哪一種開發模式',
    skill: '公司所導入的技能',
    skill: '你掌握哪些開發技能',
    software: '公司主要使用哪些繪圖軟體',
    tenure: '年資',
  },
  gender: '性別',
  job: '職稱',
  major: '科系',
  works: {
    prefix: '工作相關',
    market: '自評工作能力範圍',
    window: '主要是哪些窗口有溝通障礙',
  },
}

function toChinese(key) {
  const parts = key.split('-');
  if (parts.length === 1) {
    return chinese[parts[0]];
  }
  if (parts.length === 2) {
    return `${chinese[parts[0]].prefix}-${chinese[parts[0]][parts[1]]}`;
  }
}

const multiSelectQues = [
  'first_job-content', 'first_job-position', 'first_job-skill', 'first_job-render', 'first_job-software', 'works-window'
];

const exceptions = [
  { start: '任務指派工具（Trello', end: 'Asana...）' },
  { start: 'UI Prototype 或設計稿標示工具（Adobe XD', end: 'Figma）' },
  { start: 'Git', end: 'SVN' },
  { start: '測試（Unit Test', end: 'E2E Test）' },
];

function organize(datas) {
  const ret = {};
  datas.forEach(data => {
    const isFE = data['job'] === '前端工程師';
    addProperty(data, ret, null, isFE);
  });
  return ret;
}

function addProperty(data, ret, prefix, isFE) {
  for (const prop in data) {
    if (typeof data[prop] === 'object') {
      addProperty(data[prop], ret, prop, isFE);
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
          addCount(ret[key], v, isFE);
        });
      } else {
        addCount(ret[key], value, isFE);
      }
    }
  }
}

function addCount(xLabelArray, value, isFE) {
  let found = xLabelArray.find(l => l.xLabel === value);
  if (!found) {
    found = { xLabel: value, countUI: 0, countFE: 0 };
    xLabelArray.push(found);
  }
  isFE ? found.countFE++ : found.countUI++;
}

const defaults = {
  job: ['fe'],
  factor: 'age',
  type: 'bar',
};
const app = createApp({
  setup() {
    const noData = ref(false);
    const initDone = ref(false);
    const selected = ref({
      xLabel: defaults.factor,
      job: [],
      type: defaults.type,
    });

    const jobs = ref([
      { id: 0, value: 'fe', label: '前端工程師' },
      { id: 1, value: 'ui', label: 'UI設計師' },
    ]);
    const factors = ref([]);
    const types = ref([
      { id: 0, value: 'pie', label: '圓餅圖' },
      { id: 1, value: 'bar', label: '長條圖' },
      { id: 2, value: 'line', label: '折線圖' },
    ]);

    const changeData = (job) => {
      const newStatus = !job.checked;
      if (newStatus) {
        selected.value.job.push(job.value);
      } else {
        const idx = selected.value.job.findIndex(j => j === job.value);
        selected.value.job.splice(idx, 1);
      }
      drawChart();
    }

    const changeX = (factor) => {
      factors.value.forEach(f => f.checked = false);
      const unselect = (selected.value.xLabel === factor.value);
      selected.value.xLabel = unselect ? null : factor.value;
      drawChart();
    }

    const changeType = (type) => {
      if (!initDone.value) {
        return;
      }
      selected.value.type = type.value;
      drawChart();
    }

    let dataByFactor = {};
    onMounted(() => {
      getData()
        .then(results => {
          dataByFactor = organize(results[0].data.concat(results[1].data));
          for (const factor in dataByFactor) {
            factors.value.push({
              id: factors.value.length,
              value: factor,
              label: toChinese(factor),
              checked: factor === defaults.factor
            });
          }
          jobs.value.forEach(j => {
            if (defaults.job.includes(j.value)) {
              changeData(j);
              j.checked = true;
            }
          });
        });
    });

    function drawChart() {
      if (!selected.value.job.length || selected.value.xLabel === null) {
        noData.value = true;
        return;
      }
      noData.value = false;
      destroyChart();
      initDone.value = false;
      initChart(dataByFactor, selected.value, initDoneCb);
    }

    function initDoneCb() {
      initDone.value = true;
    }

    return {
      noData,
      initDone,
      selected,
      jobs,
      factors,
      types,
      changeData,
      changeX,
      changeType,
    }
  }
});
app.mount('#app');

let myChart;
function destroyChart() {
  if (myChart) {
    myChart.destroy();
  }
}

function initChart(dataByFactor, selected, callback) {
  const addFE = selected.job.includes('fe');
  const addUI = selected.job.includes('ui');
  const labels = [];
  const datas = [];
  dataByFactor[selected.xLabel].forEach(l => {
    let count = (addFE ? l.countFE : 0) + (addUI ? l.countUI : 0);
    if (count > 0) {
      labels.push(l.xLabel);
      datas.push(count);
    }
  });
  myChart = new Chart(
    document.querySelector('#myChart'),
    {
      type: selected.type,
      data: {
        labels: labels,
        datasets: [{
          label: '人數',
          backgroundColor: 'lightblue',
          borderColor: 'blue',
          data: datas,
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
