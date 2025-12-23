#!/usr/bin/env python3
"""
Генератор иконок приложений МастерПрофи
Создает PNG иконки для Android из исходного изображения
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Размеры для разных DPI
SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

def create_master_icon(size):
    """Создать иконку для приложения мастера"""
    # Создаем изображение с черным фоном
    img = Image.new('RGBA', (size, size), color='#1a1a1a')
    draw = ImageDraw.Draw(img)
    
    # Настройки
    center = size // 2
    padding = size // 6
    
    # Рисуем гаечный ключ (упрощенная версия)
    wrench_width = size // 8
    wrench_height = size - padding * 2
    
    # Ручка ключа
    x1 = center - wrench_width // 2
    x2 = center + wrench_width // 2
    y1 = padding
    y2 = size - padding
    draw.rectangle([x1, y1, x2, y2], fill='white')
    
    # Круглая часть ключа (головка)
    head_radius = size // 4
    head_center_y = center
    draw.ellipse([
        center - head_radius, head_center_y - head_radius,
        center + head_radius, head_center_y + head_radius
    ], fill='white', outline='white', width=3)
    
    # Внутренний круг (шестигранник упрощенный)
    inner_radius = head_radius - size // 16
    draw.ellipse([
        center - inner_radius, head_center_y - inner_radius,
        center + inner_radius, head_center_y + inner_radius
    ], fill='#1a1a1a', outline='#1a1a1a')
    
    # Зеленая галочка
    check_size = size // 5
    check_x = center - check_size // 3
    check_y = head_center_y - check_size // 4
    
    # Рисуем галочку
    draw.line([
        (check_x, check_y),
        (check_x + check_size // 3, check_y + check_size // 2)
    ], fill='#00E676', width=size // 20)
    
    draw.line([
        (check_x + check_size // 3, check_y + check_size // 2),
        (check_x + check_size, check_y - check_size // 3)
    ], fill='#00E676', width=size // 20)
    
    return img

def create_client_icon(size):
    """Создать иконку для приложения клиента"""
    # Создаем изображение с темно-синим фоном
    img = Image.new('RGBA', (size, size), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Настройки
    center = size // 2
    padding = size // 5
    
    # Рисуем домик
    house_width = size - padding * 2
    house_height = house_width // 2
    house_x = padding
    house_y = center - house_height // 4
    
    # Крыша (треугольник)
    roof_points = [
        (house_x, house_y + house_height // 2),  # левый
        (center, house_y - house_height // 2),    # верх
        (house_x + house_width, house_y + house_height // 2)  # правый
    ]
    draw.polygon(roof_points, fill='white')
    
    # Стены дома
    wall_y = house_y + house_height // 2
    wall_height = house_height
    draw.rectangle([
        house_x, wall_y,
        house_x + house_width, wall_y + wall_height
    ], fill='white')
    
    # Дверь
    door_width = house_width // 3
    door_height = wall_height // 2
    door_x = center - door_width // 2
    door_y = wall_y + wall_height - door_height
    draw.rectangle([door_x, door_y, door_x + door_width, door_y + door_height], fill='#1a1a2e')
    
    # Окна
    window_size = house_width // 5
    window_y = wall_y + wall_height // 4
    # Левое окно
    draw.rectangle([
        house_x + house_width // 6, window_y,
        house_x + house_width // 6 + window_size, window_y + window_size
    ], fill='#2196F3')
    # Правое окно
    draw.rectangle([
        house_x + house_width - house_width // 6 - window_size, window_y,
        house_x + house_width - house_width // 6, window_y + window_size
    ], fill='#2196F3')
    
    # Зеленая галочка
    check_size = size // 4
    check_x = center - check_size // 3
    check_y = size - padding - check_size
    
    draw.line([
        (check_x, check_y + check_size // 2),
        (check_x + check_size // 3, check_y + check_size)
    ], fill='#00C853', width=size // 15)
    
    draw.line([
        (check_x + check_size // 3, check_y + check_size),
        (check_x + check_size, check_y)
    ], fill='#00C853', width=size // 15)
    
    return img

def generate_icons(app_type, base_path):
    """Генерирует все размеры иконок для приложения"""
    print(f"Генерация иконок для {app_type}...")
    
    for dpi, size in SIZES.items():
        # Создаем директорию если не существует
        output_dir = os.path.join(base_path, f'mipmap-{dpi}')
        os.makedirs(output_dir, exist_ok=True)
        
        # Генерируем иконку нужного размера
        if app_type == 'master':
            icon = create_master_icon(size)
        else:
            icon = create_client_icon(size)
        
        # Сохраняем обычную и круглую версии
        icon_path = os.path.join(output_dir, 'ic_launcher.png')
        icon_round_path = os.path.join(output_dir, 'ic_launcher_round.png')
        
        icon.save(icon_path, 'PNG')
        
        # Для круглой версии создаем круглую маску
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, size, size], fill=255)
        
        round_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        round_icon.paste(icon, (0, 0))
        round_icon.putalpha(mask)
        round_icon.save(icon_round_path, 'PNG')
        
        print(f"  [OK] {dpi}: {size}x{size} px")
    
    print(f"[SUCCESS] Иконки для {app_type} созданы!\n")

if __name__ == '__main__':
    # Генерируем иконки для приложения мастера
    master_path = 'app/src/main/res'
    generate_icons('master', master_path)
    
    # Генерируем иконки для приложения клиента
    client_path = 'ClientApp/app/src/main/res'
    generate_icons('client', client_path)
    
    print("[DONE] Все иконки успешно сгенерированы!")
    print("\nТеперь выполните:")
    print("1. cd e:\\Ispravleno")
    print("2. gradlew.bat assembleDebug")
    print("3. adb install -r app/build/outputs/apk/debug/app-debug.apk")
