'use client'

import { useState } from 'react'

export default function ContactsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.')
        setFormData({ name: '', email: '', phone: '', message: '' })
      } else {
        alert('Произошла ошибка при отправке сообщения. Попробуйте позже.')
      }
    } catch (error) {
      alert('Произошла ошибка при отправке сообщения. Попробуйте позже.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#1a1a1a] mb-3">
            Свяжитесь с нами
          </h1>
          <p className="text-base text-gray-600">
            Мы всегда на связи и готовы ответить на все ваши вопросы
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Контактная информация */}
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Контактная информация</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-bold text-base mb-3 text-[#1a1a1a]">Телефоны</h3>
                <div className="space-y-2">
                  <a href="tel:+79201669381" className="text-gray-600 hover:text-black transition block">
                    +7 (920) 166-93-81
                  </a>
                  <a href="tel:+79511923956" className="text-gray-600 hover:text-black transition block">
                    +7 (951) 192-39-56
                  </a>
                </div>
                <p className="text-sm text-blue-600 mt-2 cursor-pointer hover:underline">Звоните в любое время</p>
              </div>
              
              <div>
                <h3 className="font-bold text-base mb-3 text-[#1a1a1a]">Email</h3>
                <a href="mailto:ispravleno.pro@mail.ru" className="text-gray-600 hover:text-black transition">
                  ispravleno.pro@mail.ru
                </a>
                <p className="text-sm text-gray-500 mt-2">Ответим в течение 24 часов</p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-3 text-[#1a1a1a]">Мессенджеры</h3>
                <a
                  href="https://t.me/ispravleno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#0088cc] text-white px-6 py-2 rounded hover:bg-[#006699] transition font-medium"
                >
                  Telegram
                </a>
              </div>

              <div>
                <h3 className="font-bold text-base mb-3 text-[#1a1a1a]">Часы работы</h3>
                <div className="space-y-1 text-gray-600 text-sm">
                  <p><span className="text-blue-600">Понедельник - Пятница:</span> 11:00 - 18:00</p>
                  <p><span className="text-blue-600">Суббота - Воскресенье:</span> Выходной</p>
                </div>
              </div>
            </div>
          </div>

          {/* Форма обратной связи */}
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Форма обратной связи</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-normal mb-2 text-[#1a1a1a]">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-400 transition"
                  placeholder="Введите ваше имя"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-normal mb-2 text-[#1a1a1a]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-400 transition"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-normal mb-2 text-[#1a1a1a]">
                  Телефон
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-400 transition"
                  placeholder="+7 (920) 166-93-81"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-normal mb-2 text-[#1a1a1a]">
                  Сообщение <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-400 transition resize-none"
                  placeholder="Введите ваше сообщение"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white py-3 rounded font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Отправка...' : 'Отправить сообщение'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
