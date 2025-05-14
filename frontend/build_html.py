#!/usr/bin/env python3
"""
Скрипт для сборки HTML компонентов в единый index.html
"""

import os

def read_file(file_path):
    """Чтение содержимого файла"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Файл не найден: {file_path}")
        return ""

def main():
    """Основная функция сборки"""
    # Пути к компонентам
    template_dir = "templates"
    
    # Базовые компоненты
    head = read_file(os.path.join(template_dir, "head.html"))
    header = read_file(os.path.join(template_dir, "layout/header.html"))
    footer = read_file(os.path.join(template_dir, "layout/footer.html"))
    sidebar = read_file(os.path.join(template_dir, "components/sidebar.html"))
    map_component = read_file(os.path.join(template_dir, "components/map.html"))
    scripts = read_file(os.path.join(template_dir, "scripts.html"))
    
    # Модальные окна
    about_modal = read_file(os.path.join(template_dir, "modals/about-modal.html"))
    login_modal = read_file(os.path.join(template_dir, "modals/login-modal.html"))
    screenshot_modal = read_file(os.path.join(template_dir, "modals/screenshot-modal.html"))
    
    # Сборка финального HTML
    index_html = f"""<!DOCTYPE html>
<html lang="ru">

{head}

<body>
    {header}

    <main class="container-fluid p-3">
        <div class="row g-3">
            <!-- Sidebar for layers control -->
            {sidebar}
            
            <!-- Main map area -->
            {map_component}
        </div>
    </main>

    {footer}

    <!-- Modals -->
    {about_modal}
    {login_modal}
    {screenshot_modal}

    <!-- Scripts -->
    {scripts}
</body>

</html>
"""
    
    # Запись результата в файл
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(index_html)
    
    print("HTML успешно собран в index.html")

if __name__ == "__main__":
    main() 