# Coin Collector Adventure

**Coin Collector Adventure** adalah permainan edukasi coding berbasis web untuk peserta didik sekolah dasar (rekomendasi usia 8–12 tahun). Pemain membantu Milo menjelajahi labirin, mengumpulkan tiga koin, dan mencapai peti harta karun dengan menyusun urutan instruksi.

## Fitur utama

- Username pemain dengan dukungan beberapa profil pada satu browser.
- 20 level bertahap dengan peta labirin berukuran 6 × 6.
- Blok instruksi arah: Atas, Bawah, Kiri, dan Kanan.
- Blok pengulangan ×2 dan ×3 yang mengulangi arah terakhir.
- Animasi gerakan Milo dan umpan balik ketika menemukan koin atau terhalang dinding.
- Sistem poin, progres, level terbuka, dan riwayat level yang selesai.
- Progres tersimpan secara lokal menggunakan `localStorage`.
- Tombol undo, hapus semua instruksi, hentikan program, dan ulang level.
- Tampilan responsif untuk desktop, tablet, dan ponsel.
- Copyright dinamis pada footer.

## Cara menjalankan

1. Ekstrak folder proyek.
2. Buka folder `coin-collector-adventure-v2` di Visual Studio Code.
3. Jalankan `index.html` menggunakan ekstensi Live Server, atau buka file tersebut langsung di browser.
4. Masukkan username, lalu pilih **Mulai Petualangan**.

Aplikasi ini tidak membutuhkan backend, database, maupun API key. Font Google Fonts dan Font Awesome dimuat dari CDN sehingga koneksi internet diperlukan agar font dan ikon eksternal tampil sempurna. Permainan tetap memakai HTML, CSS, dan JavaScript di sisi browser.

## Cara bermain

1. Masukkan username.
2. Perhatikan peta 6 × 6. Milo mulai dari kiri atas, sedangkan peti harta berada di kanan bawah.
3. Tambahkan blok Atas, Bawah, Kiri, atau Kanan ke daftar **Program Milo**.
4. Untuk menggunakan pengulangan, tambahkan satu blok arah terlebih dahulu, lalu pilih **Ulangi ×2** atau **Ulangi ×3**. Blok tersebut mengulang arah terakhir sebanyak dua atau tiga langkah tambahan.
5. Tekan **Jalankan Program**. Milo selalu memulai dari titik awal setiap kali program dijalankan.
6. Kumpulkan ketiga koin sebelum mencapai peti harta.
7. Selesaikan level untuk memperoleh poin dan membuka level berikutnya.

### Aturan poin

Pada penyelesaian pertama setiap level, pemain memperoleh:

- 50 poin untuk setiap koin (maksimal 150 poin).
- 100 poin karena mencapai peti harta.
- Bonus efisiensi hingga 100 poin. Bonus berkurang 10 poin untuk setiap langkah di atas jalur terpendek yang dihitung oleh peta.

Dengan demikian, skor maksimum untuk penyelesaian pertama satu level adalah **350 poin**. Level yang pernah diselesaikan tetap dapat dimainkan kembali untuk latihan, tetapi tidak memberikan poin tambahan.

## Penyimpanan data

Username, skor, level terbuka, dan level yang telah diselesaikan disimpan di `localStorage` browser berdasarkan username. Data tidak dikirim ke server. Progres tersedia pada browser dan perangkat yang sama; data tidak otomatis tersinkronisasi ke perangkat lain. Menghapus data situs/browser dapat menghapus progres permainan.

## Struktur folder

```text
coin-collector-adventure-v2/
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── images/
│       ├── favicon.svg
│       └── logo.svg
└── docs/
    └── panduan-guru.md
```

## Teknologi

- HTML5
- CSS3 (responsive layout, CSS Grid, Flexbox, transitions, dan keyframes)
- Vanilla JavaScript
- Browser `localStorage`
- Font Awesome dan Google Fonts melalui CDN

## Pengembang

**Arjun Yuda Firwanda**  
Coin Collector Adventure · Educational Coding Game

© 2026 Arjun Yuda Firwanda. All rights reserved.
