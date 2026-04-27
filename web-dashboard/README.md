# Akilli Sinif Web Dashboard

Bu proje, sinif ortami icin enerji verimliligi simulasyonu yapan web tabanli bir arayuzdur.

## Ozellikler

- Gercek zamanli sinif simulasyonu
- Sicaklik, doluluk, isik ve HVAC takibi
- Pencere ve kapi etkisi
- HTML ve TXT rapor olusturma
- Oturum kaydetme, yukleme ve silme
- Enerji ve konfor odakli ozet metrikler

## Calistirma

```powershell
npm install
npm run dev
```

Ardindan terminalde verilen `http://localhost:5173` benzeri adresi tarayicida acin.

## Uretim Derlemesi

```powershell
npm run build
```

## Proje Yapisi

- `src/App.tsx`: ana uygulama akisi
- `src/components/`: arayuz bilesenleri
- `src/simulation/`: simulasyon mantigi
- `src/utils/report.ts`: rapor uretimi
- `src/utils/sessions.ts`: oturum kaydetme akisi
- `src/utils/insights.ts`: ek metrikler ve uyarilar
