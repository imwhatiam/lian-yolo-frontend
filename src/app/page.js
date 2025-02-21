'use client'
import axios from 'axios'
import dayjs from 'dayjs'
import Select from 'react-select'
import { useState, useEffect } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip,
  Legend, BarElement
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, BarElement
)

// Set API endpoints based on current origin
let windInfoUrl = '';
let bigRiseVolumeStockUrl = '';
let tradingCrowdingUrl = '';
let industryListUrl = '';
if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  windInfoUrl =
    origin === 'http://127.0.0.1:3000'
      ? 'http://127.0.0.1:8000/stock/api/wind-info/'
      : origin === 'https://www.lian-yolo.com'
      ? 'https://www.lian-yolo.com/stock/api/wind-info/'
      : '';

  bigRiseVolumeStockUrl =
    origin === 'http://127.0.0.1:3000'
      ? 'http://127.0.0.1:8000/stock/api/big-rise-volume/'
      : origin === 'https://www.lian-yolo.com'
      ? 'https://www.lian-yolo.com/stock/api/big-rise-volume/'
      : '';

  tradingCrowdingUrl =
    origin === 'http://127.0.0.1:3000'
      ? 'http://127.0.0.1:8000/stock/api/trading-crowding/'
      : origin === 'https://www.lian-yolo.com'
      ? 'https://www.lian-yolo.com/stock/api/trading-crowding/'
      : '';

  industryListUrl =
    origin === 'http://127.0.0.1:3000'
      ? 'http://127.0.0.1:8000/stock/api/industry-list/'
      : origin === 'https://www.lian-yolo.com'
      ? 'https://www.lian-yolo.com/stock/api/industry-list/'
      : '';
}

// ---------------- Helper Functions ---------------- //

// Fetch industry list data
async function getIndustryList(url) {
  try {
    const res = await axios.get(url);
    return res.data.data.map(item => ({ value: item, label: item }));
  } catch (err) {
    console.error('Failed to load industry list:', err);
    return [];
  }
}

// Fetch wind info data
async function getWindInfoData(url) {
  try {
    const res = await axios.get(url);
    return res.data.data.Result;
  } catch (err) {
    throw new Error(err.message);
  }
}

// Prepare chart data for wind info line chart
function getWindChartData(windInfoData) {
  const labels = windInfoData.map(item => dayjs(item.tradeDate).format('YYYY-MM-DD'));
  const closePrices = windInfoData.map(item => item.close);
  return {
    labels,
    datasets: [{
      label: '万得全A',
      data: closePrices,
      borderColor: 'rgba(75, 192, 192, 1)',
      fill: false,
    }]
  };
}

// Prepare chart data for wind info bar chart
function getWindBarChartData(windInfoData) {
  const labels = windInfoData.map(item => dayjs(item.tradeDate).format('YYYY-MM-DD'));
  const amounts = windInfoData.map(item => item.amount);
  const colors = windInfoData.map(item =>
    item.pctChange > 0 ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 128, 0, 0.7)'
  );
  return {
    labels,
    datasets: [{
      label: '成交额 (Amount)',
      data: amounts,
      backgroundColor: colors,
    }]
  };
}

// Format stock data for big rise volume stocks table
function formatStockData(data, isMobile) {
  const dateEntries = Object.entries(data);
  const formattedData = dateEntries.map(([date, industries]) => {
    const industryEntries = Object.entries(industries);
    const sortedIndustries = industryEntries.sort((a, b) => b[1].length - a[1].length);
    // Take top 5 industries
    const topIndustries = sortedIndustries.slice(0, 5);
    const industryElements = topIndustries.map(([industry, stocks]) => {
      const COLUMN_COUNT = 5;
      const stockRows = [];
      for (let i = 0; i < stocks.length; i += COLUMN_COUNT) {
        const rowStocks = stocks.slice(i, i + COLUMN_COUNT);
        stockRows.push(rowStocks);
      }
      const stockElements = stockRows.map((rowStocks, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-x-2 mb-1.5">
          {rowStocks.map((stock) => {
            const [stockName, changePct, money] = stock;
            return (
              <span key={stockName} className="text-nowrap text-sm">
                {stockName}（
                <span className="text-red-500">{changePct.toFixed(2)}%</span>
                ，{(money / 1e8).toFixed(2)}亿元）
              </span>
            );
          })}
        </div>
      ));

      const stockCount = stocks.length;
      const totalChange = stocks.reduce((sum, item) => sum + item[1], 0);
      const avgChange = (totalChange / stockCount).toFixed(2);
      const totalMoney = stocks.reduce((sum, item) => sum + item[2], 0);
      const avgMoney = (totalMoney / 1e8).toFixed(2);

      return (
        <tr key={industry} className="border-t hover:bg-gray-50">
          {isMobile ? (
            <td className="px-4 py-2 whitespace-nowrap">
              {industry} {stockCount}，{avgChange}%，{avgMoney}亿元
            </td>
          ) : (
            <>
              <td className="px-4 py-2 whitespace-nowrap">
                {industry} <br /> {stockCount}，{avgChange}% <br /> {avgMoney}亿元
              </td>
              <td className="px-4 py-2">{stockElements}</td>
            </>
          )}
        </tr>
      );
    });
    return {
      date: dayjs(date).format('YYYY-MM-DD'),
      industries: industryElements,
    };
  });
  return formattedData.sort((a, b) => dayjs(b.date) - dayjs(a.date));
}

// Fetch big rise volume stock data and format it
async function getBigRiseVolumeStockData(url, riseValue, isMobile) {
  try {
    const apiUrl = `${url}?rise=${riseValue}`;
    const res = await axios.get(apiUrl);
    return formatStockData(res.data.data, isMobile);
  } catch (err) {
    throw new Error(err.message);
  }
}

// Build trading crowding chart data from API response
function buildTradingCrowdingChartData(apiData, industryList) {
  const dates = Object.keys(apiData).sort((a, b) => dayjs(a) - dayjs(b));
  const colors = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)'
  ];
  const datasets = industryList.map((industry, idx) => {
    const data = dates.map(date => {
      const dayData = apiData[date];
      const industryValue = dayData[industry] || 0;
      return industryValue / dayData.total_money;
    });
    return {
      label: industry,
      data,
      borderColor: colors[idx % colors.length],
      fill: false,
      tension: 0.2,
    };
  });
  return {
    labels: dates,
    datasets,
  };
}

// Fetch trading crowding data for given industries and date
async function getTradingCrowding(selectedIndustries, date) {
  if (selectedIndustries.length === 0) {
    alert('请至少选择一个行业');
    return;
  }
  const industryList = selectedIndustries.map(industry => industry.value);
  const jsonData = {
    industry_list: industryList,
    latest_trade_date: date
  };
  const res = await axios.post(tradingCrowdingUrl, jsonData, {
    headers: { 'Content-Type': 'application/json' }
  });
  const apiData = res.data.data;
  return buildTradingCrowdingChartData(apiData, industryList);
}

// ---------------- Main Component ---------------- //

export default function Home() {
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  // ---------------- Industry List ---------------- //
  const [industryOptions, setIndustryOptions] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);

  useEffect(() => {
    // Fetch industry list on component mount
    async function loadIndustryList() {
      const options = await getIndustryList(industryListUrl);
      setIndustryOptions(options);
    }
    loadIndustryList();
  }, []);

  // ---------------- Wind Info Data ---------------- //
  const [windInfoData, setWindInfoData] = useState([]);
  const [windInfoLoading, setWindInfoLoading] = useState(true);
  const [windInfoError, setWindInfoError] = useState(null);

  useEffect(() => {
    // Fetch wind info data on component mount
    async function loadWindInfoData() {
      try {
        const data = await getWindInfoData(windInfoUrl);
        setWindInfoData(data);
      } catch (err) {
        setWindInfoError(err.message);
      } finally {
        setWindInfoLoading(false);
      }
    }
    loadWindInfoData();
  }, []);

  const latestWindInfo = windInfoData.length > 0 ? windInfoData[windInfoData.length - 1] : null;
  const windChartData = getWindChartData(windInfoData);
  const windChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '万得全A指数走势（08:30更新前一天数据）',
        font: { size: 20 },
      },
    },
    scales: {
      x: {
        ticks: { display: false },
        grid: { display: false },
      },
      y: {
        display: false,
        ticks: { display: false },
        grid: { display: false },
      },
    },
  };

  const windBarChartData = getWindBarChartData(windInfoData);
  const windBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const value = context.raw / 1e12;
            return `成交额: ${value.toFixed(2)} 万亿元`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { display: false },
      },
      y: {
        display: false,
        grid: { display: false },
        ticks: { display: false },
      },
    },
  };

  // ---------------- Big Rise Volume Stock Data ---------------- //
  const [rise, setRise] = useState(8);
  const [bigRiseVolumeStockData, setBigRiseVolumeStockData] = useState([]);
  const [bigRiseVolumeStockLoading, setBigRiseVolumeStockLoading] = useState(true);
  const [bigRiseVolumeStockError, setBigRiseVolumeStockError] = useState(null);

  useEffect(() => {
    // Fetch big rise volume stock data when 'rise' value changes
    async function loadBigRiseVolumeStockData() {
      try {
        const data = await getBigRiseVolumeStockData(bigRiseVolumeStockUrl, rise, isMobile);
        // Set default trading crowding industries based on first data entry
        if (data.length > 0) {
          // Replicating original behavior: extract industry key from each industry element
          const defaultTradingCrowdingIndustry = data[0].industries.map(item => ({
            value: item.key,
            label: item.key
          }));
          setSelectedIndustries(defaultTradingCrowdingIndustry);
        }
        setBigRiseVolumeStockData(data);
      } catch (err) {
        setBigRiseVolumeStockError(err.message);
      } finally {
        setBigRiseVolumeStockLoading(false);
      }
    }
    loadBigRiseVolumeStockData();
  }, [rise, isMobile]);

  const handleRiseChange = (event) => {
    const selectedValue = parseInt(event.target.value, 10);
    setBigRiseVolumeStockLoading(true);
    setRise(selectedValue);
  };

  // ---------------- Trading Crowding Data ---------------- //
  const [tradingCrowdingData, setTradingCrowdingData] = useState({});
  const [tradingCrowdingLoading, setTradingCrowdingLoading] = useState(false);
  const [showTradingCrowdingBtn, setShowTradingCrowdingBtn] = useState(true);

  const handleGetTradingCrowding = async (date) => {
    if (selectedIndustries.length === 0) {
      alert('请至少选择一个行业');
      return;
    }
    // Set loading state for trading crowding of the given date
    setTradingCrowdingData(prev => ({
      ...prev,
      [date]: { loading: true }
    }));
    setTradingCrowdingLoading(true);
    try {
      const chartData = await getTradingCrowding(selectedIndustries, date);
      setTradingCrowdingData(prev => ({
        ...prev,
        [date]: { loading: false, data: chartData }
      }));
    } catch (err) {
      setTradingCrowdingData(prev => ({
        ...prev,
        [date]: { loading: false, error: err.message }
      }));
    } finally {
      setShowTradingCrowdingBtn(true);
    }
  };

  const tradingCrowdingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text: '交易拥挤度（板块总成交额/全市场总成交额）',
        font: { size: 20 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          callback: function(value, index, ticks) {
            const total = ticks.length;
            if (total < 3) {
              return this.getLabelForValue(value);
            }
            if (index === 0 || index === total - 1 || index === Math.floor(total / 2)) {
              return this.getLabelForValue(value);
            }
            return '';
          }
        },
      },
      y: {
        ticks: {
          callback: (value) => `${(value * 100).toFixed(2)}%`
        },
      },
    },
  };

  // ---------------- Render ---------------- //
  return (
    <>
      {windInfoLoading ? (
        <div className="p-4 text-gray-600">加载中...</div>
      ) : windInfoError ? (
        <div className="p-4 text-red-500">图表加载错误：{windInfoError}</div>
      ) : (
        <>
          {latestWindInfo && (
            <div className="absolute top-8 right-8 bg-white p-2 rounded-lg shadow text-sm">
              {/* Display latest wind info */}
              <div>日期: {dayjs(latestWindInfo.tradeDate).format('YYYY-MM-DD')}</div>
              <div>涨跌幅: {latestWindInfo.pctChange.toFixed(2)}%</div>
              <div>成交额: {(latestWindInfo.amount / 1e8).toFixed(2)} 亿元</div>
            </div>
          )}
          <div className="p-6 max-w-8xl mx-auto">
            <div className="bg-white p-4 rounded-lg border mb-6">
              <div style={{ height: '420px' }}>
                <Line data={windChartData} options={windChartOptions} />
              </div>
              <div style={{ height: '150px', marginTop: '10px' }}>
                <Bar data={windBarChartData} options={windBarChartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Big Rise Volume Stock Table */}
      <div className="p-6 max-w-8xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          股票异动（涨超
          <select value={rise} onChange={handleRiseChange} className="w-8 inline-block ml-1">
            {[...Array(10).keys()].map((num) => {
              const optionValue = num + 6;
              return (
                <option key={optionValue} value={optionValue}>
                  {optionValue}
                </option>
              );
            })}
          </select>
          %）数据（17:30更新当天数据）
        </h1>
        {bigRiseVolumeStockLoading ? (
          <div className="p-4 text-gray-600">加载中...</div>
        ) : bigRiseVolumeStockError ? (
          <div className="p-4 text-red-500">错误：{bigRiseVolumeStockError}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-center text-[20px]">日期</th>
                <th className="px-4 py-2 text-left text-[20px]">
                  行业（个股数量，平均涨幅，总成交额）{isMobile ? '' : '及股票信息'}
                </th>
              </tr>
            </thead>
            <tbody>
              {bigRiseVolumeStockData.map((data, idx) => {
                const chartState = (tradingCrowdingData || {})[data.date] || {};
                return (
                  <tr key={data.date} className="hover:bg-gray-50">
                    <td className="text-center px-4 py-2 whitespace-nowrap align-top">
                      {data.date}
                    </td>
                    <td className="py-2">
                      <table className="w-full">
                        <tbody>
                          {data.industries}
                        </tbody>
                      </table>
                      {idx === 0 && showTradingCrowdingBtn && (
                        <div className="flex items-center gap-4 pt-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Select
                                isMulti
                                defaultValue={selectedIndustries}
                                value={selectedIndustries}
                                onChange={setSelectedIndustries}
                                options={industryOptions}
                                placeholder="选择行业..."
                                closeMenuOnSelect={false}
                              />
                            </div>
                            <button
                              onClick={() => handleGetTradingCrowding(data.date)}
                              className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                              获取交易拥挤度
                            </button>
                          </div>
                        </div>
                      )}
                      {chartState.loading ? (
                        <div className="p-4 text-gray-600 max-w-8xl mx-auto">加载交易拥挤度中...</div>
                      ) : chartState.error ? (
                        <div className="p-4 text-red-500 max-w-8xl mx-auto">获取交易拥挤度错误：{chartState.error}</div>
                      ) : chartState.data && (
                        <div style={{ height: '420px' }}>
                          <Line data={chartState.data} options={tradingCrowdingChartOptions} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
