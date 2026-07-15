# HR Mobile App

Bu klasor, `HR SaaS` projesinin Flutter mobil uygulama iskeletidir.

## Durum

- Flutter SDK bu makinede kurulu olmadigi icin `flutter create` calistirilmadi
- buna ragmen `P1` icin temel klasor yapisi, paket secimi ve auth/home akisi iskeleti hazirlandi

## Hedef

Ilk faz:
- splash
- login
- MFA
- employee home

Sonraki faz:
- attendance
- leave
- expense
- helpdesk
- e-dossier

## Kurulum

Flutter SDK kurulduktan sonra:

1. Bu klasorde:
   `flutter pub get`
2. Gerekirse platform klasorlerini olustur:
   `flutter create .`
3. Sonra mevcut `lib/` yapisini koruyarak devam et

## Temel Paketler

- Riverpod
- go_router
- Dio
- flutter_secure_storage
- intl
- mobile_scanner

## Firebase Push Dosya Yerlesimi

Kullanilan uygulama kimlikleri:

- iOS bundle id: `com.ikpro.hrmobile`
- Android application id: `com.ikpro.hrmobile`

Gercek sir dosyalari repoya eklenmez.

Android:
- dosya adi: `google-services.json`
- hedef yol: `mobile_app/android/app/google-services.json`

iOS:
- dosya adi: `GoogleService-Info.plist`
- hedef yol: `mobile_app/ios/Runner/GoogleService-Info.plist`

Bu repoda yalnizca ornek dosyalar vardir:
- [android/app/google-services.json.example](/Users/turgaybozkus/Desktop/hr_saas/mobile_app/android/app/google-services.json.example)
- [ios/Runner/GoogleService-Info.plist.example](/Users/turgaybozkus/Desktop/hr_saas/mobile_app/ios/Runner/GoogleService-Info.plist.example)

Push iskeletini gercek provider ile acmak icin ornek calistirma:

```bash
flutter run \
  --dart-define=ENABLE_FIREBASE_PUSH=true \
  --dart-define=FIREBASE_WEB_VAPID_KEY=YOUR_WEB_VAPID_KEY
```
