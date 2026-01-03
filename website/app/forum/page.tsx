'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ForumTopic {
  id: number
  title: string
  content: string
  author: string
  createdAt: string
  repliesCount: number
  category: string
  views: number
}

const categoryGroups = {
  'Типы техники': [
    'Холодильник',
    'Стиральная машина',
    'Посудомоечная машина',
    'Духовой шкаф',
    'Варочная панель',
    'Кондиционер',
    'Кофемашина',
    'Микроволновая печь',
  ],
  'Категории': [
    'Коды ошибок',
    'Тестовый режим',
    'Обслуживание',
    'Диагностика',
    'Замена запчастей',
    'Профилактика',
  ],
  'Бренды': [
    'Samsung',
    'LG',
    'Bosch',
    'Indesit',
    'Ariston',
    'Electrolux',
    'Siemens',
    'Whirlpool',
  ],
}

export default function ForumPage() {
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Все')
  const [selectedGroup, setSelectedGroup] = useState<string>('Типы техники')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTopics()
  }, [selectedCategory])

  const fetchTopics = async () => {
    try {
      const response = await fetch(`/api/forum/topics?category=${selectedCategory}`)
      if (response.ok) {
        const data = await response.json()
        setTopics(data)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTopics = topics.filter((topic) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      topic.title.toLowerCase().includes(query) ||
      topic.content.toLowerCase().includes(query) ||
      topic.author.toLowerCase().includes(query)
    )
  })

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-[#424242]">Форум</h1>
        <Link
          href="/forum/new"
          className="bg-[#424242] text-white px-6 py-2 rounded-lg hover:bg-[#212121] transition-colors"
        >
          Создать тему
        </Link>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по ключевым словам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:border-[#424242] transition"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Группы категорий */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => {
              setSelectedCategory('Все')
              setSelectedGroup('Типы техники')
            }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              selectedCategory === 'Все'
                ? 'border-[#424242] text-[#424242]'
                : 'border-transparent text-gray-500 hover:text-[#424242]'
            }`}
          >
            Все темы
          </button>
          {Object.keys(categoryGroups).map((group) => (
            <button
              key={group}
              onClick={() => {
                setSelectedGroup(group)
                setSelectedCategory('Все')
              }}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                selectedGroup === group && selectedCategory !== 'Все'
                  ? 'border-[#424242] text-[#424242]'
                  : 'border-transparent text-gray-500 hover:text-[#424242]'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Категории выбранной группы */}
        {selectedCategory === 'Все' && selectedGroup !== 'Типы техники' && (
          <div className="flex flex-wrap gap-2">
            {categoryGroups[selectedGroup as keyof typeof categoryGroups].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-[#424242] hover:bg-gray-200 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        )}
        
        {selectedCategory === 'Все' && selectedGroup === 'Типы техники' && (
          <div className="flex flex-wrap gap-2">
            {categoryGroups['Типы техники'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-[#424242] hover:bg-gray-200 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {selectedCategory !== 'Все' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Выбрано:</span>
            <span className="px-4 py-2 rounded-lg bg-[#424242] text-white font-medium">
              {selectedCategory}
            </span>
            <button
              onClick={() => setSelectedCategory('Все')}
              className="text-sm text-gray-500 hover:text-[#424242] underline"
            >
              Сбросить фильтр
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Загрузка...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTopics.length > 0 ? (
            filteredTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/forum/${topic.id}`}
                className="block border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-[#424242]">{topic.title}</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {topic.category}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-2">{topic.content}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span>Автор: {topic.author}</span>
                    <span>{new Date(topic.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex gap-4">
                    <span>Ответов: {topic.repliesCount}</span>
                    <span>Просмотров: {topic.views}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchQuery ? 'По вашему запросу ничего не найдено' : 'Темы не найдены'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

