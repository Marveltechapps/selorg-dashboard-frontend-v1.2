import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Download, X, Search, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchProductionStaffRoster,
  createProductionStaff,
  updateProductionStaffStatus,
  fetchProductionShiftCoverage,
  createProductionShift,
  fetchProductionAttendance,
  markProductionAttendancePresent,
  type ProductionEmployee as Employee,
  type ProductionShift as Shift,
  type ProductionAttendance as Attendance,
} from '../../../api/productionApi';

export function ProductionStaff() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'operators' | 'qc' | 'supervisors'>('operators');
  const [subTab, setSubTab] = useState<'roster' | 'shifts' | 'attendance'>('roster');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const dateStr = new Date().toISOString().split('T')[0];

  const { data: allStaff = [] } = useQuery({
    queryKey: ['production', 'staff', 'roster'],
    queryFn: () => fetchProductionStaffRoster(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['production', 'staff', 'shifts', dateStr],
    queryFn: () => fetchProductionShiftCoverage({ date: dateStr }),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['production', 'staff', 'attendance', dateStr],
    queryFn: () => fetchProductionAttendance({ date: dateStr }),
  });

  const createStaffMutation = useMutation({
    mutationFn: createProductionStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'roster'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'attendance'] });
      toast.success('Employee added successfully!');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add employee'),
  });

  const createShiftMutation = useMutation({
    mutationFn: createProductionShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'shifts'] });
      toast.success('Shift scheduled successfully!');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to schedule shift'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: 'active' | 'on-break' | 'absent' | 'off-duty' }) =>
      updateProductionStaffStatus(staffId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'roster'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update status'),
  });

  const markPresentMutation = useMutation({
    mutationFn: (recordId: string) => markProductionAttendancePresent(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'staff', 'roster'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to mark present'),
  });

  const employeesByDept = allStaff.filter(
    (e: Employee) =>
      (activeTab === 'operators' && (e.department === 'operators' || e.department === 'maintenance')) ||
      (activeTab === 'qc' && e.department === 'qc') ||
      (activeTab === 'supervisors' && e.department === 'supervisors')
  );
  const filteredEmployees = employeesByDept.filter(
    (e: Employee) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    employeeId: '',
    role: '',
    department: 'operators' as const,
    assignedLine: '',
    shift: 'morning' as const,
    phoneNumber: '',
  });

  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '',
    endTime: '',
    requiredEmployees: '',
    date: '',
    department: 'All',
  });

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.employeeId && newEmployee.role) {
      createStaffMutation.mutate(
        {
          name: newEmployee.name,
          employeeId: newEmployee.employeeId,
          role: newEmployee.role,
          department: newEmployee.department,
          assignedLine: newEmployee.assignedLine || undefined,
          shift: newEmployee.shift,
          phoneNumber: newEmployee.phoneNumber || undefined,
        },
        {
          onSuccess: () => {
            setNewEmployee({ name: '', employeeId: '', role: '', department: 'operators', assignedLine: '', shift: 'morning', phoneNumber: '' });
            setShowAddModal(false);
          },
        }
      );
    } else {
      toast.error('Please fill name, employee ID, and role');
    }
  };

  const handleAddShift = () => {
    if (newShift.name && newShift.startTime && newShift.endTime && newShift.date) {
      createShiftMutation.mutate(
        {
          name: newShift.name,
          startTime: newShift.startTime,
          endTime: newShift.endTime,
          requiredEmployees: parseInt(newShift.requiredEmployees, 10) || 20,
          date: newShift.date,
          department: newShift.department,
        },
        {
          onSuccess: () => {
            setNewShift({ name: '', startTime: '', endTime: '', requiredEmployees: '', date: '', department: 'All' });
            setShowAddModal(false);
          },
        }
      );
    } else {
      toast.error('Please fill shift name, start/end time, and date');
    }
  };

  const handleUpdateEmployeeStatus = (staffId: string, newStatus: Employee['status']) => {
    updateStatusMutation.mutate({ staffId, status: newStatus });
  };

  const handleMarkAttendance = (recordId: string, status: Attendance['status']) => {
    if (status === 'present') {
      markPresentMutation.mutate(recordId);
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (subTab === 'roster') {
      csvData = [
        ['Workforce Roster Report', `Date: ${today}`],
        [''],
        ['Employee ID', 'Name', 'Role', 'Department', 'Assigned Line', 'Status', 'Shift', 'Productivity %', 'Attendance %'],
        ...filteredEmployees.map(e => [
          e.employeeId,
          e.name,
          e.role,
          e.department,
          e.assignedLine || 'N/A',
          e.status,
          e.shiftTime,
          e.productivity?.toString() || 'N/A',
          e.attendance?.toString() || 'N/A'
        ]),
      ];
    } else if (subTab === 'shifts') {
      csvData = [
        ['Shift Schedule Report', `Date: ${today}`],
        [''],
        ['Shift Name', 'Time Range', 'Date', 'Department', 'Assigned', 'Required', 'Fill Rate %'],
        ...shifts.map(s => [
          s.name,
          s.timeRange,
          s.date,
          s.department,
          s.assignedEmployees.toString(),
          s.requiredEmployees.toString(),
          ((s.assignedEmployees / s.requiredEmployees) * 100).toFixed(1)
        ]),
      ];
    } else {
      csvData = [
        ['Attendance Report', `Date: ${today}`],
        [''],
        ['Employee ID', 'Name', 'Date', 'Check In', 'Check Out', 'Status', 'Hours Worked'],
        ...attendance.map(a => [
          a.employeeId,
          a.employeeName,
          a.date,
          a.checkIn || 'N/A',
          a.checkOut || 'N/A',
          a.status,
          a.hoursWorked?.toString() || 'N/A'
        ]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-${subTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };


  const activeCount = allStaff.filter((e: Employee) => e.status === 'active').length;
  const totalScheduled = allStaff.filter((e: Employee) => e.shift === 'morning').length;
  const absentCount = allStaff.filter((e: Employee) => e.status === 'absent').length;
  const attendanceRate = totalScheduled > 0 ? (((totalScheduled - absentCount) / totalScheduled) * 100).toFixed(0) : '0';
  const avgProductivity = allStaff.length > 0 
    ? (allStaff.reduce((sum: number, e: Employee) => sum + (e.productivity || 0), 0) / allStaff.length).toFixed(0) 
    : '0';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Workforce"
        subtitle="Shift management and productivity tracking"
        actions={
          <>
            <button 
              onClick={exportData}
              className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5] flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
            >
              {subTab === 'shifts' ? <Plus size={16} /> : <UserPlus size={16} />}
              {subTab === 'shifts' ? 'Schedule Shift' : 'Add Staff'}
            </button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
          <h3 className="font-bold text-[#212121] mb-2">On Shift Now</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[#16A34A]">{activeCount}</span>
            <span className="text-sm text-[#757575] mb-1">/ {totalScheduled} Scheduled</span>
          </div>
          <p className="text-xs text-[#757575] mt-2">{absentCount} Absent • {attendanceRate}% Attendance</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
          <h3 className="font-bold text-[#212121] mb-2">Next Shift</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[#212121]">
              {shifts.find(s => s.name === 'Afternoon Shift')?.assignedEmployees || 0}
            </span>
            <span className="text-sm text-[#757575] mb-1">Operators</span>
          </div>
          <p className="text-xs text-[#757575] mt-2">Starts in 3h 15m</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
          <h3 className="font-bold text-[#212121] mb-2">Avg Productivity</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-[#16A34A]">{avgProductivity}%</span>
            <span className="text-sm text-[#757575] mb-1">This week</span>
          </div>
          <p className="text-xs text-[#757575] mt-2">↑ 2% vs last week</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-2 border-b border-[#E0E0E0]">
        <button
          onClick={() => setSubTab('roster')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            subTab === 'roster'
              ? 'border-[#16A34A] text-[#16A34A]'
              : 'border-transparent text-[#757575] hover:text-[#212121]'
          }`}
        >
          Employee Roster
        </button>
        <button
          onClick={() => setSubTab('shifts')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            subTab === 'shifts'
              ? 'border-[#16A34A] text-[#16A34A]'
              : 'border-transparent text-[#757575] hover:text-[#212121]'
          }`}
        >
          Shift Planning
        </button>
        <button
          onClick={() => setSubTab('attendance')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            subTab === 'attendance'
              ? 'border-[#16A34A] text-[#16A34A]'
              : 'border-transparent text-[#757575] hover:text-[#212121]'
          }`}
        >
          Attendance
        </button>
      </div>

      {/* Employee Roster Tab */}
      {subTab === 'roster' && (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#F9FAFB] border-b border-[#E0E0E0] flex justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('operators')}
                className={`text-sm font-bold ${activeTab === 'operators' ? 'text-[#212121] border-b-2 border-[#16A34A]' : 'text-[#757575] hover:text-[#212121]'} pb-1`}
              >
                Machine Operators ({allStaff.filter((e: Employee) => e.department === 'operators' || e.department === 'maintenance').length})
              </button>
              <button 
                onClick={() => setActiveTab('qc')}
                className={`text-sm font-bold ${activeTab === 'qc' ? 'text-[#212121] border-b-2 border-[#16A34A]' : 'text-[#757575] hover:text-[#212121]'} pb-1`}
              >
                QC Staff ({allStaff.filter((e: Employee) => e.department === 'qc').length})
              </button>
              <button 
                onClick={() => setActiveTab('supervisors')}
                className={`text-sm font-bold ${activeTab === 'supervisors' ? 'text-[#212121] border-b-2 border-[#16A34A]' : 'text-[#757575] hover:text-[#212121]'} pb-1`}
              >
                Supervisors ({allStaff.filter((e: Employee) => e.department === 'supervisors').length})
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#E0E0E0] text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all w-64"
              />
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Assigned Line</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Shift</th>
                <th className="px-6 py-3">Performance</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {filteredEmployees.map(employee => (
                <tr key={employee.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[#212121]">{employee.name}</p>
                      <p className="text-xs text-[#757575]">{employee.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{employee.role}</td>
                  <td className="px-6 py-4 text-[#616161]">{employee.assignedLine || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.status === 'active' ? 'bg-[#DCFCE7] text-[#166534]' :
                      employee.status === 'on-break' ? 'bg-[#FEF9C3] text-[#854D0E]' :
                      employee.status === 'absent' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                      'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {employee.status === 'on-break' ? 'On Break' : 
                       employee.status === 'off-duty' ? 'Off Duty' :
                       employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{employee.shiftTime}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#E5E7EB] rounded-full h-2">
                        <div 
                          className="bg-[#16A34A] h-2 rounded-full"
                          style={{ width: `${employee.productivity || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-[#616161]">{employee.productivity || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {employee.status === 'active' && (
                        <button 
                          onClick={() => handleUpdateEmployeeStatus(employee.id, 'on-break')}
                          className="text-[#F59E0B] hover:text-[#D97706] font-medium text-xs"
                        >
                          Break
                        </button>
                      )}
                      {employee.status === 'on-break' && (
                        <button 
                          onClick={() => handleUpdateEmployeeStatus(employee.id, 'active')}
                          className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                        >
                          Resume
                        </button>
                      )}
                      <button 
                        onClick={() => setShowProfileModal(employee)}
                        className="text-[#3B82F6] hover:text-[#2563EB] font-medium text-xs"
                      >
                        Profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift Planning Tab */}
      {subTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB] flex items-center gap-2"
            >
              <Plus size={16} />
              Schedule Shift
            </button>
          </div>
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
                <tr>
                  <th className="px-6 py-3">Shift Name</th>
                  <th className="px-6 py-3">Time Range</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Assigned</th>
                  <th className="px-6 py-3">Required</th>
                  <th className="px-6 py-3">Fill Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {shifts.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-[#757575]">No shifts scheduled for today. Schedule a shift to get started.</td></tr>
                ) : shifts.map((shift: Shift) => {
                  const fillRate = shift.requiredEmployees > 0 ? (shift.assignedEmployees / shift.requiredEmployees) * 100 : 0;
                  return (
                    <tr key={shift.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-6 py-4 font-medium text-[#212121]">{shift.name}</td>
                      <td className="px-6 py-4 text-[#616161]">{shift.timeRange}</td>
                      <td className="px-6 py-4 text-[#616161]">{shift.date}</td>
                      <td className="px-6 py-4 text-[#616161]">{shift.department}</td>
                      <td className="px-6 py-4 font-medium text-[#212121]">{shift.assignedEmployees}</td>
                      <td className="px-6 py-4 text-[#616161]">{shift.requiredEmployees}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-[#E5E7EB] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                fillRate >= 90 ? 'bg-[#16A34A]' :
                                fillRate >= 70 ? 'bg-[#F59E0B]' :
                                'bg-[#EF4444]'
                              }`}
                              style={{ width: `${Math.min(fillRate, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${
                            fillRate >= 90 ? 'text-[#16A34A]' :
                            fillRate >= 70 ? 'text-[#F59E0B]' :
                            'text-[#EF4444]'
                          }`}>
                            {fillRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {subTab === 'attendance' && (
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#757575] font-medium border-b border-[#E0E0E0]">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Check In</th>
                <th className="px-6 py-3">Check Out</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Hours Worked</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {attendance.map(record => (
                <tr key={record.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[#212121]">{record.employeeName}</p>
                      <p className="text-xs text-[#757575]">{record.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#616161]">{record.date}</td>
                  <td className="px-6 py-4 text-[#616161]">{record.checkIn || '-'}</td>
                  <td className="px-6 py-4 text-[#616161]">{record.checkOut || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'present' ? 'bg-[#DCFCE7] text-[#166534]' :
                      record.status === 'late' ? 'bg-[#FEF9C3] text-[#854D0E]' :
                      record.status === 'on-leave' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                      'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {record.status === 'on-leave' ? 'On Leave' :
                       record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-[#212121]">
                    {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.status === 'absent' && (
                      <button 
                        onClick={() => handleMarkAttendance(record.id, 'present')}
                        className="text-[#16A34A] hover:text-[#15803D] font-medium text-xs"
                      >
                        Mark Present
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal - only when on roster tab */}
      {showAddModal && subTab !== 'shifts' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Full Name</label>
                  <input 
                    type="text"
                    placeholder="John Doe"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Employee ID</label>
                  <input 
                    type="text"
                    placeholder="EMP-XXX"
                    value={newEmployee.employeeId}
                    onChange={(e) => setNewEmployee({...newEmployee, employeeId: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Role</label>
                <input 
                  type="text"
                  placeholder="e.g., Lead Operator"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Department</label>
                  <select 
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value as any})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="operators">Operators</option>
                    <option value="qc">QC Staff</option>
                    <option value="supervisors">Supervisors</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Assigned Line</label>
                  <input 
                    type="text"
                    placeholder="Line A"
                    value={newEmployee.assignedLine}
                    onChange={(e) => setNewEmployee({...newEmployee, assignedLine: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Shift</label>
                  <select 
                    value={newEmployee.shift}
                    onChange={(e) => setNewEmployee({...newEmployee, shift: e.target.value as any})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="morning">Morning (6-2)</option>
                    <option value="afternoon">Afternoon (2-10)</option>
                    <option value="night">Night (10-6)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Phone</label>
                  <input 
                    type="text"
                    placeholder="Optional"
                    value={newEmployee.phoneNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, phoneNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddEmployee}
                className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D]"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal - only when on Shift Planning tab */}
      {showAddModal && subTab === 'shifts' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Schedule New Shift</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Shift Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Morning Shift"
                  value={newShift.name}
                  onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Start Time</label>
                  <input 
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">End Time</label>
                  <input 
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Date</label>
                  <input 
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({...newShift, date: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#212121] mb-2">Required Staff</label>
                  <input 
                    type="number"
                    placeholder="20"
                    value={newShift.requiredEmployees}
                    onChange={(e) => setNewShift({...newShift, requiredEmployees: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#212121] mb-2">Department</label>
                <select 
                  value={newShift.department}
                  onChange={(e) => setNewShift({...newShift, department: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="All">All Departments</option>
                  <option value="Operators">Operators</option>
                  <option value="QC">QC Staff</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#E0E0E0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddShift}
                className="px-4 py-2 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#2563EB]"
              >
                Schedule Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#212121]">Employee Profile</h3>
              <button onClick={() => setShowProfileModal(null)} className="text-[#757575] hover:text-[#212121]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center pb-4 border-b border-[#E0E0E0]">
                <div className="w-20 h-20 bg-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={32} className="text-white" />
                </div>
                <h4 className="font-bold text-xl text-[#212121]">{showProfileModal.name}</h4>
                <p className="text-sm text-[#757575]">{showProfileModal.employeeId}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#757575]">Role</span>
                  <p className="font-bold text-[#212121]">{showProfileModal.role}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Department</span>
                  <p className="font-bold text-[#212121] capitalize">{showProfileModal.department}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Assigned Line</span>
                  <p className="font-bold text-[#212121]">{showProfileModal.assignedLine || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Shift</span>
                  <p className="font-bold text-[#212121]">{showProfileModal.shiftTime}</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Productivity</span>
                  <p className="font-bold text-[#16A34A]">{showProfileModal.productivity || 0}%</p>
                </div>
                <div>
                  <span className="text-xs text-[#757575]">Attendance</span>
                  <p className="font-bold text-[#16A34A]">{showProfileModal.attendance || 0}%</p>
                </div>
              </div>
              {showProfileModal.phoneNumber && (
                <div className="bg-[#F5F5F5] p-3 rounded-lg">
                  <span className="text-xs text-[#757575] block mb-1">Contact</span>
                  <p className="text-sm font-medium text-[#212121]">{showProfileModal.phoneNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}