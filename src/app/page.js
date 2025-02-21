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

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, BarElement
)

// Define API URLs based on the environment
let windInfoUrl = '';
let bigRiseVolumeStockUrl = '';
let tradingCrowdingUrl = '';
let industryListUrl = '';
if (typeof window !== 'undefined') {
  const origin = window.location.origin;

  // Helper function to create URLs
  const createUrl = (path) => {
    const baseUrl = origin === 'http://127.0.0.1:3000'
      ? 'http://127.0.0.1:8000/stock/api'
      : 'https://www.lian-yolo.com/stock/api';
    return `${baseUrl}${path}`;
  };

  windInfoUrl = createUrl('/wind-info/');
  bigRiseVolumeStockUrl = createUrl('/big-rise-volume/');
  tradingCrowdingUrl = createUrl('/trading-crowding/');
  industryListUrl = createUrl('/industry-list/');
}

export default function Home() {
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  // State for industry list
  const [industryOptions, setIndustryOptions] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);

  // State for windInfo
  const [windInfoData, setWindInfoData] = useState([]);
  const [windInfoLoading, setWindInfoLoading] = useState(true);
  const [windInfoError, setWindInfoError] = useState(null);

  // State for bigRiseVolumeStock
  const [rise, setRise] = useState(8);
  const [bigRiseVolumeStockData, setBigRiseVolumeStockData] = useState([]);
  const [bigRiseVolumeStockLoading, setBigRiseVolumeStockLoading] = useState(true);
  const [bigRiseVolumeStockError, setBigRiseVolumeStockError] = useState(null);

  // State for tradingCrowding
  const [tradingCrowdingData, setTradingCrowdingData] = useState(null);
  const [showTradingCrowdingBtn, setShowTradingCrowdingBtn] = useState(true);

  // Fetch industry list on mount
  useEffect(() => {
    fetchIndustryList();
  }, []);

  // Fetch wind info data on mount
  useEffect(() => {
    fetchWindInfoData();
  }, []);

  // Fetch big rise volume stock data when rise value changes
  useEffect(() => {
    fetchBigRiseVolumeStockData(rise);
  }, [rise]);

  // Function to fetch industry list data
  const fetchIndustryList = async () => {
    try {
      const res = await axios.get(industryListUrl);
      setIndustryOptions(res.data.data.map(item => ({ value: item, label: item })));
    } catch (err) {
      console.error('Failed to load industry list:', err);
    }
  };

  // Function to fetch wind info data
  const fetchWindInfoData = async () => {
    try {
      const res = await axios.get(windInfoUrl);
      const data = res.data.data.Result;
      setWindInfoData(data);
    } catch (err) {
      setWindInfoError(err.message);
    } finally {
      setWindInfoLoading(false);
    }
  };

  // Function to fetch big rise volume stock data
  const fetchBigRiseVolumeStockData = async (riseValue) => {
    try {
      const apiUrl = `${bigRiseVolumeStockUrl}?rise=${riseValue}`;
      const res = await axios.get(apiUrl);
      const data = formatStockData(res.data.data);
      const defaultTradingCrowdingIndustry = data[0].industries.map(item => ({
        value: item.key,
        label: item.key
      }));
      setSelectedIndustries(defaultTradingCrowdingIndustry);
      setBigRiseVolumeStockData(data);
    } catch (err) {
      setBigRiseVolumeStockError(err.message);
    } finally {
      setBigRiseVolumeStockLoading(false);
    }
  };

  // Function to format big rise volume stock data
  const formatStockData = (data) => {
    const dateEntries = Object.entries(data);
    const formattedData = dateEntries.map(([date, industries]) => {
      const industryEntries = Object.entries(industries);
      const sortedIndustries = industryEntries.sort((a, b) => b[1].length - a[1].length);
      const topIndustries = sortedIndustries.slice(0, 5);

      const industryElements = topIndustries.map(([industry, stocks]) => {
        const COLUMN_COUNT = 5;
        const stockRows = [];
        for (let i = 0; i < stocks.length; i += COLUMN_COUNT) {
          stockRows.push(stocks.slice(i, i + COLUMN_COUNT));
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

        return {
          key: industry, // Add key for industry reference
          element: (
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
          )
        };
      });
      return {
        date: dayjs(date).format('YYYY-MM-DD'),
        industries: industryElements
      };
    });
    return formattedData.sort((a, b) => dayjs(b.date) - dayjs(a.date));
  };

  // Function to fetch trading crowding data
  const getTradingCrowding = async (date) => {
    if (selectedIndustries.length === 0) {
      alert('Please select at least one industry');
      return;
    }

    setTradingCrowdingData(prev => ({
      ...prev,
      [date]: { loading: true }
    }));

    const industryList = selectedIndustries.map(industry => industry.value);

    try {
      const jsonData = {
        industry_list: industryList,
        latest_trade_date: date
      };
      const res = await axios.post(tradingCrowdingUrl, jsonData, {
        headers: { 'Content-Type': 'application/json' }
      });
      const apiData = res.data.data;
      const dates = Object.keys(apiData).sort((a, b) => dayjs(a) - dayjs(b));

      const colors = [
        'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'
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
          tension: 0.2
        };
      });
      const crowdingChartData = { labels: dates, datasets };
      setTradingCrowdingData(prev => ({
        ...prev,
        [date]: { loading: false, data: crowdingChartData }
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

  // Chart configurations
  const latestWindInfo = windInfoData.length > 0 ? windInfoData[windInfoData.length - 1] : null;

  const windChartData = {
    labels: windInfoData.map(item => dayjs(item.tradeDate).format('YYYY-MM-DD')),
    datasets: [{
      label: '万得全A',
      data: windInfoData.map(item => item.close),
      borderColor: 'rgba(75, 192, 192, 1)',
      fill: false
    }]
  };

  const windChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '万得全A指数走势（08:30更新前一天数据）',
        font: { size: 20 }
      }
    },
    scales: {
      x: { ticks: { display: false }, grid: { display: false } },
      y: { display: false, ticks: { display: false }, grid: { display: false } }
    }
  };

  const windBarChartData = {
    labels: windInfoData.map(item => dayjs(item.tradeDate).format('YYYY-MM-DD')),
    datasets: [{
      label: '成交额 (Amount)',
      data: windInfoData.map(item => item.amount),
      backgroundColor: windInfoData.map(item => item.pctChange > 0 ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 128, 0, 0.7)')
    }]
  };

  const windBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => `成交额: ${(context.raw / 1e12).toFixed(2)} 万亿元`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: { display: false, grid: { display: false }, ticks: { display: false } }
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
        font: { size: 20 }
      }
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
            if (total < 3) return this.getLabelForValue(value);
            if (index === 0 || index === total - 1 || index === Math.floor(total / 2)) {
              return this.getLabelForValue(value);
            }
            return '';
          }
        }
      },
      y: { ticks: { callback: value => `${(value * 100).toFixed(2)}%` } }
    }
  };

  // Handle rise value change
  const handleRiseChange = (event) => {
    const selectedValue = parseInt(event.target.value, 10);
    setBigRiseVolumeStockLoading(true);
    setRise(selectedValue);
  };

  // Render the component
  return (
    <>
      {/* Wind Info Section */}
      {windInfoLoading ? (
        <div className="p-4 text-gray-600">Loading...</div>
      ) : windInfoError ? (
        <div className="p-4 text-red-500">Error loading chart: {windInfoError}</div>
      ) : (
        <>
          {latestWindInfo && (
            <div className="absolute top-8 right-8 bg-white p-2 rounded-lg shadow text-sm">
              <div>Date: {dayjs(latestWindInfo.tradeDate).format('YYYY-MM-DD')}</div>
              <div>Change: {latestWindInfo.pctChange.toFixed(2)}%</div>
              <div>Amount: {(latestWindInfo.amount / 1e8).toFixed(2)} billion CNY</div>
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

      {/* Big Rise Volume Stock and Trading Crowding Section */}
      <div className="p-6 max-w-8xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Stock Anomalies (Rise over
          <select value={rise} onChange={handleRiseChange} className="w-8 inline-block ml-1">
            {[...Array(10).keys()].map(num => (
              <option key={num + 6} value={num + 6}>{num + 6}</option>
            ))}
          </select>
          %) Data (Updated at 17:30 daily)
        </h1>

        {bigRiseVolumeStockLoading ? (
          <div className="p-4 text-gray-600">Loading...</div>
        ) : bigRiseVolumeStockError ? (
          <div className="p-4 text-red-500">Error: {bigRiseVolumeStockError}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-center text-[20px]">Date</th>
                <th className="px-4 py-2 text-left text-[20px]">
                  Industry (Number of stocks, Average change, Total amount) {isMobile ? '' : 'and Stock Information'}
                </th>
              </tr>
            </thead>
            <tbody>
              {bigRiseVolumeStockData.map((data, idx) => {
                const chartState = (tradingCrowdingData || {})[data.date] || {};
                return (
                  <tr key={data.date} className="hover:bg-gray-50">
                    <td className="text-center px-4 py-2 whitespace-nowrap align-top">{data.date}</td>
                    <td className="py-2">
                      <table className="w-full">
                        <tbody>{data.industries.map(item => item.element)}</tbody>
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
                                placeholder="Select industries..."
                                closeMenuOnSelect={false}
                              />
                            </div>
                            <button
                              onClick={() => getTradingCrowding(data.date)}
                              className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                              Get Trading Crowding
                            </button>
                          </div>
                        </div>
                      )}
                      {chartState.loading ? (
                        <div className="p-4 text-gray-600 max-w-8xl mx-auto">Loading trading crowding...</div>
                      ) : chartState.error ? (
                        <div className="p-4 text-red-500 max-w-8xl mx-auto">Error getting trading crowding: {chartState.error}</div>
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
