import React, { useState, useEffect } from 'react';
import { Users, Clock, Zap, UserCheck, X, Download, Search, Plus, Calendar, TrendingUp, Award, AlertCircle, CheckCircle2, XCircle, Coffee } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { EmptyState, LoadingState } from '../../ui/ux-components';
import { toast } from 'sonner';
import { 
  fetchStaff, 
  addStaff as apiAddStaff,
  fetchSchedules, 
  createShiftSchedule as apiCreateSchedule, 
  assignStaffToShift as apiAssignStaff,
  fetchTrainings,
  addTraining as apiAddTraining,
  logStaffAttendance,
  fetchAttendance,
  fetchPerformance,
  fetchLeaveRequests,
  createLeaveRequest as apiCreateLeaveRequest,
  updateLeaveStatus as apiUpdateLeaveStatus,
  Staff,
  ShiftSchedule,
  Attendance,
  Performance,
  LeaveRequest,
  Training
} from './warehouseApi';

export function WorkforceShifts() {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'attendance' | 'performance' | 'leave-requests' | 'training'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [showTrainingDetailsModal, setShowTrainingDetailsModal] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ShiftSchedule | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [newSchedule, setNewSchedule] = useState({ date: '', shift: 'morning' as const, requiredStaff: '' });
  const [newAttendance, setNewAttendance] = useState({ staffId: '', date: '', checkIn: '', checkOut: '' });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', role: '', shift: 'morning' as const, hourlyRate: '' });
  const [newLeave, setNewLeave] = useState({ staffId: '', leaveType: 'casual' as const, startDate: '', endDate: '', reason: '' });
  const [newTraining, setNewTraining] = useState({ title: '', type: '', date: '', duration: '', instructor: '', capacity: '' });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await fetchStaff();
        setStaff(data);
      } else if (activeTab === 'schedule') {
        const data = await fetchSchedules();
        setSchedules(data);
      } else if (activeTab === 'training') {
        const data = await fetchTrainings();
        setTrainings(data);
      } else if (activeTab === 'attendance') {
        const data = await fetchAttendance();
        setAttendance(data);
      } else if (activeTab === 'performance') {
        const data = await fetchPerformance();
        setPerformance(data);
      } else if (activeTab === 'leave-requests') {
        const data = await fetchLeaveRequests();
        setLeaveRequests(data);
      }
      // Leave and Performance might need their own endpoints or filtering from staff
    } catch (error) {
      toast.error('Failed to load workforce data');
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    if (newSchedule.date && newSchedule.requiredStaff) {
      try {
        await apiCreateSchedule({
          date: newSchedule.date,
          shift: newSchedule.shift,
          requiredStaff: parseInt(newSchedule.requiredStaff)
        });
        toast.success('Schedule created successfully');
        setNewSchedule({ date: '', shift: 'morning', requiredStaff: '' });
        setShowScheduleModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to create schedule');
      }
    }
  };

  const handleAssignStaff = async (scheduleId: string, currentStaffIds: string[], staffId: string, action: 'add' | 'remove') => {
    let newStaffIds = [];
    if (action === 'add') {
      newStaffIds = [...currentStaffIds, staffId];
    } else {
      newStaffIds = currentStaffIds.filter(id => id !== staffId);
    }
    
    try {
      await apiAssignStaff(scheduleId, newStaffIds);
      toast.success(action === 'add' ? 'Staff assigned' : 'Staff removed');
      
      // Update local state for immediate feedback if needed, but loadData will refresh it
      setSchedules(prev => prev.map(s => 
        s.id === scheduleId ? { ...s, staffAssigned: newStaffIds } : s
      ));
      
      if (selectedSchedule && selectedSchedule.id === scheduleId) {
        setSelectedSchedule({ ...selectedSchedule, staffAssigned: newStaffIds });
      }
    } catch (error) {
      toast.error('Failed to update staff assignment');
    }
  };

  const logAttendance = async () => {
    if (newAttendance.staffId && newAttendance.date) {
      const staffName = staff.find(s => s.id === newAttendance.staffId)?.name ?? '';
      try {
        await logStaffAttendance({
          ...newAttendance,
          staffName: staffName || newAttendance.staffId,
        });
        toast.success('Attendance logged');
        setNewAttendance({ staffId: '', date: '', checkIn: '', checkOut: '' });
        setShowAttendanceModal(false);
        loadData();
      } catch (error) {
        toast.error('Failed to log attendance');
      }
    }
  };

  const addStaff = async () => {
    if (!newStaff.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await apiAddStaff({
        name: newStaff.name.trim(),
        email: newStaff.email || undefined,
        phone: newStaff.phone || undefined,
        role: newStaff.role || 'Picker',
        shift: newStaff.shift,
        hourlyRate: newStaff.hourlyRate ? parseFloat(newStaff.hourlyRate) : undefined,
      });
      toast.success('Staff member added');
      setShowRosterModal(false);
      setNewStaff({ name: '', email: '', phone: '', role: '', shift: 'morning', hourlyRate: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to add staff');
    }
  };

  const createLeaveRequest = async () => {
    const staffName = staff.find(s => s.id === newLeave.staffId)?.name ?? '';
    const days = newLeave.startDate && newLeave.endDate
      ? Math.max(1, Math.ceil((new Date(newLeave.endDate).getTime() - new Date(newLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;
    try {
      await apiCreateLeaveRequest({
        ...newLeave,
        staffName: staffName || newLeave.staffId,
        days,
      });
      toast.success('Leave request submitted');
      setShowLeaveModal(false);
      setNewLeave({ staffId: '', leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to submit leave request');
    }
  };

  const updateLeaveStatus = async (id: string, status: string) => {
    try {
      await apiUpdateLeaveStatus(id, status);
      toast.success(`Leave request ${status}`);
      loadData();
    } catch (error) {
      toast.error(`Failed to ${status} leave request`);
    }
  };

  const createTraining = async () => {
    if (!newTraining.title?.trim() || !newTraining.date) {
      toast.error('Title and date are required');
      return;
    }
    try {
      await apiAddTraining({
        title: newTraining.title.trim(),
        type: newTraining.type || 'Mandatory',
        date: newTraining.date,
        duration: newTraining.duration || '1h',
        instructor: newTraining.instructor || 'TBD',
        capacity: newTraining.capacity ? parseInt(newTraining.capacity, 10) : 20,
      });
      toast.success('Training program created');
      setShowTrainingModal(false);
      setNewTraining({ title: '', type: '', date: '', duration: '', instructor: '', capacity: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create training');
    }
  };

  const exportData = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvData: any[] = [];

    if (activeTab === 'schedule') {
      csvData = [
        ['Shift Schedule Report', `Date: ${today}`],
        [''],
        ['Date', 'Shift', 'Required Staff', 'Assigned Staff', 'Status'],
        ...schedules.map(s => [s.date, s.shift, s.requiredStaff, s.staffAssigned.length, s.status]),
      ];
    } else if (activeTab === 'attendance') {
      csvData = [
        ['Attendance Report', `Date: ${today}`],
        [''],
        ['Staff Name', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status'],
        ...attendance.map(a => [a.staffName, a.date, a.checkIn, a.checkOut, a.hoursWorked, a.status]),
      ];
    } else if (activeTab === 'performance') {
      csvData = [
        ['Performance Report', `Date: ${today}`],
        [''],
        ['Staff Name', 'Role', 'Weekly Target', 'Weekly Actual', 'Accuracy %', 'Avg Speed', 'Rating'],
        ...performance.map(p => [p.staffName, p.role, p.weeklyTarget, p.weeklyActual, p.accuracy, p.avgSpeed, p.rating]),
      ];
    } else if (activeTab === 'leave-requests') {
      csvData = [
        ['Leave Requests Report', `Date: ${today}`],
        [''],
        ['Staff Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
        ...leaveRequests.map(l => [l.staffName, l.leaveType, l.startDate, l.endDate, l.days, l.status, l.reason]),
      ];
    } else if (activeTab === 'training') {
      csvData = [
        ['Training Programs Report', `Date: ${today}`],
        [''],
        ['Training ID', 'Title', 'Type', 'Date', 'Duration', 'Instructor', 'Enrolled/Capacity', 'Status'],
        ...trainings.map(t => [t.trainingId, t.title, t.type, t.date, t.duration, t.instructor, `${t.enrolled}/${t.capacity}`, t.status]),
      ];
    } else {
      csvData = [
        ['Workforce & Shifts Report', `Date: ${today}`],
        [''],
        ['Summary Metrics'],
        ['Total Staff', staff.length.toString()],
        ['Active Staff', staff.filter(s => s.status === 'active').length.toString()],
        ['Avg Productivity', `${Math.round(staff.reduce((sum, s) => sum + s.productivity, 0) / staff.length)} UPH`],
        [''],
        ['Staff Details'],
        ['Name', 'Role', 'Shift', 'Status', 'Productivity (UPH)', 'Email', 'Phone', 'Join Date', 'Hourly Rate'],
        ...staff.map(s => [s.name, s.role, s.shift, s.status, s.productivity.toString(), s.email, s.phone, s.joinDate, `₹${s.hourlyRate}`]),
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-${activeTab}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSchedules = schedules.filter(s =>
    s.date.includes(searchTerm) || s.shift.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = attendance.filter(a =>
    a.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.date.includes(searchTerm)
  );

  const filteredPerformance = performance.filter(p =>
    p.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeaves = leaveRequests.filter(l =>
    l.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTrainings = trainings.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.status === 'active').length;
  const avgProductivity = staff.length > 0
    ? Math.round(staff.reduce((sum, s) => sum + (s.productivity ?? 0), 0) / staff.length)
    : 0;
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce & Shifts"
        subtitle="Shift rostering, staff performance, and labor productivity"
        actions={[
          <button 
            key="export"
            onClick={exportData}
            className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC] flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>,
          activeTab === 'overview' && (
            <button 
              key="staff"
              onClick={() => setShowRosterModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Add Staff
            </button>
          ),
          activeTab === 'schedule' && (
            <button 
              key="schedule"
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Create Schedule
            </button>
          ),
          activeTab === 'attendance' && (
            <button 
              key="attendance"
              onClick={() => setShowAttendanceModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Log Attendance
            </button>
          ),
          activeTab === 'leave-requests' && (
            <button 
              key="leave"
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              New Request
            </button>
          ),
          activeTab === 'training' && (
            <button 
              key="training"
              onClick={() => setShowTrainingModal(true)}
              className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4] flex items-center gap-2"
            >
              <Plus size={16} />
              Add Training
            </button>
          )
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Total Staff</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{staff.length}</p>
          <p className="text-xs text-green-600 font-bold">{activeStaff} Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Shifts</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{schedules.length}</p>
          <p className="text-xs text-[#64748B]">Scheduled</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><Zap size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Productivity</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{avgProductivity}</p>
          <p className="text-xs text-green-600 font-bold">UPH Average</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><UserCheck size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Attendance</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{attendanceRate}%</p>
          <p className="text-xs text-[#64748B]">This Week</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Calendar size={18} /></div>
            <span className="text-sm font-bold text-[#64748B]">Leave Requests</span>
          </div>
          <p className="text-2xl font-bold text-[#1E293B]">{leaveRequests.filter(l => l.status === 'pending').length}</p>
          <p className="text-xs text-[#64748B]">Pending</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => { setActiveTab('schedule'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'schedule' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Shift Schedule
        </button>
        <button
          onClick={() => { setActiveTab('attendance'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attendance' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => { setActiveTab('performance'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'performance' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => { setActiveTab('leave-requests'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'leave-requests' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => { setActiveTab('training'); setSearchTerm(''); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'training' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          Training
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-bold text-[#1E293B] mb-3">Current Shift Roster</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search staff by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12"><EmptyState title="No staff" message="Add staff members to see them here." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Shift</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Productivity</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredStaff.map(member => (
                  <tr key={member.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{member.name}</td>
                    <td className="px-6 py-4 text-[#64748B]">{member.role}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.shift === 'morning' ? 'bg-blue-100 text-blue-700' :
                        member.shift === 'afternoon' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {member.shift.charAt(0).toUpperCase() + member.shift.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'active' ? 'bg-green-100 text-green-700' :
                        member.status === 'break' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={`h-full ${member.productivity >= 90 ? 'bg-green-500' : member.productivity >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${member.productivity}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-[#64748B] min-w-[40px]">{member.productivity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-[#64748B]">
                        <p>{member.email}</p>
                        <p>{member.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedStaff(member);
                          setShowStaffDetailsModal(true);
                        }}
                        className="text-[#0891b2] hover:underline text-xs font-bold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Shift Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search by date or shift..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-12"><EmptyState title="No schedules" message="Create a shift schedule to see it here." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Shift</th>
                  <th className="px-6 py-3">Required Staff</th>
                  <th className="px-6 py-3">Assigned Staff</th>
                  <th className="px-6 py-3">Coverage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredSchedules.map(schedule => {
                  const coverage = Math.round((schedule.staffAssigned.length / schedule.requiredStaff) * 100);
                  return (
                    <tr key={schedule.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{schedule.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.shift === 'morning' ? 'bg-blue-100 text-blue-700' :
                          schedule.shift === 'afternoon' ? 'bg-amber-100 text-amber-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {schedule.shift.charAt(0).toUpperCase() + schedule.shift.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{schedule.requiredStaff}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{schedule.staffAssigned.length}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#E2E8F0] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                coverage >= 100 ? 'bg-green-500' :
                                coverage >= 80 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(coverage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-[#64748B]">{coverage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.status === 'full' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          schedule.status === 'overstaffed' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                          'bg-[#FEE2E2] text-[#991B1B]'
                        }`}>
                          {schedule.status === 'understaffed' ? 'Understaffed' :
                           schedule.status === 'overstaffed' ? 'Overstaffed' :
                           'Full'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setShowAssignStaffModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          Assign Staff
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search by staff name or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredAttendance.length === 0 ? (
            <div className="p-12"><EmptyState title="No attendance records" message="Log attendance to see records here." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Check In</th>
                  <th className="px-6 py-3">Check Out</th>
                  <th className="px-6 py-3">Hours Worked</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAttendance.map(record => (
                  <tr key={record.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{record.staffName || staff.find(s => s.id === record.staffId)?.name || record.staffId || '—'}</td>
                    <td className="px-6 py-4 text-[#64748B]">{record.date}</td>
                    <td className="px-6 py-4 text-[#64748B]">{record.checkIn}</td>
                    <td className="px-6 py-4 text-[#64748B]">{record.checkOut}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{record.hoursWorked}h</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'present' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        record.status === 'late' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        record.status === 'half-day' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                        'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {record.status === 'half-day' ? 'Half Day' :
                         record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search by staff name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredPerformance.length === 0 ? (
            <div className="p-12"><EmptyState title="No performance data" message="Performance metrics will appear as staff complete tasks." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Weekly Target</th>
                  <th className="px-6 py-3">Weekly Actual</th>
                  <th className="px-6 py-3">Achievement</th>
                  <th className="px-6 py-3">Accuracy</th>
                  <th className="px-6 py-3">Avg Speed</th>
                  <th className="px-6 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPerformance.map(perf => {
                  const achievement = Math.round((perf.weeklyActual / perf.weeklyTarget) * 100);
                  return (
                    <tr key={perf.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{perf.staffName}</td>
                      <td className="px-6 py-4 text-[#64748B]">{perf.role}</td>
                      <td className="px-6 py-4 text-[#64748B]">{perf.weeklyTarget}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{perf.weeklyActual}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${
                          achievement >= 100 ? 'text-green-600' :
                          achievement >= 80 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {achievement}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-[#1E293B]">{perf.accuracy}%</span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{perf.avgSpeed} UPH</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Award size={14} className="text-amber-500" />
                          <span className="font-bold text-[#1E293B]">{perf.rating}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leave-requests' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search by staff name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredLeaves.length === 0 ? (
            <div className="p-12"><EmptyState title="No leave requests" message="Submit a leave request to see it here." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Days</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{leave.staffName || staff.find(s => s.id === leave.staffId)?.name || leave.staffId || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leave.leaveType === 'sick' ? 'bg-red-100 text-red-700' :
                        leave.leaveType === 'casual' ? 'bg-blue-100 text-blue-700' :
                        leave.leaveType === 'emergency' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">{leave.startDate}</td>
                    <td className="px-6 py-4 text-[#64748B]">{leave.endDate}</td>
                    <td className="px-6 py-4 font-medium text-[#1E293B]">{leave.days}</td>
                    <td className="px-6 py-4 text-[#64748B]">{leave.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leave.status === 'approved' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        leave.status === 'rejected' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        'bg-[#F1F5F9] text-[#64748B]'
                      }`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' && (
                        <div className="flex items-center gap-2 justify-end">
                          <button 
                            onClick={() => updateLeaveStatus(leave.id, 'approved')}
                            className="text-green-600 hover:underline text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                            className="text-red-600 hover:underline text-xs font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input 
                type="text"
                placeholder="Search training programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingState /></div>
          ) : filteredTrainings.length === 0 ? (
            <div className="p-12"><EmptyState title="No training programs" message="Add a training program to see it here." /></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Training ID</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Instructor</th>
                  <th className="px-6 py-3">Enrollment</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredTrainings.map(training => {
                  const enrollmentRate = Math.round((training.enrolled / training.capacity) * 100);
                  return (
                    <tr key={training.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4 font-mono text-xs text-[#475569]">{training.trainingId}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{training.title}</td>
                      <td className="px-6 py-4 text-[#64748B]">{training.type}</td>
                      <td className="px-6 py-4 text-[#64748B]">{training.date}</td>
                      <td className="px-6 py-4 text-[#64748B]">{training.duration}</td>
                      <td className="px-6 py-4 text-[#64748B]">{training.instructor}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1E293B]">{training.enrolled}/{training.capacity}</span>
                          <span className={`text-xs ${enrollmentRate >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                            ({enrollmentRate}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          training.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          training.status === 'in-progress' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                          'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {training.status === 'in-progress' ? 'In Progress' :
                           training.status.charAt(0).toUpperCase() + training.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedTraining(training);
                            setShowTrainingDetailsModal(true);
                          }}
                          className="text-[#0891b2] hover:underline text-xs font-bold"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Add New Staff Member</h3>
              <button onClick={() => setShowRosterModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Full Name</label>
                <input 
                  type="text"
                  placeholder="Enter name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Email</label>
                <input 
                  type="email"
                  placeholder="email@warehouse.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Phone</label>
                <input 
                  type="tel"
                  placeholder="+1-555-0000"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Role</label>
                <select 
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select role</option>
                  <option>Picker</option>
                  <option>Packer</option>
                  <option>Forklift Operator</option>
                  <option>QC Inspector</option>
                  <option>Supervisor</option>
                  <option>Warehouse Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Shift</label>
                <select 
                  value={newStaff.shift}
                  onChange={(e) => setNewStaff({...newStaff, shift: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="morning">Morning (6AM - 2PM)</option>
                  <option value="afternoon">Afternoon (2PM - 10PM)</option>
                  <option value="night">Night (10PM - 6AM)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Hourly Rate (₹)</label>
                <input 
                  type="number"
                  placeholder="18.00"
                  value={newStaff.hourlyRate}
                  onChange={(e) => setNewStaff({...newStaff, hourlyRate: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={addStaff}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Create Shift Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Date</label>
                <input 
                  type="date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Shift</label>
                <select 
                  value={newSchedule.shift}
                  onChange={(e) => setNewSchedule({...newSchedule, shift: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="morning">Morning (6AM - 2PM)</option>
                  <option value="afternoon">Afternoon (2PM - 10PM)</option>
                  <option value="night">Night (10PM - 6AM)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Required Staff</label>
                <input 
                  type="number"
                  placeholder="5"
                  value={newSchedule.requiredStaff}
                  onChange={(e) => setNewSchedule({...newSchedule, requiredStaff: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createSchedule}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Log Attendance</h3>
              <button onClick={() => setShowAttendanceModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Staff Member</label>
                <select 
                  value={newAttendance.staffId}
                  onChange={(e) => setNewAttendance({...newAttendance, staffId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select staff</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Date</label>
                <input 
                  type="date"
                  value={newAttendance.date}
                  onChange={(e) => setNewAttendance({...newAttendance, date: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Check In</label>
                  <input 
                    type="time"
                    value={newAttendance.checkIn}
                    onChange={(e) => setNewAttendance({...newAttendance, checkIn: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Check Out</label>
                  <input 
                    type="time"
                    value={newAttendance.checkOut}
                    onChange={(e) => setNewAttendance({...newAttendance, checkOut: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={logAttendance}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Log Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">New Leave Request</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Staff Member</label>
                <select 
                  value={newLeave.staffId}
                  onChange={(e) => setNewLeave({...newLeave, staffId: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select staff</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Leave Type</label>
                <select 
                  value={newLeave.leaveType}
                  onChange={(e) => setNewLeave({...newLeave, leaveType: e.target.value as any})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="vacation">Vacation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Start Date</label>
                  <input 
                    type="date"
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({...newLeave, startDate: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">End Date</label>
                  <input 
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({...newLeave, endDate: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Reason</label>
                <textarea 
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})}
                  placeholder="Enter reason for leave..."
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createLeaveRequest}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Modal */}
      {showTrainingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1E293B]">Add Training Program</h3>
              <button onClick={() => setShowTrainingModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Training Title</label>
                <input 
                  type="text"
                  placeholder="Enter training title"
                  value={newTraining.title}
                  onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Type</label>
                <select 
                  value={newTraining.type}
                  onChange={(e) => setNewTraining({...newTraining, type: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                >
                  <option value="">Select type</option>
                  <option>Safety</option>
                  <option>Quality</option>
                  <option>Technical</option>
                  <option>Operational</option>
                  <option>Leadership</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Date</label>
                  <input 
                    type="date"
                    value={newTraining.date}
                    onChange={(e) => setNewTraining({...newTraining, date: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Duration</label>
                  <input 
                    type="text"
                    placeholder="4 hours"
                    value={newTraining.duration}
                    onChange={(e) => setNewTraining({...newTraining, duration: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Instructor</label>
                <input 
                  type="text"
                  placeholder="Instructor name"
                  value={newTraining.instructor}
                  onChange={(e) => setNewTraining({...newTraining, instructor: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Capacity</label>
                <input 
                  type="number"
                  placeholder="10"
                  value={newTraining.capacity}
                  onChange={(e) => setNewTraining({...newTraining, capacity: e.target.value})}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex gap-3 justify-end">
              <button 
                onClick={() => setShowTrainingModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button 
                onClick={createTraining}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#06b6d4]"
              >
                Add Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffDetailsModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Staff Details - {selectedStaff.name}</h3>
              <button onClick={() => setShowStaffDetailsModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Name</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.name}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Role</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.role}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Shift</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.shift.charAt(0).toUpperCase() + selectedStaff.shift.slice(1)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className={`font-bold ${
                    selectedStaff.status === 'active' ? 'text-green-600' :
                    selectedStaff.status === 'break' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {selectedStaff.status.charAt(0).toUpperCase() + selectedStaff.status.slice(1)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Productivity</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.productivity}%</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Hourly Rate</label>
                  <p className="font-bold text-[#1E293B]">₹{selectedStaff.hourlyRate}/hr</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Email</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.email}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Phone</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Join Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedStaff.joinDate}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowStaffDetailsModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {showAssignStaffModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Assign Staff - {selectedSchedule.date} ({selectedSchedule.shift})</h3>
              <button onClick={() => setShowAssignStaffModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedSchedule.date}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Shift</label>
                  <p className="font-bold text-[#1E293B]">{selectedSchedule.shift.charAt(0).toUpperCase() + selectedSchedule.shift.slice(1)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Required Staff</label>
                  <p className="font-bold text-[#1E293B]">{selectedSchedule.requiredStaff}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Currently Assigned</label>
                  <p className="font-bold text-[#1E293B]">{selectedSchedule.staffAssigned.length}</p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Available Staff</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {staff.filter(s => !selectedSchedule.staffAssigned.includes(s.id)).map(member => (
                    <div key={member.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#1E293B]">{member.name}</p>
                        <p className="text-sm text-[#64748B]">{member.role} • {member.shift.charAt(0).toUpperCase() + member.shift.slice(1)}</p>
                      </div>
                      <button 
                        onClick={() => handleAssignStaff(selectedSchedule.id, selectedSchedule.staffAssigned, member.id, 'add')}
                        className="px-4 py-2 bg-[#0891b2] text-white text-sm font-medium rounded-lg hover:bg-[#06b6d4]"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                  {staff.filter(s => !selectedSchedule.staffAssigned.includes(s.id)).length === 0 && (
                    <p className="text-sm text-[#64748B] text-center py-4">No available staff</p>
                  )}
                </div>
              </div>
              {selectedSchedule.staffAssigned.length > 0 && (
                <div className="border-t border-[#E2E8F0] pt-4">
                  <h4 className="font-bold text-[#1E293B] mb-3">Assigned Staff</h4>
                  <div className="space-y-2">
                    {selectedSchedule.staffAssigned.map(staffId => {
                      const member = staff.find(s => s.id === staffId);
                      if (!member) return null;
                      return (
                        <div key={staffId} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                          <div>
                            <p className="font-bold text-[#1E293B]">{member.name}</p>
                            <p className="text-sm text-[#64748B]">{member.role}</p>
                          </div>
                          <button 
                            onClick={() => handleAssignStaff(selectedSchedule.id, selectedSchedule.staffAssigned, staffId, 'remove')}
                            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowAssignStaffModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Details Modal */}
      {showTrainingDetailsModal && selectedTraining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-[#1E293B]">Training Details - {selectedTraining.title}</h3>
              <button onClick={() => setShowTrainingDetailsModal(false)} className="text-[#64748B] hover:text-[#1E293B]">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Training ID</label>
                  <p className="font-bold text-[#1E293B] font-mono">{selectedTraining.trainingId}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Title</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.title}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Type</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.type}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Date</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.date}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Duration</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.duration}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Instructor</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.instructor}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Enrollment</label>
                  <p className="font-bold text-[#1E293B]">{selectedTraining.enrolled}/{selectedTraining.capacity}</p>
                </div>
                <div>
                  <label className="text-xs text-[#64748B] font-medium">Status</label>
                  <p className={`font-bold ${
                    selectedTraining.status === 'completed' ? 'text-green-600' :
                    selectedTraining.status === 'in-progress' ? 'text-blue-600' :
                    'text-amber-600'
                  }`}>
                    {selectedTraining.status === 'in-progress' ? 'In Progress' :
                     selectedTraining.status.charAt(0).toUpperCase() + selectedTraining.status.slice(1)}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <h4 className="font-bold text-[#1E293B] mb-3">Training Information</h4>
                <div className="bg-[#F8FAFC] p-4 rounded-lg space-y-2">
                  <p className="text-sm text-[#64748B]">Type: <span className="font-bold text-[#1E293B]">{selectedTraining.type}</span></p>
                  <p className="text-sm text-[#64748B]">Duration: <span className="font-bold text-[#1E293B]">{selectedTraining.duration}</span></p>
                  <p className="text-sm text-[#64748B]">Instructor: <span className="font-bold text-[#1E293B]">{selectedTraining.instructor}</span></p>
                  <p className="text-sm text-[#64748B]">Enrollment: <span className="font-bold text-[#1E293B]">{selectedTraining.enrolled} of {selectedTraining.capacity} spots filled</span></p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowTrainingDetailsModal(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#1E293B] font-medium rounded-lg hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
