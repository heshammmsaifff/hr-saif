import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { supabase } from "../../utils/supabase";
import { SupabaseBranchRepository } from "../../data/repositories/SupabaseBranchRepository";
import { SupabaseEmployeeRepository } from "../../data/repositories/SupabaseEmployeeRepository";
import { SupabaseTenantSettingsRepository } from "../../data/repositories/SupabaseTenantSettingsRepository";
import { SupabaseDeductionRepository } from "../../data/repositories/SupabaseDeductionRepository";
import { SupabaseAdvanceRepository } from "../../data/repositories/SupabaseAdvanceRepository";
import { SupabaseLeaveRepository } from "../../data/repositories/SupabaseLeaveRepository";
import type { Branch } from "../../domain/entities/Branch";
import type { Employee } from "../../domain/entities/Employee";
import type { Deduction } from "../../domain/entities/Deduction";
import type { Advance } from "../../domain/entities/Advance";
import type { Leave } from "../../domain/entities/Leave";
import * as XLSX from "xlsx";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CalendarRange,
  Building,
  Plus,
  Trash2,
  PlusCircle,
  Briefcase,
  Phone,
  MapPin,
  FileText,
  Calendar,
  AlertCircle,
  Pencil,
  Percent,
  Coins,
  ClipboardList,
  BarChart3,
  Download,
} from "lucide-react";

const branchRepository = new SupabaseBranchRepository();
const employeeRepository = new SupabaseEmployeeRepository();
const tenantSettingsRepository = new SupabaseTenantSettingsRepository();
const deductionRepository = new SupabaseDeductionRepository();
const advanceRepository = new SupabaseAdvanceRepository();
const leaveRepository = new SupabaseLeaveRepository();

export const TenantDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenantId } = useParams<{ tenantId: string }>();
  const { theme, toggleTheme } = useTheme();

  const [tenantName, setTenantName] = useState<string>("جاري تحميل المنشأة...");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Multi-tenant lists
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Branch forms state
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState("");
  const [branchAddressInput, setBranchAddressInput] = useState("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Employee wizard state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeStep, setEmployeeStep] = useState(1); // 1, 2, 3
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  // Employee filter states
  const [filterBranchId, setFilterBranchId] = useState<string>("");
  const [filterJobTitle, setFilterJobTitle] = useState<string>("");
  const [filterExpiringDocs, setFilterExpiringDocs] = useState<boolean>(false);

  // Date filter states
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>(String(currentYear));
  const [filterMonth, setFilterMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );

  // Lookup employee state
  const [selectedLookupEmployeeId, setSelectedLookupEmployeeId] = useState<string>('');

  // Reports page state
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [reportFromDate, setReportFromDate] = useState<string>(getFirstDayOfMonth());
  const [reportToDate, setReportToDate] = useState<string>(getTodayDate());
  const [reportType, setReportType] = useState<string>('payroll');
  const [reportBranchId, setReportBranchId] = useState<string>('');
  const [reportJobTitle, setReportJobTitle] = useState<string>('');

  // Step 1: Personal
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empAddress, setEmpAddress] = useState("");
  const [empBranchId, setEmpBranchId] = useState("");
  const [empNationalId, setEmpNationalId] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empEndOfServiceDate, setEmpEndOfServiceDate] = useState("");

  // Step 2: Job
  const [empJobTitle, setEmpJobTitle] = useState("");
  const [empHireDate, setEmpHireDate] = useState("");
  const [empSalary, setEmpSalary] = useState("");

  // Step 3: Documents
  const [empDocs, setEmpDocs] = useState<
    { name: string; expiryDate: string }[]
  >([]);

  // Tenant settings state
  const [settingsPaidLeaves, setSettingsPaidLeaves] = useState<number>(2);
  const [settingsExcusedDeduction, setSettingsExcusedDeduction] =
    useState<number>(1.0);
  const [settingsUnexcusedDeduction, setSettingsUnexcusedDeduction] =
    useState<number>(2.0);
  const [settingsAllowEmployeeViewSalary, setSettingsAllowEmployeeViewSalary] =
    useState<boolean>(true);
  const [
    settingsAllowEmployeeSubmitRequests,
    setSettingsAllowEmployeeSubmitRequests,
  ] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Deductions states
  const [showAddDeductionModal, setShowAddDeductionModal] = useState(false);
  const [selectedEmployeeForDeduction, setSelectedEmployeeForDeduction] =
    useState<Employee | null>(null);
  const [deductionType, setDeductionType] = useState<"amount" | "days">("days");
  const [deductionValue, setDeductionValue] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [deductionDate, setDeductionDate] = useState("");
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  // Advances states
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [selectedEmployeeForAdvance, setSelectedEmployeeForAdvance] =
    useState<Employee | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  // Leaves states
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [selectedEmployeeForLeave, setSelectedEmployeeForLeave] =
    useState<Employee | null>(null);
  const [leaveType, setLeaveType] = useState<
    "paid_leave" | "excused_absence" | "unexcused_absence"
  >("paid_leave");
  const [leaveDays, setLeaveDays] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  // Auto-calculate Leave End Date based on Start Date and Days
  useEffect(() => {
    if (leaveStartDate && leaveDays && !isNaN(Number(leaveDays))) {
      const days = Number(leaveDays);
      if (days > 0) {
        const start = new Date(leaveStartDate);
        const daysToSubtract = Math.max(0, Math.ceil(days) - 1);
        const end = new Date(
          start.getTime() + daysToSubtract * 24 * 60 * 60 * 1000,
        );
        setLeaveEndDate(end.toISOString().split("T")[0]);
      }
    }
  }, [leaveStartDate, leaveDays]);

  // 1. Fetch Tenant details
  useEffect(() => {
    async function fetchTenantDetails() {
      const activeTenantId = tenantId || user?.tenantId;
      if (!activeTenantId) return;

      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", activeTenantId)
          .single();

        if (error) throw error;
        if (data) {
          setTenantName(data.name);
        }
      } catch (err) {
        console.error("Error fetching tenant details:", err);
        setTenantName("منشأة افتراضية");
      }
    }

    fetchTenantDetails();
  }, [tenantId, user?.tenantId]);

  // 2. Load Branches, Employees, Deductions, Advances, and Leaves
  const loadData = async () => {
    const activeTenantId = tenantId || user?.tenantId;
    if (!activeTenantId) return;

    setIsLoadingData(true);
    try {
      const [
        fetchedBranches,
        fetchedEmployees,
        fetchedDeductions,
        fetchedAdvances,
        fetchedLeaves,
      ] = await Promise.all([
        branchRepository.getBranches(activeTenantId),
        employeeRepository.getEmployees(activeTenantId),
        deductionRepository.getDeductions(activeTenantId),
        advanceRepository.getAdvances(activeTenantId),
        leaveRepository.getLeaves(activeTenantId),
      ]);
      setBranches(fetchedBranches);
      setEmployees(fetchedEmployees);
      setDeductions(fetchedDeductions);
      setAdvances(fetchedAdvances);
      setLeaves(fetchedLeaves);

      const { data: reqData, error: reqErr } = await supabase
        .from("employee_requests")
        .select("*, employees(name)")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (reqErr) {
        console.error("Error fetching employee requests:", reqErr);
      } else {
        setEmployeeRequests(reqData || []);
      }
    } catch (err) {
      console.error("Error loading tenant data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId, user?.tenantId]);

  // 3. Load Tenant settings
  const loadTenantSettings = async () => {
    const activeTenantId = tenantId || user?.tenantId;
    if (!activeTenantId) return;

    setIsLoadingSettings(true);
    try {
      const res = await tenantSettingsRepository.getSettings(activeTenantId);
      setSettingsPaidLeaves(res.paidLeavesLimit);
      setSettingsExcusedDeduction(res.excusedAbsenceDeduction);
      setSettingsUnexcusedDeduction(res.unexcusedAbsenceDeduction);
      setSettingsAllowEmployeeViewSalary(res.allowEmployeeViewSalary ?? true);
      setSettingsAllowEmployeeSubmitRequests(
        res.allowEmployeeSubmitRequests ?? true,
      );
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadTenantSettings();
  }, [tenantId, user?.tenantId]);

  // Navigation items
  const navItems = [
    { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { id: "branches", label: "الفروع", icon: Building },
    { id: "employees", label: "إدارة الموظفين", icon: Users },
    { id: "employee_lookup", label: "البحث الشامل للموظف", icon: FileText },
    { id: "deductions", label: "الخصومات", icon: Percent },
    { id: "leaves", label: "الإجازات والغياب", icon: CalendarRange },
    { id: "advances", label: "السلف", icon: Coins },
    { id: "requests", label: "طلبات الموظفين", icon: ClipboardList },
    { id: "reports", label: "التقارير الإدارية والمالية", icon: BarChart3 },
    { id: "settings", label: "إعدادات المنشأة", icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
  };

  // Branch CRUD handlers
  const startEditBranch = (b: Branch) => {
    if (!b.id) return;
    setEditingBranchId(b.id);
    setBranchNameInput(b.name);
    setBranchAddressInput(b.address || "");
    setShowAddBranch(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (!activeTenantId || !branchNameInput.trim()) return;

    setIsSavingBranch(true);
    try {
      if (editingBranchId) {
        await branchRepository.updateBranch(editingBranchId, {
          tenantId: activeTenantId,
          name: branchNameInput.trim(),
          address: branchAddressInput.trim(),
        });
      } else {
        await branchRepository.createBranch({
          tenantId: activeTenantId,
          name: branchNameInput.trim(),
          address: branchAddressInput.trim(),
        });
      }
      setBranchNameInput("");
      setBranchAddressInput("");
      setEditingBranchId(null);
      setShowAddBranch(false);
      await loadData();
    } catch (err) {
      console.error("Error creating/updating branch:", err);
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الفرع؟")) return;
    try {
      await branchRepository.deleteBranch(id);
      await loadData();
    } catch (err) {
      console.error("Error deleting branch:", err);
    }
  };

  // Employee Multi-step Wizard handlers
  const addDocRow = () => {
    setEmpDocs((prev) => [...prev, { name: "", expiryDate: "" }]);
  };

  const removeDocRow = (index: number) => {
    setEmpDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDocRow = (
    index: number,
    key: "name" | "expiryDate",
    value: string,
  ) => {
    setEmpDocs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const startEditEmployee = (emp: Employee) => {
    if (!emp.id) return;
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpPhone(emp.phone || "");
    setEmpAddress(emp.address || "");
    setEmpBranchId(emp.branchId || "");
    setEmpNationalId(emp.nationalId || "");
    setEmpJobTitle(emp.jobTitle);
    setEmpHireDate(emp.hireDate);
    setEmpSalary(String(emp.salary));
    setEmpUsername(emp.username || "");
    setEmpPassword(emp.password || "");
    setEmpEndOfServiceDate(emp.endOfServiceDate || "");
    setEmpDocs(
      emp.documents
        ? emp.documents.map((d) => ({ name: d.name, expiryDate: d.expiryDate }))
        : [],
    );
    setEmployeeStep(1);
    setShowAddEmployee(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (
      !activeTenantId ||
      !empName.trim() ||
      !empJobTitle.trim() ||
      !empHireDate ||
      !empSalary
    )
      return;

    setIsSavingEmployee(true);
    try {
      // Filter out empty rows
      const validDocs = empDocs.filter(
        (d) => d.name.trim() !== "" && d.expiryDate !== "",
      );

      if (editingEmployeeId) {
        await employeeRepository.updateEmployee(
          editingEmployeeId,
          {
            tenantId: activeTenantId,
            branchId: empBranchId || undefined,
            name: empName.trim(),
            phone: empPhone.trim(),
            address: empAddress.trim(),
            nationalId: empNationalId.trim(),
            jobTitle: empJobTitle.trim(),
            hireDate: empHireDate,
            salary: Number(empSalary),
            username: empUsername.trim() || undefined,
            password: empPassword.trim() || undefined,
            endOfServiceDate: empEndOfServiceDate || undefined,
          },
          validDocs,
        );
      } else {
        await employeeRepository.createEmployee(
          {
            tenantId: activeTenantId,
            branchId: empBranchId || undefined,
            name: empName.trim(),
            phone: empPhone.trim(),
            address: empAddress.trim(),
            nationalId: empNationalId.trim(),
            jobTitle: empJobTitle.trim(),
            hireDate: empHireDate,
            salary: Number(empSalary),
            username: empUsername.trim() || undefined,
            password: empPassword.trim() || undefined,
            endOfServiceDate: empEndOfServiceDate || undefined,
          },
          validDocs,
        );
      }

      // Reset employee fields
      setEmpName("");
      setEmpPhone("");
      setEmpAddress("");
      setEmpBranchId("");
      setEmpNationalId("");
      setEmpJobTitle("");
      setEmpHireDate("");
      setEmpSalary("");
      setEmpUsername("");
      setEmpPassword("");
      setEmpEndOfServiceDate("");
      setEmpDocs([]);
      setEmployeeStep(1);
      setEditingEmployeeId(null);
      setShowAddEmployee(false);
      await loadData();
    } catch (err) {
      console.error("Error saving employee:", err);
      alert("حدث خطأ أثناء حفظ الموظف. قد يكون اسم المستخدم مكررًا.");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع مستنداته تلقائياً.",
      )
    )
      return;
    try {
      await employeeRepository.deleteEmployee(id);
      await loadData();
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  // Settings handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (!activeTenantId) return;

    setIsSavingSettings(true);
    try {
      await tenantSettingsRepository.saveSettings({
        tenantId: activeTenantId,
        paidLeavesLimit: settingsPaidLeaves,
        excusedAbsenceDeduction: settingsExcusedDeduction,
        unexcusedAbsenceDeduction: settingsUnexcusedDeduction,
        allowEmployeeViewSalary: settingsAllowEmployeeViewSalary,
        allowEmployeeSubmitRequests: settingsAllowEmployeeSubmitRequests,
      });
      alert("تم حفظ إعدادات المنشأة بنجاح!");
      await loadTenantSettings();
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("حدث خطأ أثناء حفظ الإعدادات.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Deduction handlers
  const handleCreateDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (
      !activeTenantId ||
      !selectedEmployeeForDeduction?.id ||
      !deductionValue ||
      !deductionReason.trim() ||
      !deductionDate
    )
      return;

    setIsSavingDeduction(true);
    try {
      await deductionRepository.createDeduction({
        tenantId: activeTenantId,
        employeeId: selectedEmployeeForDeduction.id,
        deductionType: deductionType,
        value: Number(deductionValue),
        reason: deductionReason.trim(),
        deductionDate: deductionDate,
      });

      setDeductionValue("");
      setDeductionReason("");
      setDeductionDate("");
      setSelectedEmployeeForDeduction(null);
      setShowAddDeductionModal(false);
      await loadData();
    } catch (err) {
      console.error("Error creating deduction:", err);
      alert("حدث خطأ أثناء حفظ الخصم.");
    } finally {
      setIsSavingDeduction(false);
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الخصم؟")) return;
    try {
      await deductionRepository.deleteDeduction(id);
      await loadData();
    } catch (err) {
      console.error("Error deleting deduction:", err);
    }
  };

  // Advance handlers
  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (
      !activeTenantId ||
      !selectedEmployeeForAdvance?.id ||
      !advanceAmount ||
      !advanceReason.trim() ||
      !advanceDate
    )
      return;

    setIsSavingAdvance(true);
    try {
      await advanceRepository.createAdvance({
        tenantId: activeTenantId,
        employeeId: selectedEmployeeForAdvance.id,
        amount: Number(advanceAmount),
        reason: advanceReason.trim(),
        advanceDate: advanceDate,
      });

      setAdvanceAmount("");
      setAdvanceReason("");
      setAdvanceDate("");
      setSelectedEmployeeForAdvance(null);
      setShowAddAdvanceModal(false);
      await loadData();
    } catch (err) {
      console.error("Error creating advance:", err);
      alert("حدث خطأ أثناء حفظ السلفة.");
    } finally {
      setIsSavingAdvance(false);
    }
  };

  const handleDeleteAdvance = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه السلفة؟")) return;
    try {
      await advanceRepository.deleteAdvance(id);
      await loadData();
    } catch (err) {
      console.error("Error deleting advance:", err);
    }
  };

  // Leave handlers
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeTenantId = tenantId || user?.tenantId;
    if (
      !activeTenantId ||
      !selectedEmployeeForLeave?.id ||
      !leaveDays ||
      !leaveReason.trim() ||
      !leaveStartDate ||
      !leaveEndDate
    )
      return;

    setIsSavingLeave(true);
    try {
      await leaveRepository.createLeave({
        tenantId: activeTenantId,
        employeeId: selectedEmployeeForLeave.id,
        leaveType: leaveType,
        days: Number(leaveDays),
        reason: leaveReason.trim(),
        startDate: leaveStartDate,
        endDate: leaveEndDate,
      });

      setLeaveDays("");
      setLeaveReason("");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setSelectedEmployeeForLeave(null);
      setShowAddLeaveModal(false);
      await loadData();
    } catch (err) {
      console.error("Error creating leave:", err);
      alert("حدث خطأ أثناء حفظ الإجازة/الغياب.");
    } finally {
      setIsSavingLeave(false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الإجازة/الغياب؟")) return;
    try {
      await leaveRepository.deleteLeave(id);
      await loadData();
    } catch (err) {
      console.error("Error deleting leave:", err);
    }
  };

  const handleApproveRequest = async (req: any) => {
    if (!window.confirm("هل أنت متأكد من الموافقة على هذا الطلب؟")) return;
    try {
      if (req.request_type === "advance") {
        await advanceRepository.createAdvance({
          tenantId: req.tenant_id,
          employeeId: req.employee_id,
          amount: Number(req.amount),
          reason: `سلفة معتمدة: ${req.reason}`,
          advanceDate: req.start_date,
        });
      } else if (req.request_type === "leave") {
        const days = Number(req.days);
        const start = new Date(req.start_date);
        const daysToSubtract = Math.max(0, Math.ceil(days) - 1);
        const end = new Date(
          start.getTime() + daysToSubtract * 24 * 60 * 60 * 1000,
        );
        const endDateStr = end.toISOString().split("T")[0];

        await leaveRepository.createLeave({
          tenantId: req.tenant_id,
          employeeId: req.employee_id,
          leaveType: req.leave_type,
          days: days,
          reason: `إجازة معتمدة: ${req.reason}`,
          startDate: req.start_date,
          endDate: endDateStr,
        });
      }

      const { error } = await supabase
        .from("employee_requests")
        .update({ status: "approved" })
        .eq("id", req.id);

      if (error) throw error;

      alert("تمت الموافقة على الطلب بنجاح وتسجيل الحركة تلقائياً.");
      await loadData();
    } catch (err) {
      console.error("Error approving request:", err);
      alert("حدث خطأ أثناء معالجة الموافقة.");
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!window.confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;
    try {
      const { error } = await supabase
        .from("employee_requests")
        .update({ status: "rejected" })
        .eq("id", reqId);

      if (error) throw error;

      alert("تم رفض الطلب بنجاح.");
      await loadData();
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("حدث خطأ أثناء معالجة الرفض.");
    }
  };

  // ----------------------------------------
  // Filter Employees Logic
  // ----------------------------------------
  const uniqueJobTitles = Array.from(
    new Set(employees.map((emp) => emp.jobTitle).filter(Boolean)),
  );

  const filteredEmployees = employees.filter((emp) => {
    // 1. Filter by branch
    if (filterBranchId && emp.branchId !== filterBranchId) {
      return false;
    }

    // 2. Filter by job title
    if (filterJobTitle && emp.jobTitle !== filterJobTitle) {
      return false;
    }

    // 3. Filter by expiring documents (within 30 days)
    if (filterExpiringDocs) {
      if (!emp.documents || emp.documents.length === 0) {
        return false;
      }

      const hasExpiringDoc = emp.documents.some((doc) => {
        if (!doc.expiryDate) return false;

        const expiry = new Date(doc.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Expiring within 30 days (including already expired, <= 30)
        return diffDays <= 30;
      });

      if (!hasExpiringDoc) {
        return false;
      }
    }

    return true;
  });

  // ----------------------------------------
  // Dashboard Alerts Logic
  // ----------------------------------------
  const expiringDocs: any[] = [];
  employees.forEach((emp) => {
    if (emp.documents) {
      emp.documents.forEach((doc) => {
        if (doc.expiryDate) {
          const expiry = new Date(doc.expiryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiry.setHours(0, 0, 0, 0);

          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30) {
            expiringDocs.push({
              employeeId: emp.id,
              employeeName: emp.name,
              documentName: doc.name,
              expiryDate: doc.expiryDate,
              remainingDays: diffDays,
            });
          }
        }
      });
    }
  });
  expiringDocs.sort((a, b) => a.remainingDays - b.remainingDays);

  const pendingRequests = employeeRequests.filter(
    (r) => r.status === "pending",
  );

  // ----------------------------------------
  // Reports Computations Logic
  // ----------------------------------------
  const reportEmployees = employees.filter(emp => {
    if (reportBranchId && emp.branchId !== reportBranchId) return false;
    if (reportJobTitle && emp.jobTitle !== reportJobTitle) return false;
    return true;
  });

  const reportDeductions = deductions.filter(d => {
    if (!d.deductionDate) return false;
    if (d.deductionDate < reportFromDate || d.deductionDate > reportToDate) return false;
    
    const emp = employees.find(e => e.id === d.employeeId);
    if (!emp) return false;
    if (reportBranchId && emp.branchId !== reportBranchId) return false;
    if (reportJobTitle && emp.jobTitle !== reportJobTitle) return false;
    return true;
  });

  const reportLeaves = leaves.filter(l => {
    if (!l.startDate) return false;
    if (l.startDate < reportFromDate || l.startDate > reportToDate) return false;
    
    const emp = employees.find(e => e.id === l.employeeId);
    if (!emp) return false;
    if (reportBranchId && emp.branchId !== reportBranchId) return false;
    if (reportJobTitle && emp.jobTitle !== reportJobTitle) return false;
    return true;
  });

  const reportAdvances = advances.filter(a => {
    if (!a.advanceDate) return false;
    if (a.advanceDate < reportFromDate || a.advanceDate > reportToDate) return false;
    
    const emp = employees.find(e => e.id === a.employeeId);
    if (!emp) return false;
    if (reportBranchId && emp.branchId !== reportBranchId) return false;
    if (reportJobTitle && emp.jobTitle !== reportJobTitle) return false;
    return true;
  });


  // ----------------------------------------
  // Date Filtering Calculations
  // ----------------------------------------
  const years = Array.from({ length: 7 }, (_, i) => String(currentYear - 3 + i));
  const months = [
    { value: '01', label: 'يناير (01)' },
    { value: '02', label: 'فبراير (02)' },
    { value: '03', label: 'مارس (03)' },
    { value: '04', label: 'أبريل (04)' },
    { value: '05', label: 'مايو (05)' },
    { value: '06', label: 'يونيو (06)' },
    { value: '07', label: 'يوليو (07)' },
    { value: '08', label: 'أغسطس (08)' },
    { value: '09', label: 'سبتمبر (09)' },
    { value: '10', label: 'أكتوبر (10)' },
    { value: '11', label: 'نوفمبر (11)' },
    { value: '12', label: 'ديسمبر (12)' }
  ];

  const filteredDeductions = deductions.filter(d => {
    if (!d.deductionDate) return true;
    const [year, month] = d.deductionDate.split('-');
    if (filterYear && year !== filterYear) return false;
    if (filterMonth && month !== filterMonth) return false;
    return true;
  });

  const filteredLeaves = leaves.filter(l => {
    if (!l.startDate) return true;
    const [year, month] = l.startDate.split('-');
    if (filterYear && year !== filterYear) return false;
    if (filterMonth && month !== filterMonth) return false;
    return true;
  });

  const filteredAdvances = advances.filter(a => {
    if (!a.advanceDate) return true;
    const [year, month] = a.advanceDate.split('-');
    if (filterYear && year !== filterYear) return false;
    if (filterMonth && month !== filterMonth) return false;
    return true;
  });

  const filteredRequests = employeeRequests.filter(r => {
    if (!r.created_at) return true;
    const dateObj = new Date(r.created_at);
    const year = String(dateObj.getFullYear());
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    if (filterYear && year !== filterYear) return false;
    if (filterMonth && month !== filterMonth) return false;
    return true;
  });

  // Reusable Date Filter Dropdown Bar Component
  const DateFilterBar = () => (
    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap gap-4 items-center text-xs font-sans mb-5">
      <div className="flex flex-col gap-1.5 min-w-[120px]">
        <label className="font-bold text-slate-700 dark:text-slate-300">سنة السجل</label>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">كل السنوات</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[120px]">
        <label className="font-bold text-slate-700 dark:text-slate-300">شهر السجل</label>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">كل الشهور</option>
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {(filterYear || filterMonth) && (
        <button
          onClick={() => {
            setFilterYear('');
            setFilterMonth('');
          }}
          className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold font-sans transition-colors mt-4 md:mt-5"
        >
          تفريغ فلتر التاريخ
        </button>
      )}
    </div>
  );

  // Excel Export Logic (Option 2: Native SheetJS workbook with RTL and auto-fitted columns)
  const exportToExcel = (headers: string[], rows: any[][], fileName: string) => {
    // Construct sheet data with metadata block at the top
    const fullData: any[][] = [
      [fileName],
      [`من تاريخ: ${reportFromDate} | إلى تاريخ: ${reportToDate}`]
    ];
    if (reportBranchId) {
      const bName = branches.find(b => b.id === reportBranchId)?.name || '';
      fullData.push([`الفرع: ${bName}`]);
    }
    if (reportJobTitle) {
      fullData.push([`الوظيفة: ${reportJobTitle}`]);
    }
    fullData.push([]); // blank spacer row
    fullData.push(headers);
    rows.forEach(r => fullData.push(r));

    // Convert array of arrays to sheet
    const ws = XLSX.utils.aoa_to_sheet(fullData);

    // Enable RTL Sheet layout for Arabic Excel
    ws['!sheetPr'] = {
      rightToLeft: true
    };

    // Calculate auto-fitted column widths based on headers and rows only
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach(r => {
        const cellVal = r[colIdx];
        if (cellVal !== undefined && cellVal !== null) {
          const valStr = String(cellVal);
          if (valStr.length > maxLen) {
            maxLen = valStr.length;
          }
        }
      });
      return { wch: Math.max(maxLen + 4, 12) };
    });
    ws['!cols'] = colWidths;

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
    
    // Save workbook natively as binary xlsx
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportExcel = () => {
    if (reportType === 'payroll') {
      const headers = [
        'اسم الموظف',
        'المسمى الوظيفي',
        'الفرع',
        'المرتب الأساسي المستحق',
        'إجمالي الخصومات',
        'السلف المستقطعة',
        'صافي المرتب المستحق'
      ];
      
      const tableData = reportEmployees.map(emp => {
        const empDeductions = reportDeductions.filter(d => d.employeeId === emp.id);
        const empLeaves = reportLeaves.filter(l => l.employeeId === emp.id);
        const empAdvances = reportAdvances.filter(a => a.employeeId === emp.id);

        const basicSalary = Number(emp.salary) || 0;
        const excusedDays = empLeaves.filter(l => l.leaveType === 'excused_absence').reduce((sum, l) => sum + Number(l.days), 0);
        const unexcusedDays = empLeaves.filter(l => l.leaveType === 'unexcused_absence').reduce((sum, l) => sum + Number(l.days), 0);
        const excusedFactor = settingsExcusedDeduction || 1.0;
        const unexcusedFactor = settingsUnexcusedDeduction || 2.0;

        const totalAbsenceDeductionDays = (excusedDays * excusedFactor) + (unexcusedDays * unexcusedFactor);
        const dailyWage = basicSalary / 30;
        const absenceDeductionAmount = totalAbsenceDeductionDays * dailyWage;

        const customAmountDeductions = empDeductions.filter(d => d.deductionType === 'amount').reduce((sum, d) => sum + Number(d.value), 0);
        const customDaysDeductionsValue = empDeductions.filter(d => d.deductionType === 'days').reduce((sum, d) => sum + Number(d.value), 0);
        const customDaysDeductionAmount = customDaysDeductionsValue * dailyWage;

        const totalDeductionsValue = absenceDeductionAmount + customAmountDeductions + customDaysDeductionAmount;
        const totalAdvancesValue = empAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

        const rStart = new Date(reportFromDate);
        const rEnd = new Date(reportToDate);
        const totalPeriodDays = Math.max(1, Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const hireDateVal = emp.hireDate ? new Date(emp.hireDate) : null;
        const eosDateVal = emp.endOfServiceDate ? new Date(emp.endOfServiceDate) : null;

        let empStart = rStart;
        if (hireDateVal && hireDateVal > rStart && hireDateVal <= rEnd) {
          empStart = hireDateVal;
        }

        let empEnd = rEnd;
        if (eosDateVal && eosDateVal >= rStart && eosDateVal < rEnd) {
          empEnd = eosDateVal;
        }

        let activeDays = 30;
        if (empStart <= empEnd) {
          activeDays = Math.max(1, Math.ceil((empEnd.getTime() - empStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else {
          activeDays = 0;
        }

        const isProrated = totalPeriodDays < 28 || activeDays < totalPeriodDays;
        let proratedSalary = basicSalary;
        if (isProrated) {
          proratedSalary = (basicSalary / 30) * activeDays;
          if (proratedSalary > basicSalary) {
            proratedSalary = basicSalary;
          }
        }
        const netSalary = Math.max(0, proratedSalary - totalDeductionsValue - totalAdvancesValue);

        return [
          emp.name,
          emp.jobTitle,
          emp.branchName || '',
          proratedSalary,
          totalDeductionsValue,
          totalAdvancesValue,
          netSalary
        ];
      });

      const totalBasic = tableData.reduce((sum, item) => sum + Number(item[3]), 0);
      const totalDeductions = tableData.reduce((sum, item) => sum + Number(item[4]), 0);
      const totalAdvances = tableData.reduce((sum, item) => sum + Number(item[5]), 0);
      const totalNet = tableData.reduce((sum, item) => sum + Number(item[6]), 0);

      const rows = [...tableData];
      rows.push([
        'إجمالي كشف مسير الرواتب المالي',
        '-',
        '-',
        totalBasic,
        totalDeductions,
        totalAdvances,
        totalNet
      ]);

      exportToExcel(headers, rows, 'مسير الرواتب والأجور الموحد');
    } else if (reportType === 'deductions') {
      const headers = ['الموظف', 'نوع الخصم', 'قيمة الخصم', 'السبب', 'تاريخ التسجيل'];
      const rows = reportDeductions.map(dec => [
        dec.employeeName,
        dec.deductionType === 'days' ? 'خصم أيام عمل' : 'مبلغ مالي',
        dec.deductionType === 'days' ? `${dec.value} يوم` : Number(dec.value),
        dec.reason,
        dec.deductionDate
      ]);
      const totalValue = reportDeductions.filter(d => d.deductionType === 'amount').reduce((sum, d) => sum + Number(d.value), 0);
      const totalDays = reportDeductions.filter(d => d.deductionType === 'days').reduce((sum, d) => sum + Number(d.value), 0);
      
      rows.push([
        'إجمالي سجل الخصومات والجزاءات',
        '-',
        `مبلغ مالي: ${totalValue} ج.م | أيام: ${totalDays} يوم`,
        '-',
        '-'
      ]);
      exportToExcel(headers, rows, 'سجل الخصومات والجزاءات');
    } else if (reportType === 'leaves') {
      const headers = ['الموظف', 'النوع', 'عدد الأيام', 'السبب', 'من تاريخ', 'إلى تاريخ'];
      const rows = reportLeaves.map(l => [
        l.employeeName,
        l.leaveType === 'paid_leave' ? 'إجازة مدفوعة' : l.leaveType === 'excused_absence' ? 'غياب بإذن' : 'غياب بدون إذن',
        Number(l.days),
        l.reason,
        l.startDate,
        l.endDate
      ]);
      const totalPaid = reportLeaves.filter(l => l.leaveType === 'paid_leave').reduce((sum, l) => sum + Number(l.days), 0);
      const totalExcused = reportLeaves.filter(l => l.leaveType === 'excused_absence').reduce((sum, l) => sum + Number(l.days), 0);
      const totalUnexcused = reportLeaves.filter(l => l.leaveType === 'unexcused_absence').reduce((sum, l) => sum + Number(l.days), 0);
      
      rows.push([
        'إجمالي حركات الغياب والحضور',
        '-',
        `إجازات مدفوعة: ${totalPaid} يوم | غياب بإذن: ${totalExcused} يوم | غياب بدون إذن: ${totalUnexcused} يوم`,
        '-',
        '-',
        '-'
      ]);
      exportToExcel(headers, rows, 'تقرير الإجازات والغياب ومعدلات الحضور');
    } else if (reportType === 'advances') {
      const headers = ['الموظف', 'قيمة السلفة', 'السبب', 'تاريخ التسجيل'];
      const rows = reportAdvances.map(a => [
        a.employeeName,
        Number(a.amount),
        a.reason,
        a.advanceDate
      ]);
      const totalAmount = reportAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
      rows.push([
        'إجمالي السلف الممنوحة للفترة',
        totalAmount,
        '-',
        '-'
      ]);
      exportToExcel(headers, rows, 'سجل السلف المستحقة');
    } else if (reportType === 'turnover') {
      const headers = ['نوع الحركة', 'الموظف', 'الفرع', 'المسمى الوظيفي', 'تاريخ التعيين', 'تاريخ إنهاء الخدمة', 'الراتب الأساسي'];
      const newHires = reportEmployees.filter(emp => emp.hireDate >= reportFromDate && emp.hireDate <= reportToDate);
      const terminations = reportEmployees.filter(emp => emp.endOfServiceDate && emp.endOfServiceDate >= reportFromDate && emp.endOfServiceDate <= reportToDate);
      
      const rows: any[][] = [];
      newHires.forEach(emp => {
        rows.push([
          'تعيين جديد',
          emp.name,
          emp.branchName || '',
          emp.jobTitle,
          emp.hireDate,
          '-',
          Number(emp.salary) || 0
        ]);
      });
      terminations.forEach(emp => {
        rows.push([
          'إنهاء خدمة',
          emp.name,
          emp.branchName || '',
          emp.jobTitle,
          emp.hireDate,
          emp.endOfServiceDate || '-',
          Number(emp.salary) || 0
        ]);
      });
      exportToExcel(headers, rows, 'حركة التعيينات وإنهاء الخدمة');
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex flex-col items-start text-right">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {tenantName}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
            لوحة تحكم المالك
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-300"
      dir="rtl"
    >
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-64 transform ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out lg:hidden h-full`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Persistent Sidebar (Static on Right) */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-l border-slate-200 dark:border-slate-800">
        <SidebarContent />
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors duration-300 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 hidden sm:block">
              {activeTab === "dashboard" && "الرئيسية"}
              {activeTab === "branches" && "إدارة الفروع"}
              {activeTab === "employees" && "إدارة الموظفين"}
              {activeTab === "employee_lookup" && "البحث الشامل للموظف"}
              {activeTab === "deductions" && "الخصومات"}
              {activeTab === "leaves" && "الإجازات والغياب"}
              {activeTab === "advances" && "السلف"}
              {activeTab === "requests" && "طلبات الموظفين"}
              {activeTab === "reports" && "التقارير الإدارية والمالية"}
              {activeTab === "settings" && "إعدادات المنشأة"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/10"
              title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Profile Info */}
            <div className="text-right text-xs text-slate-500 dark:text-slate-400 hidden sm:block border-r border-slate-200 dark:border-slate-800 pr-4">
              <div className="font-semibold text-slate-800 dark:text-slate-100">
                {user?.name || "مالك المنشأة"}
              </div>
              <div>{user?.email}</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 space-y-6">
          {isLoadingData ? (
            <div className="flex items-center justify-center p-20 text-slate-500 dark:text-slate-400 text-xs">
              <svg
                className="animate-spin h-5 w-5 text-slate-700 dark:text-slate-300 ml-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              جاري تحميل البيانات...
            </div>
          ) : activeTab === "dashboard" ? (
            <>
              {/* Welcome Banner */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 md:p-8 shadow-sm transition-colors duration-300">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  مرحباً بك في لوحة تحكم {tenantName}!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                  هذا هو نظام إدارة الموارد البشرية والموظفين الخاص بشركتك. من
                  هنا يمكنك البدء في إضافة موظفيك ومتابعتهم.
                </p>
                <div
                  className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-xs text-slate-500 dark:text-slate-400 font-mono text-right"
                  dir="ltr"
                >
                  Tenant ID: {tenantId || user?.tenantId}
                  <br />
                  Account Email: {user?.email}
                  <br />
                  Role: {user?.role}
                </div>
              </section>

              {/* Statistics Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm transition-colors duration-300">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    إجمالي الفروع
                  </h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {branches.length}
                  </p>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                    توزيع منافذ و فروع شركتك
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm transition-colors duration-300">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    إجمالي الموظفين
                  </h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {employees.length}
                  </p>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                    مسجلين بالكامل في النظام
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm transition-colors duration-300">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    إجمالي الخصومات المسجلة
                  </h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {deductions.length}
                  </p>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                    عمليات خصم هذا الشهر
                  </span>
                </div>
              </section>

              {/* Urgent Alerts Section */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* 1. Expiring Documents Alert Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>مستندات قاربت على الانتهاء (خلال 30 يوم)</span>
                      </h3>
                      <button
                        onClick={() => {
                          setFilterExpiringDocs(true);
                          setActiveTab("employees");
                        }}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-semibold flex items-center gap-0.5"
                      >
                        عرض الكل
                      </button>
                    </div>

                    <div className="space-y-3 mt-4 max-h-[250px] overflow-y-auto pr-1">
                      {expiringDocs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">
                          🎉 لا توجد مستندات منتهية أو قاربت على الانتهاء.
                        </div>
                      ) : (
                        expiringDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border text-[11px] font-sans flex items-start gap-2.5 ${
                              doc.remainingDays <= 0
                                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-300"
                                : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1 leading-normal">
                              <div>
                                الموظف{" "}
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {doc.employeeName}
                                </span>{" "}
                                لديه مستند{" "}
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  "{doc.documentName}"
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                                {doc.remainingDays <= 0 ? (
                                  <span>
                                    منتهي الصلاحية منذ{" "}
                                    {Math.abs(doc.remainingDays)} يوم (
                                    {doc.expiryDate})
                                  </span>
                                ) : (
                                  <span>
                                    ينتهي خلال {doc.remainingDays} يوم (
                                    {doc.expiryDate})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Pending Requests Alert Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                        <span>
                          طلبات معلقة تحتاج إلى مراجعة ({pendingRequests.length}
                          )
                        </span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("requests")}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-semibold flex items-center gap-0.5"
                      >
                        عرض الكل
                      </button>
                    </div>

                    <div className="space-y-3 mt-4 max-h-[250px] overflow-y-auto pr-1">
                      {pendingRequests.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">
                          لا توجد أي طلبات معلقة حالياً.
                        </div>
                      ) : (
                        pendingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-sans flex items-start gap-2.5 text-slate-700 dark:text-slate-300"
                          >
                            <ClipboardList className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div className="flex-1 leading-normal">
                              <div>
                                الموظف{" "}
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {req.employees?.name || "مجهول"}
                                </span>{" "}
                                لديه طلب معلق:{" "}
                                <span className="font-bold">
                                  {req.request_type === "advance"
                                    ? "سلفة مالية"
                                    : "إجازة"}
                                </span>
                              </div>
                              <p
                                className="text-slate-500 dark:text-slate-400 mt-1 italic text-[10px] truncate max-w-[300px]"
                                title={req.reason}
                              >
                                السبب: "{req.reason}"
                              </p>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold flex items-center gap-2">
                                <span>
                                  {req.request_type === "advance" ? (
                                    <span>
                                      المبلغ:{" "}
                                      {Number(req.amount).toLocaleString()} ج.م
                                    </span>
                                  ) : (
                                    <span>
                                      المدة: {req.days} أيام (
                                      {req.leave_type === "paid_leave"
                                        ? "مدفوعة"
                                        : req.leave_type === "excused_absence"
                                          ? "بإذن"
                                          : "بدون إذن"}
                                      ) ابتداءً من {req.start_date}
                                    </span>
                                  )}
                                </span>
                                <span>•</span>
                                <span className="font-mono">
                                  {new Date(req.created_at).toLocaleDateString(
                                    "ar-EG",
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : activeTab === "branches" ? (
            <div className="space-y-6">
              {/* Header actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    فروع المنشأة
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">
                    عرض وإدارة فروع شركتك وأماكن تواجدها
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingBranchId(null);
                    setBranchNameInput("");
                    setBranchAddressInput("");
                    setShowAddBranch(!showAddBranch);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة فرع جديد</span>
                </button>
              </div>

              {/* Add/Edit Branch Form Card */}
              {showAddBranch && (
                <form
                  onSubmit={handleCreateBranch}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4 max-w-md transition-all"
                >
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {editingBranchId
                      ? "تعديل بيانات الفرع"
                      : "بيانات الفرع الجديد"}
                  </h3>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                      اسم الفرع *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                      placeholder="مثال: فرع التجمع الخامس"
                      value={branchNameInput}
                      onChange={(e) => setBranchNameInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                      عنوان الفرع
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                      placeholder="مثال: شارع التسعين، بجانب بنك مصر"
                      value={branchAddressInput}
                      onChange={(e) => setBranchAddressInput(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingBranch}
                      className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50"
                    >
                      {isSavingBranch
                        ? "جاري الحفظ..."
                        : editingBranchId
                          ? "حفظ التعديلات"
                          : "حفظ الفرع"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBranch(false);
                        setEditingBranchId(null);
                        setBranchNameInput("");
                        setBranchAddressInput("");
                      }}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-md text-xs font-semibold"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}

              {/* Branches Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                {branches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    لا يوجد فروع مضافة حالياً. يرجى إضافة فرعك الأول لبدء ربط
                    الموظفين به.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-4">اسم الفرع</th>
                        <th className="px-6 py-4">العنوان</th>
                        <th className="px-6 py-4 text-left">التحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {branches.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                            {b.name}
                          </td>
                          <td className="px-6 py-4">
                            {b.address || "غير محدد"}
                          </td>
                          <td className="px-6 py-4 text-left flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditBranch(b)}
                              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="تعديل الفرع"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => b.id && handleDeleteBranch(b.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                              title="حذف الفرع"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeTab === "employees" ? (
            <div className="space-y-6">
              {/* Header actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    موظفي الشركة
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans">
                    عرض وإدارة الهيكل الوظيفي والمستندات الخاصة بكل موظف
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingEmployeeId(null);
                    setEmpName("");
                    setEmpPhone("");
                    setEmpAddress("");
                    setEmpBranchId("");
                    setEmpNationalId("");
                    setEmpJobTitle("");
                    setEmpHireDate("");
                    setEmpSalary("");
                    setEmpDocs([]);
                    setEmployeeStep(1);
                    setShowAddEmployee(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة موظف جديد</span>
                </button>
              </div>

              {/* Multi-step Employee Form Modal */}
              {showAddEmployee && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                          {editingEmployeeId
                            ? "تعديل بيانات الموظف"
                            : "إضافة موظف جديد"}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          أدخل بيانات الموظف والمستندات في الخطوات الثلاث
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddEmployee(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${employeeStep >= 1 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}
                        >
                          1
                        </span>
                        <span
                          className={
                            employeeStep >= 1
                              ? "text-slate-800 dark:text-slate-200 font-sans"
                              : "text-slate-400 font-sans"
                          }
                        >
                          البيانات الشخصية
                        </span>
                      </div>
                      <span className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800" />
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${employeeStep >= 2 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}
                        >
                          2
                        </span>
                        <span
                          className={
                            employeeStep >= 2
                              ? "text-slate-800 dark:text-slate-200 font-sans"
                              : "text-slate-400 font-sans"
                          }
                        >
                          بيانات الوظيفة
                        </span>
                      </div>
                      <span className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800" />
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${employeeStep >= 3 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}
                        >
                          3
                        </span>
                        <span
                          className={
                            employeeStep >= 3
                              ? "text-slate-800 dark:text-slate-200 font-sans"
                              : "text-slate-400 font-sans"
                          }
                        >
                          المستندات
                        </span>
                      </div>
                    </div>

                    {/* Step Body (Scrollable if needed) */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                      {employeeStep === 1 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                اسم الموظف *
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Users className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="text"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                                  placeholder="الاسم الرباعي الكامل للموظف"
                                  value={empName}
                                  onChange={(e) => setEmpName(e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                رقم الموبايل
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Phone className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="tel"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  placeholder="مثال: 01000000000"
                                  value={empPhone}
                                  onChange={(e) => setEmpPhone(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                الرقم القومي
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="text"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  placeholder="مكون من 14 رقم"
                                  value={empNationalId}
                                  onChange={(e) =>
                                    setEmpNationalId(e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                الفرع التابع له *
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Building className="h-3.5 w-3.5" />
                                </span>
                                <select
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  value={empBranchId}
                                  onChange={(e) =>
                                    setEmpBranchId(e.target.value)
                                  }
                                  required
                                >
                                  <option value="">-- اختر الفرع --</option>
                                  {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {branches.length === 0 && (
                                <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-sans">
                                  <AlertCircle className="h-3 w-3" />
                                  الرجاء إضافة فرع واحد على الأقل أولاً من صفحة
                                  الفروع!
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                              العنوان الحالي
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                <MapPin className="h-3.5 w-3.5" />
                              </span>
                              <input
                                type="text"
                                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="العنوان بالتفصيل"
                                value={empAddress}
                                onChange={(e) => setEmpAddress(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                اسم المستخدم (للموظف) - اختياري
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                                placeholder="مثال: salem10"
                                value={empUsername}
                                onChange={(e) => setEmpUsername(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                كلمة المرور (للموظف) - اختياري
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                                placeholder="مثال: pass123"
                                value={empPassword}
                                onChange={(e) => setEmpPassword(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {employeeStep === 2 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                المسمى الوظيفي *
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Briefcase className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="text"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  placeholder="مثال: كاشير، مدير، محاسب"
                                  value={empJobTitle}
                                  onChange={(e) =>
                                    setEmpJobTitle(e.target.value)
                                  }
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                الراتب الشهري *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                placeholder="مثال: 5000"
                                value={empSalary}
                                onChange={(e) => setEmpSalary(e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                تاريخ التعيين *
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="date"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  value={empHireDate}
                                  onChange={(e) =>
                                    setEmpHireDate(e.target.value)
                                  }
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                                تاريخ نهاية الخدمة (اختياري)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  <Calendar className="h-3.5 w-3.5" />
                                </span>
                                <input
                                  type="date"
                                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                  value={empEndOfServiceDate}
                                  onChange={(e) =>
                                    setEmpEndOfServiceDate(e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {employeeStep === 3 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">
                              المستندات المطلوبة للموظف
                            </h4>
                            <button
                              type="button"
                              onClick={addDocRow}
                              className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 hover:underline font-bold font-sans"
                            >
                              <PlusCircle className="h-4 w-4 shrink-0" />
                              <span>إضافة مستند جديد</span>
                            </button>
                          </div>

                          {empDocs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-md font-sans">
                              لا يوجد مستندات مضافة حالياً. يمكنك الاستمرار بدون
                              مستندات أو إضافة مستندات الموظف (مثل صحيفة الحالة
                              الجنائية، الشهادة الصحية، البطاقة الشخصية).
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {empDocs.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col md:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-100 dark:border-slate-900 relative"
                                >
                                  <div className="w-full md:flex-1 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 font-sans">
                                      اسم المستند *
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                      placeholder="مثال: الشهادة الصحية"
                                      value={doc.name}
                                      onChange={(e) =>
                                        updateDocRow(
                                          idx,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      required
                                    />
                                  </div>

                                  <div className="w-full md:flex-1 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 font-sans">
                                      تاريخ انتهاء المستند *
                                    </label>
                                    <input
                                      type="date"
                                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                                      value={doc.expiryDate}
                                      onChange={(e) =>
                                        updateDocRow(
                                          idx,
                                          "expiryDate",
                                          e.target.value,
                                        )
                                      }
                                      required
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeDocRow(idx)}
                                    className="text-red-500 hover:text-red-700 self-end md:self-center md:mt-4 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20"
                                    title="حذف المستند"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                      <div>
                        {employeeStep > 1 && (
                          <button
                            type="button"
                            onClick={() => setEmployeeStep((prev) => prev - 1)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-md text-xs font-semibold"
                          >
                            السابق
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAddEmployee(false)}
                          className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-xs font-semibold"
                        >
                          إلغاء
                        </button>

                        {employeeStep < 3 ? (
                          <button
                            type="button"
                            onClick={() => {
                              // Custom validation
                              if (employeeStep === 1) {
                                if (!empName.trim() || !empBranchId) {
                                  alert(
                                    "الرجاء تعبئة الحقول المطلوبة (اسم الموظف والفرع)",
                                  );
                                  return;
                                }
                              }
                              if (employeeStep === 2) {
                                if (
                                  !empJobTitle.trim() ||
                                  !empHireDate ||
                                  !empSalary
                                ) {
                                  alert(
                                    "الرجاء تعبئة الحقول المطلوبة (المسمى الوظيفي، تاريخ التعيين، والراتب)",
                                  );
                                  return;
                                }
                              }
                              setEmployeeStep((prev) => prev + 1);
                            }}
                            className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold"
                          >
                            التالي
                          </button>
                        ) : (
                          <button
                            onClick={handleCreateEmployee}
                            disabled={isSavingEmployee}
                            className="px-6 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50"
                          >
                            {isSavingEmployee
                              ? "جاري الحفظ..."
                              : editingEmployeeId
                                ? "حفظ التعديلات"
                                : "حفظ الموظف بالكامل"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Panel */}
              {employees.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between text-xs font-sans">
                  <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    {/* Filter by Branch */}
                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        الفرع
                      </label>
                      <select
                        value={filterBranchId}
                        onChange={(e) => setFilterBranchId(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="">كل الفروع</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Job Title */}
                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        الوظيفة
                      </label>
                      <select
                        value={filterJobTitle}
                        onChange={(e) => setFilterJobTitle(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="">كل الوظائف</option>
                        {uniqueJobTitles.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Expiring Documents */}
                    <div className="flex items-center gap-2 mt-4 md:mt-5">
                      <input
                        type="checkbox"
                        id="filter_expiring_docs"
                        checked={filterExpiringDocs}
                        onChange={(e) =>
                          setFilterExpiringDocs(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <label
                        htmlFor="filter_expiring_docs"
                        className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <span>مستندات تنتهي صلاحيتها خلال 30 يوم</span>
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                      </label>
                    </div>
                  </div>

                  {/* Reset Button */}
                  {(filterBranchId || filterJobTitle || filterExpiringDocs) && (
                    <button
                      onClick={() => {
                        setFilterBranchId("");
                        setFilterJobTitle("");
                        setFilterExpiringDocs(false);
                      }}
                      className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold font-sans transition-colors self-end md:self-center"
                    >
                      إعادة تعيين الفلاتر
                    </button>
                  )}
                </div>
              )}

              {/* Employees Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-sans">
                    لا يوجد موظفين مسجلين حالياً بالمنشأة.
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-sans">
                    لا يوجد موظفين يطابقون خيارات التصفية المحددة.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-right text-xs min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                          <th className="px-6 py-4">اسم الموظف</th>
                          <th className="px-6 py-4">الجوال</th>
                          <th className="px-6 py-4">الفرع</th>
                          <th className="px-6 py-4">الوظيفة</th>
                          <th className="px-6 py-4">الراتب</th>
                          <th className="px-6 py-4">المستندات</th>
                          <th className="px-6 py-4 text-left">التحكم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredEmployees.map((emp) => (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {emp.name}
                                </div>
                                {emp.endOfServiceDate &&
                                  emp.endOfServiceDate <=
                                    new Date().toISOString().split("T")[0] && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-[8px] font-bold rounded">
                                      منتهي الخدمة ({emp.endOfServiceDate})
                                    </span>
                                  )}
                              </div>
                              {emp.nationalId && (
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  رقم قومي: {emp.nationalId}
                                </div>
                              )}
                              {emp.username && (
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                  الحساب:{" "}
                                  <span className="font-semibold">
                                    {emp.username}
                                  </span>{" "}
                                  | ك.المرور:{" "}
                                  <span className="font-semibold">
                                    {emp.password}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">{emp.phone || "-"}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-medium font-sans">
                                {emp.branchName}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {emp.jobTitle}
                            </td>
                            <td className="px-6 py-4 font-mono font-semibold">
                              {Number(emp.salary).toLocaleString()} ج.م
                            </td>
                            <td className="px-6 py-4">
                              {emp.documents && emp.documents.length > 0 ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 font-sans">
                                    {emp.documents.length} مستند(ات)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {emp.documents.map((doc) => (
                                      <span
                                        key={doc.id}
                                        className="text-[8px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 font-sans"
                                      >
                                        {doc.name} (ينتهي: {doc.expiryDate})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-sans">
                                  لا يوجد مستندات
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-left flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditEmployee(emp)}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="تعديل بيانات الموظف"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  emp.id && handleDeleteEmployee(emp.id)
                                }
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                                title="حذف الموظف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "employee_lookup" ? (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                  البحث الشامل والملف الكامل للموظف
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  اختر موظفاً لعرض ملفه الشخصي والمستندات والرواتب والخصومات والإجازات والسلف والطلبات في مكان واحد
                </p>
              </div>

              {/* Employee Selector & Date Filter */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex flex-col gap-1.5 flex-1 max-w-md">
                    <label className="font-bold text-xs text-slate-700 dark:text-slate-300">اختر الموظف للمعاينة</label>
                    <select
                      value={selectedLookupEmployeeId}
                      onChange={(e) => setSelectedLookupEmployeeId(e.target.value)}
                      className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 font-sans"
                    >
                      <option value="">-- اختر موظفاً من القائمة --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle})</option>
                      ))}
                    </select>
                  </div>

                  {selectedLookupEmployeeId && (
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <label className="font-bold text-xs text-slate-700 dark:text-slate-300 font-sans">السنة المالية</label>
                          <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 font-sans"
                          >
                            <option value="">كل السنوات</option>
                            {years.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <label className="font-bold text-xs text-slate-700 dark:text-slate-300 font-sans">الشهر المالي</label>
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 font-sans"
                          >
                            <option value="">كل الشهور</option>
                            {months.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Employee Info Dashboard */}
              {!selectedLookupEmployeeId ? (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-lg text-center text-xs text-slate-400 font-sans">
                  يرجى اختيار موظف من القائمة المنسدلة أعلاه لبدء استعراض ملفه الكامل.
                </div>
              ) : (() => {
                const emp = employees.find(e => e.id === selectedLookupEmployeeId);
                if (!emp) return <div className="text-red-500 font-sans">الموظف غير موجود.</div>;

                // 1. Filtered data for this employee
                const empDeductions = filteredDeductions.filter(d => d.employeeId === emp.id);
                const empLeaves = filteredLeaves.filter(l => l.employeeId === emp.id);
                const empAdvances = filteredAdvances.filter(a => a.employeeId === emp.id);
                const empRequests = filteredRequests.filter(r => r.employee_id === emp.id);

                // Math parameters for proration/calculations
                const basicSalary = Number(emp.salary) || 0;
                
                // Absences calculation for net salary proration
                const monthlyExcusedAbsences = empLeaves.filter(l => l.leaveType === 'excused_absence').reduce((sum, l) => sum + Number(l.days), 0);
                const monthlyUnexcusedAbsences = empLeaves.filter(l => l.leaveType === 'unexcused_absence').reduce((sum, l) => sum + Number(l.days), 0);
                
                const excusedAbsenceFactor = settingsExcusedDeduction || 1.0;
                const unexcusedAbsenceFactor = settingsUnexcusedDeduction || 2.0;

                const excusedAbsenceDeductionDays = monthlyExcusedAbsences * excusedAbsenceFactor;
                const unexcusedAbsenceDeductionDays = monthlyUnexcusedAbsences * unexcusedAbsenceFactor;
                const totalDeductionDays = excusedAbsenceDeductionDays + unexcusedAbsenceDeductionDays;

                const daysInMonth = 30; // standard calendar month
                const dailyWage = basicSalary / daysInMonth;
                
                // Base deduction calculations
                const absenceDeductionAmount = totalDeductionDays * dailyWage;
                
                // Monetary deductions
                const customMonetaryDeduction = empDeductions
                  .filter(d => d.deductionType === 'amount')
                  .reduce((sum, d) => sum + Number(d.value), 0);
                
                // Deductions in days
                const customDaysDeductionValue = empDeductions
                  .filter(d => d.deductionType === 'days')
                  .reduce((sum, d) => sum + Number(d.value), 0);
                const customDaysDeductionAmount = customDaysDeductionValue * dailyWage;

                const finalTotalDeductions = absenceDeductionAmount + customMonetaryDeduction + customDaysDeductionAmount;
                const finalTotalAdvances = empAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
                
                // Prorated salary for end of service if applicable
                let isProrated = false;
                let activeDays = 30;
                if (emp.endOfServiceDate && filterYear && filterMonth) {
                  const [eosY, eosM, eosD] = emp.endOfServiceDate.split('-');
                  if (eosY === filterYear && eosM === filterMonth) {
                    isProrated = true;
                    activeDays = Math.max(1, Math.min(30, Number(eosD)));
                  }
                }
                const proratedBasicEarnings = isProrated ? (basicSalary / 30) * activeDays : basicSalary;
                const netSalary = Math.max(0, proratedBasicEarnings - finalTotalDeductions - finalTotalAdvances);

                return (
                  <div className="space-y-6">
                    {/* Core Profile Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{emp.name}</h3>
                          {emp.endOfServiceDate && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-[10px] font-bold rounded">
                              منتهي الخدمة في: {emp.endOfServiceDate}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>الفرع: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{emp.branchName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>المسمى الوظيفي: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{emp.jobTitle}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>الهاتف: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{emp.phone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>العنوان: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{emp.address || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>الرقم القومي: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{emp.nationalId || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>تاريخ التعيين: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{emp.hireDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Accounts & Auth Info */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-[11px] text-slate-600 dark:text-slate-400 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-700 dark:text-slate-300 font-sans border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2">حساب الموظف بالبوابة</h4>
                          <div>اسم المستخدم: <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{emp.username || 'لم ينشأ'}</span></div>
                          <div>كلمة المرور: <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{emp.password || 'لم تنشأ'}</span></div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                          يستخدم الموظف هذه البيانات لتسجيل الدخول إلى بوابته الخاصة للاطلاع على رواتبه وتقديم الطلبات.
                        </div>
                      </div>
                    </div>

                    {/* Financial Calculations Card for Month/Year */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4 font-sans">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1">
                        <Coins className="h-4 w-4 text-slate-400" />
                        <span>التفاصيل المالية لشهر: {filterMonth && filterYear ? `${filterMonth} / ${filterYear}` : 'الكل (غير مفلتر بالشهور)'}</span>
                      </h4>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block font-semibold">الراتب الأساسي</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block font-mono">
                            {proratedBasicEarnings.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block font-semibold">الخصومات المستحقة</span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 mt-1 block font-mono">
                            {finalTotalDeductions.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block font-semibold">إجمالي السلف المستقطعة</span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 mt-1 block font-mono">
                            {finalTotalAdvances.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block font-semibold">أيام الغياب والخصم</span>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 block font-mono">
                            {totalDeductionDays + customDaysDeductionValue} يوم
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded col-span-2 md:col-span-1">
                          <span className="text-[10px] text-slate-400 block font-semibold">صافي المرتب المستحق</span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
                            {netSalary.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Multi-records Logs (Deductions, Leaves, Advances, Requests, Documents) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                      {/* Deductions Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <Percent className="h-4 w-4 text-slate-400" />
                          <span>الخصومات المسجلة ({empDeductions.length})</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {empDeductions.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">لا توجد خصومات مطابقة في هذا التاريخ.</p>
                          ) : (
                            empDeductions.map((d) => (
                              <div key={d.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                                <div className="flex justify-between font-bold">
                                  <span className="text-red-600 dark:text-red-400">
                                    {d.deductionType === 'days' ? `${d.value} يوم` : `${Number(d.value).toLocaleString()} ج.م`}
                                  </span>
                                  <span className="font-mono text-slate-400">{d.deductionDate}</span>
                                </div>
                                <p className="text-slate-500 font-medium">{d.reason}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Advances Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <Coins className="h-4 w-4 text-slate-400" />
                          <span>السلف المستلمة ({empAdvances.length})</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {empAdvances.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">لا توجد سلف مسجلة في هذا التاريخ.</p>
                          ) : (
                            empAdvances.map((a) => (
                              <div key={a.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                                <div className="flex justify-between font-bold">
                                  <span className="text-red-600 dark:text-red-400">
                                    {Number(a.amount).toLocaleString()} ج.م
                                  </span>
                                  <span className="font-mono text-slate-400">{a.advanceDate}</span>
                                </div>
                                <p className="text-slate-500 font-medium">{a.reason}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Leaves & Absences Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <CalendarRange className="h-4 w-4 text-slate-400" />
                          <span>الإجازات والغياب المسجلة ({empLeaves.length})</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {empLeaves.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">لا توجد إجازات أو غيابات مطابقة في هذا التاريخ.</p>
                          ) : (
                            empLeaves.map((l) => (
                              <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                                <div className="flex justify-between font-bold">
                                  <span className={
                                    l.leaveType === 'paid_leave' 
                                      ? 'text-emerald-600 dark:text-emerald-400' 
                                      : l.leaveType === 'excused_absence' 
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }>
                                    {l.leaveType === 'paid_leave' && 'إجازة مدفوعة'}
                                    {l.leaveType === 'excused_absence' && 'غياب بإذن'}
                                    {l.leaveType === 'unexcused_absence' && 'غياب بدون إذن'}
                                    {' '} ({l.days} يوم)
                                  </span>
                                  <span className="font-mono text-slate-400">{l.startDate} إلى {l.endDate}</span>
                                </div>
                                <p className="text-slate-500 font-medium">{l.reason}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Submissions/Requests Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <ClipboardList className="h-4 w-4 text-slate-400" />
                          <span>الطلبات المرفوعة ({empRequests.length})</span>
                        </h4>
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {empRequests.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">لا توجد طلبات مطابقة في هذا التاريخ.</p>
                          ) : (
                            empRequests.map((r) => (
                              <div key={r.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                                <div className="flex justify-between font-bold">
                                  <span>{r.request_type === 'advance' ? 'طلب سلفة مالية' : 'طلب إجازة'}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    r.status === 'pending'
                                      ? 'bg-amber-100 text-amber-800'
                                      : r.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {r.status === 'pending' && 'قيد الانتظار'}
                                    {r.status === 'approved' && 'تمت الموافقة'}
                                    {r.status === 'rejected' && 'مرفوض'}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-500 font-semibold mt-1">
                                  {r.request_type === 'advance' ? (
                                    <span>المبلغ: {Number(r.amount).toLocaleString()} ج.م</span>
                                  ) : (
                                    <span>نوع الإجازة: {r.leave_type === 'paid_leave' ? 'مدفوعة' : 'غياب'} ({r.days} يوم)</span>
                                  )}
                                </div>
                                <p className="text-slate-500 font-medium mt-1">السبب: {r.reason}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Documents Card (Independent of month/year) */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3 lg:col-span-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span>المستندات الرسمية والملفات الخاصة بالموظف ({emp.documents?.length || 0})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {!emp.documents || emp.documents.length === 0 ? (
                            <p className="text-[10px] text-slate-400 py-4 col-span-full text-center">لا يوجد مستندات رسمية مسجلة لهذا الموظف.</p>
                          ) : (
                            emp.documents.map((doc) => {
                              const expiry = new Date(doc.expiryDate);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              expiry.setHours(0, 0, 0, 0);
                              const diffTime = expiry.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                              return (
                                <div 
                                  key={doc.id} 
                                  className={`p-3 rounded border text-[10px] font-sans flex flex-col justify-between gap-2 ${
                                    diffDays <= 0
                                      ? 'bg-red-50/20 border-red-200 text-red-800 dark:bg-red-950/10 dark:border-red-900/30 dark:text-red-300'
                                      : diffDays <= 30
                                      ? 'bg-amber-50/20 border-amber-200 text-amber-800 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-300'
                                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{doc.name}</div>
                                    <div className="text-slate-400 mt-1">تاريخ الانتهاء: <span className="font-mono">{doc.expiryDate}</span></div>
                                  </div>
                                  <div className="font-semibold mt-1">
                                    {diffDays <= 0 ? (
                                      <span className="text-red-600 dark:text-red-400 font-bold">⚠️ منتهي الصلاحية منذ {Math.abs(diffDays)}  يوم</span>
                                    ) : diffDays <= 30 ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">⏳ ينتهي خلال {diffDays} يوم</span>
                                    ) : (
                                      <span className="text-slate-400">ساري الصلاحية ({diffDays} يوم متبقي)</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : activeTab === "deductions" ? (
            <div className="space-y-8">
              {/* Top Section: Employees List */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    تسجيل الخصومات للموظفين
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                    اختر موظفاً لتسجيل خصم مالي أو خصم أيام عمل عليه
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {employees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد موظفين مسجلين لتسجيل الخصومات عليهم.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">اسم الموظف</th>
                            <th className="px-6 py-4">الفرع</th>
                            <th className="px-6 py-4">المسمى الوظيفي</th>
                            <th className="px-6 py-4">الراتب الأساسي</th>
                            <th className="px-6 py-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {employees.map((emp) => (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {emp.name}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-sans">
                                  {emp.branchName}
                                </span>
                              </td>
                              <td className="px-6 py-4">{emp.jobTitle}</td>
                              <td className="px-6 py-4 font-mono font-semibold">
                                {Number(emp.salary).toLocaleString()} ج.م
                              </td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() => {
                                    setSelectedEmployeeForDeduction(emp);
                                    setDeductionType("days");
                                    setDeductionValue("");
                                    setDeductionReason("");
                                    setDeductionDate(
                                      new Date().toISOString().split("T")[0],
                                    );
                                    setShowAddDeductionModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-[10px] font-bold transition-all"
                                >
                                  تسجيل خصم
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Deductions History */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                    سجل الخصومات التاريخي
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    عرض ومراجعة كافة الحركات والخصومات المالية والعملية المسجلة
                  </p>
                </div>

                <DateFilterBar />

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {deductions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد خصومات مسجلة حالياً في النظام.
                    </div>
                  ) : filteredDeductions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد خصومات تطابق خيارات التصفية المحددة.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4">نوع الخصم</th>
                            <th className="px-6 py-4">قيمة الخصم</th>
                            <th className="px-6 py-4 font-sans">السبب</th>
                            <th className="px-6 py-4">التاريخ</th>
                            <th className="px-6 py-4 text-left font-sans">
                              التحكم
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {filteredDeductions.map((dec) => (
                            <tr
                              key={dec.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {dec.employeeName}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-0.5 text-[9px] rounded font-bold font-sans ${
                                    dec.deductionType === "days"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                                      : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300"
                                  }`}
                                >
                                  {dec.deductionType === "days"
                                    ? "خصم أيام عمل"
                                    : "مبلغ مالي"}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">
                                {dec.deductionType === "days"
                                  ? `${dec.value} يوم`
                                  : `${dec.value.toLocaleString()} ج.م`}
                              </td>
                              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium font-sans">
                                {dec.reason}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {dec.deductionDate}
                              </td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() =>
                                    dec.id && handleDeleteDeduction(dec.id)
                                  }
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                                  title="حذف الخصم"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Deduction Modal Popup */}
              {showAddDeductionModal && selectedEmployeeForDeduction && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <form
                    onSubmit={handleCreateDeduction}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-lg overflow-hidden flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                          تسجيل خصم جديد
                        </h3>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                          تسجيل عقوبة خصم للموظف:{" "}
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedEmployeeForDeduction.name}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddDeductionModal(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                      {/* Deduction Type */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans font-sans">
                          نوع الخصم *
                        </label>
                        <select
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={deductionType}
                          onChange={(e) =>
                            setDeductionType(
                              e.target.value as "amount" | "days",
                            )
                          }
                          required
                        >
                          <option value="days">خصم أيام عمل (أيام)</option>
                          <option value="amount">مبلغ مالي (ج.م)</option>
                        </select>
                      </div>

                      {/* Deduction Value */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          {deductionType === "days"
                            ? "عدد أيام الخصم (يقبل الكسور مثل 0.5)*"
                            : "مبلغ الخصم (ج.م)*"}
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder={
                            deductionType === "days"
                              ? "مثال: 0.5 (نصف يوم) أو 1.25"
                              : "مثال: 350"
                          }
                          value={deductionValue}
                          onChange={(e) => setDeductionValue(e.target.value)}
                          required
                        />
                      </div>

                      {/* Deduction Reason */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          السبب *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder="مثال: غياب بدون عذر، تأخر عن الدوام"
                          value={deductionReason}
                          onChange={(e) => setDeductionReason(e.target.value)}
                          required
                        />
                      </div>

                      {/* Deduction Date */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          تاريخ الخصم *
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={deductionDate}
                          onChange={(e) => setDeductionDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddDeductionModal(false)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingDeduction}
                        className="px-6 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50"
                      >
                        {isSavingDeduction ? "جاري الحفظ..." : "حفظ الخصم"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : activeTab === "reports" ? (
            <div className="space-y-8 animate-fade-in">
              {/* Report Header Filter Controls (Hidden in Print) */}
              <div className="print:hidden space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    التقارير الإدارية والمالية للمنشأة
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                    قم بتوليد وتصدير كشوف مسيرات الرواتب، الخصومات، الغيابات، وحركة السلف المالي خلال أي فترة زمنية محددة
                  </p>
                </div>

                {/* Filter Panel Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end text-xs font-sans">
                    
                    {/* From Date */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">من تاريخ</label>
                      <input
                        type="date"
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">إلى تاريخ</label>
                      <input
                        type="date"
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    {/* Branch Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">تصفية حسب الفرع</label>
                      <select
                        value={reportBranchId}
                        onChange={(e) => setReportBranchId(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none font-sans"
                      >
                        <option value="">كل الفروع</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Job Title Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">تصفية حسب الوظيفة</label>
                      <select
                        value={reportJobTitle}
                        onChange={(e) => setReportJobTitle(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none font-sans"
                      >
                        <option value="">كل الوظائف</option>
                        {uniqueJobTitles.map(title => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 flex-wrap gap-4">
                    {/* Report Type Selector Tabs */}
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-semibold font-sans">
                      <button
                        onClick={() => setReportType('payroll')}
                        className={`px-3 py-1.5 rounded transition-colors ${
                          reportType === 'payroll'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        مسير الرواتب والأجور
                      </button>
                      <button
                        onClick={() => setReportType('deductions')}
                        className={`px-3 py-1.5 rounded transition-colors ${
                          reportType === 'deductions'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        تقرير الخصومات والجزاءات
                      </button>
                      <button
                        onClick={() => setReportType('leaves')}
                        className={`px-3 py-1.5 rounded transition-colors ${
                          reportType === 'leaves'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        تقرير الإجازات والغياب
                      </button>
                      <button
                        onClick={() => setReportType('advances')}
                        className={`px-3 py-1.5 rounded transition-colors ${
                          reportType === 'advances'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        سجل السلف المستحقة
                      </button>
                      <button
                        onClick={() => setReportType('turnover')}
                        className={`px-3 py-1.5 rounded transition-colors ${
                          reportType === 'turnover'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        التعيينات وإنهاء الخدمة
                      </button>
                    </div>
                    {/* Excel Export Button */}
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm transition-all font-sans"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span>تصدير التقرير إلى Excel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Output Content Block */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden font-sans">
                
                {/* 1. PAYROLL REPORT */}
                {reportType === 'payroll' && (() => {
                  if (reportEmployees.length === 0) {
                    return <div className="p-8 text-center text-xs text-slate-400">لا يوجد موظفين مسجلين يطابقون هذه الفلاتر.</div>;
                  }

                  // Compute table data for each employee in the date range
                  const tableData = reportEmployees.map(emp => {
                    const empDeductions = reportDeductions.filter(d => d.employeeId === emp.id);
                    const empLeaves = reportLeaves.filter(l => l.employeeId === emp.id);
                    const empAdvances = reportAdvances.filter(a => a.employeeId === emp.id);

                    const basicSalary = Number(emp.salary) || 0;
                    
                    // Absence calculation
                    const excusedDays = empLeaves.filter(l => l.leaveType === 'excused_absence').reduce((sum, l) => sum + Number(l.days), 0);
                    const unexcusedDays = empLeaves.filter(l => l.leaveType === 'unexcused_absence').reduce((sum, l) => sum + Number(l.days), 0);
                    
                    const excusedFactor = settingsExcusedDeduction || 1.0;
                    const unexcusedFactor = settingsUnexcusedDeduction || 2.0;

                    const totalAbsenceDeductionDays = (excusedDays * excusedFactor) + (unexcusedDays * unexcusedFactor);
                    const dailyWage = basicSalary / 30;
                    const absenceDeductionAmount = totalAbsenceDeductionDays * dailyWage;

                    // Custom deductions
                    const customAmountDeductions = empDeductions.filter(d => d.deductionType === 'amount').reduce((sum, d) => sum + Number(d.value), 0);
                    const customDaysDeductionsValue = empDeductions.filter(d => d.deductionType === 'days').reduce((sum, d) => sum + Number(d.value), 0);
                    const customDaysDeductionAmount = customDaysDeductionsValue * dailyWage;

                    const totalDeductionsValue = absenceDeductionAmount + customAmountDeductions + customDaysDeductionAmount;
                    const totalAdvancesValue = empAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

                    // Proration
                    const rStart = new Date(reportFromDate);
                    const rEnd = new Date(reportToDate);
                    const totalPeriodDays = Math.max(1, Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                    const hireDateVal = emp.hireDate ? new Date(emp.hireDate) : null;
                    const eosDateVal = emp.endOfServiceDate ? new Date(emp.endOfServiceDate) : null;

                    let empStart = rStart;
                    if (hireDateVal && hireDateVal > rStart && hireDateVal <= rEnd) {
                      empStart = hireDateVal;
                    }

                    let empEnd = rEnd;
                    if (eosDateVal && eosDateVal >= rStart && eosDateVal < rEnd) {
                      empEnd = eosDateVal;
                    }

                    let activeDays = 30;
                    if (empStart <= empEnd) {
                      activeDays = Math.max(1, Math.ceil((empEnd.getTime() - empStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    } else {
                      activeDays = 0;
                    }

                    const isProrated = totalPeriodDays < 28 || activeDays < totalPeriodDays;
                    let proratedSalary = basicSalary;
                    if (isProrated) {
                      proratedSalary = (basicSalary / 30) * activeDays;
                      if (proratedSalary > basicSalary) {
                        proratedSalary = basicSalary;
                      }
                    }
                    const netSalary = Math.max(0, proratedSalary - totalDeductionsValue - totalAdvancesValue);

                    return {
                      id: emp.id,
                      name: emp.name,
                      branchName: emp.branchName,
                      jobTitle: emp.jobTitle,
                      basicSalary,
                      proratedSalary,
                      deductions: totalDeductionsValue,
                      advances: totalAdvancesValue,
                      netSalary,
                      isProrated,
                      activeDays
                    };
                  });

                  // Calculate grand totals
                  const totalBasic = tableData.reduce((sum, item) => sum + item.proratedSalary, 0);
                  const totalDeductions = tableData.reduce((sum, item) => sum + item.deductions, 0);
                  const totalAdvances = tableData.reduce((sum, item) => sum + item.advances, 0);
                  const totalNet = tableData.reduce((sum, item) => sum + item.netSalary, 0);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[750px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">اسم الموظف</th>
                            <th className="px-6 py-4">الفرع</th>
                            <th className="px-6 py-4 font-sans text-right">المرتب الأساسي المستحق</th>
                            <th className="px-6 py-4 font-sans text-right">إجمالي الخصومات</th>
                            <th className="px-6 py-4 font-sans text-right">السلف المستقطعة</th>
                            <th className="px-6 py-4 font-sans text-right">صافي المرتب المستحق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {tableData.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">{row.jobTitle}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-sans font-medium">
                                  {row.branchName}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-right">
                                {row.proratedSalary.toLocaleString()} ج.م
                                {row.isProrated && (
                                  <span className="text-[8px] text-amber-600 block mt-0.5 font-sans">(محتسب عن {row.activeDays} يوم)</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-red-600 dark:text-red-400 font-semibold text-right">
                                {row.deductions.toLocaleString()} - ج.م
                              </td>
                              <td className="px-6 py-4 font-mono text-red-600 dark:text-red-400 font-semibold text-right">
                                {row.advances.toLocaleString()} - ج.م
                              </td>
                              <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-right">
                                {row.netSalary.toLocaleString()} ج.م
                              </td>
                            </tr>
                          ))}
                          
                          {/* Grand Totals Row */}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                            <td className="px-6 py-4 text-sm font-bold">إجمالي كشف مسير الرواتب المالي</td>
                            <td className="px-6 py-4">-</td>
                            <td className="px-6 py-4 font-mono text-sm text-right">{totalBasic.toLocaleString()} ج.م</td>
                            <td className="px-6 py-4 font-mono text-sm text-red-600 dark:text-red-400 text-right">{totalDeductions.toLocaleString()} - ج.م</td>
                            <td className="px-6 py-4 font-mono text-sm text-red-600 dark:text-red-400 text-right">{totalAdvances.toLocaleString()} - ج.م</td>
                            <td className="px-6 py-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 text-right">{totalNet.toLocaleString()} ج.م</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* 2. DEDUCTIONS REPORT */}
                {reportType === 'deductions' && (() => {
                  if (reportDeductions.length === 0) {
                    return <div className="p-8 text-center text-xs text-slate-400">لا يوجد حركات خصم مسجلة خلال هذه الفترة.</div>;
                  }

                  const totalValue = reportDeductions.reduce((sum, d) => sum + (d.deductionType === 'amount' ? Number(d.value) : 0), 0);
                  const totalDays = reportDeductions.reduce((sum, d) => sum + (d.deductionType === 'days' ? Number(d.value) : 0), 0);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4">نوع الخصم</th>
                            <th className="px-6 py-4 text-right">قيمة الخصم</th>
                            <th className="px-6 py-4">السبب</th>
                            <th className="px-6 py-4">تاريخ التسجيل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {reportDeductions.map(dec => (
                            <tr key={dec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {dec.employeeName}
                              </td>
                              <td className="px-6 py-4 font-sans">
                                <span className={`px-2 py-0.5 text-[9px] rounded font-bold ${
                                  dec.deductionType === 'days'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
                                }`}>
                                  {dec.deductionType === 'days' ? 'خصم أيام عمل' : 'مبلغ مالي'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-right">
                                {dec.deductionType === 'days' ? `${dec.value} يوم` : `${Number(dec.value).toLocaleString()} ج.م`}
                              </td>
                              <td className="px-6 py-4 font-sans font-medium text-slate-800 dark:text-slate-200">{dec.reason}</td>
                              <td className="px-6 py-4 font-mono text-slate-400">{dec.deductionDate}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-300 text-slate-955 dark:text-slate-100">
                            <td className="px-6 py-4 text-sm">إجمالي إحصائيات الخصومات</td>
                            <td className="px-6 py-4">-</td>
                            <td className="px-6 py-4 font-mono text-sm text-red-600 dark:text-red-400 text-right">
                              مبلغ مالي: {totalValue.toLocaleString()} ج.م | أيام: {totalDays} يوم
                            </td>
                            <td className="px-6 py-4">-</td>
                            <td className="px-6 py-4">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* 3. LEAVES REPORT */}
                {reportType === 'leaves' && (() => {
                  if (reportLeaves.length === 0) {
                    return <div className="p-8 text-center text-xs text-slate-400">لا يوجد إجازات أو غيابات مسجلة خلال هذه الفترة.</div>;
                  }

                  const totalPaid = reportLeaves.filter(l => l.leaveType === 'paid_leave').reduce((sum, l) => sum + Number(l.days), 0);
                  const totalExcused = reportLeaves.filter(l => l.leaveType === 'excused_absence').reduce((sum, l) => sum + Number(l.days), 0);
                  const totalUnexcused = reportLeaves.filter(l => l.leaveType === 'unexcused_absence').reduce((sum, l) => sum + Number(l.days), 0);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4">النوع</th>
                            <th className="px-6 py-4 font-sans">عدد الأيام</th>
                            <th className="px-6 py-4">السبب</th>
                            <th className="px-6 py-4">من تاريخ</th>
                            <th className="px-6 py-4">إلى تاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {reportLeaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {l.employeeName}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 text-[9px] rounded font-bold font-sans ${
                                  l.leaveType === 'paid_leave'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                                    : l.leaveType === 'excused_absence'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
                                }`}>
                                  {l.leaveType === 'paid_leave' && 'إجازة مدفوعة'}
                                  {l.leaveType === 'excused_absence' && 'غياب بإذن'}
                                  {l.leaveType === 'unexcused_absence' && 'غياب بدون إذن'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">{l.days} يوم</td>
                              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium font-sans">{l.reason}</td>
                              <td className="px-6 py-4 font-mono text-slate-400">{l.startDate}</td>
                              <td className="px-6 py-4 font-mono text-slate-400">{l.endDate}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-300 text-slate-955 dark:text-slate-100">
                            <td className="px-6 py-4 text-sm">إجمالي حركات الغياب والحضور</td>
                            <td className="px-6 py-4">-</td>
                            <td className="px-6 py-4 font-mono text-sm" colSpan={4}>
                              إجازات مدفوعة: {totalPaid} يوم | غياب بإذن: {totalExcused} يوم | غياب بدون إذن: {totalUnexcused} يوم
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* 4. ADVANCES REPORT */}
                {reportType === 'advances' && (() => {
                  if (reportAdvances.length === 0) {
                    return <div className="p-8 text-center text-xs text-slate-400">لا يوجد سلف مسجلة أو مستقطعة خلال هذه الفترة.</div>;
                  }

                  const totalAmount = reportAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[650px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4 font-sans text-right">قيمة السلفة</th>
                            <th className="px-6 py-4">السبب</th>
                            <th className="px-6 py-4">تاريخ التسجيل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {reportAdvances.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {a.employeeName}
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-red-600 dark:text-red-400 text-right">
                                {Number(a.amount).toLocaleString()} ج.م
                              </td>
                              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium font-sans">{a.reason}</td>
                              <td className="px-6 py-4 font-mono text-slate-400">{a.advanceDate}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-300 text-slate-955 dark:text-slate-100">
                            <td className="px-6 py-4 text-sm">إجمالي السلف الممنوحة للفترة</td>
                            <td className="px-6 py-4 font-mono text-red-600 dark:text-red-400 text-sm text-right">{totalAmount.toLocaleString()} ج.م</td>
                            <td className="px-6 py-4">-</td>
                            <td className="px-6 py-4">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* 5. TURNOVER REPORT */}
                {reportType === 'turnover' && (() => {
                  const newHires = reportEmployees.filter(emp => emp.hireDate >= reportFromDate && emp.hireDate <= reportToDate);
                  const terminations = reportEmployees.filter(emp => emp.endOfServiceDate && emp.endOfServiceDate >= reportFromDate && emp.endOfServiceDate <= reportToDate);

                  if (newHires.length === 0 && terminations.length === 0) {
                    return <div className="p-8 text-center text-xs text-slate-400">لا توجد حركة تعيينات أو إنهاء خدمة خلال هذه الفترة.</div>;
                  }

                  return (
                    <div className="space-y-6 p-4">
                      {/* New Hires Table */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1">
                          <Users className="h-4 w-4 text-emerald-500" />
                          <span>الموظفين الجدد الذين تم تعيينهم ({newHires.length})</span>
                        </h4>
                        {newHires.length === 0 ? (
                          <p className="text-[10px] text-slate-400 pr-2">لم يتم تعيين موظفين جدد خلال هذه الفترة.</p>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded">
                            <table className="w-full border-collapse text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                                  <th className="px-4 py-2">الموظف</th>
                                  <th className="px-4 py-2">الفرع</th>
                                  <th className="px-4 py-2">المسمى الوظيفي</th>
                                  <th className="px-4 py-2 font-mono">تاريخ التعيين</th>
                                  <th className="px-4 py-2 font-mono text-right">الراتب الأساسي</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                                {newHires.map(emp => (
                                  <tr key={emp.id}>
                                    <td className="px-4 py-2 font-semibold text-slate-900 dark:text-slate-100">{emp.name}</td>
                                    <td className="px-4 py-2">{emp.branchName}</td>
                                    <td className="px-4 py-2">{emp.jobTitle}</td>
                                    <td className="px-4 py-2 font-mono">{emp.hireDate}</td>
                                    <td className="px-4 py-2 font-mono text-right">{Number(emp.salary).toLocaleString()} ج.م</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Terminations Table */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1">
                          <Users className="h-4 w-4 text-red-500" />
                          <span>الموظفين الذين أنهوا خدمتهم (استقالة / فصل) ({terminations.length})</span>
                        </h4>
                        {terminations.length === 0 ? (
                          <p className="text-[10px] text-slate-400 pr-2">لا توجد حالات إنهاء خدمة مسجلة خلال هذه الفترة.</p>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded">
                            <table className="w-full border-collapse text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                                  <th className="px-4 py-2">الموظف</th>
                                  <th className="px-4 py-2">الفرع</th>
                                  <th className="px-4 py-2">المسمى الوظيفي</th>
                                  <th className="px-4 py-2 font-mono">تاريخ التعيين</th>
                                  <th className="px-4 py-2 font-mono">تاريخ إنهاء الخدمة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                                {terminations.map(emp => (
                                  <tr key={emp.id} className="bg-red-50/10">
                                    <td className="px-4 py-2 font-semibold text-red-800 dark:text-red-400">{emp.name}</td>
                                    <td className="px-4 py-2">{emp.branchName}</td>
                                    <td className="px-4 py-2">{emp.jobTitle}</td>
                                    <td className="px-4 py-2 font-mono">{emp.hireDate}</td>
                                    <td className="px-4 py-2 font-mono font-bold text-red-600 dark:text-red-400">{emp.endOfServiceDate}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          ) : activeTab === "settings" ? (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                  إعدادات المنشأة العامة
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  تهيئة ضوابط الغياب الشهري، وقواعد الخصم، والإجازات المدفوعة
                </p>
              </div>

              {isLoadingSettings ? (
                <div className="text-xs text-slate-400 p-4">
                  جاري تحميل الإعدادات...
                </div>
              ) : (
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-5 transition-all"
                >
                  {/* Paid Leaves Limit */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-sans font-sans">
                      رصيد الإجازات الشهرية المجانية (بالأيام) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                      value={settingsPaidLeaves}
                      onChange={(e) =>
                        setSettingsPaidLeaves(Number(e.target.value))
                      }
                      required
                    />
                    <span className="block text-[10px] text-slate-400 leading-normal">
                      الحد الأقصى لأيام الإجازات المسموح بها شهرياً للموظف دون
                      خصم من راتبه الأساسي.
                    </span>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* Penalty Absences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-sans font-sans">
                        معامل خصم يوم الغياب بإذن (أيام العمل) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                        value={settingsExcusedDeduction}
                        onChange={(e) =>
                          setSettingsExcusedDeduction(Number(e.target.value))
                        }
                        required
                      />
                      <span className="block text-[10px] text-slate-400 leading-normal">
                        عدد الأيام التي سيتم خصمها من راتب الموظف لكل يوم غياب
                        بعذر مقبول (الافتراضي: 1.00 أي خصم يوم واحد).
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-sans font-sans">
                        معامل خصم يوم الغياب بدون إذن (أيام العمل) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
                        value={settingsUnexcusedDeduction}
                        onChange={(e) =>
                          setSettingsUnexcusedDeduction(Number(e.target.value))
                        }
                        required
                      />
                      <span className="block text-[10px] text-slate-400 leading-normal">
                        العقوبة المطبقة بالأيام لكل يوم غياب دون عذر مقبول
                        (الافتراضي: 2.00 أي خصم يومين من الراتب).
                      </span>
                    </div>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* Employee Portal Permissions */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      صلاحيات بوابة الموظف
                    </h3>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allow_employee_view_salary"
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        checked={settingsAllowEmployeeViewSalary}
                        onChange={(e) =>
                          setSettingsAllowEmployeeViewSalary(e.target.checked)
                        }
                      />
                      <label
                        htmlFor="allow_employee_view_salary"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        السماح للموظف برؤية راتبه التفصيلي في كشف الراتب (Pay
                        Slip)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allow_employee_submit_requests"
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        checked={settingsAllowEmployeeSubmitRequests}
                        onChange={(e) =>
                          setSettingsAllowEmployeeSubmitRequests(
                            e.target.checked,
                          )
                        }
                      />
                      <label
                        htmlFor="allow_employee_submit_requests"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        السماح للموظف بتقديم طلبات الإجازات والسلف من حسابه
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50 transition-colors font-sans"
                    >
                      {isSavingSettings
                        ? "جاري حفظ الإعدادات..."
                        : "حفظ الإعدادات بالكامل"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : activeTab === "leaves" ? (
            <div className="space-y-8">
              {/* Top Section: Employees List */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    إدارة الإجازات والغياب للموظفين
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                    اختر موظفاً لتسجيل إجازة مدفوعة، أو غياب بعذر، أو غياب بدون
                    عذر
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {employees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد موظفين مسجلين.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">اسم الموظف</th>
                            <th className="px-6 py-4">الفرع</th>
                            <th className="px-6 py-4">المسمى الوظيفي</th>
                            <th className="px-6 py-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {employees.map((emp) => (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {emp.name}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-sans">
                                  {emp.branchName}
                                </span>
                              </td>
                              <td className="px-6 py-4">{emp.jobTitle}</td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() => {
                                    setSelectedEmployeeForLeave(emp);
                                    setLeaveType("paid_leave");
                                    setLeaveDays("1");
                                    setLeaveReason("");
                                    setLeaveStartDate(
                                      new Date().toISOString().split("T")[0],
                                    );
                                    setLeaveEndDate(
                                      new Date().toISOString().split("T")[0],
                                    );
                                    setShowAddLeaveModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-[10px] font-bold transition-all"
                                >
                                  تسجيل إجازة / غياب
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Leaves History */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                    سجل الإجازات والغيابات التاريخي
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    مراجعة كافة الإجازات والغيابات المسجلة للموظفين
                  </p>
                </div>

                <DateFilterBar />

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {leaves.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد إجازات أو غيابات مسجلة حالياً.
                    </div>
                  ) : filteredLeaves.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد إجازات أو غيابات تطابق خيارات التصفية المحددة.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4">النوع</th>
                            <th className="px-6 py-4 font-sans">عدد الأيام</th>
                            <th className="px-6 py-4">السبب</th>
                            <th className="px-6 py-4">من تاريخ</th>
                            <th className="px-6 py-4">إلى تاريخ</th>
                            <th className="px-6 py-4 text-left font-sans">
                              التحكم
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {filteredLeaves.map((l) => (
                            <tr
                              key={l.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {l.employeeName}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-0.5 text-[9px] rounded font-bold font-sans ${
                                    l.leaveType === "paid_leave"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                                      : l.leaveType === "excused_absence"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                                        : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300"
                                  }`}
                                >
                                  {l.leaveType === "paid_leave" &&
                                    "إجازة مدفوعة"}
                                  {l.leaveType === "excused_absence" &&
                                    "غياب بإذن"}
                                  {l.leaveType === "unexcused_absence" &&
                                    "غياب بدون إذن"}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">
                                {l.days} يوم
                              </td>
                              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium font-sans">
                                {l.reason}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {l.startDate}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {l.endDate}
                              </td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() =>
                                    l.id && handleDeleteLeave(l.id)
                                  }
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                                  title="حذف الحركة"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Leave Modal Popup */}
              {showAddLeaveModal && selectedEmployeeForLeave && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <form
                    onSubmit={handleCreateLeave}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-lg overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                          تسجيل حركة غياب / إجازة
                        </h3>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                          تسجيل للموظف:{" "}
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedEmployeeForLeave.name}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddLeaveModal(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Leave Type */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          النوع *
                        </label>
                        <select
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value as any)}
                          required
                        >
                          <option value="paid_leave">
                            إجازة مدفوعة الأجر (تخصم من الرصيد)
                          </option>
                          <option value="excused_absence">
                            غياب بعذر مقبول / بإذن (يخضع للخصم المخفض)
                          </option>
                          <option value="unexcused_absence">
                            غياب بدون عذر / بدون إذن (يخضع للخصم المغلظ)
                          </option>
                        </select>
                      </div>

                      {/* Leave Days */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          عدد الأيام (يقبل الكسور)*
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder="مثال: 1 أو 0.5"
                          value={leaveDays}
                          onChange={(e) => setLeaveDays(e.target.value)}
                          required
                        />
                      </div>

                      {/* Start Date */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          من تاريخ *
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* End Date */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          إلى تاريخ (محتسب تلقائياً) *
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* Reason */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          السبب *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder="مثال: إجازة عادية، ظروف مرضية"
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddLeaveModal(false)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingLeave}
                        className="px-6 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50"
                      >
                        {isSavingLeave ? "جاري الحفظ..." : "حفظ الحركة"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : activeTab === "advances" ? (
            <div className="space-y-8">
              {/* Top Section: Employees List */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                    تسجيل السلف المالية للموظفين
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                    تسجيل السلف المؤقتة أو المستديمة التي يحصل عليها الموظف من
                    الشركة
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {employees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد موظفين مسجلين.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">اسم الموظف</th>
                            <th className="px-6 py-4">الفرع</th>
                            <th className="px-6 py-4">المسمى الوظيفي</th>
                            <th className="px-6 py-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {employees.map((emp) => (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {emp.name}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded font-sans">
                                  {emp.branchName}
                                </span>
                              </td>
                              <td className="px-6 py-4">{emp.jobTitle}</td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() => {
                                    setSelectedEmployeeForAdvance(emp);
                                    setAdvanceAmount("");
                                    setAdvanceReason("");
                                    setAdvanceDate(
                                      new Date().toISOString().split("T")[0],
                                    );
                                    setShowAddAdvanceModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-[10px] font-bold transition-all"
                                >
                                  تسجيل سلفة
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Advances History */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                    سجل السلف المسجلة
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    عرض ومتابعة كافة المبالغ المستلفة من الموظفين
                  </p>
                </div>

                <DateFilterBar />

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                  {advances.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد سلف مسجلة حالياً.
                    </div>
                  ) : filteredAdvances.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-sans">
                      لا يوجد سلف تطابق خيارات التصفية المحددة.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs min-w-[650px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">الموظف</th>
                            <th className="px-6 py-4 font-sans">قيمة السلفة</th>
                            <th className="px-6 py-4">السبب</th>
                            <th className="px-6 py-4">التاريخ</th>
                            <th className="px-6 py-4 text-left font-sans">
                              التحكم
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {filteredAdvances.map((a) => (
                            <tr
                              key={a.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                {a.employeeName}
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-red-600 dark:text-red-400">
                                {Number(a.amount).toLocaleString()} ج.م
                              </td>
                              <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium font-sans">
                                {a.reason}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {a.advanceDate}
                              </td>
                              <td className="px-6 py-4 text-left">
                                <button
                                  onClick={() =>
                                    a.id && handleDeleteAdvance(a.id)
                                  }
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                                  title="حذف السلفة"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Advance Modal Popup */}
              {showAddAdvanceModal && selectedEmployeeForAdvance && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <form
                    onSubmit={handleCreateAdvance}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-lg overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">
                          تسجيل سلفة مالية جديدة
                        </h3>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                          تسجيل للموظف:{" "}
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedEmployeeForAdvance.name}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddAdvanceModal(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Advance Amount */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          مبلغ السلفة (ج.م) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder="مثال: 500"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          required
                        />
                      </div>

                      {/* Date */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          تاريخ السلفة *
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          value={advanceDate}
                          onChange={(e) => setAdvanceDate(e.target.value)}
                          required
                        />
                      </div>

                      {/* Reason */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                          السبب والبيان *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
                          placeholder="مثال: سلفة شخصية مستقطعة من الشهر القادم"
                          value={advanceReason}
                          onChange={(e) => setAdvanceReason(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddAdvanceModal(false)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingAdvance}
                        className="px-6 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-md text-xs font-bold disabled:opacity-50"
                      >
                        {isSavingAdvance ? "جاري الحفظ..." : "حفظ السلفة"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : activeTab === "requests" ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                  طلبات الموظفين المعلقة والسابقة
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  مراجعة طلبات الإجازات والسلف المالية المقدمة من الموظفين
                  واتخاذ إجراء بالموافقة أو الرفض
                </p>
              </div>

              <DateFilterBar />

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                {employeeRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-sans">
                    لا توجد أي طلبات مقدمة حالياً.
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-sans">
                    لا توجد طلبات تطابق خيارات التصفية المحددة.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-right text-xs min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                          <th className="px-6 py-4">الموظف</th>
                          <th className="px-6 py-4">نوع الطلب</th>
                          <th className="px-6 py-4">تفاصيل الطلب</th>
                          <th className="px-6 py-4">السبب</th>
                          <th className="px-6 py-4 font-sans">تاريخ التقديم</th>
                          <th className="px-6 py-4">الحالة</th>
                          <th className="px-6 py-4 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredRequests.map((req) => (
                          <tr
                            key={req.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              {req.employees?.name || "موظف غير معروف"}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {req.request_type === "advance"
                                ? "سلفة مالية"
                                : "إجازة / غياب"}
                            </td>
                            <td className="px-6 py-4">
                              {req.request_type === "advance" ? (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {Number(req.amount).toLocaleString()} ج.م
                                </span>
                              ) : (
                                <span>
                                  {req.leave_type === "paid_leave" &&
                                    "إجازة مدفوعة"}
                                  {req.leave_type === "excused_absence" &&
                                    "غياب بإذن"}
                                  {req.leave_type === "unexcused_absence" &&
                                    "غياب بدون إذن"}{" "}
                                  ({req.days} يوم) ابتداءً من {req.start_date}
                                </span>
                              )}
                            </td>
                            <td
                              className="px-6 py-4 max-w-[200px] truncate"
                              title={req.reason}
                            >
                              {req.reason}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-400">
                              {new Date(req.created_at).toLocaleDateString(
                                "ar-EG",
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  req.status === "pending"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                                    : req.status === "approved"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                                }`}
                              >
                                {req.status === "pending" && "قيد الانتظار"}
                                {req.status === "approved" && "تمت الموافقة"}
                                {req.status === "rejected" && "تم الرفض"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-left">
                              {req.status === "pending" ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold transition-all shadow-sm"
                                  >
                                    موافقة
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-[10px] font-bold transition-all shadow-sm"
                                  >
                                    رفض
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">
                                  مكتمل
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Placeholder for other tabs */
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 text-center shadow-sm transition-colors duration-300">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                قسم "{navItems.find((n) => n.id === activeTab)?.label}" قيد
                التطوير
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                سيتم تفعيل هذه الميزة بالكامل في الخطوات القادمة بناءً على
                احتياجات منشأتك.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default TenantDashboardPage;
