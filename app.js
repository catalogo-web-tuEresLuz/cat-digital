/* =========================================
   CONFIGURACIÓN Y ESTADO
   ========================================= */
   const CONFIG = {
    URL_API: "https://script.google.com/macros/s/AKfycbyQ4TAvrmBeyJgKo8Psb5DYikIeaHnSfvLIDZUK4AANlzJ3f9hGD0TZ1hfKgAwfHSD1/exec",
    WHATSAPP_BASE: "https://wa.me/543834267691",
    IMG_PLACEHOLDER: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" // Base64 transparente para mejor performance
};

let state = {
    productos: [],
    categoriaActual: "Todas",
    busqueda: ""
};

/* =========================================
   INICIALIZACIÓN
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    const contenedor = document.getElementById("productos");
    // 1. Mostrar Skeleton/Loading
    contenedor.innerHTML = Array(8).fill().map(() => `<div class="card skeleton"></div>`).join('');
    
    try {
        const res = await fetch(CONFIG.URL_API);
        state.productos = await res.json();
        
        cargarCategorias();
        render(); // Primera renderización
        
        // Configurar Buscador con Debounce
        const buscador = document.getElementById("buscador");
        buscador.addEventListener("input", debounce(() => {
            state.busqueda = buscador.value.toLowerCase();
            render();
        }, 300));

    } catch (err) {
        contenedor.innerHTML = `<p class="error">Error al cargar el catálogo. Por favor reintente.</p>`;
        console.error("API Error:", err);
    }
}

/* =========================================
   LÓGICA DE NEGOCIO (FILTRADO)
   ========================================= */
function render() {
    const filtrados = state.productos.filter(p => {
        const coincideTexto = p.nombre.toLowerCase().includes(state.busqueda) || 
                             (p.descripcion && p.descripcion.toLowerCase().includes(state.busqueda));
        const coincideCat = state.categoriaActual === "Todas" || p.categoria === state.categoriaActual;
        return coincideTexto && coincideCat;
    });

    mostrarProductos(filtrados);
}

/* =========================================
   COMPONENTES
   ========================================= */
function mostrarProductos(lista) {
    const contenedor = document.getElementById("productos");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<p class="no-results">No se encontraron productos.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    lista.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        
        const urlImagen = p.imagen ? p.imagen.split(",")[0].trim() : null;
        const imgFinal = convertirDrive(urlImagen);

        card.innerHTML = `
            <div class="imagenes">
                <img src="${CONFIG.IMG_PLACEHOLDER}" data-src="${imgFinal}" alt="${p.nombre}" class="lazy">
            </div>
            <div class="info">
                <p class="codigo">Cod: ${p.codigo}</p>
                <h3>${p.nombre}</h3>
                <span class="stock-pill ${p.stock > 0 ? 'in' : 'out'}">
                    ${p.stock > 0 ? `Stock: ${p.stock}` : 'Sin Stock'}
                </span>
                <a class="btn-whatsapp" 
                   href="${CONFIG.WHATSAPP_BASE}?text=${encodeURIComponent(`Hola 👋\nQuiero consultar por: *${p.nombre}*\n🔢 Código: ${p.codigo}`)}"
                   target="_blank">
                    Consultar
                </a>
            </div>
        `;
        fragment.appendChild(card);
    });

    contenedor.appendChild(fragment);
    aplicarLazyLoad();
}

function cargarCategorias() {
    const categorias = ["Todas", ...new Set(state.productos.map(p => p.categoria).filter(Boolean))];
    const contenedor = document.getElementById("categorias");
    
    contenedor.innerHTML = categorias.map(cat => `
        <button class="${cat === state.categoriaActual ? 'activa' : ''}" onclick="cambiarCategoria('${cat}', this)">
            ${cat}
        </button>
    `).join('');
}

window.cambiarCategoria = (cat, btn) => {
    state.categoriaActual = cat;
    document.querySelectorAll(".categorias button").forEach(b => b.classList.remove("activa"));
    btn.classList.add("activa");
    render();
};

/* =========================================
   UTILIDADES (SENIOR STUFF)
   ========================================= */
function convertirDrive(url) {
    if (!url || url.includes('sin-imagen')) return "img/sin-imagen.jpg";
    const match = url.match(/\/d\/([^/]+)|id=([^&]+)/);
    const id = match ? (match[1] || match[2]) : null;
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
}

// Lazy Load Pro con Intersection Observer
function aplicarLazyLoad() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => img.classList.add('loaded');
                obs.unobserve(img);
            }
        });
    });
    document.querySelectorAll(".lazy").forEach(img => observer.observe(img));
}

// Debounce para no saturar el filtrado al escribir
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}