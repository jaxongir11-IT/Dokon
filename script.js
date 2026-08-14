let products = JSON.parse(localStorage.getItem('pro_pos_products')) || [
  { 
    id: '1', 
    barcode: '890001', 
    name: 'Sut 1L', 
    price: 12000, 
    category: 'Ichimliklar', 
    stock: 45,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300' // Rasm linki yoki 'sut.jpg'
  },
  { 
    id: '2', 
    barcode: '890002', 
    name: 'Buxoro Noni', 
    price: 4000, 
    category: 'Yemak', 
    stock: 100,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300'
  },
  { 
    id: '3', 
    barcode: '890003', 
    name: 'Qahwa Arabica 250g', 
    price: 65000, 
    category: 'Ichimliklar', 
    stock: 12,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'
  },
  { 
    id: '4', 
    barcode: '890004', 
    name: 'Olma Fuji 1kg', 
    price: 18000, 
    category: 'Mevalar', 
    stock: 30,
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300'
  },
  { 
    id: '5', 
    barcode: '890005', 
    name: 'Dark Shokolad 100g', 
    price: 15000, 
    category: 'Yemak', 
    stock: 50,
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=300'
  },
  { 
    id: '6', 
    barcode: '890006', 
    name: 'Suv 1.5L', 
    price: 3500, 
    category: 'Ichimliklar', 
    stock: 80,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300'
  }
];