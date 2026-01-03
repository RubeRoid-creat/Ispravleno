import Link from 'next/link'
import NewsSection from '@/components/NewsSection'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-20 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#1a1a1a] leading-tight">
              Ваша техника исправлена.<br />
              Точно и в срок.
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-600 leading-relaxed">
              Сервис премиум-ремонта бытовой техники. Гарантия результата — в договоре.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/order"
                className="bg-black text-white px-8 py-4 rounded-lg font-medium hover:bg-gray-800 transition inline-block text-center"
              >
                Вызвать мастера
              </Link>
              <Link
                href="/price"
                className="bg-white text-black px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition inline-block text-center border-2 border-black"
              >
                Смотреть услуги
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <NewsSection />
        </div>
      </section>
    </main>
  )
}
