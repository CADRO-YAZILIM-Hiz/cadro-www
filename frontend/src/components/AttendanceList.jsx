import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { attendanceApi, workScheduleApi } from '../api/axios';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle,
  CheckSquare,
  Clock,
  CopyCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Square,
  TimerReset,
  Trash2,
  UploadCloud,
  UserCog,
  Users,
  X,
  XCircle,
  XOctagon,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const DEFAULT_SCHEDULE_FORM = {
  name: '',
  schedule_type: 'FIXED',
  start_time: '08:30',
  end_time: '17:30',
  break_minutes: 60,
  grace_in_minutes: 10,
  grace_out_minutes: 5,
  late_after_minutes: 0,
  early_leave_after_minutes: 0,
  overtime_after_minutes: 30,
  core_start_time: '',
  core_end_time: '',
  crosses_midnight: false,
  is_active: true,
};

const todayIso = new Date().toISOString().split('T')[0];
const monthStartDate = new Date();
monthStartDate.setDate(1);
const monthStartIso = monthStartDate.toISOString().split('T')[0];

const DEFAULT_SICK_REPORT_FORM = {
  employee_id: '',
  start_date: monthStartIso,
  end_date: todayIso,
  report_no: '',
  issued_by: '',
  issue_date: todayIso,
  payroll_treatment: 'FULL_PAY',
  decision_note: '',
};

const AttendanceList = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const numberLocale = isArabic ? 'ar-u-nu-arab' : locale;

  const [activeView, setActiveView] = useState('ATTENDANCE');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({
    query: '',
    department: 'ALL',
    schedule_name: 'ALL',
    schedule_type: 'ALL',
    status: 'ALL',
    approval: 'ALL',
    from_date: monthStartIso,
    to_date: todayIso,
  });
  const [attendanceFilterMenu, setAttendanceFilterMenu] = useState(null);
  const [attendanceFilterDraft, setAttendanceFilterDraft] = useState({
    query: '',
    department: 'ALL',
    schedule_name: 'ALL',
    schedule_type: 'ALL',
    status: 'ALL',
    approval: 'ALL',
    from_date: monthStartIso,
    to_date: todayIso,
  });
  const attendanceFilterMenuRef = useRef(null);

  const [exporting, setExporting] = useState(false);
  const [reportSummary, setReportSummary] = useState({ rows: [], totals: null, from_date: monthStartIso, to_date: todayIso });
  const [reportLoading, setReportLoading] = useState(false);
  const [showSickReportModal, setShowSickReportModal] = useState(false);
  const [sickReportForm, setSickReportForm] = useState(DEFAULT_SICK_REPORT_FORM);

  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(DEFAULT_SCHEDULE_FORM);

  const [departments, setDepartments] = useState([]);
  const [departmentAssignments, setDepartmentAssignments] = useState({});
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeOverrides, setEmployeeOverrides] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeFilters, setEmployeeFilters] = useState({
    department_id: 'ALL',
    query: '',
    work_schedule_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [employeeAssigning, setEmployeeAssigning] = useState(false);

  const approvalOptionLabel = (value) => {
    switch (value) {
      case 'PENDING':
        return t('badge_manager_pending', 'MÜDÜR ONAYI BEK.');
      case 'MANAGER_APPROVED':
        return t('badge_hr_pending', 'İK ONAYI BEK.');
      case 'HR_APPROVED':
        return t('badge_payroll_ready', 'BORDROYA HAZIR');
      case 'REJECTED':
        return t('badge_rejected', 'REDDEDİLDİ');
      default:
        return value;
    }
  };

  useEffect(() => {
    setAttendanceFilterDraft(attendanceFilters);
  }, [attendanceFilters]);

  useEffect(() => {
    if (!attendanceFilterMenu) return undefined;
    const handleClickOutside = (event) => {
      if (attendanceFilterMenuRef.current && !attendanceFilterMenuRef.current.contains(event.target)) {
        setAttendanceFilterMenu(null);
        setAttendanceFilterDraft(attendanceFilters);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [attendanceFilterMenu, attendanceFilters]);

  const openAttendanceFilterMenu = (menuKey) => {
    setAttendanceFilterDraft(attendanceFilters);
    setAttendanceFilterMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const applyAttendanceFilterMenu = () => {
    setAttendanceFilters(attendanceFilterDraft);
    setAttendanceFilterMenu(null);
  };

  const resetAttendanceFilterMenu = () => {
    if (attendanceFilterMenu === 'personnel') {
      setAttendanceFilterDraft((prev) => ({ ...prev, query: '', department: 'ALL' }));
      return;
    }
    if (attendanceFilterMenu === 'date') {
      setAttendanceFilterDraft((prev) => ({ ...prev, from_date: monthStartIso, to_date: todayIso }));
      return;
    }
    if (attendanceFilterMenu === 'status') {
      setAttendanceFilterDraft((prev) => ({ ...prev, status: 'ALL' }));
      return;
    }
    if (attendanceFilterMenu === 'schedule') {
      setAttendanceFilterDraft((prev) => ({ ...prev, schedule_name: 'ALL', schedule_type: 'ALL' }));
      return;
    }
    if (attendanceFilterMenu === 'approval') {
      setAttendanceFilterDraft((prev) => ({ ...prev, approval: 'ALL' }));
    }
  };

  const hasAttendanceFilter = (menuKey) => {
    if (menuKey === 'personnel') return Boolean(attendanceFilters.query) || attendanceFilters.department !== 'ALL';
    if (menuKey === 'date') return attendanceFilters.from_date !== monthStartIso || attendanceFilters.to_date !== todayIso;
    if (menuKey === 'schedule') return attendanceFilters.schedule_name !== 'ALL' || attendanceFilters.schedule_type !== 'ALL';
    if (menuKey === 'status') return attendanceFilters.status !== 'ALL';
    if (menuKey === 'approval') return attendanceFilters.approval !== 'ALL';
    return false;
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/list', {
        params: {
          from_date: attendanceFilters.from_date || undefined,
          to_date: attendanceFilters.to_date || undefined,
        },
      });
      setRecords(res.data || []);
      setSelectedRecords([]);
    } catch (err) {
      toast.error(t('err_fetch_attendance', 'Puantaj verileri çekilemedi.'));
      console.error('Veri hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollSummary = async () => {
    setReportLoading(true);
    try {
      const res = await api.get('/attendance/payroll-summary', {
        params: {
          from_date: attendanceFilters.from_date || undefined,
          to_date: attendanceFilters.to_date || undefined,
          department: attendanceFilters.department !== 'ALL' ? attendanceFilters.department : undefined,
          query: attendanceFilters.query || undefined,
        },
      });
      setReportSummary(res.data || { rows: [], totals: null, from_date: attendanceFilters.from_date, to_date: attendanceFilters.to_date });
    } catch (err) {
      toast.error(t('err_fetch_attendance_report', 'Puantaj raporu alınamadı.'));
    } finally {
      setReportLoading(false);
    }
  };

  const fetchScheduleTemplates = async () => {
    setScheduleLoading(true);
    try {
      const res = await workScheduleApi.getTemplates(false);
      setScheduleTemplates(res.data || []);
    } catch (err) {
      toast.error(t('err_fetch_schedules', 'Mesai planları yüklenemedi.'));
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchDepartmentAssignments = async () => {
    try {
      const [departmentRes, assignmentRes] = await Promise.all([
        api.get('/employee/department/list'),
        workScheduleApi.getDepartmentAssignments(),
      ]);

      const departmentList = departmentRes.data || [];
      const assignments = assignmentRes.data || [];

      const assignmentMap = {};
      assignments.forEach((item) => {
        assignmentMap[item.department_id] = {
          work_schedule_id: item.work_schedule_id ? String(item.work_schedule_id) : '',
          work_schedule_name: item.work_schedule_name || '',
          employee_count: item.employee_count || 0,
        };
      });

      const normalizedDepartments = departmentList.map((department) => ({
        ...department,
        employee_count: assignmentMap[department.id]?.employee_count || 0,
      }));

      const initialSelections = {};
      normalizedDepartments.forEach((department) => {
        initialSelections[department.id] = assignmentMap[department.id]?.work_schedule_id || '';
      });

      setDepartments(normalizedDepartments);
      setDepartmentAssignments(initialSelections);
    } catch (err) {
      toast.error(t('err_fetch_department_schedules', 'Departman mesai atamaları yüklenemedi.'));
    }
  };

  const fetchEmployeesAndOverrides = async () => {
    setEmployeeLoading(true);
    try {
      const [employeeRes, overrideRes] = await Promise.all([
        api.get('/employee/list?status=ACTIVE'),
        workScheduleApi.getEmployeeOverrides(true),
      ]);
      setEmployees(employeeRes.data || []);
      setEmployeeOverrides(overrideRes.data || []);
    } catch (err) {
      toast.error(t('err_fetch_employee_overrides', 'Personel mesai istisnaları alınamadı.'));
    } finally {
      setEmployeeLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchScheduleTemplates();
    fetchDepartmentAssignments();
    fetchEmployeesAndOverrides();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [attendanceFilters.from_date, attendanceFilters.to_date]);

  useEffect(() => {
    if (activeView === 'SCHEDULES') {
      fetchScheduleTemplates();
    }
    if (activeView === 'DEPARTMENTS') {
      fetchScheduleTemplates();
      fetchDepartmentAssignments();
      fetchEmployeesAndOverrides();
    }
    if (activeView === 'OVERRIDES') {
      fetchScheduleTemplates();
      fetchEmployeesAndOverrides();
      fetchDepartmentAssignments();
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'REPORTS') {
      fetchPayrollSummary();
    }
  }, [activeView, attendanceFilters.from_date, attendanceFilters.to_date, attendanceFilters.department, attendanceFilters.query]);

  useEffect(() => {
    if (!departments.length || !employees.length) return;
    const employeeCountMap = employees.reduce((acc, employee) => {
      const key = employee.department_id;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    setDepartments((prev) => prev.map((department) => ({
      ...department,
      employee_count: employeeCountMap[department.id] ?? department.employee_count ?? 0,
    })));
  }, [employees]);

  const openCreateScheduleModal = () => {
    setEditingScheduleId(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setShowScheduleModal(true);
  };

  const openEditScheduleModal = (schedule) => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      name: schedule.name || '',
      schedule_type: schedule.schedule_type || 'FIXED',
      start_time: schedule.start_time ? String(schedule.start_time).slice(0, 5) : '08:30',
      end_time: schedule.end_time ? String(schedule.end_time).slice(0, 5) : '17:30',
      break_minutes: schedule.break_minutes ?? 60,
      grace_in_minutes: schedule.grace_in_minutes ?? 10,
      grace_out_minutes: schedule.grace_out_minutes ?? 5,
      late_after_minutes: schedule.late_after_minutes ?? 0,
      early_leave_after_minutes: schedule.early_leave_after_minutes ?? 0,
      overtime_after_minutes: schedule.overtime_after_minutes ?? 30,
      core_start_time: schedule.core_start_time ? String(schedule.core_start_time).slice(0, 5) : '',
      core_end_time: schedule.core_end_time ? String(schedule.core_end_time).slice(0, 5) : '',
      crosses_midnight: Boolean(schedule.crosses_midnight),
      is_active: Boolean(schedule.is_active),
    });
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingScheduleId(null);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
  };

  const handleScheduleFormChange = (key, value) => {
    setScheduleForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleScheduleSave = async (e) => {
    e.preventDefault();

    const payload = {
      ...scheduleForm,
      break_minutes: Number(scheduleForm.break_minutes || 0),
      grace_in_minutes: Number(scheduleForm.grace_in_minutes || 0),
      grace_out_minutes: Number(scheduleForm.grace_out_minutes || 0),
      late_after_minutes: Number(scheduleForm.late_after_minutes || 0),
      early_leave_after_minutes: Number(scheduleForm.early_leave_after_minutes || 0),
      overtime_after_minutes: Number(scheduleForm.overtime_after_minutes || 0),
      core_start_time: scheduleForm.schedule_type === 'FLEX' && scheduleForm.core_start_time ? scheduleForm.core_start_time : null,
      core_end_time: scheduleForm.schedule_type === 'FLEX' && scheduleForm.core_end_time ? scheduleForm.core_end_time : null,
    };

    const tLoading = toast.loading(
      editingScheduleId
        ? t('msg_updating_schedule', 'Mesai planı güncelleniyor...')
        : t('msg_creating_schedule', 'Mesai planı oluşturuluyor...')
    );

    try {
      if (editingScheduleId) {
        await workScheduleApi.updateTemplate(editingScheduleId, payload);
      } else {
        await workScheduleApi.createTemplate(payload);
      }
      toast.success(
        editingScheduleId
          ? t('msg_schedule_updated', 'Mesai planı güncellendi.')
          : t('msg_schedule_created', 'Mesai planı oluşturuldu.'),
        { id: tLoading }
      );
      closeScheduleModal();
      fetchScheduleTemplates();
      fetchDepartmentAssignments();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_schedule_save', 'Mesai planı kaydedilemedi.'), { id: tLoading });
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    const confirmMsg = t('msg_confirm_delete_schedule', '"{{name}}" planını silmek istediğinize emin misiniz?')
      .replace('{{name}}', schedule.name || '-');
    if (!window.confirm(confirmMsg)) return;

    const tLoading = toast.loading(t('msg_deleting_schedule', 'Mesai planı siliniyor...'));
    try {
      await workScheduleApi.deleteTemplate(schedule.id);
      toast.success(t('msg_schedule_deleted', 'Mesai planı silindi.'), { id: tLoading });
      fetchScheduleTemplates();
      fetchDepartmentAssignments();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_schedule_delete', 'Mesai planı silinemedi.'), { id: tLoading });
    }
  };

  const handleDepartmentAssignmentChange = (departmentId, value) => {
    setDepartmentAssignments((prev) => ({
      ...prev,
      [departmentId]: value,
    }));
  };

  const handleDepartmentAssignmentsSave = async () => {
    const assignments = departments
      .filter((department) => departmentAssignments[department.id])
      .map((department) => ({
        department_id: department.id,
        work_schedule_id: Number(departmentAssignments[department.id]),
      }));

    if (!assignments.length) {
      toast.error(t('err_select_department_schedule', 'En az bir departman için mesai planı seçin.'));
      return;
    }

    setDepartmentSaving(true);
    const tLoading = toast.loading(t('msg_saving_department_schedules', 'Departman mesai atamaları kaydediliyor...'));
    try {
      await workScheduleApi.assignDepartments(assignments);
      toast.success(t('msg_department_schedules_saved', 'Departman mesai atamaları güncellendi.'), { id: tLoading });
      fetchScheduleTemplates();
      fetchDepartmentAssignments();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_department_schedules_save', 'Departman mesai atamaları kaydedilemedi.'), { id: tLoading });
    } finally {
      setDepartmentSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error(t('err_only_excel', 'Sadece Excel (.xlsx, .xls) dosyası yükleyebilirsiniz.'));
      e.target.value = null;
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error(t('err_select_excel', 'Lütfen bir Excel dosyası seçin.'));

    const formData = new FormData();
    formData.append('file', selectedFile);
    setUploading(true);

    const tLoading = toast.loading(t('msg_processing_excel', 'Excel dosyası işleniyor...'));

    try {
      await attendanceApi.bulkUpload(formData);
      toast.success(t('msg_excel_success', 'Excel verileri başarıyla sisteme aktarıldı!'), { id: tLoading });
      setSelectedFile(null);
      const uploadInput = document.getElementById('excel-upload');
      if (uploadInput) uploadInput.value = null;
      fetchAttendanceData();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('msg_upload_failed', 'Yükleme başarısız.'), { id: tLoading });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async (format) => {
    const tLoading = toast.loading(t('msg_exporting', 'Dışa aktarılıyor...'));
    setExporting(true);
    try {
      const res = await api.get(`/attendance/export`, {
        params: {
          format,
          from_date: attendanceFilters.from_date || undefined,
          to_date: attendanceFilters.to_date || undefined,
        },
        responseType: 'blob',
        headers: { 'Accept-Language': i18n.language },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      const fileNameStr = t('file_attendance', 'Puantaj');
      link.setAttribute('download', `${fileNameStr}_${new Date().toISOString().split('T')[0]}.${ext}`);

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(t('msg_export_success', 'Dosya başarıyla indirildi!'), { id: tLoading });
    } catch (err) {
      toast.error(t('err_export_failed', 'Dışa aktarım başarısız oldu.'), { id: tLoading });
    } finally {
      setExporting(false);
    }
  };

  const handlePayrollExport = async (format) => {
    const tLoading = toast.loading(t('msg_exporting', 'Dışa aktarılıyor...'));
    setExporting(true);
    try {
      const res = await api.get('/attendance/payroll-summary/export', {
        params: {
          format,
          from_date: attendanceFilters.from_date || undefined,
          to_date: attendanceFilters.to_date || undefined,
          department: attendanceFilters.department !== 'ALL' ? attendanceFilters.department : undefined,
          query: attendanceFilters.query || undefined,
        },
        responseType: 'blob',
        headers: { 'Accept-Language': i18n.language },
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : format;
      const fileNameStr = t('tab_payroll_report', 'Bordro Raporu').replace(/\s+/g, '_');
      link.setAttribute('download', `${fileNameStr}_${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(t('msg_export_success', 'Dosya başarıyla indirildi!'), { id: tLoading });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_export_failed', 'Dışa aktarım başarısız oldu.'), { id: tLoading });
    } finally {
      setExporting(false);
    }
  };

  const closeSickReportModal = () => {
    setShowSickReportModal(false);
    setSickReportForm({
      ...DEFAULT_SICK_REPORT_FORM,
      employee_id: selectedEmployeeIds[0] || '',
    });
  };

  const handleCreateSickReport = async () => {
    if (!sickReportForm.employee_id) {
      toast.error(t('err_select_employee_for_sick_report', 'Lütfen sağlık raporu için personel seçin.'));
      return;
    }
    const tLoading = toast.loading(t('msg_creating_sick_report', 'Sağlık raporu puantaja işleniyor...'));
    try {
      await api.post('/attendance/sick-report', {
        ...sickReportForm,
        employee_id: Number(sickReportForm.employee_id),
      });
      toast.success(t('msg_sick_report_created', 'Sağlık raporu puantaja işlendi.'), { id: tLoading });
      closeSickReportModal();
      fetchAttendanceData();
      if (activeView === 'REPORTS') {
        fetchPayrollSummary();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_sick_report_create', 'Sağlık raporu kaydedilemedi.'), { id: tLoading });
    }
  };

  const localizeDigits = (value) => {
    if (value === null || value === undefined) return '-';
    if (!isArabic) return String(value);
    const digitMap = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
    return String(value).replace(/\d/g, (digit) => digitMap[digit] || digit);
  };

  const localizedNumber = (value, options = {}) => {
    const numericValue = Number(value || 0);
    if (Number.isNaN(numericValue)) return localizeDigits(value);
    return new Intl.NumberFormat(numberLocale, { useGrouping: false, ...options }).format(numericValue);
  };

  const normalizeDepartmentName = (value) => String(value || '').trim();

  const attendanceDepartments = useMemo(() => {
    const departmentPool = [
      ...departments.map((department) => department.name),
      ...records.map((record) => record.department),
    ];

    return [...new Set(departmentPool.map(normalizeDepartmentName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, locale));
  }, [departments, records, locale]);

  const attendanceScheduleNames = useMemo(() => (
    [...new Set(records.map((record) => String(record.schedule_name || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, locale))
  ), [records, locale]);

  const filteredAttendanceRecords = useMemo(() => {
    return records.filter((record) => {
      const query = attendanceFilters.query.trim().toLocaleLowerCase(locale);
      const displayName = (record.employee_name || [record.first_name, record.last_name].filter(Boolean).join(' ')).toLocaleLowerCase(locale);
      const normalizedDepartment = normalizeDepartmentName(record.department);
      const normalizedScheduleName = String(record.schedule_name || '').trim();
      const normalizedScheduleType = String(record.schedule_type || '').trim();
      const matchesQuery =
        !query ||
        displayName.includes(query) ||
        normalizedDepartment.toLocaleLowerCase(locale).includes(query);
      const matchesDepartment = attendanceFilters.department === 'ALL' || normalizedDepartment === normalizeDepartmentName(attendanceFilters.department);
      const matchesScheduleName =
        attendanceFilters.schedule_name === 'ALL' ||
        (attendanceFilters.schedule_name === '__UNSCHEDULED__'
          ? !normalizedScheduleName
          : normalizedScheduleName === attendanceFilters.schedule_name);
      const matchesScheduleType =
        attendanceFilters.schedule_type === 'ALL' ||
        (attendanceFilters.schedule_type === '__UNSCHEDULED__'
          ? !normalizedScheduleType
          : normalizedScheduleType === attendanceFilters.schedule_type);
      const matchesStatus = attendanceFilters.status === 'ALL' || record.status === attendanceFilters.status;
      const matchesApproval = attendanceFilters.approval === 'ALL' || record.approval_status === attendanceFilters.approval;
      return matchesQuery && matchesDepartment && matchesScheduleName && matchesScheduleType && matchesStatus && matchesApproval;
    });
  }, [records, attendanceFilters, locale]);

  const toggleSelectAll = () => {
    const filteredIds = filteredAttendanceRecords.map((record) => record.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedRecords.includes(id));
    if (allSelected) setSelectedRecords((prev) => prev.filter((id) => !filteredIds.includes(id)));
    else setSelectedRecords((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const toggleSelectRecord = (id, e) => {
    e.stopPropagation();
    if (selectedRecords.includes(id)) setSelectedRecords(selectedRecords.filter((rId) => rId !== id));
    else setSelectedRecords([...selectedRecords, id]);
  };

  const handleBulkAction = async (action) => {
    if (selectedRecords.length === 0) return;

    const actionText = action === 'REJECT' ? t('action_reject', 'reddetmek') : t('action_approve', 'onaylamak');
    const confirmMsg = t('msg_confirm_bulk', 'Seçili {{count}} kaydı toplu olarak {{action}} istediğinize emin misiniz?')
      .replace('{{count}}', selectedRecords.length)
      .replace('{{action}}', actionText);

    if (!window.confirm(confirmMsg)) return;

    const tLoading = toast.loading(t('msg_applying_bulk', 'Toplu işlem uygulanıyor...'));
    try {
      await api.put('/attendance/approve', { record_ids: selectedRecords, action });
      toast.success(t('msg_bulk_success', 'Toplu işlem başarıyla tamamlandı.'), { id: tLoading });
      fetchAttendanceData();
    } catch (err) {
      toast.error(t('msg_error_occurred', 'İşlem sırasında bir hata oluştu.'), { id: tLoading });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="text-emerald-600 font-black flex items-center gap-1.5"><CheckCircle size={14} /> {t('status_present', 'MEVCUT')}</span>;
      case 'ABSENT':
        return <span className="text-rose-600 font-black flex items-center gap-1.5"><XCircle size={14} /> {t('status_absent', 'DEVAMSIZ')}</span>;
      case 'LATE':
        return <span className="text-amber-600 font-black flex items-center gap-1.5"><Clock size={14} /> {t('status_late', 'GEÇ KALDI')}</span>;
      case 'OFF':
        return <span className="text-slate-400 font-black flex items-center gap-1.5">{t('status_off', 'İZİNLİ / TATİL')}</span>;
      case 'SICK_REPORT':
        return <span className="text-sky-700 font-black flex items-center gap-1.5"><AlertCircle size={14} /> {t('status_sick_report', 'SAĞLIK RAPORU')}</span>;
      case 'EARLY_OUT':
        return <span className="text-fuchsia-600 font-black flex items-center gap-1.5"><TimerReset size={14} /> {t('status_early_out', 'ERKEN ÇIKIŞ')}</span>;
      case 'LATE_EARLY_OUT':
        return <span className="text-orange-600 font-black flex items-center gap-1.5"><TimerReset size={14} /> {t('status_late_early', 'GEÇ + ERKEN')}</span>;
      default:
        return <span className="text-slate-500 font-black uppercase">{status || '-'}</span>;
    }
  };

  const getApprovalBadge = (approvalStatus) => {
    switch (approvalStatus) {
      case 'PENDING':
        return <span className="bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm w-full"><Clock size={14} /> {t('badge_manager_pending', 'MÜDÜR ONAYI BEK.')}</span>;
      case 'MANAGER_APPROVED':
        return <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm w-full"><UserCog size={14} /> {t('badge_hr_pending', 'İK ONAYI BEK.')}</span>;
      case 'HR_APPROVED':
        return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm w-full"><ShieldCheck size={14} /> {t('badge_payroll_ready', 'BORDROYA HAZIR')}</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-full flex items-center justify-center gap-1.5"><XOctagon size={14} /> {t('badge_rejected', 'REDDEDİLDİ')}</span>;
    }
  };

  const getViolationBadge = (violationCode) => {
    switch (violationCode) {
      case 'LATE_IN':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_late_in', 'GEÇ GİRİŞ')}</span>;
      case 'EARLY_OUT':
        return <span className="bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_early_out', 'ERKEN ÇIKIŞ')}</span>;
      case 'LATE_IN_EARLY_OUT':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_late_early', 'GEÇ + ERKEN')}</span>;
      case 'MISSING_CLOCK_OUT':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_missing_out', 'ÇIKIŞ EKSİK')}</span>;
      case 'MISSING_CLOCK_IN':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_missing_in', 'GİRİŞ EKSİK')}</span>;
      case 'NONE':
      default:
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('violation_none', 'İHLAL YOK')}</span>;
    }
  };

  const getScheduleTypeBadge = (scheduleType) => {
    return scheduleType === 'FLEX'
      ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('opt_flex', 'ESNEK')}</span>
      : <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('opt_fixed', 'SABİT')}</span>;
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesDepartment = employeeFilters.department_id === 'ALL' || String(employee.department_id) === String(employeeFilters.department_id);
      const query = employeeFilters.query.trim().toLocaleLowerCase(locale);
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim().toLocaleLowerCase(locale);
      const matchesQuery = !query || fullName.includes(query) || String(employee.email || '').toLocaleLowerCase(locale).includes(query);
      return matchesDepartment && matchesQuery;
    });
  }, [employees, employeeFilters.department_id, employeeFilters.query, locale]);

  const selectedScheduleTemplate = useMemo(
    () => scheduleTemplates.find((item) => String(item.id) === String(employeeFilters.work_schedule_id)),
    [scheduleTemplates, employeeFilters.work_schedule_id]
  );

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployeeIds((prev) => (
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    ));
  };

  const toggleSelectFilteredEmployees = () => {
    const filteredIds = filteredEmployees.map((employee) => employee.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedEmployeeIds.includes(id));
    if (allSelected) {
      setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleAssignEmployeeSchedule = async () => {
    if (!selectedEmployeeIds.length) {
      toast.error(t('err_select_employees', 'Lütfen en az bir personel seçin.'));
      return;
    }
    if (!employeeFilters.work_schedule_id) {
      toast.error(t('err_select_schedule_for_people', 'Atamak için bir mesai planı seçin.'));
      return;
    }

    setEmployeeAssigning(true);
    const tLoading = toast.loading(t('msg_assigning_employee_schedule', 'Özel mesai planı atanıyor...'));
    try {
      await workScheduleApi.assignEmployeesBulk({
        employee_ids: selectedEmployeeIds,
        work_schedule_id: Number(employeeFilters.work_schedule_id),
        effective_from: employeeFilters.effective_from,
        effective_to: null,
        reason: employeeFilters.reason || null,
      });
      toast.success(t('msg_employee_schedule_assigned', 'Özel mesai planı atandı.'), { id: tLoading });
      setSelectedEmployeeIds([]);
      setEmployeeFilters((prev) => ({ ...prev, reason: '' }));
      fetchScheduleTemplates();
      fetchEmployeesAndOverrides();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_employee_schedule_assign', 'Özel mesai planı atanamadı.'), { id: tLoading });
    } finally {
      setEmployeeAssigning(false);
    }
  };

  const handleClearEmployeeOverrides = async () => {
    if (!selectedEmployeeIds.length) {
      toast.error(t('err_select_employees', 'Lütfen en az bir personel seçin.'));
      return;
    }
    if (!window.confirm(t('msg_confirm_clear_employee_schedule', 'Seçili personelleri departman varsayılan planına döndürmek istediğinize emin misiniz?'))) {
      return;
    }

    setEmployeeAssigning(true);
    const tLoading = toast.loading(t('msg_clearing_employee_schedule', 'Özel mesai planları kaldırılıyor...'));
    try {
      await workScheduleApi.clearEmployeeOverrides(selectedEmployeeIds);
      toast.success(t('msg_employee_schedule_cleared', 'Seçili personeller departman varsayılanına döndürüldü.'), { id: tLoading });
      setSelectedEmployeeIds([]);
      fetchScheduleTemplates();
      fetchEmployeesAndOverrides();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_employee_schedule_clear', 'Özel mesai planları kaldırılamadı.'), { id: tLoading });
    } finally {
      setEmployeeAssigning(false);
    }
  };

  const sortedSchedules = useMemo(
    () => [...scheduleTemplates].sort((a, b) => String(a.name).localeCompare(String(b.name), locale)),
    [scheduleTemplates, locale]
  );

  const activeScheduleOptions = useMemo(
    () => sortedSchedules.filter((schedule) => schedule.is_active !== false),
    [sortedSchedules]
  );

  const handleDownloadScheduleReport = async () => {
    const tLoading = toast.loading(t('msg_schedule_report_pdf', 'Mesai planı PDF raporu hazırlanıyor...'));
    try {
      const response = await workScheduleApi.getTemplatesReportPdf();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mesai_Planlari_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('msg_schedule_report_pdf_ready', 'Mesai planı raporu hazır.'), { id: tLoading });
    } catch (err) {
      toast.error(t('err_schedule_report_pdf', 'Mesai planı PDF raporu oluşturulamadı.'), { id: tLoading });
    }
  };

  const handleDownloadSingleScheduleReport = async (schedule) => {
    const tLoading = toast.loading(
      t('msg_schedule_members_report_pdf', '"{{name}}" için personel raporu hazırlanıyor...').replace('{{name}}', schedule.name || '-')
    );
    try {
      const response = await workScheduleApi.getTemplateMembersReportPdf(schedule.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const safeName = String(schedule.name || 'Mesai_Plani')
        .replace(/[^\p{L}\p{N}_ -]/gu, '')
        .trim()
        .replace(/\s+/g, '_') || 'Mesai_Plani';
      link.href = url;
      link.setAttribute('download', `${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('msg_schedule_members_report_pdf_ready', 'Plan personel raporu hazır.'), { id: tLoading });
    } catch (err) {
      toast.error(t('err_schedule_members_report_pdf', 'Plan personel raporu oluşturulamadı.'), { id: tLoading });
    }
  };

  const renderAttendanceHeaderFilter = (menuKey) => {
    if (attendanceFilterMenu !== menuKey) return null;

    const commonButtonClass = 'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all';

    if (menuKey === 'personnel') {
      return (
        <div className={`absolute top-full mt-2 z-30 w-[300px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
              <input
                value={attendanceFilterDraft.query}
                onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t('ph_search_attendance', 'PERSONEL / DEPARTMAN')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
              />
            </div>
            <select
              value={attendanceFilterDraft.department}
              onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, department: normalizeDepartmentName(e.target.value) || 'ALL' }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_departments', 'TÜM DEPARTMANLAR')}</option>
              {attendanceDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
          <div className={`mt-4 flex gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={resetAttendanceFilterMenu} className={`${commonButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>{t('btn_reset_filter', 'TEMİZLE')}</button>
            <button type="button" onClick={() => { setAttendanceFilterMenu(null); setAttendanceFilterDraft(attendanceFilters); }} className={`${commonButtonClass} bg-white border border-slate-200 text-slate-500 hover:bg-slate-50`}>{t('btn_cancel', 'İPTAL')}</button>
            <button type="button" onClick={applyAttendanceFilterMenu} className={`${commonButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>{t('btn_confirm_filter', 'ONAYLA')}</button>
          </div>
        </div>
      );
    }

    if (menuKey === 'date') {
      return (
        <div className={`absolute top-full mt-2 z-30 w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
          <div className="space-y-3">
            <input
              type="date"
              value={attendanceFilterDraft.from_date}
              onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, from_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500"
              dir="ltr"
            />
            <input
              type="date"
              value={attendanceFilterDraft.to_date}
              onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, to_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500"
              dir="ltr"
            />
          </div>
          <div className={`mt-4 flex gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={resetAttendanceFilterMenu} className={`${commonButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>{t('btn_reset_filter', 'TEMİZLE')}</button>
            <button type="button" onClick={() => { setAttendanceFilterMenu(null); setAttendanceFilterDraft(attendanceFilters); }} className={`${commonButtonClass} bg-white border border-slate-200 text-slate-500 hover:bg-slate-50`}>{t('btn_cancel', 'İPTAL')}</button>
            <button type="button" onClick={applyAttendanceFilterMenu} className={`${commonButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>{t('btn_confirm_filter', 'ONAYLA')}</button>
          </div>
        </div>
      );
    }

    if (menuKey === 'status') {
      return (
        <div className={`absolute top-full mt-2 z-30 w-[240px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
          <select
            value={attendanceFilterDraft.status}
            onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, status: e.target.value }))}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
          >
            <option value="ALL">{t('opt_all_statuses', 'TÜM DURUMLAR')}</option>
            <option value="PRESENT">{t('status_present', 'MEVCUT')}</option>
            <option value="LATE">{t('status_late', 'GEÇ')}</option>
            <option value="ABSENT">{t('status_absent', 'DEVAMSIZ')}</option>
            <option value="SICK_REPORT">{t('status_sick_report', 'SAĞLIK RAPORU')}</option>
            <option value="EARLY_OUT">{t('status_early_out', 'ERKEN ÇIKIŞ')}</option>
            <option value="LATE_EARLY_OUT">{t('status_late_early', 'GEÇ + ERKEN')}</option>
          </select>
          <div className={`mt-4 flex gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={resetAttendanceFilterMenu} className={`${commonButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>{t('btn_reset_filter', 'TEMİZLE')}</button>
            <button type="button" onClick={() => { setAttendanceFilterMenu(null); setAttendanceFilterDraft(attendanceFilters); }} className={`${commonButtonClass} bg-white border border-slate-200 text-slate-500 hover:bg-slate-50`}>{t('btn_cancel', 'İPTAL')}</button>
            <button type="button" onClick={applyAttendanceFilterMenu} className={`${commonButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>{t('btn_confirm_filter', 'ONAYLA')}</button>
          </div>
        </div>
      );
    }

    if (menuKey === 'schedule') {
      return (
        <div className={`absolute top-full mt-2 z-30 w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
          <div className="space-y-3">
            <select
              value={attendanceFilterDraft.schedule_name}
              onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, schedule_name: e.target.value }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_schedules', 'TÜM PLANLAR')}</option>
              <option value="__UNSCHEDULED__">{t('lbl_unscheduled', 'PLANSIZ')}</option>
              {attendanceScheduleNames.map((scheduleName) => (
                <option key={scheduleName} value={scheduleName}>{scheduleName}</option>
              ))}
            </select>
            <select
              value={attendanceFilterDraft.schedule_type}
              onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, schedule_type: e.target.value }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_schedule_types', 'TÜM PLAN TİPLERİ')}</option>
              <option value="FIXED">{t('opt_fixed', 'SABİT')}</option>
              <option value="FLEX">{t('opt_flex', 'ESNEK')}</option>
              <option value="__UNSCHEDULED__">{t('lbl_no_schedule_type', 'PLAN YOK')}</option>
            </select>
          </div>
          <div className={`mt-4 flex gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={resetAttendanceFilterMenu} className={`${commonButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>{t('btn_reset_filter', 'TEMİZLE')}</button>
            <button type="button" onClick={() => { setAttendanceFilterMenu(null); setAttendanceFilterDraft(attendanceFilters); }} className={`${commonButtonClass} bg-white border border-slate-200 text-slate-500 hover:bg-slate-50`}>{t('btn_cancel', 'İPTAL')}</button>
            <button type="button" onClick={applyAttendanceFilterMenu} className={`${commonButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>{t('btn_confirm_filter', 'ONAYLA')}</button>
          </div>
        </div>
      );
    }

    return (
      <div className={`absolute top-full mt-2 z-30 w-[250px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${isArabic ? 'left-0' : 'right-0'}`}>
        <select
          value={attendanceFilterDraft.approval}
          onChange={(e) => setAttendanceFilterDraft((prev) => ({ ...prev, approval: e.target.value }))}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
        >
          <option value="ALL">{t('opt_all_approvals', 'TÜM ONAYLAR')}</option>
          <option value="PENDING">{approvalOptionLabel('PENDING')}</option>
          <option value="MANAGER_APPROVED">{approvalOptionLabel('MANAGER_APPROVED')}</option>
          <option value="HR_APPROVED">{approvalOptionLabel('HR_APPROVED')}</option>
          <option value="REJECTED">{approvalOptionLabel('REJECTED')}</option>
        </select>
        <div className={`mt-4 flex gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <button type="button" onClick={resetAttendanceFilterMenu} className={`${commonButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}>{t('btn_reset_filter', 'TEMİZLE')}</button>
          <button type="button" onClick={() => { setAttendanceFilterMenu(null); setAttendanceFilterDraft(attendanceFilters); }} className={`${commonButtonClass} bg-white border border-slate-200 text-slate-500 hover:bg-slate-50`}>{t('btn_cancel', 'İPTAL')}</button>
          <button type="button" onClick={applyAttendanceFilterMenu} className={`${commonButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}>{t('btn_confirm_filter', 'ONAYLA')}</button>
        </div>
      </div>
    );
  };

  const attendanceView = (
    <>
      <div className="bg-white p-3 rounded-[1.75rem] border border-slate-100 shadow-sm mb-3 shrink-0 w-full">
        <div className={`flex flex-col xl:flex-row xl:items-center gap-2 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
          <div className={`flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0 ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
            <input id="excel-upload" type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" />
            <label htmlFor="excel-upload" className="sm:flex-[0_1_260px] min-w-0 max-w-[320px] text-[10px] font-black text-slate-600 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-center gap-2 uppercase tracking-widest truncate">
              <FileSpreadsheet size={16} className={selectedFile ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'} />
              {selectedFile ? selectedFile.name : t('btn_select_excel', 'EXCEL DOSYASI SEÇ')}
            </label>
            <button onClick={handleUpload} disabled={!selectedFile || uploading} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 tracking-widest disabled:opacity-50 shrink-0 whitespace-nowrap">
              {uploading ? <TimerReset size={14} className="animate-spin" /> : <UploadCloud size={16} />}
              {t('btn_transfer', 'AKTAR')}
            </button>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-5 xl:flex gap-2 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
            <button
              onClick={() => {
                setSickReportForm((prev) => ({ ...DEFAULT_SICK_REPORT_FORM, employee_id: prev.employee_id || selectedEmployeeIds[0] || '' }));
                setShowSickReportModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <Plus size={15} /> {t('btn_sick_report', 'SAĞLIK RAPORU')}
            </button>
            <button onClick={() => handleExport('excel')} disabled={exporting || !filteredAttendanceRecords.length} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <FileSpreadsheet size={15} /> {t('btn_export_excel', 'EXCEL')}
            </button>
            <button onClick={() => handleExport('csv')} disabled={exporting || !filteredAttendanceRecords.length} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <FileText size={15} /> {t('btn_export_csv', 'CSV')}
            </button>
            <button onClick={() => handleExport('pdf')} disabled={exporting || !filteredAttendanceRecords.length} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <Download size={15} /> {t('btn_export_pdf', 'PDF')}
            </button>
          </div>

          <div className={`bg-slate-900 text-white rounded-xl px-4 py-2.5 min-w-[118px] shrink-0 flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{t('lbl_records', 'KAYIT')}</span>
            <span className="text-xl font-black tracking-tighter leading-none">{localizedNumber(filteredAttendanceRecords.length)}</span>
          </div>
        </div>
      </div>

      {/* 🎁 TOPLU İŞLEM BARI (Sadece kayıt seçilince görünür) */}
      {selectedRecords.length > 0 && (
        <div className="bg-indigo-900 text-white p-5 rounded-[2rem] shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-5 mb-6 animate-in slide-in-from-bottom-4 relative z-20">
            <div className={`flex items-center gap-4 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
              <div className="bg-indigo-800 p-3 rounded-2xl border border-indigo-700 shadow-inner"><CheckSquare size={24} className="text-indigo-300" /></div>
              <div>
                <p className="font-black text-sm uppercase tracking-widest text-indigo-100">{localizedNumber(selectedRecords.length)} {t('lbl_record_selected', 'KAYIT SEÇİLDİ')}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">{t('desc_bulk_action', 'Seçili kayıtlar için toplu işlem uygulayabilirsiniz.')}</p>
              </div>
            </div>
            <div className={`flex gap-3 w-full sm:w-auto ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => handleBulkAction('REJECT')} className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 px-8 py-3.5 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"><XCircle size={16} /> {t('btn_reject_selected', 'REDDET')}</button>
              <button onClick={() => handleBulkAction('APPROVE_MANAGER')} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 px-8 py-3.5 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"><CheckCircle size={16} /> {t('btn_approve_selected', 'ONAYLA')}</button>
            </div>
        </div>
      )}

      {/* TABLO ALANI */}
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col mb-3 transition-all duration-300">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading_data', 'VERİLER YÜKLENİYOR...')}</div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left relative">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-6 w-16 text-center">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {filteredAttendanceRecords.length > 0 && filteredAttendanceRecords.every((record) => selectedRecords.includes(record.id)) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className={`py-6 relative ${isArabic ? 'pl-6 text-right' : 'pr-6 text-left'}`}>
                    <button type="button" onClick={() => openAttendanceFilterMenu('personnel')} className={`inline-flex items-center gap-2 hover:text-indigo-600 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span>{t('tbl_emp_dept', 'PERSONEL & DEPARTMAN')}</span>
                      <Filter size={14} className={hasAttendanceFilter('personnel') ? 'text-indigo-600' : 'text-slate-500'} />
                    </button>
                    {attendanceFilterMenu === 'personnel' && (
                      <div ref={attendanceFilterMenuRef}>
                        {renderAttendanceHeaderFilter('personnel')}
                      </div>
                    )}
                  </th>
                  <th className={`p-6 relative ${isArabic ? 'text-right' : 'text-left'}`}>
                    <button type="button" onClick={() => openAttendanceFilterMenu('date')} className={`inline-flex items-center gap-2 hover:text-indigo-600 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span>{t('tbl_day_in_out', 'GÜN & GİRİŞ-ÇIKIŞ')}</span>
                      <Filter size={14} className={hasAttendanceFilter('date') ? 'text-indigo-600' : 'text-slate-500'} />
                    </button>
                    {attendanceFilterMenu === 'date' && (
                      <div ref={attendanceFilterMenuRef}>
                        {renderAttendanceHeaderFilter('date')}
                      </div>
                    )}
                  </th>
                  <th className={`p-6 relative ${isArabic ? 'text-right' : 'text-left'}`}>
                    <button type="button" onClick={() => openAttendanceFilterMenu('schedule')} className={`inline-flex items-center gap-2 hover:text-indigo-600 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span>{t('tbl_schedule_plan', 'PLAN')}</span>
                      <Filter size={14} className={hasAttendanceFilter('schedule') ? 'text-indigo-600' : 'text-slate-500'} />
                    </button>
                    {attendanceFilterMenu === 'schedule' && (
                      <div ref={attendanceFilterMenuRef}>
                        {renderAttendanceHeaderFilter('schedule')}
                      </div>
                    )}
                  </th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('tbl_total_ot', 'TOPLAM / MESAİ')}</th>
                  <th className={`p-6 relative ${isArabic ? 'text-right' : 'text-left'}`}>
                    <button type="button" onClick={() => openAttendanceFilterMenu('status')} className={`inline-flex items-center gap-2 hover:text-indigo-600 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span>{t('tbl_daily_status', 'DURUM / İHLAL')}</span>
                      <Filter size={14} className={hasAttendanceFilter('status') ? 'text-indigo-600' : 'text-slate-500'} />
                    </button>
                    {attendanceFilterMenu === 'status' && (
                      <div ref={attendanceFilterMenuRef}>
                        {renderAttendanceHeaderFilter('status')}
                      </div>
                    )}
                  </th>
                  <th className="p-6 text-center relative">
                    <button type="button" onClick={() => openAttendanceFilterMenu('approval')} className={`inline-flex items-center gap-2 hover:text-indigo-600 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span>{t('tbl_approval_status', 'ONAY DURUMU')}</span>
                      <Filter size={14} className={hasAttendanceFilter('approval') ? 'text-indigo-600' : 'text-slate-500'} />
                    </button>
                    {attendanceFilterMenu === 'approval' && (
                      <div ref={attendanceFilterMenuRef}>
                        {renderAttendanceHeaderFilter('approval')}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredAttendanceRecords.length === 0 ? (
                  <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest"><AlertCircle className="mx-auto mb-4 opacity-30" size={56} /> {t('lbl_no_records', 'HENÜZ KAYIT BULUNMUYOR.')}</td></tr>
                ) : (
                  filteredAttendanceRecords.map((rec) => {
                    const isSelected = selectedRecords.includes(rec.id);
                    const displayName = rec.employee_name || [rec.first_name, rec.last_name].filter(Boolean).join(' ') || t('unknown_employee', 'BİLİNMİYOR');
                    const weekdayOtHours = Number(rec.weekday_ot_hours || 0);
                    const weekendOtHours = Number(rec.weekend_ot_hours || 0);
                    const overtimeMinutes = Number(rec.overtime_minutes || 0);
                    const lateMinutes = Number(rec.late_minutes || 0);
                    const earlyLeaveMinutes = Number(rec.early_leave_minutes || 0);
                    const scheduleWindow = rec.scheduled_start && rec.scheduled_end
                      ? `${localizeDigits(rec.scheduled_start)} - ${localizeDigits(rec.scheduled_end)}`
                      : '';
                    const normalizedScheduleName = String(rec.schedule_name || '').replace(/\s+/g, '').toLowerCase();
                    const normalizedScheduleWindow = String(`${rec.scheduled_start || ''}-${rec.scheduled_end || ''}`).replace(/\s+/g, '').toLowerCase();
                    const showScheduleWindowInline = Boolean(scheduleWindow) && !normalizedScheduleName.includes(normalizedScheduleWindow);
                    return (
                      <tr key={rec.id} onClick={(e) => toggleSelectRecord(rec.id, e)} className={`transition-all group cursor-pointer ${isSelected ? (isArabic ? 'bg-indigo-50/60 border-r-4 border-r-indigo-500' : 'bg-indigo-50/60 border-l-4 border-l-indigo-500') : (isArabic ? 'border-r-4 border-r-transparent hover:bg-slate-50/50' : 'border-l-4 border-l-transparent hover:bg-slate-50/50')}`}>
                        <td className="p-6 text-center">
                          <div className={`transition-colors inline-block ${isSelected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-300'}`}>
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                        </td>
                        <td className={`py-6 ${isArabic ? 'pl-6 text-right' : 'pr-6 text-left'}`}>
                          <div className={`font-black uppercase transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{displayName.toLocaleUpperCase(locale)}</div>
                          <div className="mt-1.5">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1.5 w-fit border border-slate-200">
                              <Building2 size={12} className="text-indigo-400 shrink-0" /> {rec.department?.toLocaleUpperCase(locale) || t('lbl_unknown', 'BİLİNMİYOR')}
                            </span>
                          </div>
                        </td>
                        <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                          <div className="text-xs font-black text-slate-700 tracking-widest mb-1.5 uppercase">{localizeDigits(rec.date)}</div>
                          <div className="flex items-center gap-2 font-mono text-[11px] font-black text-slate-500 bg-white w-fit px-2 py-1 rounded-lg border border-slate-200 shadow-sm" dir="ltr">
                            <span className="text-emerald-600">{localizeDigits(rec.check_in || '--:--')}</span>
                            <span className="text-slate-300">-</span>
                            <span className="text-rose-600">{localizeDigits(rec.check_out || '--:--')}</span>
                          </div>
                        </td>
                        <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                          <div className={`flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : ''}`}>
                            <div className="font-black text-slate-800 uppercase">{rec.schedule_name || t('lbl_unscheduled', 'PLANSIZ')}</div>
                            {showScheduleWindowInline && (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest" dir="ltr">
                                {scheduleWindow}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {rec.schedule_type ? getScheduleTypeBadge(rec.schedule_type) : (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('lbl_no_schedule_type', 'PLAN YOK')}</span>
                            )}
                          </div>
                        </td>
                        <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border border-slate-200" dir="ltr">{localizeDigits(rec.total_work_hours || '0')}h</span>
                          </div>
                          {rec.status === 'SICK_REPORT' ? (
                            <div className="flex gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-widest ${rec.payroll_treatment === 'DEDUCT' ? 'text-rose-600' : 'text-sky-700'}`}>
                                {rec.payroll_treatment === 'DEDUCT'
                                  ? t('badge_sick_deduct', 'KESİNTİLİ RAPOR')
                                  : t('badge_sick_full_pay', 'TAM ÜCRETLİ RAPOR')}
                              </span>
                            </div>
                          ) : (weekdayOtHours > 0 || weekendOtHours > 0 || overtimeMinutes > 0 || lateMinutes > 0 || earlyLeaveMinutes > 0) ? (
                            <div className="flex gap-2 flex-wrap" dir="ltr">
                              {weekdayOtHours > 0 && <span className="text-indigo-600 text-[9px] font-black uppercase tracking-widest">{t('lbl_weekday_ot', 'H.İÇİ')}: +{localizedNumber(weekdayOtHours)}h</span>}
                              {weekendOtHours > 0 && <span className="text-amber-600 text-[9px] font-black uppercase tracking-widest">{t('lbl_weekend_ot', 'H.SONU')}: +{localizedNumber(weekendOtHours)}h</span>}
                              {overtimeMinutes > 0 && <span className="text-emerald-600 text-[9px] font-black uppercase tracking-widest">+{localizedNumber(overtimeMinutes)} dk {t('lbl_overtime', 'MESAİ')}</span>}
                              {lateMinutes > 0 && <span className="text-amber-600 text-[9px] font-black uppercase tracking-widest">{localizedNumber(lateMinutes)} dk {t('lbl_late', 'GEÇ')}</span>}
                              {earlyLeaveMinutes > 0 && <span className="text-fuchsia-600 text-[9px] font-black uppercase tracking-widest">{localizedNumber(earlyLeaveMinutes)} dk {t('lbl_early_out', 'ERKEN')}</span>}
                            </div>
                          ) : (
                              <span className="text-slate-300 font-black text-[9px] uppercase tracking-widest">- {t('lbl_no_ot', 'MESAİ YOK')} -</span>
                          )}
                        </td>
                        <td className={`p-6 text-[11px] ${isArabic ? 'text-right' : 'text-left'}`}>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(rec.status)}
                            {rec.status === 'SICK_REPORT' && (
                              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit ${rec.payroll_treatment === 'DEDUCT' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                                {rec.payroll_treatment === 'DEDUCT'
                                  ? t('lbl_deduct_in_payroll', 'BORDRO KESİNTİSİ')
                                  : t('lbl_full_pay_in_payroll', 'TAM ÜCRET ÖDE')}
                              </span>
                            )}
                            {getViolationBadge(rec.violation_code)}
                          </div>
                        </td>
                        <td className="p-6 w-56">{getApprovalBadge(rec.approval_status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  const scheduleManagementView = (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row justify-between gap-3">
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6 relative overflow-hidden">
          <TimerReset size={84} className={`absolute opacity-5 -bottom-4 ${isArabic ? '-left-2' : '-right-2'} text-cyan-500`} />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2">{t('lbl_schedule_logic', 'MESAİ MANTIĞI')}</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('title_work_schedules', 'MESAİ PLANLARI')}</h2>
            <p className="text-[11px] font-bold text-slate-500 mt-3 max-w-3xl leading-relaxed">{t('desc_work_schedules', 'Önce şirketinizin standart mesai planlarını tanımlayın. Sonraki adımda bu planları departmanlara bağlayarak puantaj yorumlarının sabit saat yerine gerçek çalışma düzenine göre oluşmasını sağlayabilirsiniz.')}</p>
          </div>
        </div>

        <div className={`flex flex-col sm:flex-row gap-3 shrink-0 ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
          <button onClick={handleDownloadScheduleReport} disabled={!scheduleTemplates.length} className={`w-full xl:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 px-5 py-4 rounded-[1.5rem] font-black transition-all border border-rose-200 flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95 disabled:opacity-50 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Download size={18} /> {t('btn_schedule_pdf_report', 'PDF RAPORU')}
          </button>
          <button onClick={openCreateScheduleModal} className={`w-full xl:w-auto bg-slate-900 hover:bg-cyan-600 text-white px-6 py-4 rounded-[1.5rem] font-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Plus size={20} /> {t('btn_add_schedule', 'MESAİ PLANI OLUŞTUR')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-emerald-500 rounded-[1.75rem] p-5 text-white shadow-lg shadow-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">{t('lbl_total_plans', 'TOPLAM PLAN')}</p>
          <p className="text-3xl font-black mt-2">{localizedNumber(scheduleTemplates.length)}</p>
        </div>
        <div className="bg-amber-500 rounded-[1.75rem] p-5 text-white shadow-lg shadow-amber-200">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">{t('lbl_department_defaults', 'DEPARTMAN VARSAYILANI')}</p>
          <p className="text-3xl font-black mt-2">{localizedNumber(scheduleTemplates.reduce((sum, item) => sum + Number(item.department_assignments_count || 0), 0))}</p>
        </div>
        <div className="bg-indigo-500 rounded-[1.75rem] p-5 text-white shadow-lg shadow-indigo-200">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">{t('lbl_employee_overrides', 'PERSONEL İSTİSNASI')}</p>
          <p className="text-3xl font-black mt-2">{localizedNumber(scheduleTemplates.reduce((sum, item) => sum + Number(item.employee_overrides_count || 0), 0))}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        {scheduleLoading ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading_schedules', 'MESAİ PLANLARI YÜKLENİYOR...')}</div>
        ) : sortedSchedules.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            <AlertCircle className="mx-auto mb-4 opacity-30" size={56} />
            {t('msg_no_schedules', 'HENÜZ TANIMLANMIŞ BİR MESAİ PLANI YOK.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-6">{t('col_schedule_name', 'PLAN ADI')}</th>
                  <th className="p-6">{t('col_schedule_type', 'PLAN TÜRÜ')}</th>
                  <th className="p-6">{t('col_schedule_hours', 'SAATLER')}</th>
                  <th className="p-6">{t('col_schedule_rules', 'KURALLAR')}</th>
                  <th className="p-6 text-center">{t('col_schedule_usage', 'KULLANIM')}</th>
                  <th className="p-6 text-right">{t('col_actions', 'İŞLEMLER')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="font-black text-slate-800 uppercase">{schedule.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {schedule.crosses_midnight ? t('lbl_crosses_midnight', 'GECE VARDİYASI') : t('lbl_same_day', 'AYNI GÜN')}
                      </div>
                    </td>
                    <td className="p-6">{getScheduleTypeBadge(schedule.schedule_type)}</td>
                    <td className="p-6">
                      <div className="font-mono text-sm font-black text-slate-700" dir="ltr">
                        {localizeDigits(String(schedule.start_time).slice(0, 5))} - {localizeDigits(String(schedule.end_time).slice(0, 5))}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {t('lbl_break_minutes', 'MOLA')}: {localizedNumber(schedule.break_minutes)} dk
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">+{localizedNumber(schedule.grace_in_minutes)} {t('lbl_grace_in', 'giriş tolerans')}</span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">+{localizedNumber(schedule.grace_out_minutes)} {t('lbl_grace_out', 'çıkış tolerans')}</span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{localizedNumber(schedule.overtime_after_minutes)} {t('lbl_ot_after', 'dk sonra mesai')}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          {localizedNumber(schedule.department_assignments_count || 0)} {t('lbl_departments_short', 'DEPT')}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          {localizedNumber(schedule.employee_overrides_count || 0)} {t('lbl_people_short', 'KİŞİ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={`flex gap-2 ${isArabic ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                        <button onClick={() => handleDownloadSingleScheduleReport(schedule)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100">
                          <Download size={16} />
                        </button>
                        <button onClick={() => openEditScheduleModal(schedule)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm border border-indigo-100">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteSchedule(schedule)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const departmentAssignmentView = (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row justify-between gap-3">
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6 relative overflow-hidden">
          <Users size={84} className={`absolute opacity-5 -bottom-5 ${isArabic ? '-left-4' : '-right-4'} text-indigo-500`} />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">{t('lbl_bulk_department_logic', 'TOPLU VARSAYILAN MANTIĞI')}</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('title_department_schedule_defaults', 'DEPARTMAN MESAİ ATAMALARI')}</h2>
            <p className="text-[11px] font-bold text-slate-500 mt-3 max-w-3xl leading-relaxed">{t('desc_department_schedule_defaults', 'Her departmana bir varsayılan plan bağlayın. Kullanıcıların çoğu bu planı otomatik kullanır; sadece özel durumlar için personel bazlı istisna tanımlanır.')}</p>
          </div>
        </div>

        <button onClick={handleDepartmentAssignmentsSave} disabled={departmentSaving || !departments.length} className={`w-full xl:w-auto bg-slate-900 hover:bg-indigo-600 text-white px-6 py-4 rounded-[1.5rem] font-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95 shrink-0 disabled:opacity-50 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <Save size={20} /> {departmentSaving ? t('btn_saving', 'KAYDEDİLİYOR...') : t('btn_save_department_schedules', 'DEPARTMAN ATAMALARINI KAYDET')}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        {scheduleLoading ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading_department_schedules', 'DEPARTMAN PLANLARI YÜKLENİYOR...')}</div>
        ) : departments.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            <AlertCircle className="mx-auto mb-4 opacity-30" size={56} />
            {t('msg_no_departments', 'ATAMA YAPILABİLECEK DEPARTMAN BULUNMUYOR.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-6">{t('col_department', 'DEPARTMAN')}</th>
                  <th className="p-6">{t('col_active_people', 'AKTİF PERSONEL')}</th>
                  <th className="p-6">{t('col_default_schedule', 'VARSAYILAN MESAİ PLANI')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {departments.map((department) => (
                  <tr key={department.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="font-black text-slate-800 uppercase">{department.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {localizedNumber(department.id)}</div>
                    </td>
                    <td className="p-6">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {localizedNumber(department.employee_count || 0)} {t('lbl_people', 'KİŞİ')}
                      </span>
                    </td>
                    <td className="p-6">
                      <select
                        value={departmentAssignments[department.id] || ''}
                        onChange={(e) => handleDepartmentAssignmentChange(department.id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                        dir={isArabic ? 'rtl' : 'ltr'}
                      >
                        <option value="">{t('opt_select_schedule', 'MESAİ PLANI SEÇİN')}</option>
                        {activeScheduleOptions.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const employeeOverrideView = (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row justify-between gap-3">
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6 relative overflow-hidden">
          <UserCog size={84} className={`absolute opacity-5 -bottom-5 ${isArabic ? '-left-4' : '-right-4'} text-fuchsia-500`} />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-[0.2em] mb-2">{t('lbl_employee_override_logic', 'PERSONEL İSTİSNASI')}</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('title_employee_schedule_override', 'TOPLU PERSONEL MESAİ ATAMA')}</h2>
            <p className="text-[11px] font-bold text-slate-500 mt-3 max-w-3xl leading-relaxed">{t('desc_employee_schedule_override', 'Departman varsayılanını bozmadan, sadece gerekli personeller için özel plan tanımlayın. Seçili personelleri tek işlemle mesai planına bağlayabilir veya varsayılana geri döndürebilirsiniz.')}</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] px-6 py-5 text-white shadow-xl shadow-slate-900/20 w-full xl:w-72">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_selected_people', 'SEÇİLİ PERSONEL')}</p>
          <p className="text-3xl font-black mt-2">{localizedNumber(selectedEmployeeIds.length)}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-3">
            {selectedScheduleTemplate ? `${t('lbl_target_schedule', 'HEDEF PLAN')}: ${selectedScheduleTemplate.name}` : t('lbl_no_target_schedule', 'PLAN SEÇİLMEDİ')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="bg-white rounded-[2.25rem] border border-slate-100 shadow-xl p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-4' : 'left-4'}`} />
              <input
                value={employeeFilters.query}
                onChange={(e) => setEmployeeFilters((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t('ph_search_employee', 'İsim veya e-posta ile ara')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 text-sm font-bold text-slate-700 outline-none focus:border-fuchsia-500 ${isArabic ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
              />
            </div>

            <div className="relative">
              <Filter size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-4' : 'left-4'}`} />
              <select
                value={employeeFilters.department_id}
                onChange={(e) => setEmployeeFilters((prev) => ({ ...prev, department_id: e.target.value }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 text-sm font-bold text-slate-700 outline-none focus:border-fuchsia-500 appearance-none cursor-pointer ${isArabic ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
              >
                <option value="ALL">{t('opt_all_departments', 'TÜM DEPARTMANLAR')}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </div>

            <select
              value={employeeFilters.work_schedule_id}
              onChange={(e) => setEmployeeFilters((prev) => ({ ...prev, work_schedule_id: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:border-fuchsia-500 appearance-none cursor-pointer"
            >
              <option value="">{t('opt_select_schedule', 'MESAİ PLANI SEÇİN')}</option>
              {activeScheduleOptions.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={employeeFilters.effective_from}
              onChange={(e) => setEmployeeFilters((prev) => ({ ...prev, effective_from: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:border-fuchsia-500"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-4 items-center">
            <input
              value={employeeFilters.reason}
              onChange={(e) => setEmployeeFilters((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={t('ph_override_reason', 'İsteğe bağlı not: örn. esnek çalışma, saha planı, özel sözleşme')}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:border-fuchsia-500"
            />
            <button onClick={handleAssignEmployeeSchedule} disabled={employeeAssigning} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <Save size={16} /> {t('btn_assign_special_schedule', 'ÖZEL PLAN ATA')}
            </button>
            <button onClick={handleClearEmployeeOverrides} disabled={employeeAssigning} className="bg-slate-900 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <TimerReset size={16} /> {t('btn_reset_to_department_default', 'VARSAYILANA DÖNDÜR')}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
            {employeeLoading ? (
              <div className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading_people', 'PERSONELLER YÜKLENİYOR...')}</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="p-5 w-16 text-center">
                      <button onClick={toggleSelectFilteredEmployees} className="text-slate-400 hover:text-fuchsia-600 transition-colors">
                        {filteredEmployees.length > 0 && filteredEmployees.every((employee) => selectedEmployeeIds.includes(employee.id)) ? <CheckSquare size={20} className="text-fuchsia-600" /> : <Square size={20} />}
                      </button>
                    </th>
                    <th className="p-5">{t('col_personnel', 'PERSONEL')}</th>
                    <th className="p-5">{t('col_department', 'DEPARTMAN')}</th>
                    <th className="p-5">{t('col_position', 'POZİSYON')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan="4" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">{t('msg_no_filtered_employees', 'FİLTREYE UYAN PERSONEL BULUNMADI.')}</td></tr>
                  ) : filteredEmployees.map((employee) => {
                    const isSelected = selectedEmployeeIds.includes(employee.id);
                    return (
                      <tr key={employee.id} className={`cursor-pointer transition-all ${isSelected ? (isArabic ? 'bg-fuchsia-50 border-r-4 border-r-fuchsia-500' : 'bg-fuchsia-50 border-l-4 border-l-fuchsia-500') : 'hover:bg-slate-50'}`} onClick={() => toggleEmployeeSelection(employee.id)}>
                        <td className="p-5 text-center">
                          {isSelected ? <CheckSquare size={20} className="text-fuchsia-600 mx-auto" /> : <Square size={20} className="text-slate-300 mx-auto" />}
                        </td>
                        <td className="p-5">
                          <div className="font-black text-slate-800 uppercase">{employee.first_name} {employee.last_name}</div>
                          <div className="text-[10px] font-black text-slate-400 tracking-widest mt-1">{employee.email}</div>
                        </td>
                        <td className="p-5">
                          <span className="bg-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600">{employee.department || '-'}</span>
                        </td>
                        <td className="p-5 text-sm font-bold text-slate-600">{employee.position || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.25rem] border border-slate-100 shadow-xl p-5 md:p-6">
          <div className={`flex items-center justify-between mb-5 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('lbl_active_overrides', 'AKTİF İSTİSNALAR')}</p>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-2">{localizedNumber(employeeOverrides.length)}</h3>
            </div>
            <div className="bg-fuchsia-50 text-fuchsia-600 p-3 rounded-2xl">
              <UserCog size={22} />
            </div>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
            {employeeOverrides.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-[2rem] p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                {t('msg_no_employee_overrides', 'AKTİF PERSONEL İSTİSNASI YOK.')}
              </div>
            ) : employeeOverrides.map((override) => (
              <div key={override.id} className="border border-slate-100 rounded-[1.75rem] p-5 bg-slate-50/70">
                <div className="font-black text-slate-800 uppercase">{override.employee_name}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{override.department_name || '-'}</div>
                <div className="mt-3 inline-flex bg-white border border-fuchsia-200 text-fuchsia-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {override.work_schedule_name}
                </div>
                <div className="mt-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('lbl_effective_from', 'BAŞLANGIÇ')}: {override.effective_from}
                </div>
                {override.reason && (
                  <div className="mt-2 text-[11px] font-bold text-slate-500 leading-relaxed">
                    {override.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const reportView = (
    <div className="space-y-6">
      <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex-1">
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 ${isArabic ? 'text-right' : 'text-left'}`}>
            <input
              type="date"
              value={attendanceFilters.from_date}
              onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, from_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-all"
              dir="ltr"
            />
            <input
              type="date"
              value={attendanceFilters.to_date}
              onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, to_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-all"
              dir="ltr"
            />
            <select
              value={attendanceFilters.department}
              onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, department: normalizeDepartmentName(e.target.value) || 'ALL' }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
            >
              <option value="ALL">{t('opt_all_departments', 'TÜM DEPARTMANLAR')}</option>
              {attendanceDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <input
              value={attendanceFilters.query}
              onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder={t('ph_search_attendance', 'Personel / Departman')}
              className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-all ${isArabic ? 'pr-4 pl-4 text-right' : 'pl-4 pr-4 text-left'}`}
            />
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-2 shrink-0 ${isArabic ? 'text-right' : 'text-left'}`}>
          <button onClick={() => handlePayrollExport('excel')} disabled={exporting || !reportSummary.rows?.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
            <FileSpreadsheet size={15} /> {t('btn_export_excel', 'EXCEL')}
          </button>
          <button onClick={() => handlePayrollExport('csv')} disabled={exporting || !reportSummary.rows?.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
            <FileText size={15} /> {t('btn_export_csv', 'CSV')}
          </button>
          <button onClick={() => handlePayrollExport('pdf')} disabled={exporting || !reportSummary.rows?.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
            <Download size={15} /> {t('btn_export_pdf', 'PDF')}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="bg-slate-900 text-white rounded-[1.5rem] px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_report_people', 'PERSONEL')}</p>
            <p className="text-3xl font-black mt-2">{localizedNumber(reportSummary.totals?.employees || 0)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">{t('lbl_report_worked_days', 'ÇALIŞILAN GÜN')}</p>
            <p className="text-3xl font-black mt-2 text-emerald-700">{localizedNumber(reportSummary.totals?.worked_days || 0)}</p>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-[1.5rem] px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-700">{t('lbl_report_approved_leaves', 'ONAYLI İZİN')}</p>
            <p className="text-3xl font-black mt-2 text-violet-700">{localizedNumber(reportSummary.totals?.approved_leave_days || 0)}</p>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-[1.5rem] px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-700">{t('lbl_report_paid_sick_days', 'TAM ÜCRETLİ RAPOR')}</p>
            <p className="text-3xl font-black mt-2 text-sky-700">{localizedNumber(reportSummary.totals?.paid_sick_days || 0)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-700">{t('lbl_report_deducted_sick_days', 'KESİNTİLİ RAPOR')}</p>
            <p className="text-3xl font-black mt-2 text-rose-700">{localizedNumber(reportSummary.totals?.deducted_sick_days || 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        {reportLoading ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            {t('lbl_loading_attendance_report', 'PUANTAJ RAPORU HAZIRLANIYOR...')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-5">{t('col_name', 'AD SOYAD')}</th>
                  <th className="p-5">{t('col_department', 'DEPARTMAN')}</th>
                  <th className="p-5 text-center">{t('lbl_report_worked_days', 'ÇALIŞILAN GÜN')}</th>
                  <th className="p-5 text-center">{t('lbl_report_approved_leaves', 'ONAYLI İZİN')}</th>
                  <th className="p-5 text-center">{t('lbl_report_sick_days', 'RAPORLU GÜN')}</th>
                  <th className="p-5 text-center">{t('lbl_report_paid_sick_days', 'TAM ÜCRETLİ RAPOR')}</th>
                  <th className="p-5 text-center">{t('lbl_report_deducted_sick_days', 'KESİNTİLİ RAPOR')}</th>
                  <th className="p-5 text-center">{t('lbl_report_late_count', 'GEÇ')}</th>
                  <th className="p-5 text-center">{t('lbl_report_early_count', 'ERKEN')}</th>
                  <th className="p-5 text-center">{t('lbl_report_overtime_hours', 'MESAİ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {!reportSummary.rows?.length ? (
                  <tr>
                    <td colSpan="10" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                      {t('msg_no_attendance_report_rows', 'SEÇİLEN DÖNEM İÇİN BORDRO RAPORU SATIRI BULUNMADI.')}
                    </td>
                  </tr>
                ) : reportSummary.rows.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5">
                      <div className="font-black text-slate-800 uppercase">{row.employee_name}</div>
                    </td>
                    <td className="p-5 text-sm font-bold text-slate-500">{row.department || '-'}</td>
                    <td className="p-5 text-center font-black text-emerald-700">{localizedNumber(row.worked_days)}</td>
                    <td className="p-5 text-center font-black text-violet-700">{localizedNumber(row.approved_leave_days)}</td>
                    <td className="p-5 text-center font-black text-sky-700">{localizedNumber(row.sick_report_days)}</td>
                    <td className="p-5 text-center font-black text-sky-700">{localizedNumber(row.paid_sick_days)}</td>
                    <td className="p-5 text-center font-black text-rose-700">{localizedNumber(row.deducted_sick_days)}</td>
                    <td className="p-5 text-center font-black text-amber-700">{localizedNumber(row.late_count)}</td>
                    <td className="p-5 text-center font-black text-fuchsia-700">{localizedNumber(row.early_out_count)}</td>
                    <td className="p-5 text-center font-black text-slate-700">{localizedNumber(row.overtime_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 relative animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} reverseOrder={false} />

      <div className={`sticky top-0 z-20 -mt-1 pt-1 pb-2 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 flex flex-col xl:flex-row justify-between items-center shrink-0 w-full gap-2 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="flex gap-2 bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm w-full xl:w-auto">
          <button
            onClick={() => setActiveView('ATTENDANCE')}
            className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeView === 'ATTENDANCE' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-500'}`}
          >
            <CalendarDays size={16} className="shrink-0" /> {t('tab_attendance_records', 'PUANTAJ')}
          </button>
          <button
            onClick={() => setActiveView('SCHEDULES')}
            className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeView === 'SCHEDULES' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-cyan-500'}`}
          >
            <TimerReset size={16} className="shrink-0" /> {t('tab_work_schedules', 'MESAİ PLANLARI')}
          </button>
          <button
            onClick={() => setActiveView('DEPARTMENTS')}
            className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeView === 'DEPARTMENTS' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-500'}`}
          >
            <CopyCheck size={16} className="shrink-0" /> {t('tab_department_assignments', 'DEPARTMAN ATAMALARI')}
          </button>
          <button
            onClick={() => setActiveView('OVERRIDES')}
            className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeView === 'OVERRIDES' ? 'bg-fuchsia-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-fuchsia-500'}`}
          >
            <UserCog size={16} className="shrink-0" /> {t('tab_employee_overrides', 'PERSONEL İSTİSNASI')}
          </button>
          <button
            onClick={() => setActiveView('REPORTS')}
            className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeView === 'REPORTS' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Download size={16} className="shrink-0" /> {t('tab_payroll_report', 'BORDRO RAPORU')}
          </button>
        </div>
      </div>

      {activeView === 'ATTENDANCE' && attendanceView}
      {activeView === 'SCHEDULES' && scheduleManagementView}
      {activeView === 'DEPARTMENTS' && departmentAssignmentView}
      {activeView === 'OVERRIDES' && employeeOverrideView}
      {activeView === 'REPORTS' && reportView}

      {showSickReportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className={`flex items-center justify-between p-8 border-b border-slate-100 bg-sky-900 text-white ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 bg-sky-500 rounded-xl"><AlertCircle size={20} /></div>
                <h3 className="font-black uppercase tracking-widest text-sm">{t('modal_title_sick_report', 'SAĞLIK RAPORU GİRİŞİ')}</h3>
              </div>
              <button onClick={closeSickReportModal} className="text-slate-300 hover:text-white transition-colors"><XCircle size={28} /></button>
            </div>

            <div className="p-8 space-y-5 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {t('lbl_employee', 'PERSONEL')}
                  </label>
                  <select
                    value={sickReportForm.employee_id}
                    onChange={(e) => setSickReportForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">{t('ph_select_employee', 'Personel seçin')}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} {employee.department ? `- ${employee.department}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_start_date', 'BAŞLANGIÇ TARİHİ')}</label>
                  <input type="date" value={sickReportForm.start_date} onChange={(e) => setSickReportForm((prev) => ({ ...prev, start_date: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm" dir="ltr" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_end_date', 'BİTİŞ TARİHİ')}</label>
                  <input type="date" value={sickReportForm.end_date} onChange={(e) => setSickReportForm((prev) => ({ ...prev, end_date: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm" dir="ltr" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_report_no', 'RAPOR NO')}</label>
                  <input type="text" value={sickReportForm.report_no} onChange={(e) => setSickReportForm((prev) => ({ ...prev, report_no: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_issued_by', 'VEREN KURUM / HEKİM')}</label>
                  <input type="text" value={sickReportForm.issued_by} onChange={(e) => setSickReportForm((prev) => ({ ...prev, issued_by: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_issue_date', 'DÜZENLENME TARİHİ')}</label>
                  <input type="date" value={sickReportForm.issue_date} onChange={(e) => setSickReportForm((prev) => ({ ...prev, issue_date: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm" dir="ltr" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_payroll_effect', 'BORDRO ETKİSİ')}</label>
                  <select
                    value={sickReportForm.payroll_treatment}
                    onChange={(e) => setSickReportForm((prev) => ({ ...prev, payroll_treatment: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="FULL_PAY">{t('opt_full_pay_sick', 'TAM ÜCRET ÖDE')}</option>
                    <option value="DEDUCT">{t('opt_deduct_sick', 'KESİNTİYE DAHİL ET')}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('lbl_payroll_decision_note', 'KARAR NOTU')}</label>
                  <textarea value={sickReportForm.decision_note} onChange={(e) => setSickReportForm((prev) => ({ ...prev, decision_note: e.target.value }))} rows={3} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 shadow-sm resize-none" />
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
                  {sickReportForm.payroll_treatment === 'FULL_PAY'
                    ? t('msg_sick_report_full_pay', 'Puantajda sağlık raporu görünür, maaş tam ödenir.')
                    : t('msg_sick_report_deduct', 'Puantajda sağlık raporu görünür, bordro kesintisine dahil edilir.')}
                </p>
              </div>

              <div className={`flex gap-3 pt-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button onClick={closeSickReportModal} className="flex-1 py-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm">
                  {t('btn_cancel', 'İPTAL')}
                </button>
                <button onClick={handleCreateSickReport} className="flex-[2] py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xl shadow-sky-500/20 active:scale-95">
                  <Save size={16} /> {t('btn_save_sick_report', 'PUANTAJA İŞLE')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MESAİ PLANI MODALI --- */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`bg-slate-900 p-8 flex justify-between items-center text-white shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-xl font-black tracking-tighter flex items-center gap-3 uppercase ${isArabic ? 'flex-row-reverse' : ''}`}>
                <div className="p-2.5 bg-cyan-500 rounded-xl"><TimerReset size={24} /></div>
                {editingScheduleId ? t('modal_title_edit_schedule', 'MESAİ PLANI DÜZENLE') : t('modal_title_new_schedule', 'YENİ MESAİ PLANI')}
              </h3>
              <button onClick={closeScheduleModal} className={`hover:text-white transition-all text-slate-400 ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32} /></button>
            </div>

            <form onSubmit={handleScheduleSave} className="p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_schedule_name', 'PLAN ADI')} <span className="text-rose-500">*</span></label>
                  <input value={scheduleForm.name} onChange={(e) => handleScheduleFormChange('name', e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>

                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_schedule_type', 'PLAN TÜRÜ')}</label>
                  <select value={scheduleForm.schedule_type} onChange={(e) => handleScheduleFormChange('schedule_type', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm appearance-none cursor-pointer">
                    <option value="FIXED">{t('opt_fixed', 'SABİT')}</option>
                    <option value="FLEX">{t('opt_flex', 'ESNEK')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <input id="crosses-midnight" type="checkbox" checked={scheduleForm.crosses_midnight} onChange={(e) => handleScheduleFormChange('crosses_midnight', e.target.checked)} className="w-4 h-4 accent-cyan-600" />
                  <label htmlFor="crosses-midnight" className="text-[11px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">{t('lbl_crosses_midnight_toggle', 'GECE VARDİYASI')}</label>
                </div>

                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_start_time', 'GİRİŞ SAATİ')} <span className="text-rose-500">*</span></label>
                  <input type="time" value={scheduleForm.start_time} onChange={(e) => handleScheduleFormChange('start_time', e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" dir="ltr" />
                </div>
                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_end_time', 'ÇIKIŞ SAATİ')} <span className="text-rose-500">*</span></label>
                  <input type="time" value={scheduleForm.end_time} onChange={(e) => handleScheduleFormChange('end_time', e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" dir="ltr" />
                </div>

                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_break_minutes', 'MOLA (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.break_minutes} onChange={(e) => handleScheduleFormChange('break_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>
                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_overtime_after', 'MESAİ BAŞLAMA (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.overtime_after_minutes} onChange={(e) => handleScheduleFormChange('overtime_after_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>

                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_grace_in_minutes', 'GİRİŞ TOLERANSI (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.grace_in_minutes} onChange={(e) => handleScheduleFormChange('grace_in_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>
                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_grace_out_minutes', 'ÇIKIŞ TOLERANSI (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.grace_out_minutes} onChange={(e) => handleScheduleFormChange('grace_out_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>

                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_late_after', 'GEÇ SAYILMA (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.late_after_minutes} onChange={(e) => handleScheduleFormChange('late_after_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>
                <div>
                  <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_early_leave_after', 'ERKEN ÇIKIŞ (DK)')}</label>
                  <input type="number" min="0" value={scheduleForm.early_leave_after_minutes} onChange={(e) => handleScheduleFormChange('early_leave_after_minutes', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                </div>

                {scheduleForm.schedule_type === 'FLEX' && (
                  <>
                    <div className="md:col-span-2 mt-2">
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
                         <AlertCircle size={20} className="text-amber-500 shrink-0" />
                         <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">{t('desc_core_hours', 'ESNEK ÇALIŞMADA PERSONELİN MUTLAKA OFİSTE OLMASI BEKLENEN "ÇEKİRDEK SAAT" ARALIĞINI BELİRLEYİN.')}</p>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_core_start', 'ÇEKİRDEK BAŞLANGIÇ')}</label>
                      <input type="time" value={scheduleForm.core_start_time} onChange={(e) => handleScheduleFormChange('core_start_time', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" dir="ltr" />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_core_end', 'ÇEKİRDEK BİTİŞ')}</label>
                      <input type="time" value={scheduleForm.core_end_time} onChange={(e) => handleScheduleFormChange('core_end_time', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm" dir="ltr" />
                    </div>
                  </>
                )}
              </div>

              <div className={`flex gap-3 pt-4 border-t border-slate-200 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={closeScheduleModal} className="flex-1 py-5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm">
                  {t('btn_cancel', 'İPTAL')}
                </button>
                <button type="submit" className="flex-[2] py-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95">
                  <Save size={16} /> {editingScheduleId ? t('btn_update_schedule', 'PLANI GÜNCELLE') : t('btn_create_schedule', 'PLANI OLUŞTUR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
