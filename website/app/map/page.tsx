'use client'

import { useEffect, useRef } from 'react'

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) {
      return
    }

    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]')
    
    if (existingScript && window.ymaps) {
      window.ymaps.ready(() => {
        if (!mapInstanceRef.current && mapRef.current) {
          mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
            center: [56.852878, 35.928228],
            zoom: 15,
          })

          const placemark = new window.ymaps.Placemark(
            [56.852878, 35.928228],
            {
              balloonContent: '<strong>Магазин Запчастей</strong><br>г. Тверь, Московская улица, 1<br>8 (920) 166-93-81',
            },
            {
              preset: 'islands#redIcon',
            }
          )
          mapInstanceRef.current.geoObjects.add(placemark)
        }
      })
      return
    }

    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true
      const script = document.createElement('script')
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
      script.async = true
      script.onload = () => {
        if (window.ymaps && mapRef.current && !mapInstanceRef.current) {
          window.ymaps.ready(() => {
            if (!mapInstanceRef.current && mapRef.current) {
              mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
                center: [56.852878, 35.928228],
                zoom: 15,
              })

              const placemark = new window.ymaps.Placemark(
                [56.852878, 35.928228],
                {
                  balloonContent: '<strong>Магазин Запчастей</strong><br>г. Тверь, Московская улица, 1<br>8 (920) 166-93-81',
                },
                {
                  preset: 'islands#redIcon',
                }
              )
              mapInstanceRef.current.geoObjects.add(placemark)
            }
          })
        }
      }
      document.head.appendChild(script)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-4">
            Карта оказания услуг
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mb-8">
            Наш сервисный центр и магазин запчастей в Твери. Нажмите на метку на карте для получения подробной информации.
          </p>
          
          <div ref={mapRef} className="w-full h-[500px] rounded-lg mb-8" />

          <div className="max-w-sm">
            <div className="border-2 border-gray-200 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-4 pl-3">Магазин Запчастей</h3>
              <div className="space-y-3 text-sm text-gray-600 pl-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">АДРЕС</p>
                  <p className="text-black">г. Тверь, Московская улица, 1</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">ТЕЛЕФОН</p>
                  <p className="text-black font-medium">8 (920) 166-93-81</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">ЧАСЫ РАБОТЫ</p>
                  <p className="text-black">ПН-ПТ с 11:00 по 18:00</p>
                  <p className="text-gray-500 text-xs mt-1">СБ, ВС — выходной</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

declare global {
  interface Window {
    ymaps: any
  }
}
