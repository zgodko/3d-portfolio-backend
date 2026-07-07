// URL бэкенда на Render (ЗАМЕНИ НА СВОЙ URL!)
const API_URL = 'https://threed-portfolio-backend-12o3.onrender.com';

// URL для models.json (fallback)
const MODELS_JSON_URL = 'https://raw.githubusercontent.com/zgodko/3d-portfolio-backend/main/data/models.json';

// Настройки пагинации
const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let totalPages = 1;
let useStaticMode = false; // true если бэкенд недоступен
let allStaticModels = []; // для статического режима

// Элементы DOM
const modelsGrid = document.getElementById('models-grid');
const pagination = document.getElementById('pagination');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close');

// Lightbox элементы
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.querySelector('.lightbox-close');
if (!lightboxClose) {
    console.error('Lightbox close button not found in HTML!');
}

// Поиск
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
let isSearchMode = false;

// Открытие lightbox
function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Блокируем прокрутку
}

// Закрытие lightbox
function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

// Закрытие по клику на крестик
if (lightboxClose) {
    lightboxClose.onclick = (e) => {
        e.stopPropagation();
        closeLightbox();
    };
}

// Закрытие по клику вне картинки
lightbox.onclick = (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
};

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Закрытие модального окна
closeBtn.onclick = () => {
    modal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Чтение номера страницы и поискового запроса из URL
function getPageFromURL() {
    const hash = window.location.hash;

    // Проверяем поисковый запрос
    const searchMatch = hash.match(/search=([^&]+)/);
    if (searchMatch) {
        return { page: 1, search: decodeURIComponent(searchMatch[1]) };
    }

    // Проверяем номер страницы
    const match = hash.match(/page=(\d+)/);
    if (match) {
        const page = parseInt(match[1], 10);
        if (page >= 1) return { page: page, search: '' };
    }
    return { page: 1, search: '' };
}

// Обновление URL с номером страницы и поисковым запросом
function updateURL(page, searchQuery = '') {
    if (searchQuery) {
        window.location.hash = `search=${encodeURIComponent(searchQuery)}`;
    } else if (page > 1) {
        window.location.hash = `page=${page}`;
    } else {
        history.replaceState(null, '', window.location.pathname);
    }
}

// Загрузка списка моделей
async function loadModels(page = 1, searchQuery = '') {
    currentPage = page;
    modelsGrid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Загрузка...</p>';
    pagination.innerHTML = '';

    if (!useStaticMode) {
        // Режим бэкенда
        try {
            let url;
            if (searchQuery) {
                // Режим поиска
                url = `${API_URL}/api/models?search=${encodeURIComponent(searchQuery)}`;
            } else {
                // Режим пагинации
                url = `${API_URL}/api/models?page=${page}&limit=${ITEMS_PER_PAGE}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }
            const data = await response.json();

            if (searchQuery) {
                // Режим поиска — нет пагинации
                totalPages = 1;
                isSearchMode = true;
                displayModels(data.models);
                pagination.innerHTML = '';
            } else {
                // Режим пагинации
                totalPages = data.totalPages;
                isSearchMode = false;
                displayModels(data.models);
                displayPagination();
            }

            updateURL(page, searchQuery);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        } catch (error) {
            console.error('Error loading from backend:', error);
            console.log('Switching to static mode...');
            useStaticMode = true;
            await loadStaticData();
            return;
        }
    }

    // Статический режим
    if (searchQuery) {
        // Поиск в статическом режиме
        const filtered = filterStaticModels(searchQuery);
        displayModels(filtered);
        pagination.innerHTML = '';
        isSearchMode = true;
    } else {
        displayCurrentPageStatic();
        displayPagination();
        isSearchMode = false;
    }

    updateURL(page, searchQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Фильтрация моделей в статическом режиме
function filterStaticModels(query) {
    const queryLower = query.toLowerCase();
    return allStaticModels.filter(model => {
        // Поиск по названию
        if (model.name.toLowerCase().includes(queryLower)) {
            return true;
        }
        // Поиск по тегам
        if (model.tags && model.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
            return true;
        }
        return false;
    });
}

// Загрузка статических данных (fallback)
async function loadStaticData() {
    try {
        const response = await fetch(MODELS_JSON_URL);
        if (!response.ok) {
            throw new Error(`Static JSON returned ${response.status}`);
        }
        const data = await response.json();
        allStaticModels = data.models;
        totalPages = Math.ceil(allStaticModels.length / ITEMS_PER_PAGE);
        displayCurrentPageStatic();
        displayPagination();
    } catch (error) {
        console.error('Failed to load static data:', error);
        modelsGrid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Ошибка загрузки данных. Проверьте подключение к интернету.</p>';
    }
}

// Отображение текущей страницы в статическом режиме
function displayCurrentPageStatic() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allStaticModels.length);
    const pageModels = allStaticModels.slice(startIndex, endIndex);
    displayModels(pageModels);
}

// Отображение карточек моделей
function displayModels(models) {
    modelsGrid.innerHTML = '';

    if (models.length === 0) {
        modelsGrid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Нет моделей для отображения</p>';
        return;
    }

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.onclick = () => showModelDetails(model.id);

        card.innerHTML = `
            <img src="${model.preview_image_url}" alt="${model.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
            <div class="model-card-content">
                <span class="category">${model.category}</span>
                <h3>${model.name}</h3>
                <p class="date">${formatDate(model.created_at)}</p>
            </div>
        `;

        modelsGrid.appendChild(card);
    });
}

// Отображение пагинации
function displayPagination() {
    pagination.innerHTML = '';

    if (totalPages <= 1) return; // Не показываем пагинацию, если одна страница

    // Кнопка "Назад"
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Назад';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadModels(currentPage - 1);
    pagination.appendChild(prevBtn);

    // Номера страниц
    const pageNumbers = getPageNumbers(currentPage, totalPages);
    pageNumbers.forEach(num => {
        if (num === '...') {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'page-info';
            pagination.appendChild(dots);
        } else {
            const btn = document.createElement('button');
            btn.textContent = num;
            if (num === currentPage) {
                btn.classList.add('active');
            }
            btn.onclick = () => loadModels(num);
            pagination.appendChild(btn);
        }
    });

    // Информация о странице
    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `(стр. ${currentPage} из ${totalPages})`;
    pagination.appendChild(info);

    // Кнопка "Вперёд"
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Вперёд →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadModels(currentPage + 1);
    pagination.appendChild(nextBtn);
}

// Умная генерация номеров страниц (например: 1 ... 4 5 6 ... 10)
function getPageNumbers(current, total) {
    const pages = [];
    const delta = 1; // количество страниц слева и справа от текущей

    const left = current - delta;
    const right = current + delta;

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= left && i <= right)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return pages;
}

// Загрузка деталей модели
async function showModelDetails(modelId) {
    try {
        const response = await fetch(`${API_URL}/api/models/${modelId}`);
        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
        const model = await response.json();
        displayModelDetails(model);
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading model details from backend:', error);

        // Fallback на статический режим
        if (useStaticMode) {
            const model = allStaticModels.find(m => m.id === modelId || m.id === parseInt(modelId));
            if (model) {
                displayModelDetails(model);
                modal.style.display = 'block';
            } else {
                alert('Модель не найдена');
            }
        } else {
            alert('Ошибка загрузки деталей модели');
        }
    }
}

// Отображение деталей модели в модальном окне
function displayModelDetails(model) {
    const imagesHtml = model.images.map(img =>
        `<img src="${img.url}" alt="${img.alt}" loading="lazy" onclick="openLightbox('${img.url}', '${img.alt}')" style="cursor: zoom-in;" onerror="this.src='https://via.placeholder.com/250x200?text=No+Image'">`
    ).join('');

    const tagsHtml = model.tags.map(tag =>
        `<span class="tag">${tag}</span>`
    ).join('');

    modalBody.innerHTML = `
        <h2>${model.name}</h2>
        <p class="description">${model.description}</p>
        
        <div class="meta-info">
            <div class="meta-item">
                <span class="meta-label">Категория</span>
                <span class="meta-value">${model.category}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Дата создания</span>
                <span class="meta-value">${formatDate(model.created_at)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Полигоны</span>
                <span class="meta-value">${model.polygon_count > 0 ? model.polygon_count.toLocaleString() : 'Не указано'}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Софт</span>
                <span class="meta-value">${model.software}</span>
            </div>
        </div>
        
        <h3 style="margin-bottom: 1rem;">Галерея</h3>
        <div class="images-gallery">
            ${imagesHtml}
        </div>
        
        <div class="tags">
            ${tagsHtml}
        </div>
    `;
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}


// Обработка изменения hash в URL (кнопки "Назад"/"Вперёд" в браузере и поиск)
window.addEventListener('hashchange', () => {
    const { page, search } = getPageFromURL();
    if (search) {
        searchInput.value = search;
        searchClear.style.display = 'block';
        loadModels(1, search);
    } else if (page !== currentPage) {
        loadModels(page);
    }
});

// Обработчики поиска
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Показываем/скрываем кнопку очистки
    searchClear.style.display = query ? 'block' : 'none';

    // Debounce: ждём 300мс после последнего ввода
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query) {
            loadModels(1, query);
        } else {
            loadModels(1);
        }
    }, 300);
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    loadModels(1);
    searchInput.focus();
});

// Загрузка данных при старте (полный список моделей или фильтрованный поиск)
const { page: initialPage, search: initialSearch } = getPageFromURL();
if (initialSearch) {
    searchInput.value = initialSearch;
    searchClear.style.display = 'block';
    loadModels(1, initialSearch);
} else {
    currentPage = initialPage;
    loadModels(currentPage);
}