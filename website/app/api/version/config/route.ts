import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Делаем route динамическим

const BACKEND_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://212.74.227.208:3000'

export async function GET() {
  try {
    // Получаем конфигурацию версий из backend
    const response = await fetch(`${BACKEND_URL}/api/version/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Всегда получаем свежие данные
    })

    if (!response.ok) {
      // Если API недоступен, возвращаем значения по умолчанию
      return NextResponse.json({
        android_master: {
          current_version: '1.1.9',
          min_required_version: '1.0.0',
          force_update: false,
          release_notes: 'Исправлена кликабельность карточки смены. Добавлено подробное логирование для отладки переключения смены.',
          download_url: 'https://ispravleno.pro/apps/masterprofi-master.apk',
          supported_os_versions: ['8.0', '9.0', '10', '11', '12', '13'],
        },
        android_client: {
          current_version: '1.0.0',
          min_required_version: '1.0.0',
          force_update: false,
          release_notes: 'Первый релиз клиента.',
          download_url: 'https://ispravleno.pro/apps/masterprofi-client.apk',
          supported_os_versions: ['8.0', '9.0', '10', '11', '12', '13'],
        },
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Ошибка получения конфигурации версий:', error)
    // Возвращаем значения по умолчанию при ошибке
    return NextResponse.json({
      android_master: {
        current_version: '1.1.9',
        min_required_version: '1.0.0',
        force_update: false,
        release_notes: 'Исправлена кликабельность карточки смены. Добавлено подробное логирование для отладки переключения смены.',
        download_url: 'https://ispravleno.pro/apps/masterprofi-master.apk',
        supported_os_versions: ['8.0', '9.0', '10', '11', '12', '13'],
      },
      android_client: {
        current_version: '1.0.0',
        min_required_version: '1.0.0',
        force_update: false,
        release_notes: 'Первый релиз клиента.',
        download_url: 'https://ispravleno.pro/apps/masterprofi-client.apk',
        supported_os_versions: ['8.0', '9.0', '10', '11', '12', '13'],
      },
    })
  }
}
