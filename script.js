'use strict';

// 1. Initial State
const DEFAULT_PRODUCTS = [
  { id: '1', barcode: '890001', name: 'Sut 1L', price: 12000, category: 'Ichimliklar', stock: 45, image: null },
  { id: '2', barcode: '890002', name: 'Buxoro Noni', price: 4000, category: 'Yemak', stock: 100, image: null },
  { id: '3', barcode: '890003', name: 'Qahwa Arabica 250g', price: 65000, category: 'Ichimliklar', stock: 12, image: null },
  { id: '4', barcode: '890004', name: 'Olma Fuji 1kg', price: 18000, category: 'Mevalar', stock: 30, image: null },
  { id: '5', barcode: '890005', name: 'Dark Shokolad 100g', price: 15000, category: 'Yemak', stock: 50, image: null },
  { id: '6', barcode: '890006', name: 'Suv 1.5L', price: 3500, category: 'Ichimliklar', stock: 80, image: null }
];

let products = [];
try {
  const saved = localStorage.getItem('pro_pos_products');
  products = saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
} catch (e) {
  products = DEFAULT_PRODUCTS;
}

let cart = [];
let currentCategory = 'Barchasi';
let currentRole = 'cashier';
let targetRoleAttempt = null;
let receiptCounter = parseInt(localStorage.getItem('pro_pos_receipt_no'), 10) || 1001;

// Passwords
let adminPass = localStorage.getItem('pro_pos_admin_pass') || '1234';
let cashierPass = localStorage.getItem('pro_pos_cashier_pass') || '0000';

let barcodeBuffer = '';
let lastKeyTime = Date.now();

// Camera scanner state
let html5QrCode = null;
let isCameraScanning = false;
let cameraScanLock = false;
let cameraScanTarget = 'cart'; // 'cart' | 'newProduct'

// Product image state
let newProductImageData = null;   // "Yangi Mahsulot" formasida tanlangan rasm (base64)
let editingImageProductId = null; // Hozir rasmi o'zgartirilayotgan mavjud mahsulot ID'si

// 2. DOM Elements
const barcodeInput = document.getElementById('barcode-input');
const searchInput = document.getElementById('search-input');
const productsGrid = document.getElementById('products-grid');
const categoryFilters = document.getElementById('category-filters');
const cartItemsContainer = document.getElementById('cart-items');
const subtotalVal = document.getElementById('subtotal-val');
const taxVal = document.getElementById('tax-val');
const totalVal = document.getElementById('total-val');
const openAddBtn = document.getElementById('openAddProduct');
const addOverlay = document.getElementById('addProductOverlay');
const closeAddBtn = document.getElementById('closeAddProduct');
const addForm = document.getElementById('addProductForm');
const roleAdminBtn = document.getElementById('role-admin-btn');
const roleCashierBtn = document.getElementById('role-cashier-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const checkoutBtn = document.getElementById('checkout-btn');

// Camera scanner elements
const cameraScanBtn = document.getElementById('camera-scan-btn');
const cameraScanModal = document.getElementById('cameraScanModal');
const closeCameraScanBtn = document.getElementById('closeCameraScanBtn');
const cameraScanStatus = document.getElementById('camera-scan-status');
const scanForNewProductBtn = document.getElementById('scanForNewProductBtn');

// Product image elements
const productImageInput = document.getElementById('productImageInput');
const newProductImagePreview = document.getElementById('newProductImagePreview');
const productImageEditInput = document.getElementById('productImageEditInput');

// Modals & Toggle Buttons
const roleAuthModal = document.getElementById('roleAuthModal');
const roleAuthForm = document.getElementById('roleAuthForm');
const roleAuthTitle = document.getElementById('roleAuthTitle');
const roleAuthDesc = document.getElementById('roleAuthDesc');
const closeRoleAuthBtn = document.getElementById('closeRoleAuthBtn');
const rolePasswordInput = document.getElementById('rolePassword');
const toggleRolePassBtn = document.getElementById('toggleRolePassBtn');

const passSettingsModal = document.getElementById('passSettingsModal');
const openPassSettingsBtn = document.getElementById('openPassSettingsBtn');
const closePassSettingsBtn = document.getElementById('closePassSettingsBtn');
const passSettingsForm = document.getElementById('passSettingsForm');
const newAdminPassInput = document.getElementById('newAdminPass');
const newCashierPassInput = document.getElementById('newCashierPass');
const toggleAdminPassBtn = document.getElementById('toggleAdminPassBtn');
const toggleCashierPassBtn = document.getElementById('toggleCashierPassBtn');

// 3. Application Init
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderProducts();
  renderCart();
  setRole('cashier');
  bindEvents();
  if (barcodeInput) barcodeInput.focus();
});

// Font Awesome Icon Toggle Logic (Oq/Qora dinamik rangi)
function setupPasswordToggle(inputEl, toggleBtn) {
  if (!inputEl || !toggleBtn) return;

  const icon = toggleBtn.querySelector('i');
  if (!icon) return;

  // Boshlang'ich holat: parol yashirin (type="password") -> Icon QORA
  icon.className = 'fa-solid fa-eye-slash text-sm eye-black';

  toggleBtn.addEventListener('click', () => {
    const isPassword = inputEl.type === 'password';
    inputEl.type = isPassword ? 'text' : 'password';

    if (isPassword) {
      // Parol ko'rsatildi -> Icon OQ rang va fa-eye
      icon.className = 'fa-solid fa-eye text-sm eye-white';
    } else {
      // Parol berkitildi -> Icon QORA rang va fa-eye-slash
      icon.className = 'fa-solid fa-eye-slash text-sm eye-black';
    }
  });
}

// 4. Global Event Binding
function bindEvents() {
  if (searchInput) searchInput.addEventListener('input', renderProducts);

  if (roleAdminBtn) roleAdminBtn.addEventListener('click', () => promptRoleAuth('admin'));
  if (roleCashierBtn) roleCashierBtn.addEventListener('click', () => promptRoleAuth('cashier'));
  if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
  if (checkoutBtn) checkoutBtn.addEventListener('click', processCheckout);
  if (closeRoleAuthBtn) closeRoleAuthBtn.addEventListener('click', closeRoleAuth);

  // Toggle password setup with Font Awesome Icons
  setupPasswordToggle(rolePasswordInput, toggleRolePassBtn);
  setupPasswordToggle(newAdminPassInput, toggleAdminPassBtn);
  setupPasswordToggle(newCashierPassInput, toggleCashierPassBtn);

  // Parollarni o'zgartirish modali
  if (openPassSettingsBtn) {
    openPassSettingsBtn.addEventListener('click', () => {
      if (newAdminPassInput) newAdminPassInput.value = adminPass;
      if (newCashierPassInput) newCashierPassInput.value = cashierPass;
      passSettingsModal.classList.remove('hidden');
    });
  }

  if (closePassSettingsBtn) {
    closePassSettingsBtn.addEventListener('click', () => {
      passSettingsModal.classList.add('hidden');
    });
  }

  if (passSettingsForm) {
    passSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newAdmin = newAdminPassInput.value.trim();
      const newCashier = newCashierPassInput.value.trim();

      if (newAdmin && newCashier) {
        adminPass = newAdmin;
        cashierPass = newCashier;
        localStorage.setItem('pro_pos_admin_pass', adminPass);
        localStorage.setItem('pro_pos_cashier_pass', cashierPass);
        alert('Parollar muvaffaqiyatli saqlandi!');
        passSettingsModal.classList.add('hidden');
      }
    });
  }

  if (barcodeInput) {
    barcodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && barcodeInput.value.trim()) {
        handleBarcodeScan(barcodeInput.value.trim());
        barcodeInput.value = '';
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

    if (e.key === 'F2') {
      e.preventDefault();
      processCheckout();
      return;
    }

    if (e.key === 'F4') {
      e.preventDefault();
      if (barcodeInput) {
        barcodeInput.focus();
        barcodeInput.select();
      }
      return;
    }

    // Kamera modali ochiq bo'lsa, Esc bilan yopish
    if (e.key === 'Escape' && cameraScanModal && !cameraScanModal.classList.contains('hidden')) {
      closeCameraScan();
      return;
    }

    const now = Date.now();
    if (!isInputFocused || document.activeElement.id === 'barcode-input') {
      if (now - lastKeyTime > 80) barcodeBuffer = '';
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

  // --- Kamera skaner tugmalari ---
  if (cameraScanBtn) {
    cameraScanBtn.addEventListener('click', () => openCameraScan('cart'));
  }
  if (scanForNewProductBtn) {
    scanForNewProductBtn.addEventListener('click', () => openCameraScan('newProduct'));
  }
  if (closeCameraScanBtn) {
    closeCameraScanBtn.addEventListener('click', closeCameraScan);
  }

  // --- Mahsulot rasmlari ---
  if (productImageInput) {
    productImageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        newProductImageData = await compressImage(file);
        if (newProductImagePreview) {
          newProductImagePreview.innerHTML = `<img src="${newProductImageData}" class="w-full h-full object-cover" alt="preview">`;
        }
      } catch (err) {
        console.error('Rasm siqishda xatolik:', err);
        alert("Rasmni yuklab bo'lmadi. Boshqa rasm tanlang.");
      }
    });
  }

  if (productImageEditInput) {
    productImageEditInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const targetId = editingImageProductId;
      productImageEditInput.value = ''; // xuddi shu faylni keyinroq qayta tanlash imkoniyati uchun
      editingImageProductId = null;

      if (!file || !targetId) return;

      try {
        const imageData = await compressImage(file);
        const product = products.find(p => p.id === targetId);
        if (product) {
          product.image = imageData;
          localStorage.setItem('pro_pos_products', JSON.stringify(products));
          renderProducts();
        }
      } catch (err) {
        console.error('Rasm siqishda xatolik:', err);
        alert("Rasmni yuklab bo'lmadi. Boshqa rasm tanlang.");
      }
    });
  }
}

// 4.2 Image compression (localStorage joyni tejash uchun rasmni kichraytirish)
function compressImage(file, maxSize = 480, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('Fayl rasm emas'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

function handleBarcodeScan(code) {
  const product = products.find(p => p.barcode === code);
  if (product) {
    addToCart(product.id);
  } else {
    alert("Mahsulot topilmadi! Shtrix-kod: " + code);
  }
}

// =========================================================
// 4.1 CAMERA BARCODE / QR SCANNER (html5-qrcode asosida)
// =========================================================
// Bu tizim ikki bosqichda ishlaydi:
//   1) openCameraScan()  -> modalni ochadi, kamerani ishga tushiradi
//   2) onCameraScanSuccess() -> kod topilganda avtomatik chaqiriladi
//
// Diagnostika uchun har bir bosqichda cameraScanStatus matni yangilanadi,
// shunda nima uchun ishlamayotgani (ruxsat, kamera yo'q, HTTPS emas va h.k.)
// aniq ko'rinadi.

const SCAN_FORMATS = (typeof Html5QrcodeSupportedFormats !== 'undefined') ? [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF
] : undefined;

async function openCameraScan(target) {
  cameraScanTarget = target || 'cart';
  cameraScanLock = false;

  if (cameraScanModal) cameraScanModal.classList.remove('hidden');
  setCameraStatus('Tekshirilmoqda...');

  // 1) Kutubxona yuklanganmi?
  if (typeof Html5Qrcode === 'undefined') {
    setCameraStatus("Xatolik: kamera kutubxonasi yuklanmadi. Internetni tekshirib, sahifani yangilang (Ctrl+F5).");
    return;
  }

  // 2) Sahifa xavfsiz protokolda (HTTPS yoki localhost) turibdimi?
  //    Brauzerlar kamerani faqat shu holatda beradi.
  const isSecure = window.isSecureContext || location.hostname === 'localhost';
  if (!isSecure) {
    setCameraStatus("Xatolik: kamera faqat HTTPS saytda ishlaydi. Iltimos, https:// orqali oching.");
    return;
  }

  // 3) Brauzer umuman kamera API'sini qo'llab-quvvatlaydimi?
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCameraStatus("Xatolik: bu brauzer kamerani qo'llab-quvvatlamaydi.");
    return;
  }

  setCameraStatus('Kamera ruxsati so\'ralmoqda...');

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('camera-reader', {
        formatsToSupport: SCAN_FORMATS,
        verbose: false
      });
    }

    const config = {
      fps: 12,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0
    };

    let started = false;

    // Avval orqa (asosiy) kamerani sinaymiz - telefon/planshet uchun eng to'g'risi
    try {
      await html5QrCode.start({ facingMode: 'environment' }, config, onCameraScanSuccess, onCameraScanFailure);
      started = true;
    } catch (envErr) {
      console.warn('Orqa kamera bilan ishga tushmadi, ro\'yxatdan qidiramiz:', envErr);
    }

    // Agar orqa kamera topilmasa (noutbuk/kompyuter yoki bitta kamerali qurilma)
    if (!started) {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setCameraStatus("Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.");
        return;
      }
      // Nomida "back"/"rear" so'zi bo'lgan kamerani tanlashga urinib ko'ramiz, bo'lmasa birinchisini olamiz
      const backCam = cameras.find(c => /back|rear|orqa/i.test(c.label));
      const camId = backCam ? backCam.id : cameras[0].id;
      await html5QrCode.start(camId, config, onCameraScanSuccess, onCameraScanFailure);
      started = true;
    }

    isCameraScanning = true;
    setCameraStatus('Tayyor — shtrix-kod yoki QR-kodni kameraga tuting');
  } catch (err) {
    console.error('Camera scan error:', err);
    isCameraScanning = false;

    const name = err && err.name ? err.name : '';
    if (name === 'NotAllowedError') {
      setCameraStatus("Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ushbu saytga kamera ruxsatini yoqing.");
    } else if (name === 'NotFoundError') {
      setCameraStatus("Kamera topilmadi.");
    } else if (name === 'NotReadableError') {
      setCameraStatus("Kamera boshqa ilova/tab tomonidan band. Boshqa dasturlarni yoping va qayta urining.");
    } else {
      setCameraStatus("Kameraga ulanib bo'lmadi: " + (err && err.message ? err.message : 'noma\'lum xatolik'));
    }
  }
}

// Har bir freymda kod topilmasa chaqiriladi - shovqin bo'lmasligi uchun hech narsa qilmaymiz
function onCameraScanFailure() {
  // intentionally empty
}

function onCameraScanSuccess(decodedText) {
  if (cameraScanLock) return;
  cameraScanLock = true;

  const code = (decodedText || '').trim();

  if (cameraScanTarget === 'newProduct') {
    const barcodeField = document.getElementById('productBarcode');
    if (barcodeField) barcodeField.value = code;
  } else {
    handleBarcodeScan(code);
  }

  setCameraStatus('✓ Skaner qilindi: ' + code);

  // Foydalanuvchi natijani ko'rishi uchun qisqa kechikish, so'ng modalni yopamiz
  setTimeout(() => {
    closeCameraScan();
  }, 600);
}

function closeCameraScan() {
  if (cameraScanModal) cameraScanModal.classList.add('hidden');

  if (html5QrCode && isCameraScanning) {
    html5QrCode.stop()
      .then(() => html5QrCode.clear())
      .catch(() => {})
      .finally(() => {
        isCameraScanning = false;
        cameraScanLock = false;
      });
  } else {
    cameraScanLock = false;
  }
}

function setCameraStatus(text) {
  if (cameraScanStatus) cameraScanStatus.innerText = text;
}

// 5. Category & Product Rendering
function renderCategories() {
  if (!categoryFilters) return;
  const categories = ['Barchasi', ...new Set(products.map(p => p.category))];
  categoryFilters.innerHTML = categories.map(cat => `
    <button data-cat="${cat}"
      class="cat-btn px-3 py-1.5 text-xs rounded-xl transition-all whitespace-nowrap font-medium ${
        currentCategory === cat
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }">
      ${cat}
    </button>
  `).join('');

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentCategory = e.currentTarget.getAttribute('data-cat');
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  if (!productsGrid) return;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = products.filter(p => {
    const matchesCat = currentCategory === 'Barchasi' || p.category === currentCategory;
    const matchesSearch = p.name.toLowerCase().includes(query) || p.barcode.includes(query);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 text-sm">
        Mahsulotlar topilmadi
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const isLowStock = p.stock < 10;
    const isOutOfStock = p.stock <= 0;

    return `
      <div data-id="${p.id}" data-disabled="${isOutOfStock}"
        class="product-card bg-slate-800/60 hover:bg-slate-800 border ${
          isOutOfStock ? 'border-rose-900/40 opacity-50 cursor-not-allowed' : 'border-slate-700/60 hover:border-indigo-500/80 cursor-pointer'
        } rounded-2xl p-3.5 transition-all flex flex-col justify-between group relative">
        <div>
          <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-700/40 mb-2.5">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover">`
              : `<div class="w-full h-full flex items-center justify-center"><i class="fa-solid fa-box text-3xl text-slate-700"></i></div>`
            }
            <button type="button" data-edit-image-id="${p.id}" title="Rasmni o'zgartirish"
              class="edit-image-btn absolute bottom-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-slate-950/85 hover:bg-indigo-600 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all">
              <i class="fa-solid fa-camera text-[10px]"></i>
            </button>
          </div>
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
              ${p.price.toLocaleString('uz-UZ')} <span class="text-[10px]">UZS</span>
            </span>
          </div>
          <span class="text-[11px] font-medium ${isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-slate-400'}">
            ${isOutOfStock ? 'Tugagan' : p.stock + ' ta'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const isDisabled = e.currentTarget.getAttribute('data-disabled') === 'true';
      if (!isDisabled) {
        const id = e.currentTarget.getAttribute('data-id');
        addToCart(id);
      }
    });
  });

  document.querySelectorAll('.edit-image-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // savatchaga qo'shilib ketmasligi uchun
      editingImageProductId = btn.getAttribute('data-edit-image-id');
      if (productImageEditInput) productImageEditInput.click();
    });
  });
}

// 6. Cart Logic
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product || product.stock <= 0) return;

  const existItem = cart.find(item => item.id === id);

  if (existItem) {
    if (existItem.qty < product.stock) {
      existItem.qty++;
    } else {
      alert("Omborda boshqa " + product.name + " qolmagan!");
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
    alert("Omborda faqat " + product.stock + " ta mahsulot mavjud.");
  }

  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-slate-500 py-12">
        <i class="fa-solid fa-cart-flatbed text-3xl mb-2 text-slate-600"></i>
        <span class="text-xs">Savatcha bo'sh</span>
      </div>
    `;
    updateTotals(0);
    return;
  }

  let totalSum = 0;

  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    totalSum += itemTotal;

    return `
      <div class="bg-slate-900/90 border border-slate-700/60 p-2.5 rounded-xl flex justify-between items-center">
        <div class="flex items-center gap-2.5 flex-1 pr-2 min-w-0">
          <div class="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
            ${item.image
              ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`
              : `<i class="fa-solid fa-box text-slate-600 text-xs"></i>`
            }
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-xs text-slate-200 line-clamp-1">${item.name}</h4>
            <span class="text-[11px] text-emerald-400 font-semibold">${item.price.toLocaleString('uz-UZ')} UZS</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center bg-slate-800 rounded-lg border border-slate-700/80 p-0.5">
            <button data-id="${item.id}" data-action="minus" class="qty-btn w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded text-xs">-</button>
            <span class="px-2 text-xs font-bold text-slate-200 font-mono">${item.qty}</span>
            <button data-id="${item.id}" data-action="plus" class="qty-btn w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded text-xs">+</button>
          </div>
          <span class="text-xs font-extrabold text-slate-100 min-w-[65px] text-right font-mono">
            ${itemTotal.toLocaleString('uz-UZ')}
          </span>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const action = e.currentTarget.getAttribute('data-action');
      changeQty(id, action === 'plus' ? 1 : -1);
    });
  });

  updateTotals(totalSum);
}

function updateTotals(totalSum) {
  const tax = Math.round(totalSum * (12 / 112));
  const subtotal = totalSum - tax;

  if (subtotalVal) subtotalVal.innerText = subtotal.toLocaleString('uz-UZ') + ' UZS';
  if (taxVal) taxVal.innerText = tax.toLocaleString('uz-UZ') + ' UZS';
  if (totalVal) totalVal.innerText = totalSum.toLocaleString('uz-UZ') + ' UZS';
}

// 7. Checkout Logic
function processCheckout() {
  if (cart.length === 0) {
    alert("Xaridni amalga oshirish uchun savatchaga mahsulot qo'shing!");
    return;
  }

  cart.forEach(cartItem => {
    const product = products.find(p => p.id === cartItem.id);
    if (product) product.stock -= cartItem.qty;
  });

  localStorage.setItem('pro_pos_products', JSON.stringify(products));

  const recItems = document.getElementById('rec-items');
  let totalSum = 0;

  if (recItems) {
    recItems.innerHTML = cart.map(item => {
      const lineTotal = item.price * item.qty;
      totalSum += lineTotal;
      return `
        <div class="flex justify-between">
          <span>${item.name} x${item.qty}</span>
          <span>${lineTotal.toLocaleString('uz-UZ')} UZS</span>
        </div>
      `;
    }).join('');
  }

  const tax = Math.round(totalSum * (12 / 112));
  const subtotal = totalSum - tax;

  receiptCounter++;
  localStorage.setItem('pro_pos_receipt_no', receiptCounter);

  const recId = document.getElementById('rec-id');
  const recSubtotal = document.getElementById('rec-subtotal');
  const recTax = document.getElementById('rec-tax');
  const recTotal = document.getElementById('rec-total');

  if (recId) recId.innerText = receiptCounter;
  if (recSubtotal) recSubtotal.innerText = subtotal.toLocaleString('uz-UZ') + ' UZS';
  if (recTax) recTax.innerText = tax.toLocaleString('uz-UZ') + ' UZS';
  if (recTotal) recTotal.innerText = totalSum.toLocaleString('uz-UZ') + ' UZS';

  window.print();

  clearCart();
  renderProducts();
}

// 8. Auth & Role Management
function promptRoleAuth(role) {
  if (currentRole === role) return;
  targetRoleAttempt = role;

  if (roleAuthTitle) roleAuthTitle.innerText = role === 'admin' ? "Admin Rejimiga Kirish" : "Kassir Rejimiga Kirish";
  if (roleAuthDesc) roleAuthDesc.innerText = role === 'admin' ? "Admin PIN kodini kiriting" : "Kassir PIN kodini kiriting";

  if (roleAuthModal) roleAuthModal.classList.remove('hidden');
  if (rolePasswordInput) {
    rolePasswordInput.type = 'password';

    // Modal ochilganda iconni dastlabki berkitilgan (QORA) holatga keltirish
    if (toggleRolePassBtn) {
      const icon = toggleRolePassBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-eye-slash text-sm eye-black';
    }

    rolePasswordInput.value = '';
    rolePasswordInput.focus();
  }
}

function closeRoleAuth() {
  if (roleAuthModal) roleAuthModal.classList.add('hidden');
  if (rolePasswordInput) rolePasswordInput.value = '';
  targetRoleAttempt = null;
}

if (roleAuthForm) {
  roleAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputPass = rolePasswordInput ? rolePasswordInput.value : '';
    const requiredPass = targetRoleAttempt === 'admin' ? adminPass : cashierPass;

    if (inputPass === requiredPass) {
      setRole(targetRoleAttempt);
      closeRoleAuth();
    } else {
      alert("Noto'g'ri PIN kod! Qayta urinib ko'ring.");
    }
  });
}

function setRole(role) {
  currentRole = role;

  if (role === 'admin') {
    if (roleAdminBtn) roleAdminBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm';
    if (roleCashierBtn) roleCashierBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all text-slate-400 hover:text-slate-200';
  } else {
    if (roleCashierBtn) roleCashierBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm';
    if (roleAdminBtn) roleAdminBtn.className = 'px-3 py-1.5 text-xs rounded-lg font-medium transition-all text-slate-400 hover:text-slate-200';
  }
  if (openAddBtn) openAddBtn.classList.remove('hidden');
}

// 9. Modal Management (Add Product)
function resetNewProductImage() {
  newProductImageData = null;
  if (newProductImagePreview) {
    newProductImagePreview.innerHTML = '<i class="fa-solid fa-image text-slate-600"></i>';
  }
  if (productImageInput) productImageInput.value = '';
}

if (openAddBtn) {
  openAddBtn.addEventListener('click', () => {
    if (addOverlay) addOverlay.classList.remove('hidden');
    const barcodeField = document.getElementById('productBarcode');
    if (barcodeField) barcodeField.value = '890' + Math.floor(1000 + Math.random() * 9000);
    resetNewProductImage();
  });
}

if (closeAddBtn) {
  closeAddBtn.addEventListener('click', () => {
    if (addOverlay) addOverlay.classList.add('hidden');
    if (addForm) addForm.reset();
    resetNewProductImage();
  });
}

if (addForm) {
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value, 10);
    const category = document.getElementById('productCategory').value.trim();
    const barcode = document.getElementById('productBarcode').value.trim();

    if (!name || isNaN(price) || price < 0 || isNaN(stock) || !category || !barcode) return;

    const newProduct = {
      id: Date.now().toString(),
      barcode,
      name,
      price,
      category,
      stock,
      image: newProductImageData || null
    };

    products.unshift(newProduct);
    localStorage.setItem('pro_pos_products', JSON.stringify(products));

    renderCategories();
    renderProducts();

    if (addOverlay) addOverlay.classList.add('hidden');
    addForm.reset();
    resetNewProductImage();
  });
}
