# Coin Collector Adventure — v1.5

Permainan edukasi coding untuk anak SD. Pemain membantu Milo menyusuri labirin, mengambil tiga koin, lalu mencapai peti harta karun dengan menyusun instruksi arah dan blok pengulangan.

## Struktur proyek

```text
Coin_Collector_Adventure_v1.5/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── script.js
    └── images/
        ├── favicon.svg
        └── logo.svg
```

Seluruh styling sudah disatukan di `assets/css/style.css`. Tidak ada file `style-patch.css`.

## Fitur pada v1.5

1. **Auto-scroll ke papan labirin.** Ketika tombol **Jalankan Program** ditekan, halaman otomatis menggulir ke panel Peta Labirin. Posisi scroll memperhitungkan tinggi header yang sticky.
2. **Username pemain.** Pemain harus memasukkan username 2–20 karakter sebelum mulai. Username yang sama (tidak membedakan huruf besar/kecil dan spasi berulang) akan membuka profil yang sama.
3. **Profil dan progres terpisah.** Setiap username memiliki skor, level yang terbuka, level terakhir, level yang telah selesai, serta hitungan kesalahan sendiri. Pemain baru mulai dari Level 1; pemain lama melanjutkan level terakhir miliknya.
4. **Popup penalti setelah tiga kegagalan.** Setiap tiga kali program gagal dijalankan pada level yang sama, total skor dikurangi 20 poin. Jika poin tersisa kurang dari 20, pengurangan dibatasi sampai 0 agar skor tidak negatif. Popup menampilkan skor sebelum, pengurangan, dan skor setelah penalti.
5. **Kesalahan dihitung dengan jelas.** Menabrak dinding/keluar area, mencapai peti sebelum mengambil semua koin, atau kehabisan instruksi sebelum mencapai peti dihitung sebagai satu kegagalan per proses menjalankan program. Menekan **Hentikan** secara manual tidak dihitung.
6. **Penyimpanan lokal.** Data disimpan pada `localStorage` browser/perangkat yang digunakan. Tidak memerlukan akun, email, server, atau database.
7. **Responsif dan aksesibel.** Layout menyesuaikan desktop, tablet, dan ponsel; tombol memiliki state interaksi, modal dapat ditutup dengan tombol atau tombol Escape, dan animasi mengikuti preferensi `prefers-reduced-motion` perangkat.

## Cara menjalankan

- Ekstrak ZIP.
- Buka folder proyek di Visual Studio Code.
- Jalankan `index.html` menggunakan ekstensi Live Server, atau buka langsung melalui browser modern.
- Pastikan perangkat terhubung ke internet untuk memuat Google Fonts dan Font Awesome dari CDN. Game dan file inti tetap tersedia secara lokal.

## Catatan progres pemain

Progres setiap pemain disimpan di browser yang sama. Contohnya:

- `MiloA` mencapai Level 3, lalu memilih **Ganti Pemain**.
- `MiloB` yang sudah mencapai Level 7 akan kembali ke Level 7 beserta skor dan progres miliknya.
- Username baru, misalnya `MiloC`, akan mulai dari Level 1 dengan skor 0.
- Saat kembali mengetik `MiloA`, game melanjutkan progres `MiloA`, bukan progres pemain lain.

Jangan menghapus data situs/browser atau menggunakan mode incognito apabila ingin mempertahankan progres lokal. Menghapus data situs dapat menghapus seluruh profil pada browser tersebut.

## Catatan penalti

Hitungan kesalahan disimpan terpisah untuk setiap pemain dan level. Dua kegagalan pertama hanya memberikan pemberitahuan. Pada kegagalan ketiga, skor dikurangi maksimal 20 poin dan penghitung kesalahan level tersebut direset. Setelah pemain berhasil menyelesaikan level, penghitung kesalahan level itu juga direset.
