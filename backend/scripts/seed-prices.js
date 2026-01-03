import { query, initDatabase } from '../database/db.js';

/**
 * Скрипт для заполнения прайс-листа тестовыми данными
 */

const prices = [
  // Работы для холодильника
  { category: 'холодильник', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика всех систем холодильника' },
  { category: 'холодильник', name: 'Замена компрессора', price: 3500, type: 'service', description: 'Замена компрессора с заправкой хладагентом' },
  { category: 'холодильник', name: 'Заправка хладагентом', price: 1500, type: 'service', description: 'Заправка системы хладагентом' },
  { category: 'холодильник', name: 'Замена термостата', price: 1200, type: 'service', description: 'Замена терморегулятора' },
  { category: 'холодильник', name: 'Чистка системы охлаждения', price: 800, type: 'service', description: 'Прочистка системы от засоров и загрязнений' },
  { category: 'холодильник', name: 'Замена уплотнителя двери', price: 900, type: 'service', description: 'Замена резинового уплотнителя' },
  
  // Запчасти для холодильника
  { category: 'холодильник', name: 'Компрессор', price: 5000, type: 'part', description: 'Компрессор для холодильника', unit: 'шт' },
  { category: 'холодильник', name: 'Термостат', price: 800, type: 'part', description: 'Терморегулятор', unit: 'шт' },
  { category: 'холодильник', name: 'Хладагент R134a', price: 300, type: 'part', description: 'Фреон R134a за 100г', unit: '100г' },
  { category: 'холодильник', name: 'Уплотнитель двери', price: 600, type: 'part', description: 'Резиновый уплотнитель', unit: 'компл' },
  { category: 'холодильник', name: 'Петли двери', price: 400, type: 'part', description: 'Петли для двери холодильника', unit: 'шт' },
  
  // Работы для стиральной машины
  { category: 'стиральная машина', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика стиральной машины' },
  { category: 'стиральная машина', name: 'Замена подшипника', price: 2500, type: 'service', description: 'Замена подшипников барабана' },
  { category: 'стиральная машина', name: 'Замена ТЭНа', price: 1000, type: 'service', description: 'Замена нагревательного элемента' },
  { category: 'стиральная машина', name: 'Замена помпы', price: 1200, type: 'service', description: 'Замена сливного насоса' },
  { category: 'стиральная машина', name: 'Замена ремня', price: 800, type: 'service', description: 'Замена приводного ремня' },
  { category: 'стиральная машина', name: 'Чистка фильтра', price: 400, type: 'service', description: 'Прочистка фильтра от засоров' },
  { category: 'стиральная машина', name: 'Замена блокировки люка', price: 900, type: 'service', description: 'Замена УБЛ (устройство блокировки люка)' },
  
  // Запчасти для стиральной машины
  { category: 'стиральная машина', name: 'ТЭН (нагревательный элемент)', price: 1200, type: 'part', description: 'Трубчатый электронагреватель', unit: 'шт' },
  { category: 'стиральная машина', name: 'Помпа (сливной насос)', price: 1500, type: 'part', description: 'Сливной насос', unit: 'шт' },
  { category: 'стиральная машина', name: 'Ремень приводной', price: 300, type: 'part', description: 'Ремень для передачи вращения', unit: 'шт' },
  { category: 'стиральная машина', name: 'Подшипники', price: 800, type: 'part', description: 'Подшипники для барабана', unit: 'компл' },
  { category: 'стиральная машина', name: 'УБЛ (блокировка люка)', price: 1200, type: 'part', description: 'Устройство блокировки люка', unit: 'шт' },
  { category: 'стиральная машина', name: 'Щетки мотора', price: 400, type: 'part', description: 'Угольные щетки для двигателя', unit: 'компл' },
  
  // Работы для посудомоечной машины
  { category: 'посудомоечная машина', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика посудомоечной машины' },
  { category: 'посудомоечная машина', name: 'Замена ТЭНа', price: 1000, type: 'service', description: 'Замена нагревательного элемента' },
  { category: 'посудомоечная машина', name: 'Замена помпы', price: 1200, type: 'service', description: 'Замена циркуляционной помпы' },
  { category: 'посудомоечная машина', name: 'Чистка фильтров', price: 400, type: 'service', description: 'Прочистка всех фильтров' },
  { category: 'посудомоечная машина', name: 'Замена разбрызгивателя', price: 800, type: 'service', description: 'Замена верхнего/нижнего разбрызгивателя' },
  
  // Запчасти для посудомоечной машины
  { category: 'посудомоечная машина', name: 'ТЭН', price: 1500, type: 'part', description: 'Нагревательный элемент', unit: 'шт' },
  { category: 'посудомоечная машина', name: 'Помпа циркуляционная', price: 2000, type: 'part', description: 'Циркуляционный насос', unit: 'шт' },
  { category: 'посудомоечная машина', name: 'Разбрызгиватель', price: 800, type: 'part', description: 'Верхний/нижний разбрызгиватель', unit: 'шт' },
  
  // Работы для ноутбука
  { category: 'ноутбук', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика ноутбука' },
  { category: 'ноутбук', name: 'Замена экрана', price: 3000, type: 'service', description: 'Замена матрицы экрана' },
  { category: 'ноутбук', name: 'Замена клавиатуры', price: 1500, type: 'service', description: 'Замена клавиатуры ноутбука' },
  { category: 'ноутбук', name: 'Чистка от пыли', price: 800, type: 'service', description: 'Чистка системы охлаждения от пыли' },
  { category: 'ноутбук', name: 'Замена термопасты', price: 600, type: 'service', description: 'Замена термопасты на процессоре и видеокарте' },
  { category: 'ноутбук', name: 'Установка ОС', price: 1000, type: 'service', description: 'Установка операционной системы' },
  
  // Запчасти для ноутбука
  { category: 'ноутбук', name: 'Матрица экрана', price: 4000, type: 'part', description: 'Экран для ноутбука', unit: 'шт' },
  { category: 'ноутбук', name: 'Клавиатура', price: 2000, type: 'part', description: 'Клавиатура для ноутбука', unit: 'шт' },
  { category: 'ноутбук', name: 'Батарея', price: 2500, type: 'part', description: 'Аккумуляторная батарея', unit: 'шт' },
  { category: 'ноутбук', name: 'Жесткий диск HDD 500GB', price: 2000, type: 'part', description: 'Жесткий диск 500GB', unit: 'шт' },
  { category: 'ноутбук', name: 'SSD 256GB', price: 2500, type: 'part', description: 'Твердотельный накопитель 256GB', unit: 'шт' },
  { category: 'ноутбук', name: 'Оперативная память 4GB', price: 1500, type: 'part', description: 'Планка памяти DDR4 4GB', unit: 'шт' },
  
  // Работы для кондиционера
  { category: 'кондиционер', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика кондиционера' },
  { category: 'кондиционер', name: 'Заправка фреоном', price: 2000, type: 'service', description: 'Заправка системы хладагентом' },
  { category: 'кондиционер', name: 'Чистка внутреннего блока', price: 1500, type: 'service', description: 'Полная чистка внутреннего блока' },
  { category: 'кондиционер', name: 'Чистка внешнего блока', price: 1500, type: 'service', description: 'Чистка конденсатора внешнего блока' },
  { category: 'кондиционер', name: 'Замена платы управления', price: 2500, type: 'service', description: 'Замена электронной платы' },
  
  // Запчасти для кондиционера
  { category: 'кондиционер', name: 'Фреон R410A', price: 400, type: 'part', description: 'Хладагент R410A за 100г', unit: '100г' },
  { category: 'кондиционер', name: 'Плата управления', price: 3500, type: 'part', description: 'Электронная плата управления', unit: 'шт' },
  { category: 'кондиционер', name: 'Компрессор', price: 8000, type: 'part', description: 'Компрессор для кондиционера', unit: 'шт' },
  
  // Работы для кофемашины
  { category: 'кофемашина', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика кофемашины' },
  { category: 'кофемашина', name: 'Чистка от накипи', price: 800, type: 'service', description: 'Профессиональная чистка от накипи' },
  { category: 'кофемашина', name: 'Замена помпы', price: 1200, type: 'service', description: 'Замена водяной помпы' },
  { category: 'кофемашина', name: 'Замена ТЭНа', price: 1000, type: 'service', description: 'Замена нагревательного элемента' },
  
  // Запчасти для кофемашины
  { category: 'кофемашина', name: 'Помпа водяная', price: 2000, type: 'part', description: 'Водяная помпа для кофемашины', unit: 'шт' },
  { category: 'кофемашина', name: 'ТЭН', price: 1500, type: 'part', description: 'Нагревательный элемент', unit: 'шт' },
  
  // Работы для духового шкафа
  { category: 'духовой шкаф', name: 'Диагностика неисправности', price: 500, type: 'service', description: 'Полная диагностика духового шкафа' },
  { category: 'духовой шкаф', name: 'Замена ТЭНа', price: 1200, type: 'service', description: 'Замена нагревательного элемента' },
  { category: 'духовой шкаф', name: 'Замена термостата', price: 1000, type: 'service', description: 'Замена терморегулятора' },
  { category: 'духовой шкаф', name: 'Замена вентилятора', price: 1000, type: 'service', description: 'Замена вентилятора охлаждения' },
  
  // Запчасти для духового шкафа
  { category: 'духовой шкаф', name: 'ТЭН верхний', price: 1500, type: 'part', description: 'Верхний нагревательный элемент', unit: 'шт' },
  { category: 'духовой шкаф', name: 'ТЭН нижний', price: 1500, type: 'part', description: 'Нижний нагревательный элемент', unit: 'шт' },
  { category: 'духовой шкаф', name: 'Термостат', price: 1200, type: 'part', description: 'Терморегулятор', unit: 'шт' },
  { category: 'духовой шкаф', name: 'Вентилятор', price: 800, type: 'part', description: 'Вентилятор охлаждения', unit: 'шт' },
];

async function seedPrices() {
  console.log('🚀 Инициализация базы данных...\n');
  await initDatabase();
  
  console.log('🚀 Начало заполнения прайс-листа...\n');
  
  let inserted = 0;
  let skipped = 0;
  
  for (const priceData of prices) {
    // Проверяем, существует ли уже такая запись
    const existing = query.get(
      'SELECT id FROM prices WHERE category = ? AND name = ? AND type = ?',
      [priceData.category, priceData.name, priceData.type]
    );
    
    if (existing) {
      console.log(`   ⚠️  Уже существует: ${priceData.name} (${priceData.category}, ${priceData.type})`);
      skipped++;
      continue;
    }
    
    // Вставляем запись
    query.run(
      'INSERT INTO prices (category, name, price, type, description, unit) VALUES (?, ?, ?, ?, ?, ?)',
      [
        priceData.category,
        priceData.name,
        priceData.price,
        priceData.type,
        priceData.description || null,
        priceData.unit || 'шт'
      ]
    );
    
    inserted++;
    console.log(`   ✅ Добавлено: ${priceData.name} - ${priceData.price} ₽ (${priceData.category}, ${priceData.type})`);
  }
  
  console.log(`\n✅ Заполнение прайс-листа завершено!`);
  console.log(`   Добавлено: ${inserted}`);
  console.log(`   Пропущено (уже существуют): ${skipped}`);
  console.log(`   Всего в прайсе: ${query.get('SELECT COUNT(*) as count FROM prices')?.count || 0} записей`);
}

seedPrices().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Ошибка заполнения прайс-листа:', error);
  process.exit(1);
});


