'use strict';

// 1. App State
let products = JSON.parse(localStorage.getItem('pro_pos_products')) || [
  { id: '1', barcode: '890001', name: 'Sut 1L', price: 12000, category: 'Ichimliklar', stock: 45 },
  { id: '2', barcode: '890002', name: 'Buxoro Noni', price: 4000, category: 'Yemak', stock: 100 },
  { id: '3', barcode: '890003', name: 'Qahwa Arabica 250g', price: 65000, category: 'Ichimliklar', stock: 12 },
  { id: '4', barcode: '890004', name: 'Olma Fuji 1kg', price: 18000, category: 'Mevalar', stock: 30 },
  { id: '5', barcode: '890005', name: 'Dark Shokolad 100g', price: 15000, category: 'Yemak', stock: 50 },
  { id: '6', barcode: '890006', name: 'Suv 1.5L', price: 3500, category: 'Ichimliklar', stock: 80 }
];

let cart = [];
let currentCategory = 'Barchasi';
let currentRole = 'admin';

// Hardware Barcode Buffer variables
let barcodeBuffer = '';
let lastKeyTime = Date.now();

// 2. DOM Elements
const barcodeInput = document.getElementById('barcode-input');
const searchInput = document.getElementById('search-input');
const productsGrid = document.getElementById('products-grid');
const categoryFilters = document.getElementById('category-filters');
const cartItemsContainer = document.getElementById('cart-items');
const subtotalVal = document.getElementById('subtotal-val');
const taxVal = document.getElementById('tax-val');
const totalVal = document.getElementById('total-val');

// 3. Initialize App
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderProducts();
  renderCart();
  setRole('admin');

  // Fast focus shortcuts
  barcodeInput.focus();
});

// 4. Keyboard Listener for Barcode Scanner Hardware & Hotkeys
window.addEventListener('keydown', (e) => {
  const now = Date.now();
  const isInputFocused = document.activeElement.tagName === 'INPUT';

  // F2 Shortcut for Checkout
  if (e.key === 'F2') {
    e.preventDefault();
    processCheckout();
    return;
  }

  // F4 Shortcut to focus scanner input
  if (e.key === 'F4') {
    e.preventDefault();
    barcodeInput.focus();
    barcodeInput.select();
    return;
  }

  // Barcode Scanner listener (< 50ms interval between characters)
  if (!isInputFocused || document.activeElement.id === 'barcode-input') {
    if (now - lastKeyTime > 80) {
      barcodeBuffer = '';
    }
    lastKeyTime = now;

    if (e.key === 'Enter') {
      if (barcodeBuffer.trim().length >= 3) {
        e.preventDefault();
        handleBarcodeScan(barcodeBuffer.trim());
        barcodeBuffer = '';
        if (barcodeInput) barcodeInput.value = '';
      }
    } else if (e.key.length === 1) {
      barcodeBuffer += e.key;
    }
  }
});

// Manual entry on Enter key in barcode field
barcodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && barcodeInput.value.trim()) {
    handleBarcodeScan(barcodeInput.value.trim());
    barcodeInput.value = '';
  }
});

function handleBarcodeScan(code) {
  const product = products.find(p => p.barcode === code);
  if (product) {
    addToCart(product.id);
  } else {
    alert(`Mahsulot topilmadi! Shtrix-kod: ${code}`);
  }
}

// 5. Render Categories & Products
function renderCategories() {
  const categories = ['Barchasi', ...new Set(products.map(p => p.category))];
  categoryFilters.innerHTML = categories.map(cat => `
    <button 
      onclick="filterCategory('${cat}')"
      class="px-3 py-1.5 text-xs rounded-xl transition-all whitespace-nowrap font-medium ${
        currentCategory === cat 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }"
    >
      ${cat}
    </button>
  `).join('');
}

function filterCategory(cat) {
  currentCategory = cat;
  renderCategories();
  renderProducts();
}

function renderProducts() {
  const query = searchInput.value.toLowerCase().trim();
  
  const filtered = products.filter(p => {
    const matchesCat = currentCategory === 'Barchasi' || p.category === currentCategory;
    const matchesSearch = p.name.toLowerCase().includes(query) || p.barcode.includes(query);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 text-sm">
        Mahsulot topilmadi
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const isLowStock = p.stock < 15;
    const isOutOfStock = p.stock <= 0;

    return `
      <div 
        onclick="${isOutOfStock ? '' : `addToCart('${p.id}')`}"
        class="bg-slate-800/60 hover:bg-slate-800 border ${
          isOutOfStock ? 'border-rose-900/40 opacity-50 cursor-not-allowed' : 'border-slate-700/60 hover:border-indigo-500/80 cursor-pointer'
        } rounded-2xl p-3.5 transition-all flex flex-col justify-between group relative"
      >
        <div>
          <div class="flex justify-between items-start gap-1">
            <span class="text-[10px] font-mono bg-slate-950 text-indigo-300 px-2 py-0.5 rounded-md border border-slate-700/50">
              ${p.barcode}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">
              ${p.category}
            </span>
          </div>
          <h3 class="font-bold text-slate-100 text-sm mt-2.5 line-clamp-2 group-hover:text-indigo-300 transition-colors">
            ${p.name}
          </h3>
        </div>

        <div class="flex justify-between items-end mt-4 pt-2.5 border-t border-slate-700/40">
          <div>
            <span class="text-[10px] text-slate-400 block">Narx:</span>
            <span class="font-extrabold text-emerald-400 text-xs">
              ${p.price.toLocaleString()} <span class="text-[10px]">UZS</span>
            </span>
          </div>
          <span class="text-[11px] font-medium ${isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-slate-400'}">
            ${isOutOfStock ? 'Tugagan' : `${p.stock} ta`}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// 6. Cart Management
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product || product.stock <= 0) return;

  const existItem = cart.find(item => item.id === id);

  if (existItem) {
    if (existItem.qty < product.stock) {
      existItem.qty++;
    } else {
      alert(`Zaxirada boshqa ${product.name} qolmagan!`);
    }
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;

  const product = products.find(p => p.id === id);
  const newQty = item.qty + delta;

  if (newQty <= 0) {
    cart = cart.filter(c => c.id !== id);
  } else if (newQty <= product.stock) {
    item.qty = newQty;
  } else {
    alert(`Omborda faqat ${product.stock} ta mahsulot bor.`);
  }

  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-slate-500 py-12">
        <svg class="w-12 h-12 mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"></path>
        </svg>
        <span class="text-xs">Savatcha hozircha bo'sh</span>
      </div>
    `;
    updateTotals(0);
    return;
  }

  let subtotal = 0;

  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    return `
      <div class="bg-slate-900/90 border border-slate-700/60 p-2.5 rounded-xl flex justify-between items-center">
        <div class="flex-1 pr-2">
          <h4 class="font-bold text-xs text-slate-200 line-clamp-1">${item.name}</h4>
          <span class="text-[11px] text-emerald-400 font-semibold">${item.price.toLocaleString()} UZS</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center bg-slate-800 rounded-lg border border-slate-700/80 p-0.5">
            <button onclick="changeQty('${item.id}', -1)" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded text-xs">-</button>
            <span class="px-2 text-xs font-bold text-slate-200 font-mono">${item.qty}</span>
            <button onclick="changeQty('${item.id}', 1)" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded text-xs">+</button>
          </div>
          <span class="text-xs font-extrabold text-slate-100 min-w-[65px] text-right font-mono">
            ${itemTotal.toLocaleString()}
          </span>
        </div>
      </div>
    `;
  }).join('');

  updateTotals(subtotal);
}

function updateTotals(subtotal) {
  const tax = Math.round(subtotal * 0.12);
  const grandTotal = subtotal + tax;

  subtotalVal.innerText = `${subtotal.toLocaleString()} UZS`;
  taxVal.innerText = `${tax.toLocaleString()} UZS`;
  totalVal.innerText = `${grandTotal.toLocaleString()} UZS`;
}

// 7. Checkout & Print Thermal Receipt
function processCheckout() {
  if (cart.length === 0) {
    alert('Xaridni amalga oshirish uchun savatchaga mahsulot qo\'shing!');
    return;
  }

  // Deduct Stock
  cart.forEach(cartItem => {
    const product = products.find(p => p.id === cartItem.id);
    if (product) {
      product.stock -= cartItem.qty;
    }
  });

  // Save State
  localStorage.setItem('pro_pos_products', JSON.stringify(products));

  // Build Receipt
  const recItems = document.getElementById('rec-items');
  let subtotal = 0;

  recItems.innerHTML = cart.map(item => {
    const total = item.price * item.qty;
    subtotal += total;
    return `
      <div class="flex justify-between">
        <span>${item.name} x${item.qty}</span>
        <span>${total.toLocaleString()} UZS</span>
      </div>
    `;
  }).join('');

  const tax = Math.round(subtotal * 0.12);
  const grandTotal = subtotal + tax;

  document.getElementById('rec-id').innerText = Math.floor(100000 + Math.random() * 900000);
  document.getElementById('rec-subtotal').innerText = `${subtotal.toLocaleString()} UZS`;
  document.getElementById('rec-tax').innerText = `${tax.toLocaleString()} UZS`;
  document.getElementById('rec-total').innerText = `${grandTotal.toLocaleString()} UZS`;

  // Trigger Print
  window.print();

  // Reset Cart & Refresh View
  clearCart();
  renderProducts();
}

// 8. Role Management (RBAC)
function setRole(role) {
  currentRole = role;
  const adminBtn = document.getElementById('role-admin-btn');
  const cashierBtn = document.getElementById('role-cashier-btn');

  if (role === 'admin') {
    adminBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm';
    cashierBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all text-slate-400 hover:text-slate-200';
  } else {
    cashierBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm';
    adminBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all text-slate-400 hover:text-slate-200';
  }
}