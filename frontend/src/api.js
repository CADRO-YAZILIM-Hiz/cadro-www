/*
 * ⚠️ LEGACY API COMPATIBILITY LAYER
 *
 * Bu dosya geçmişte farklı sayfalar tarafından ana API girişi olarak
 * kullanılıyordu. Aktif proje artık `src/api/axios.js` üzerinden ilerliyor.
 *
 * Eski `pages/*` dosyaları veya unutulmuş import zincirleri kırılmasın diye
 * burayı uyumluluk köprüsü olarak koruyoruz.
 */

import api, {
  getEmployees,
  createEmployee,
  modifyEmployee,
  getDashboardSummary,
} from './api/axios';

// Legacy sayfalarda bordro tipi bekleniyor; aktif backend route olmadığı için
// boş ama güvenli bir yanıt dönüyoruz.
export const getPayrollTypes = () => Promise.resolve({ data: [] });

export {
  api as default,
  getEmployees,
  createEmployee,
  modifyEmployee,
  getDashboardSummary,
};
