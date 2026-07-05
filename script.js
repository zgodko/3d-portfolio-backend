// URL бэкенда (локальный сервер)
const API_URL = 'http://localhost:8080';

// Элементы DOM
const modelsGrid = document.getElementById('models-grid');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close');

// Закрытие модального окна
closeBtn.onclick = () => {
    modal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Загрузка списка моделей
async function loadModels() {
    try {
        const response = await fetch(`${API_URL}/api/models`);
        if (!response.ok) {
            throw new Error('Failed to load models');
        }
        const models = await response.json();
        displayModels(models);
    } catch (error) {
        console.error('Error loading models:', error);
        modelsGrid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Ошибка загрузки данных. Убедитесь, что сервер запущен.</p>';
    }
}

// Отображение карточек моделей
function displayModels(models) {
    modelsGrid.innerHTML = '';
    
    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.onclick = () => showModelDetails(model.id);
        
        card.innerHTML = `
            <img src="${model.preview_image_url}" alt="${model.name}" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
            <div class="model-card-content">
                <span class="category">${model.category}</span>
                <h3>${model.name}</h3>
                <p class="date">${formatDate(model.created_at)}</p>
            </div>
        `;
        
        modelsGrid.appendChild(card);
    });
}

// Загрузка деталей модели
async function showModelDetails(modelId) {
    try {
        const response = await fetch(`${API_URL}/api/models/${modelId}`);
        if (!response.ok) {
            throw new Error('Failed to load model details');
        }
        const model = await response.json();
        displayModelDetails(model);
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading model details:', error);
        alert('Ошибка загрузки деталей модели');
    }
}

// Отображение деталей модели в модальном окне
function displayModelDetails(model) {
    const imagesHtml = model.images.map(img => 
        `<img src="${img.url}" alt="${img.alt}" onerror="this.src='https://via.placeholder.com/250x200?text=No+Image'">`
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

// Загрузка данных при старте
loadModels();