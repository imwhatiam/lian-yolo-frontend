'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'

const formatStockData1 = (data) => {
  return Object.entries(data)
    .map(([date, stocks]) => {
      // 将股票数组转换为格式化字符串
      const stockString = stocks
        .map(stock =>
          `${stock[0]}（${(stock[1] / 1e8).toFixed(2)}亿元，${stock[2].toFixed(2)}%）`
        )
        .join('，');  // 使用中文逗号分隔

      return {
        date: dayjs(date).format('YYYY-MM-DD'),
        stocks: stockString
      }
    })
    .sort((a, b) => dayjs(b.date) - dayjs(a.date))
}
const formatStockData = (data) => {
  return Object.entries(data)
    .map(([date, stocks]) => {
      // 将股票数组转换为 JSX 元素数组
      const stockElements = stocks.map((stock, index) => (
        <span key={stock[0]}>
          {stock[0]}（{(stock[1] / 1e8).toFixed(2)}亿元，
          <span className="text-red-500">{stock[2].toFixed(2)}%</span>）
          {index !== stocks.length - 1 && '，'}
        </span>
      ));

      return {
        date: dayjs(date).format('YYYY-MM-DD'),
        stocks: stockElements
      }
    })
    .sort((a, b) => dayjs(b.date) - dayjs(a.date))
}

export default function Home() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/stock/api/big-rise-volume/')
        const formattedData = formatStockData(res.data.data)
        setData(formattedData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-4 text-gray-600">加载中...</div>
  if (error) return <div className="p-4 text-red-500">错误：{error}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">股票异动数据(成交超8亿，涨幅超8%)</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">日期</th>
              <th className="px-4 py-2 text-left">股票信息</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ date, stocks }) => (
              <tr key={date} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">{date}</td>
                <td className="px-4 py-2">
                  {stocks}  {/* 直接显示格式化后的字符串 */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
