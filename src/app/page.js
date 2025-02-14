'use client'
import axios from 'axios'
import dayjs from 'dayjs'
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

const formatStockData = (data) => {

  // Convert the data object to an array of [date, industries] entries
  const dateEntries = Object.entries(data)

  // Convert industries object to an array and sort industries by stock count descending
  const formattedData = dateEntries.map(([date, industries]) => {
    const industryEntries = Object.entries(industries)
    const sortedIndustries = industryEntries.sort((a, b) => {
      const aStockCount = a[1].length
      const bStockCount = b[1].length
      return bStockCount - aStockCount
    })

    // Take top 5 industries
    const topIndustries = sortedIndustries.slice(0, 5)

    // Process each industry
    const industryElements = topIndustries.map(([industry, stocks]) => {
      // Process each stock and create a span element
      const stockElements = stocks.map((stock, index) => {
        const [stockName, changePct, money] = stock
        return (
          <span key={stockName} className="inline-block w-100">
            {stockName}（
            <span className="text-red-500">{changePct.toFixed(2)}%</span>，
            {(money / 1e8).toFixed(2)}亿元）
            {index !== stocks.length - 1 && '，'}
          </span>
        )
      })

      // Calculate aggregated industry statistics
      const stockCount = stocks.length
      const totalChange = stocks.reduce((sum, item) => sum + item[1], 0)
      const avgChange = (totalChange / stockCount).toFixed(2)

      const totalMoney = stocks.reduce((sum, item) => sum + item[2], 0)
      const avgMoney = (totalMoney / 1e8).toFixed(2)

      return (
        <tr key={industry} className="border-t hover:bg-gray-50">
          <td className="px-4 py-2 whitespace-nowrap">
            {industry}
            <br />
            {stockCount}，{avgChange}%，
            {avgMoney}亿元
          </td>
          <td className="px-4 py-2">{stockElements}</td>
        </tr>
      )
    })

    return {
      date: dayjs(date).format('YYYY-MM-DD'),
      industries: industryElements,
    }
  })

  // Sort formatted data by date descending
  return formattedData.sort((a, b) => dayjs(b.date) - dayjs(a.date))
}

export default function Home() {

  // Stock table related states
  const [rise, setRise] = useState(8)
  const [bigRiseVolumeStockData, setBigRiseVolumeStockData] = useState([])
  const [bigRiseVolumeStockLoading, setBigRiseVolumeStockLoading] = useState(true)
  const [bigRiseVolumeStockError, setBigRiseVolumeStockError] = useState(null)

  const fetchBigRiseVolumeStockData = async (riseValue) => {
    try {
      const apiUrl = `https://lian-yolo.com/stock/api/big-rise-volume/?rise=${riseValue}`
      const res = await axios.get(apiUrl)
      const data = formatStockData(res.data.data)
      setBigRiseVolumeStockData(data)
    } catch (err) {
      setBigRiseVolumeStockError(err.message)
    } finally {
      setBigRiseVolumeStockLoading(false)
    }
  }

  const handleRiseChange = (event) => {
    const selectedValue = parseInt(event.target.value, 10)
    setBigRiseVolumeStockLoading(true)
    setRise(selectedValue)
  }

  // K-line chart related states
  const [windInfoData, setWindInfoData] = useState([])
  const [windInfoLoading, setWindInfoLoading] = useState(true)
  const [windInfoError, setWindInfoError] = useState(null)

  const fetchWindInfoData = async () => {
    try {
      const apiUrl = `http://127.0.0.1:8000/stock/api/wind-info/`
      const res = await axios.get(apiUrl)
      const data = res.data.Result
      setWindInfoData(data)
    } catch (err) {
      setWindInfoError(err.message)
    } finally {
      setWindInfoLoading(false)
    }
  }

  // -------------------- useEffect Hooks --------------------
  // Fetch stock data when component mounts or when 'rise' changes
  useEffect(() => {
    fetchBigRiseVolumeStockData(rise)
  }, [rise])

  // Fetch K-line data when component mounts
  useEffect(() => {
    fetchWindInfoData()
  }, [])

  // -------------------- Prepare Chart Data --------------------
  // Prepare chart labels (dates) and dataset (close prices)
  const chartLabels = windInfoData.map((item) =>
    dayjs(item.tradeDate).format('YYYY-MM-DD')
  )
  const chartClosePrices = windInfoData.map((item) => item.close)

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: '万得全A',
        data: chartClosePrices,
        borderColor: 'rgba(75, 192, 192, 1)', // Line color
        fill: false,
      },
    ],
  }
  // Update Line Chart Options to remove the bottom x-axis (date) labels
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow custom height
    plugins: {
      legend: { display: false }, // Hide legend
      // tooltip: { enabled: false }, // Disable tooltips
      title: {
        display: true,
        text: '万得全A指数走势',
        font: {
          size: 20, // Set title font size to be larger
        },
      },
    },
    // Define scales with x-axis ticks hidden
    scales: {
      x: {
        // display: false, // Hide x-axis
        ticks: { display: false }, // Remove bottom date labels
        grid: { display: false },  // Remove x-axis grid lines
      },
      y: {
        display: false, // Hide y-axis
        ticks: { display: false }, // Remove left side number labels
        grid: { display: false },  // Remove y-axis grid lines
      },
    },
  }

  // 2. Prepare Bar Chart Data for 'amount'

  // Step 1: Format labels from tradeDate
  const barChartLabels = windInfoData.map(item =>
    dayjs(item.tradeDate).format('YYYY-MM-DD')
  )

  // Step 2: Extract 'amount' data for each day
  const barChartAmounts = windInfoData.map(item => item.amount)

  // Step 3: Determine bar colors based on pctChange (red if positive, green if not)
  const barChartColors = windInfoData.map(item =>
    item.pctChange > 0 ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 128, 0, 0.7)'
  )

  // Step 4: Create the bar chart data object
  const barChartData = {
    labels: barChartLabels,
    datasets: [
      {
        label: '成交额 (Amount)',
        data: barChartAmounts,
        backgroundColor: barChartColors,
      },
    ],
  }

  // Update Bar Chart Options to remove the left y-axis (number) labels
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow custom height
    plugins: {
      legend: { display: false }, // Hide legend
      title: { display: false }, // Hide title
      tooltip: {
        enabled: true, // Enable tooltip
        callbacks: {
          label: (context) => {
            const value = context.raw / 1e12 // Convert to "万亿元"
            return `成交额: ${value.toFixed(2)} 万亿元`
          },
        },
      },
    },
    // Define scales with y-axis ticks hidden
    scales: {
      x: {
        grid: { display: false }, // Remove x-axis grid lines
        ticks: { display: false},
      },
      y: {
        display: false, // Hide y-axis
        grid: { display: false },  // Remove y-axis grid lines
        ticks: { display: false }, // Remove left side number labels
      },
    },
  }

  const latestWindInfo = windInfoData.length > 0 ? windInfoData[windInfoData.length - 1] : null

  // -------------------- Render --------------------
  // If there's an error in fetching stock data, display the error message
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
              <div>日期: {dayjs(latestWindInfo.tradeDate).format('YYYY-MM-DD')}</div>
              <div>涨跌幅: {latestWindInfo.pctChange.toFixed(2)}%</div>
              <div>成交额: {(latestWindInfo.amount / 1e8).toFixed(2)} 亿元</div>
            </div>
          )}
          {/* Chart Section placed above the main container */}
          <div className="p-6 max-w-8xl mx-auto">
            <div className="bg-white p-4 rounded-lg border mb-6">
              <div style={{ height: '420px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
              <div style={{ height: '150px', marginTop: '10px' }}>
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Container for Stock Table */}
      <div className="p-6 max-w-8xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          股票异动（涨超
          <select
            value={rise}
            onChange={handleRiseChange}
            className="w-8 inline-block ml-1"
          >
            {[...Array(10).keys()].map((num) => {
              const optionValue = num + 6
              return (
                <option key={optionValue} value={optionValue}>
                  {optionValue}
                </option>
              )
            })}
          </select>
          %）数据
        </h1>

        {bigRiseVolumeStockLoading ? (
          <div className="p-4 text-gray-600">加载中...</div>
        ) : bigRiseVolumeStockError ? (
          <div className="p-4 text-red-500">错误：{bigRiseVolumeStockError}</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-left">
                    行业（个股数量，平均涨幅，总成交额）及股票信息
                  </th>
                </tr>
              </thead>
              <tbody>
                {bigRiseVolumeStockData.map(({ date, industries }) => (
                  <tr key={date} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap align-top">
                      {date}
                    </td>
                    <td className="px-4 py-2">
                      <table className="w-full">
                        <tbody>{industries}</tbody>
                      </table>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
