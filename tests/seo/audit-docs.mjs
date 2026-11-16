import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './metadata.mjs';

export function auditGuide(metadata) {
  return `# Sitemap URL kalite envanteri\n\nSon çalışma: ${metadata.generated_at}. ${metadata.total} sitemap URL’si için otomatik ön inceleme yapıldı.\n\n**Bu rapor içerik onayı değildir.** Her URL yetkili bir editör/ürün/uzman tarafından gerçek kaynak ve metriklerle incelenmelidir. Otomatik bulgu bulunmaması sayfanın güncel, özgün veya kanıtlı olduğu anlamına gelmez.\n\n## Ölçüt ve sınırlar\n\n| Soru | Otomatik ön kontrol | İnsan incelemesi |\n|---|---|---|\n| URL var ve doğru dilde mi? | Yerel HTML/canonical/noindex eşlemesi ve görünür gövdede dil sinyali | Canlı HTTP, doğru dil ve sayfa amacı |\n| Güncel mi? | Görünür açık inceleme tarihi var mı? | Mevzuat ve hesap dönemleri, değişiklik kaydı |\n| Özgün mü? | Placeholder metin sinyali; tam semantik benzerlik ölçümü yok | Özgün ürün/müşteri kanıtı ve diğer varyantlarla karşılaştırma |\n| Kanıtlı mı? | Resmî kaynak alan adı adayı ve kayıt durumu | Kaynağın ilgili iddiayı gerçekten desteklemesi, metrik tanımı |\n\n## Son otomatik bulgular\n\n${Object.entries(metadata).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n')}\n\nCSV satırları \`pending_human_review\` başlangıç durumunu taşır. \`owner\`, \`reviewer\`, \`reviewed_at\`, \`evidence_notes\` ve \`next_action\` gerçek incelemeyle doldurulur.\n\nKaynak bağlantısının varlığı, iddianın kanıtlandığı anlamına gelmez. Şablon filtreleme, semantik kopya ya da içerik doğruluğu tespiti Google sıralama tahmini değildir.\n`;
}
export function writeGuide(baseRoot, metadata) {
  fs.mkdirSync(path.join(baseRoot, 'editorial-inventory'), { recursive: true });
  fs.writeFileSync(path.join(baseRoot, 'editorial-inventory', 'README.md'), auditGuide(metadata));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'editorial-inventory', 'audit-metadata.json'), 'utf8'));
  writeGuide(root, metadata);
  console.log('Updated editorial-inventory/README.md');
}
