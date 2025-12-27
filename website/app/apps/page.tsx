'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface VersionInfo {
  current_version: string
  release_notes: string
  download_url: string
}

export default function AppsPage() {
  const [masterVersion, setMasterVersion] = useState<VersionInfo | null>(null)
  const [clientVersion, setClientVersion] = useState<VersionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Загружаем информацию о версиях
    const fetchVersions = async () => {
      try {
        // Получаем конфигурацию версий из API
        const response = await fetch('/api/version/config', {
          method: 'GET',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.android_master) {
            setMasterVersion({
              current_version: data.android_master.current_version,
              release_notes: data.android_master.release_notes,
              download_url: data.android_master.download_url || '/apps/masterprofi-master.apk'
            })
          }
          if (data.android_client) {
            setClientVersion({
              current_version: data.android_client.current_version,
              release_notes: data.android_client.release_notes,
              download_url: data.android_client.download_url || '/apps/masterprofi-client.apk'
            })
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки версий:', error)
        // Устанавливаем значения по умолчанию
        setMasterVersion({
          current_version: '1.1.9',
          release_notes: 'Исправлена кликабельность карточки смены. Добавлено подробное логирование для отладки переключения смены.',
          download_url: '/apps/masterprofi-master.apk'
        })
        setClientVersion({
          current_version: '1.0.0',
          release_notes: 'Первый релиз клиента.',
          download_url: '/apps/masterprofi-client.apk'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchVersions()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-16 md:py-24 border-b border-gray-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a1a] mb-6 leading-tight">
            Мобильные приложения
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl">
            Скачайте наши приложения для удобного управления заказами и общения с мастерами
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {/* Приложение мастера */}
          <div className="border-2 border-gray-100 rounded-2xl p-10 hover:border-black transition">
            <div className="w-24 h-24 bg-black rounded-2xl mx-auto mb-8 flex items-center justify-center">
              <span className="text-white text-5xl">🔧</span>
            </div>
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4 text-center">Для мастеров</h2>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              Управляйте заказами, общайтесь с клиентами и отслеживайте свой график работы.
              Все инструменты для эффективной работы мастера в одном приложении.
            </p>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : masterVersion && (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Версия {masterVersion.current_version} для Android
                  </div>
                  {masterVersion.release_notes && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Что нового:</div>
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {masterVersion.release_notes}
                      </div>
                    </div>
                  )}
                </div>
                <a
                  href={masterVersion.download_url}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 rounded-full hover:from-blue-700 hover:to-blue-900 transition font-semibold text-center shadow-lg"
                >
                  Скачать APK
                  <span className="block text-xs font-normal mt-1 opacity-90">(установить вручную)</span>
                </a>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  После скачивания откройте файл APK на устройстве и разрешите установку из этого источника.
                </p>
              </>
            )}
          </div>

          {/* Приложение клиента */}
          <div className="border-2 border-gray-100 rounded-2xl p-10 hover:border-black transition">
            <div className="w-24 h-24 bg-black rounded-2xl mx-auto mb-8 flex items-center justify-center">
              <span className="text-white text-5xl">📱</span>
            </div>
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4 text-center">Для клиентов</h2>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              Создавайте заказы, отслеживайте статус ремонта, общайтесь с мастерами
              и получайте уведомления о готовности заказа.
            </p>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : clientVersion && (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Версия {clientVersion.current_version} для Android
                  </div>
                  {clientVersion.release_notes && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-gray-900 mb-2">Что нового:</div>
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {clientVersion.release_notes}
                      </div>
                    </div>
                  )}
                </div>
                <a
                  href={clientVersion.download_url}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 rounded-full hover:from-blue-700 hover:to-blue-900 transition font-semibold text-center shadow-lg"
                >
                  Скачать APK
                  <span className="block text-xs font-normal mt-1 opacity-90">(установить вручную)</span>
                </a>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  После скачивания откройте файл APK на устройстве и разрешите установку из этого источника.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="border-t-2 border-gray-100 pt-16">
          <h3 className="text-4xl font-bold text-[#1a1a1a] mb-12 text-center">Возможности приложений</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h4 className="text-2xl font-bold mb-6 text-[#1a1a1a]">Для мастеров:</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Просмотр новых заказов</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Принятие заказов в работу</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Обновление статуса заказа</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Чат с клиентами</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">История выполненных заказов</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h4 className="text-2xl font-bold mb-6 text-[#1a1a1a]">Для клиентов:</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Создание заказов</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Отслеживание статуса</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Общение с мастером</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">История заказов</span>
                </li>
                <li className="flex items-start">
                  <span className="text-black text-xl mr-3">✓</span>
                  <span className="text-gray-700">Push-уведомления</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center bg-black text-white p-12 rounded-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Нужна помощь с приложением?</h2>
          <p className="text-xl mb-8 text-gray-300">
            Свяжитесь с нами, и мы поможем разобраться
          </p>
          <Link
            href="/contacts"
            className="inline-block bg-white text-black px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Связаться с нами
          </Link>
        </div>
      </div>
    </div>
  )
}
