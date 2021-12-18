import axios from "axios";
import { createApp, ref, onMounted } from "vue/dist/vue.esm-browser";

function getData() {
  const url = 'https://raw.githubusercontent.com/hexschool/2021-ui-frontend-job/master';
  return Promise.all([
    axios.get(`${url}/frontend_data.json`),
    axios.get(`${url}/ui_data.json`)
  ]);
}

const app = createApp({
  setup() {
    const jobs = ref([]);
    jobs.value.push({ id: 0, value: '前端工程師', checked: true });
    jobs.value.push({ id: 1, value: 'UI設計師', checked: false });

    const factors = ref([]);
    factors.value.push({ id: 0, value: '性別', checked: true });
    factors.value.push({ id: 1, value: '年齡', checked: false });
    factors.value.push({ id: 2, value: '學歷', checked: false });
    factors.value.push({ id: 3, value: '科系', checked: false });

    const types = ref([]);
    types.value.push({ id: 0, value: '圓餅圖', active: true });
    types.value.push({ id: 1, value: '長條圖', active: false });
    types.value.push({ id: 2, value: '折線圖', active: false });

    const changeType = (type) => {
      types.value.forEach(t => t.active = false);
      type.active = true;
    }

    const uiData = ref([]);
    const feData = ref([]);
    onMounted(() => {
      getData()
        .then(results => {
          uiData.value = results[0].data;
          feData.value = results[1].data;
          console.log('uiData_:', uiData.value);
          console.log('feData_:', feData.value);
        });
    });
    return {
      jobs,
      factors,
      types,
      changeType,
    }
  }
});
app.mount('#app');