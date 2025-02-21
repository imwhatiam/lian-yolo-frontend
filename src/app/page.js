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

// -------------------- API Configuration --------------------
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

// -------------------- Custom Hooks --------------------

// Hook for fetching industry list
const useIndustryList = () => {
  const [industryOptions, setIndustryOptions] = useState([]);

  useEffect(() => {
    const fetchIndustryList = async () => {
      try {
        const res = await axios.get(industryListUrl);
        setIndustryOptions(res.data.data.map(item => ({ value: item, label: item })));
      } catch (err) {
        console.error('Industry list loading failed:', err);
      }
    };
    fetchIndustryList();
  }, []);

  return { industryOptions };
};

// Hook for Wind Info data and charts
const useWindInfo = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch wind info data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(windInfoUrl);
        setData(res.data.data.Result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Process chart data
  const processChartData = () => {
    const labels = data.map(item => dayjs(item.tradeDate).format('YYYY-MM-DD'));
    const closePrices = data.map(item => item.close);
    const amounts = data.map(item => item.amount);
    const colors = data.map(item => 
      item.pctChange > 0 ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 128, 0, 0.7)'
    );

    return {
      lineChart: {
        labels,
        datasets: [{
          label: '万得全A',
          data: closePrices,
          borderColor: 'rgba(75, 192, 192, 1)',
          fill: false,
        }]
      },
      barChart: {
        labels,
        datasets: [{
          label: '成交额 (Amount)',
          data: amounts,
          backgroundColor: colors,
        }]
      },
      latestInfo: data.length > 0 ? data[data.length - 1] : null
    };
  };

  return { ...processChartData(), loading, error };
};

// Hook for Big Rise Volume Stock data
const useBigRiseVolumeStock = (rise) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format stock data for display
  const formatStockData = (rawData) => {
    const dateEntries = Object.entries(rawData);
    return dateEntries.map(([date, industries]) => ({
      date: dayjs(date).format('YYYY-MM-DD'),
      industries: processIndustries(industries)
    })).sort((a, b) => dayjs(b.date) - dayjs(a.date));
  };

  // Process industry data
  const processIndustries = (industries) => {
    return Object.entries(industries)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([industry, stocks]) => ({
        industry,
        stocks,
        stats: {
          count: stocks.length,
          avgChange: (stocks.reduce((sum, item) => sum + item[1], 0) / stocks.length).toFixed(2),
          totalMoney: (stocks.reduce((sum, item) => sum + item[2], 0) / 1e8).toFixed(2)
        }
      }));
  };

  // Fetch stock data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${bigRiseVolumeStockUrl}?rise=${rise}`);
        setData(formatStockData(res.data.data));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rise]);

  return { data, loading, error };
};

// Hook for Trading Crowding data
const useTradingCrowding = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch crowding data
  const fetchData = async (date, industries) => {
    if (!industries.length) {
      alert('请至少选择一个行业');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(tradingCrowdingUrl, {
        industry_list: industries,
        latest_trade_date: date
      }, { headers: { 'Content-Type': 'application/json' } });

      processCrowdingData(res.data.data, industries, date);
    } catch (err) {
      setData(prev => ({ ...prev, [date]: { error: err.message } }));
    } finally {
      setLoading(false);
    }
  };

  // Process API response data
  const processCrowdingData = (apiData, industries, date) => {
    const dates = Object.keys(apiData).sort((a, b) => dayjs(a) - dayjs(b));
    const colors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)'
    ];

    const datasets = industries.map((industry, idx) => ({
      label: industry,
      data: dates.map(date => {
        const dayData = apiData[date];
        return (dayData[industry] || 0) / dayData.total_money;
      }),
      borderColor: colors[idx % colors.length],
      fill: false,
      tension: 0.2,
    }));

    setData(prev => ({
      ...prev,
      [date]: { data: { labels: dates, datasets } }
    }));
  };

  return { data, loading, fetchData };
};

// -------------------- Main Component --------------------
export default function Home() {
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  const [rise, setRise] = useState(8);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [showCrowdingBtn, setShowCrowdingBtn] = useState(true);

  // Custom hooks
  const { industryOptions } = useIndustryList();
  const { lineChart, barChart, latestInfo, loading: windLoading, error: windError } = useWindInfo();
  const { data: stockData, loading: stockLoading, error: stockError } = useBigRiseVolumeStock(rise);
  const { data: crowdingData, loading: crowdingLoading, fetchData: fetchCrowding } = useTradingCrowding();

  // -------------------- Chart Options --------------------
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
            const value = context.raw / 1e12
            return `成交额: ${value.toFixed(2)} 万亿元`
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

  const crowdingChartOptions = {
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

  // -------------------- Render Methods --------------------
  const renderIndustryStocks = (industry) => {
    const COLUMN_COUNT = 5;
    const stockRows = [];
    for (let i = 0; i < industry.stocks.length; i += COLUMN_COUNT) {
      const rowStocks = industry.stocks.slice(i, i + COLUMN_COUNT);
      stockRows.push(rowStocks);
    }

    return stockRows.map((rowStocks, rowIndex) => (
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
  };

  const renderCrowdingChart = (date) => {
    const chartState = crowdingData[date] || {};
    if (chartState.loading) {
      return <div className="p-4 text-gray-600 max-w-8xl mx-auto">加载交易拥挤度中...</div>;
    }
    if (chartState.error) {
      return <div className="p-4 text-red-500 max-w-8xl mx-auto">获取交易拥挤度错误：{chartState.error}</div>;
    }
    if (chartState.data) {
      return (
        <div style={{ height: '420px' }}>
          <Line
            data={chartState.data}
            options={crowdingChartOptions}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {windLoading ? (
        <div className="p-4 text-gray-600">加载中...</div>
      ) : windError ? (
        <div className="p-4 text-red-500">图表加载错误：{windError}</div>
      ) : (
        <>
          {latestInfo && (
            <div className="absolute top-8 right-8 bg-white p-2 rounded-lg shadow text-sm">
              <div>日期: {dayjs(latestInfo.tradeDate).format('YYYY-MM-DD')}</div>
              <div>涨跌幅: {latestInfo.pctChange.toFixed(2)}%</div>
              <div>成交额: {(latestInfo.amount / 1e8).toFixed(2)} 亿元</div>
            </div>
          )}
          <div className="p-6 max-w-8xl mx-auto">
            <div className="bg-white p-4 rounded-lg border mb-6">
              <div style={{ height: '420px' }}>
                <Line data={lineChart} options={windChartOptions} />
              </div>
              <div style={{ height: '150px', marginTop: '10px' }}>
                <Bar data={barChart} options={windBarChartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 股票表格 */}
      <div className="p-6 max-w-8xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          股票异动（涨超
          <select value={rise} onChange={(e) => setRise(parseInt(e.target.value, 10))} className="w-8 inline-block ml-1">
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

        {stockLoading ? (
          <div className="p-4 text-gray-600">加载中...</div>
        ) : stockError ? (
          <div className="p-4 text-red-500">错误：{stockError}</div>
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
              {stockData.map((data, idx) => {
                const chartState = crowdingData[data.date] || {};
                return (
                  <tr key={data.date} className="hover:bg-gray-50">
                    <td className="text-center px-4 py-2 whitespace-nowrap align-top">
                      {data.date}
                    </td>
                    <td className="py-2">
                      <table className="w-full">
                        <tbody>
                          {data.industries.map((industry) => (
                            <tr key={industry.industry} className="border-t hover:bg-gray-50">
                              {isMobile ? (
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {industry.industry} {industry.stats.count}，{industry.stats.avgChange}%，{industry.stats.totalMoney}亿元
                                </td>
                              ) : (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                      {industry.industry} <br /> {industry.stats.count}，{industry.stats.avgChange}% <br /> {industry.stats.totalMoney}亿元
                                  </td>
                                  <td className="px-4 py-2">{renderIndustryStocks(industry)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {idx === 0 && showCrowdingBtn && (
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
                              onClick={() => fetchCrowding(data.date, selectedIndustries.map(item => item.value))}
                              className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                              获取交易拥挤度
                            </button>
                          </div>
                        </div>
                      )}
                      {renderCrowdingChart(data.date)}
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
