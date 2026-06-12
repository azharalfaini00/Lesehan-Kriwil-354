export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'makanan' | 'minuman' | 'camilan';
  rating: number;
  image: string;
  isPopular?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  coords: [number, number]; // [lat, lng]
  phone: string;
}

export const RESTAURANT_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    name: 'Resto Rasa Nusantara - Sudirman',
    address: 'Jl. Jend. Sudirman No. Kav 21, Jakarta Pusat, DKI Jakarta 10220',
    coords: [-6.21412, 106.82194],
    phone: '(021) 555-0192'
  },
  {
    id: 'branch-2',
    name: 'Resto Rasa Nusantara - Kemang',
    address: 'Jl. Kemang Raya No. 12, Mampang Prpt., Jakarta Selatan, DKI Jakarta 12730',
    coords: [-6.27354, 106.81446],
    phone: '(021) 555-0248'
  },
  {
    id: 'branch-3',
    name: 'Resto Rasa Nusantara - Bandung Dago',
    address: 'Jl. Ir. H. Juanda No. 84, Dago, Coblong, Kota Bandung, Jawa Barat 40132',
    coords: [-6.89294, 107.61574],
    phone: '(022) 444-0812'
  }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Nasi Goreng Spesial Nusantara',
    description: 'Nasi goreng harum kaya rempah khas Indonesia dengan topping telur mata sapi, ayam suwir, bakso sapi, acar segar, dan kerupuk udang renyah.',
    price: 38000,
    category: 'makanan',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
    isPopular: true
  },
  {
    id: 'menu-2',
    name: 'Sate Ayam Madura (10 Tusuk)',
    description: 'Sate daging dada ayam empuk panggang arang tradisional disiram saus kacang gurih manis, taburan bawang merah mentah dan jeruk limau segar.',
    price: 35000,
    category: 'makanan',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    isPopular: true
  },
  {
    id: 'menu-3',
    name: 'Rendang Daging Sapi Padang',
    description: 'Daging sapi pilihan empuk yang dimasak perlahan berjam-jam dengan santan murni dan bumbu rempah asli Minang hingga berwarna cokelat gelap beraroma kuat.',
    price: 48000,
    category: 'makanan',
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80',
    isPopular: true
  },
  {
    id: 'menu-4',
    name: 'Soto Ayam Lamongan Kehangatan',
    description: 'Soto ayam berkuah kuning bening gurih bertabur koya udang yang gurih, bihun soun, suwiran ayam kampung, telur rebus, seledri dan bubuk jeruk nipis.',
    price: 28000,
    category: 'makanan',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1626804475315-9644b37a2fe4?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'menu-5',
    name: 'Gado-Gado Ibu Pertiwi',
    description: 'Sayur-mayur segar matang (kangkung, tauge, kacang panjang) dicampur tahu goreng, tempe, kentang rebus, lontong kenyal dan curahan bumbu kacang kental.',
    price: 26000,
    category: 'makanan',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'menu-6',
    name: 'Es Teh Manis Selasih',
    description: 'Teh melati seduh tradisional dengan gula asli disajikan super dingin dan ditaburi biji selasih bertekstur unik.',
    price: 8000,
    category: 'minuman',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'menu-7',
    name: 'Es Jeruk Peras Alami',
    description: 'Perasan jeruk pontianak asli segar dipadu dengan es batu kristal dan sirup gula murni manis menyegarkan kerongkongan.',
    price: 12000,
    category: 'minuman',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'menu-8',
    name: 'Soda Gembira Nostalgia',
    description: 'Minuman mocktail legendaris perpaduan sirup coco pandan merah manis, susu kental manis putih, dan air soda berkarbonasi dingin.',
    price: 18000,
    category: 'minuman',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'menu-9',
    name: 'Martabak Manis Cokelat Keju',
    description: 'Martabak manis tebal empuk dan berongga dengan olesan mentega wijsman bertaburan melimpah meses cokelat, keju parut, dan susu kental manis.',
    price: 32000,
    category: 'camilan',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80',
    isPopular: true
  },
  {
    id: 'menu-10',
    name: 'Pisang Goreng Pasir Keju',
    description: 'Pisang kepok manis digoreng tepung roti renyah crispy disajikan dengan taburan keju cheddar parut dan siraman susu cokelat.',
    price: 15000,
    category: 'camilan',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1566843972142-a7fcb70de55a?w=600&auto=format&fit=crop&q=80'
  }
];
