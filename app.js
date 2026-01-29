/**
 * Educational Media Visualizer - Main Application Logic
 */

// State
let allMedia = [];
let metadataSchema = {};
let activeFilters = {
    learning_intention: new Set(),
    content_nature: new Set(),
    activation_level: '',
    timing: '',
    cost: '',
    sortBy: 'label'
};

// DOM Elements
const elements = {
    filterIntention: document.getElementById('filter-intention'),
    filterNature: document.getElementById('filter-nature'),
    filterActivation: document.getElementById('filter-activation'),
    filterTiming: document.getElementById('filter-timing'),
    filterCost: document.getElementById('filter-cost'),
    sortBy: document.getElementById('sort-by'),
    resetBtn: document.getElementById('reset-filters'),
    resultsCount: document.getElementById('results-count'),
    mediaGrid: document.getElementById('media-grid'),
    noResults: document.getElementById('no-results')
};

/**
 * Initialize the application
 */
async function init() {
    try {
        const response = await fetch('educational_media_formats_v3.json');
        if (!response.ok) throw new Error('Failed to load data');

        const data = await response.json();
        allMedia = data.media_formats;
        metadataSchema = data.metadata_schema;

        populateFilters();
        renderCards(allMedia);
        setupEventListeners();

        console.log('App Initialized with', allMedia.length, 'entries');
    } catch (error) {
        console.error('Fehler beim Initialisieren der App:', error);
        elements.mediaGrid.innerHTML = `<p class="error">Fehler beim Laden der Daten. Bitte prüfen Sie, ob 'educational_media_formats.json' existiert.</p>`;
    }
}

/**
 * Populate Sidebar Filters based on Schema
 */
function populateFilters() {
    // Learning Intention (Checkboxes)
    if (metadataSchema.learning_intention) {
        elements.filterIntention.innerHTML = metadataSchema.learning_intention.map(item => `
            <label>
                <input type="checkbox" value="${item}" data-filter="learning_intention">
                ${formatLabel(item)}
            </label>
        `).join('');
    }

    // Content Nature (Checkboxes)
    if (metadataSchema.content_nature) {
        elements.filterNature.innerHTML = metadataSchema.content_nature.map(item => `
            <label>
                <input type="checkbox" value="${item}" data-filter="content_nature">
                ${formatLabel(item)}
            </label>
        `).join('');
    }

    // Activation Level (Select)
    if (metadataSchema.activation_level) {
        metadataSchema.activation_level.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = formatLabel(item);
            elements.filterActivation.appendChild(option);
        });
    }

    // Timing (Select)
    if (metadataSchema.timing) {
        metadataSchema.timing.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = formatLabel(item);
            elements.filterTiming.appendChild(option);
        });
    }

    // Cost (Select)
    if (metadataSchema.cost) {
        metadataSchema.cost.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = formatLabel(item);
            elements.filterCost.appendChild(option);
        });
    }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Checkboxes (Delegation)
    document.querySelectorAll('.checkbox-group').forEach(group => {
        group.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                const filterType = e.target.dataset.filter;
                const value = e.target.value;

                if (e.target.checked) {
                    activeFilters[filterType].add(value);
                } else {
                    activeFilters[filterType].delete(value);
                }
                applyFilters();
            }
        });
    });

    // Selects
    elements.filterActivation.addEventListener('change', (e) => {
        activeFilters.activation_level = e.target.value;
        applyFilters();
    });

    elements.filterTiming.addEventListener('change', (e) => {
        activeFilters.timing = e.target.value;
        applyFilters();
    });

    elements.filterCost.addEventListener('change', (e) => {
        activeFilters.cost = e.target.value;
        applyFilters();
    });

    elements.sortBy.addEventListener('change', (e) => {
        activeFilters.sortBy = e.target.value;
        applyFilters();
    });

    // Reset Button
    elements.resetBtn.addEventListener('click', resetFilters);
}

/**
 * Filter Logic
 */
function applyFilters() {
    const filtered = allMedia.filter(media => {
        // 1. Learning Intention (ANY match - OR logic within category, AND logic across categories)
        // Actually, usually "Show me things that have [A] OR [B]" is standard for checkboxes.
        // But if I select "Explain" and "Create", do I want items that have BOTH? Or Either?
        // Let's assume OR between checkboxes of same group.
        // AND this matched set must also match the other filters.

        const matchIntention = activeFilters.learning_intention.size === 0 ||
            media.learning_intention.some(t => activeFilters.learning_intention.has(t));

        const matchNature = activeFilters.content_nature.size === 0 ||
            media.content_nature.some(t => activeFilters.content_nature.has(t));

        // Activation Level (Select = Exact Match or contained in range? Data is string "low", "medium" etc.)
        // But some users might view "High" and accept "Medium"? For now, exact match to start.
        const matchActivation = !activeFilters.activation_level ||
            media.activation_level === activeFilters.activation_level;

        // Timing (Array in JSON, Select in UI)
        // If I select "Synchronous", does the media have "synchronous" in its array?
        const matchTiming = !activeFilters.timing ||
            media.timing.includes(activeFilters.timing);

        // Cost (Select)
        const matchCost = !activeFilters.cost ||
            media.cost === activeFilters.cost;

        return matchIntention && matchNature && matchActivation && matchTiming && matchCost;
    });

    const sorted = applySorting(filtered);
    renderCards(sorted);
}

/**
 * Sorting Logic
 */
function applySorting(mediaList) {
    const costMap = { 'niedrig': 1, 'mittel': 2, 'hoch': 3 };
    const activationMap = { 'niedrig': 1, 'mittel': 2, 'hoch': 3, 'sehr_hoch': 4 };

    return [...mediaList].sort((a, b) => {
        const sortBy = activeFilters.sortBy;

        if (sortBy === 'label') {
            return a.label.localeCompare(b.label);
        } else if (sortBy === 'cost') {
            return (costMap[a.cost] || 0) - (costMap[b.cost] || 0);
        } else if (sortBy === 'activation_level') {
            return (activationMap[a.activation_level] || 0) - (activationMap[b.activation_level] || 0);
        }
        return 0;
    });
}

/**
 * Reset all filters
 */
function resetFilters() {
    activeFilters.learning_intention.clear();
    activeFilters.content_nature.clear();
    activeFilters.activation_level = '';
    activeFilters.timing = '';
    activeFilters.cost = '';
    activeFilters.sortBy = 'label';

    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    elements.filterActivation.value = '';
    elements.filterTiming.value = '';
    elements.filterCost.value = '';
    elements.sortBy.value = 'label';

    applyFilters();
}

/**
 * Render Cards
 */
function renderCards(mediaList) {
    elements.resultsCount.textContent = `Empfehlung von ${mediaList.length} Medienformaten`;
    elements.mediaGrid.innerHTML = '';

    if (mediaList.length === 0) {
        elements.noResults.classList.remove('hidden');
        return;
    } else {
        elements.noResults.classList.add('hidden');
    }

    mediaList.forEach(media => {
        const card = document.createElement('div');
        card.className = 'media-card';
        // Add click listener
        card.addEventListener('click', (e) => {
            // Prevent toggling if selecting text might be desired? 
            // For now, simple toggle.
            card.classList.toggle('expanded');
        });

        card.innerHTML = `
            <h3>${media.label}</h3>
            <p class="notes">${media.notes}</p>
            <div class="tags-container">
                ${media.learning_intention.slice(0, 3).map(t => `<span class="tag intention">${formatLabel(t)}</span>`).join('')}
                ${media.content_nature.slice(0, 2).map(t => `<span class="tag nature">${formatLabel(t)}</span>`).join('')}
                <span class="tag activation">${formatLabel(media.activation_level)}</span>
                <span class="tag timing">${media.timing.map(t => formatLabel(t)).join(', ')}</span>
                <span class="tag cost">${formatLabel(media.cost)} Aufwand</span>
            </div>
            <div class="media-details">
                <h4>Beschreibung</h4>
                <p>${media.detailed_description || "Keine detaillierte Beschreibung verfügbar."}</p>
                ${media.image_path ? `<img src="${media.image_path}" alt="${media.label} Vorschau" class="media-preview-img">` : ''}
            </div>

        `;
        elements.mediaGrid.appendChild(card);
    });

}

/**
 * Helper: Format snake_case to Title Case
 */
function formatLabel(str) {
    if (!str) return '';
    return str.split('_')
        .map(word => {
            let formatted = word.charAt(0).toUpperCase() + word.slice(1);
            return formatted;
        })
        .join(' ')
        .replace(/\bUnd\b/g, '&')
        .replace(/ae/g, 'ä')
        .replace(/Ae/g, 'Ä')
        .replace(/ue(?!ll)/g, 'ü')
        .replace(/Ue(?!ll)/g, 'Ü')
        .replace(/ẞ/g, 'ss');
}

// Start
init();
