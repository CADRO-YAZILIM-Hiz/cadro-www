import axios from 'axios';

const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const inferApiUrl = () => {
    if (process.env.REACT_APP_API_BASE_URL) {
        return process.env.REACT_APP_API_BASE_URL;
    }
    if (browserHost === 'localhost' || browserHost === '127.0.0.1') {
        return 'http://localhost:8000';
    }
    return 'https://api.cadro.io';
};

export const API_URL = inferApiUrl();

// ==========================================
// 🧹 ORTAK OTURUM TEMİZLEME YARDIMCISI
// ==========================================
export const clearAuthStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('company_plan');
};

// ==========================================
// 🔗 DOSYA / EK URL NORMALIZER
// ==========================================
export const getAbsoluteFileUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// ==========================================
// 🛡️ 1. REQUEST INTERCEPTOR (Zombi Token & GLOBAL DİL Motoru)
// ==========================================
api.interceptors.request.use((config) => {
    // 🌍 DİL AYARI: i18next'in kaydettiği dili al, yoksa varsayılan 'tr' yap
    const currentLang = localStorage.getItem('i18nextLng') || 'tr';
    
    // Backend'in okuyacağı Accept-Language başlığını ekle
    config.headers['Accept-Language'] = currentLang;

    // 🔑 TOKEN AYARI
    const token = localStorage.getItem('token'); 
    if (token && token !== 'null' && token !== 'undefined') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

// ==========================================
// 🛡️ 2. RESPONSE INTERCEPTOR (Otomatik Çıkış)
// ==========================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            clearAuthStorage();
            
            // 🔥 DÜZELTME: /login?mode=setup gibi URL parametrelerinde de döngüyü kırmak için .includes kullanıldı
            if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
                window.location.href = '/login'; 
            }
        }
        return Promise.reject(error);
    }
);

// --- TEMEL VE PERSONEL ROTALARI ---
export const getEmployees = () => api.get('/employee/list');
export const createEmployee = (data) => api.post('/employee/create', data);
export const getDashboardSummary = () => api.get('/dashboard/summary');
export const modifyEmployee = (id, data) => api.put(`/employee/${id}`, data);

export const employeeApi = {
    resetPassword: (id) => api.post(`/employee/${id}/reset-password`),
    getPositions: () => api.get('/employee/position/list'),
    createPosition: (data) => api.post('/employee/position', data),
    deletePosition: (posId) => api.delete(`/employee/position/${posId}`),
    getOrgChart: () => api.get('/employee/org-chart')
};

export const onboardingApi = {
    getOverview: (mode = 'onboarding', search = '') => api.get('/employee/lifecycle/overview', { params: { mode, search } }),
    getDetail: (empId, mode = 'onboarding') => api.get(`/employee/${empId}/lifecycle/detail`, { params: { mode } }),
    getChecklistTemplates: (mode = 'onboarding') => api.get('/employee/lifecycle/checklist/templates', { params: { mode } }),
    createChecklistTemplate: (data) => api.post('/employee/lifecycle/checklist/templates', data),
    deleteChecklistTemplate: (templateId) => api.delete(`/employee/lifecycle/checklist/templates/${templateId}`),
    updateChecklistItem: (empId, templateId, data) => api.put(`/employee/${empId}/lifecycle/checklist/${templateId}`, data),
    openAccount: (empId) => api.post(`/employee/${empId}/lifecycle/account/open`),
    closeAccount: (empId, exitDate) => api.post(`/employee/${empId}/lifecycle/account/close`, { exit_date: exitDate }),
    downloadDocument: (empId, kind) => api.get(`/employee/${empId}/lifecycle/document`, { params: { kind }, responseType: 'blob' }),
    createDocument: (empId, kind) => api.post(`/employee/${empId}/lifecycle/document`, { kind }),
    getOffboardingTemplates: () => api.get('/employee/lifecycle/offboarding-templates'),
    getTerminationReleaseDraft: (empId, templateKey = 'tr_release') => api.get(`/employee/${empId}/lifecycle/termination-release/draft`, { params: { template_key: templateKey } }),
    downloadTerminationReleasePdf: (empId, data) => api.post(`/employee/${empId}/lifecycle/termination-release/pdf`, data, { responseType: 'blob' }),
    storeTerminationRelease: (empId, data) => api.post(`/employee/${empId}/lifecycle/termination-release/store`, data),
};

// --- ŞİRKET ---
export const companyApi = {
    initCheckout: (data) => api.post('/api/v1/company/init-checkout', data),

    uploadLogo: (companyId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/company/${companyId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

export const settingsApi = {
    getSettings: () => api.get('/company/settings'),
    updateSettings: (data) => api.put('/company/settings', data)
};

// billingApi → Paddle abonelik bilgileri artık /paddle/subscription'dan gelir
// Iyzico kaldırıldı, tüm ödeme akışı Paddle üzerinden işlenir
export const billingApi = {
    getSubscriptionDetails: () => api.get('/paddle/subscription'),
};

export const executiveApi = {
    getOverview: () => api.get('/executive/overview'),
    updateCompanyMeta: (companyId, data) => api.put(`/executive/company-notes/${companyId}`, data),
};

export const supportApi = {
    contact: (formData) => api.post('/support/contact', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    requestSubscriptionCancellation: (formData) => api.post('/support/subscription-cancellation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getMine: () => api.get('/support/my'),
    getInbox: () => api.get('/support/inbox'),
    updateStatus: (messageId, data) => api.put(`/support/${messageId}/status`, data),
    createBroadcast: (formData) => api.post('/support/broadcast', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getOwnerBroadcasts: () => api.get('/support/broadcasts/owner'),
    getMyBroadcasts: () => api.get('/support/broadcasts'),
    getUnreadBroadcastCount: () => api.get('/support/broadcasts/unread-count'),
    markBroadcastRead: (broadcastId) => api.post(`/support/broadcasts/${broadcastId}/read`),
};

// --- İZİN YÖNETİMİ ---
export const leaveApi = {
    getCatalog: () => api.get('/leave/catalog'),
    getPendingRequests: () => api.get(`/leave/list?status=PENDING`), 
    getMyLeaves: () => api.get('/leave/list'),
    getLeaveSummary: (employeeId) => api.get(`/leave/summary/${employeeId}`),
    requestLeave: (data) => api.post('/leave/', data),
    processAction: (id, action, note = "") => api.put(`/leave/${id}/status`, { 
        status: action,
        rejection_reason: note 
    })
};

// --- ZAMAN & PUANTAJ ---
export const attendanceApi = {
    clockIn: (data) => api.post('/attendance/clock-in', data),
    clockOut: (data) => api.post('/attendance/clock-out', data), 
    bulkUpload: (formData) => api.post('/attendance/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// --- MESAİ PLANLARI ---
export const workScheduleApi = {
    getTemplates: (activeOnly = false) => api.get(`/work-schedule/templates?active_only=${activeOnly}`),
    getTemplatesReportPdf: () => api.get('/work-schedule/templates/report', { responseType: 'blob' }),
    getTemplateMembersReportPdf: (id) => api.get(`/work-schedule/templates/${id}/report`, { responseType: 'blob' }),
    createTemplate: (data) => api.post('/work-schedule/templates', data),
    updateTemplate: (id, data) => api.put(`/work-schedule/templates/${id}`, data),
    deleteTemplate: (id) => api.delete(`/work-schedule/templates/${id}`),
    getDepartmentAssignments: () => api.get('/work-schedule/assign/departments'),
    assignDepartments: (assignments) => api.post('/work-schedule/assign/departments', { assignments }),
    getEmployeeOverrides: (activeOnly = true) => api.get(`/work-schedule/assign/employees/overrides?active_only=${activeOnly}`),
    assignEmployeesBulk: (data) => api.post('/work-schedule/assign/employees/bulk', data),
    clearEmployeeOverrides: (employeeIds) => api.post('/work-schedule/assign/employees/clear', { employee_ids: employeeIds }),
    getEffectiveSchedule: (employeeId, targetDate = null) => api.get(`/work-schedule/employees/${employeeId}/effective`, {
        params: targetDate ? { target_date: targetDate } : {}
    })
};

// --- KİMLİK DOĞRULAMA (AUTH) ---
export const authApi = {
    login: (email, password) => {
        const params = new URLSearchParams();
        params.append('username', email); 
        params.append('password', password);
        
        return api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    },
    register: (data) => api.post('/auth/register', data),

    setupPassword: (data) => api.post('/auth/setup-password', data),  // ✅ DÜZELTİLDİ

    verifyMfa: (email, code) => api.post('/auth/verify-mfa', { 
        email, 
        code 
    }),

    forgotPassword: (email) => api.post('/auth/forgot-password', { 
        email 
    }),

    resetPasswordConfirm: (email, code, newPassword) => api.post('/auth/reset-password', { 
        email, 
        code, 
        new_password: newPassword 
    })
};

// --- YARDIM MASASI (HELPDESK) ---
export const ticketApi = {
  getAll: () => api.get('/helpdesk/'),
  getDetails: (id) => api.get(`/helpdesk/${id}`),
  getHistory: (id) => api.get(`/helpdesk/${id}/history`),
  create: (data) => api.post('/helpdesk/', data),
  addMessage: (id, message) => api.post(`/helpdesk/${id}/messages`, { message }),
  addMessageWithFile: (id, formData) => api.post(`/helpdesk/${id}/messages/with-file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  updateStatus: (id, status) => api.put(`/helpdesk/${id}/status`, { status })
};

// --- ATS (İŞE ALIM) ---
export const atsApi = {
  getJobs: () => api.get('/ats/jobs'),
  createJob: (data) => api.post('/ats/jobs', data),
  createCandidate: (data) => api.post('/ats/candidates', data),
  updateStage: (id, stage) => api.put(`/ats/candidates/${id}/stage`, { stage }),
  rejectCandidate: (id, data) => api.post(`/ats/candidates/${id}/reject`, data),
  deleteCandidate: (id) => api.delete(`/ats/candidates/${id}`),
  uploadCV: (id, formData) => api.post(`/ats/candidates/${id}/cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateOfferLetter: (id, data) => api.post(`/ats/candidates/${id}/offer-letter`, data, {
    responseType: 'blob' 
  })
};

// --- E-DOSYALAMA (BELGELER) ---
export const documentApi = {
    getByEmployee: (empId) => api.get(`/document/${empId}`), 
    getComplianceSummary: (empId) => api.get(`/document/${empId}/compliance-summary`),
    getHistory: (docId) => api.get(`/document/${docId}/history`),
    upload: (formData) => api.post(`/document/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateStatus: (docId, status) => api.put(`/employee/document/${docId}/status`, { status }),
    delete: (docId) => api.delete(`/document/${docId}`)
};

// --- MASRAF YÖNETİMİ ---
export const expenseApi = {
    create: (formData) => api.post('/expense/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getAll: () => api.get('/expense/'),
    getMyExpenses: () => api.get('/expense/'),
    updateStatus: (id, status, reason = "") => api.put(`/expense/${id}/status`, { status, rejection_reason: reason }),
    delete: (id) => api.delete(`/expense/${id}`) 
};

export const purchaseRequestApi = {
    getAll: (params = {}) => api.get('/purchase-request/list', { params }),
    getSummary: (params = {}) => api.get('/purchase-request/summary', { params }),
    getHistory: (id) => api.get(`/purchase-request/${id}/history`),
    create: (data) => api.post('/purchase-request/', data),
    updateStatus: (id, data) => api.put(`/purchase-request/${id}/status`, data),
    convertToExpense: (id) => api.post(`/purchase-request/${id}/convert-to-expense`),
};

export const genericRequestApi = {
    getCatalog: () => api.get('/generic-request/catalog'),
    getAll: (params = {}) => api.get('/generic-request/', { params }),
    getDetails: (id) => api.get(`/generic-request/${id}`),
    getHistory: (id) => api.get(`/generic-request/${id}/history`),
    getSummary: (params = {}) => api.get('/generic-request/summary-metrics', { params }),
    create: (data) => api.post('/generic-request/', data),
    updateStatus: (id, data) => api.put(`/generic-request/${id}/status`, data),
    addMessage: (id, data) => api.post(`/generic-request/${id}/messages`, data),
    addMessageWithFile: (id, formData) => api.post(`/generic-request/${id}/messages/with-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const knowledgeBaseApi = {
    getAll: (params = {}) => api.get('/knowledge-base/articles', { params }),
    getHistory: (id) => api.get(`/knowledge-base/articles/${id}/history`),
    getReceiptHistory: (id) => api.get(`/knowledge-base/articles/${id}/receipt-history`),
    create: (data) => api.post('/knowledge-base/articles', data),
    update: (id, data) => api.put(`/knowledge-base/articles/${id}`, data),
    restoreVersion: (articleId, versionId) => api.post(`/knowledge-base/articles/${articleId}/restore/${versionId}`),
    remove: (id) => api.delete(`/knowledge-base/articles/${id}`),
    markRead: (id) => api.post(`/knowledge-base/articles/${id}/read`),
    acknowledge: (id) => api.post(`/knowledge-base/articles/${id}/ack`),
};

export const kpiApi = {
    getCatalog: () => api.get('/kpi/catalog'),
    getAll: (params = {}) => api.get('/kpi/', { params }),
    getSummary: (params = {}) => api.get('/kpi/summary', { params }),
    create: (data) => api.post('/kpi/', data),
    update: (id, data) => api.put(`/kpi/${id}`, data),
    delete: (id) => api.delete(`/kpi/${id}`),
};

// --- PERFORMANS ---
export const performanceApi = {
    createGoal: (data) => api.post('/performance/goals', data),
    getGoals: (employeeId) => api.get(`/performance/goals/${employeeId}`),
    updateGoalProgress: (goalId, progress) => api.put(`/performance/goals/${goalId}/progress`, { progress }),
    createReview: (data) => api.post('/performance/reviews', data), 
    getReviews: (employeeId) => api.get(`/performance/reviews/${employeeId}`),
    getAIAnalysis: (employeeId) => api.get(`/performance/analysis/${employeeId}`) 
};

// --- ZİMMET YÖNETİMİ ---
export const assetApi = {
    assign: (data) => api.post('/asset/assign', data),
    bulkCreate: (data) => api.post('/asset/bulk-create', data),
    updateStatus: (id, data) => api.put(`/asset/${id}/status`, data),
    returnAsset: (data) => api.post(`/asset/return`, data), 
    getEmployeeAssets: (empId) => api.get(`/asset/employee/${empId}`),
    acknowledgeAsset: (id) => api.put(`/asset/${id}/acknowledge`), 
    getAvailable: () => api.get('/asset/list?status=AVAILABLE')
};

// --- EĞİTİM YÖNETİMİ ---
export const trainingApi = {
    getTrainings: () => api.get('/training/'),
    createTraining: (data) => api.post('/training/', data),
    deleteTraining: (id) => api.delete(`/training/${id}`),
    assignEmployees: (id, data) => api.post(`/training/${id}/assign`, data),
    cancelTraining: (id, data) => api.post(`/training/${id}/cancel`, data),
    takeAttendance: (participantId, status) => api.put(`/training/participant/${participantId}/attendance`, { status }),
    getParticipantsReportPdf: (id) => api.get(`/training/${id}/participants-report`, { responseType: 'blob' })
};

// --- RAPORLAR & PDF ---
export const reportApi = {
    getEmploymentCertificate: (empId) => api.get(`/report/employment-certificate/${empId}`, { responseType: 'blob' }),
    getAssetAssignmentPdf: (assetId) => api.get(`/report/asset-assignment/${assetId}`, { responseType: 'blob' }),
    generateDynamicReport: (data) => api.post('/report/dynamic', data, { responseType: 'blob' })
};

// --- PROFİL GÜNCELLEME TALEPLERİ (SELF-SERVICE) ---
export const profileApi = {
    requestUpdate: (data) => api.put('/employee/me/profile', data),
    getRequests: (status = 'PENDING') => api.get(`/employee/profile-requests?status=${status}`),
    reviewRequest: (reqId, status) => api.put(`/employee/profile-requests/${reqId}/status`, { status })
};

// ==========================================
// 🛡️ ANA EXPORT 
// ==========================================
export default api;