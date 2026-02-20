const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');

// Employee Leave Summary (GET /api/analytics/leaves)
const getLeaveAnalytics = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const employees = await User.find({ company: req.user.company, isActive: true })
      .select('name phone role');

    const allLeaves = await Leave.find({
      company: req.user.company,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    });

    const employeeLeaves = employees.map(emp => {
      const empLeaves = allLeaves.filter(l => l.user.toString() === emp._id.toString());

      let casualUsed = 0, sickUsed = 0, annualUsed = 0, unpaidUsed = 0;
      empLeaves.forEach(l => {
        if (l.leaveType === 'casual') casualUsed += l.totalDays;
        else if (l.leaveType === 'sick') sickUsed += l.totalDays;
        else if (l.leaveType === 'annual') annualUsed += l.totalDays;
        else if (l.leaveType === 'unpaid') unpaidUsed += l.totalDays;
      });

      const casualTotal = 6, earnedTotal = 10, sickTotal = 30;

      return {
        _id: emp._id,
        name: emp.name,
        phone: emp.phone,
        role: emp.role,
        leaves: {
          casual: { total: casualTotal, used: casualUsed, remaining: Math.max(0, casualTotal - casualUsed) },
          earned: { total: earnedTotal, used: annualUsed, remaining: Math.max(0, earnedTotal - annualUsed) },
          sick: { total: sickTotal, used: sickUsed, remaining: Math.max(0, sickTotal - sickUsed) },
          unpaid: { used: unpaidUsed }
        },
        totalUsed: casualUsed + sickUsed + annualUsed + unpaidUsed,
        totalRemaining: Math.max(0, casualTotal - casualUsed) + Math.max(0, earnedTotal - annualUsed) + Math.max(0, sickTotal - sickUsed)
      };
    });

    // Summary totals
    const summary = {
      totalEmployees: employees.length,
      totalCasualUsed: employeeLeaves.reduce((sum, e) => sum + e.leaves.casual.used, 0),
      totalSickUsed: employeeLeaves.reduce((sum, e) => sum + e.leaves.sick.used, 0),
      totalEarnedUsed: employeeLeaves.reduce((sum, e) => sum + e.leaves.earned.used, 0),
      totalUnpaidUsed: employeeLeaves.reduce((sum, e) => sum + (e.leaves.unpaid?.used || 0), 0),
    };

    return res.json({
      success: true,
      data: {
        employees: employeeLeaves,
        summary,
        year: currentYear
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// KPI Analytics (GET /api/analytics/kpi)
const getKPIAnalytics = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const searchMonth = month || currentDate.getMonth() + 1;
    const searchYear = year || currentDate.getFullYear();

    const startDate = `${searchYear}-${String(searchMonth).padStart(2, '0')}-01`;
    const endDate = `${searchYear}-${String(searchMonth).padStart(2, '0')}-31`;

    const employees = await User.find({ company: req.user.company, isActive: true })
      .select('name phone role');

    const allAttendances = await Attendance.find({
      company: req.user.company,
      date: { $gte: startDate, $lte: endDate }
    });

    const allLeaves = await Leave.find({
      company: req.user.company,
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate }
    });

    const workingDays = 22;

    const employeeKPI = employees.map(emp => {
      const empAtt = allAttendances.filter(a => a.user.toString() === emp._id.toString());
      const empLeaves = allLeaves.filter(l => l.user.toString() === emp._id.toString());

      const presentDays = empAtt.filter(a => a.status === 'present').length;
      const lateDays = empAtt.filter(a => a.status === 'late').length;
      const totalWorkDays = presentDays + lateDays;

      let leaveDays = 0;
      empLeaves.forEach(l => { leaveDays += l.totalDays; });

      const absentDays = Math.max(0, workingDays - totalWorkDays - leaveDays);

      const totalWorkHours = empAtt.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const avgWorkHours = totalWorkDays > 0 ? Math.round((totalWorkHours / totalWorkDays) * 100) / 100 : 0;

      // KPI Score (100 point system)
      const attendanceScore = Math.round((totalWorkDays / workingDays) * 40); // 40 points
      const punctualityScore = totalWorkDays > 0 ? Math.round(((totalWorkDays - lateDays) / totalWorkDays) * 30) : 0; // 30 points
      const workHoursScore = Math.min(30, Math.round((avgWorkHours / 8) * 30)); // 30 points
      const kpiScore = Math.min(100, attendanceScore + punctualityScore + workHoursScore);

      let kpiGrade = 'F';
      if (kpiScore >= 90) kpiGrade = 'A+';
      else if (kpiScore >= 80) kpiGrade = 'A';
      else if (kpiScore >= 70) kpiGrade = 'B+';
      else if (kpiScore >= 60) kpiGrade = 'B';
      else if (kpiScore >= 50) kpiGrade = 'C';
      else if (kpiScore >= 40) kpiGrade = 'D';

      return {
        _id: emp._id,
        name: emp.name,
        phone: emp.phone,
        role: emp.role,
        attendance: {
          workingDays,
          presentDays,
          lateDays,
          absentDays,
          leaveDays,
          totalWorkDays,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          avgWorkHours
        },
        kpi: {
          score: kpiScore,
          grade: kpiGrade,
          breakdown: {
            attendance: attendanceScore,
            punctuality: punctualityScore,
            workHours: workHoursScore
          }
        }
      };
    });

    // Sort by KPI score
    employeeKPI.sort((a, b) => b.kpi.score - a.kpi.score);

    // Company averages
    const avgKPI = employeeKPI.length > 0
      ? Math.round(employeeKPI.reduce((sum, e) => sum + e.kpi.score, 0) / employeeKPI.length)
      : 0;

    const totalPresent = employeeKPI.reduce((sum, e) => sum + e.attendance.presentDays, 0);
    const totalLate = employeeKPI.reduce((sum, e) => sum + e.attendance.lateDays, 0);
    const totalAbsent = employeeKPI.reduce((sum, e) => sum + e.attendance.absentDays, 0);

    return res.json({
      success: true,
      data: {
        employees: employeeKPI,
        summary: {
          avgKPI,
          totalPresent,
          totalLate,
          totalAbsent,
          totalEmployees: employees.length,
          month: Number(searchMonth),
          year: Number(searchYear)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Salary Analytics (GET /api/analytics/salary)
const getSalaryAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const searchYear = year || new Date().getFullYear();

    const payrolls = await Payroll.find({
      company: req.user.company,
      year: Number(searchYear)
    }).populate('user', 'name phone role');

    // Monthly totals
    const monthlyData = [];
    for (let m = 1; m <= 12; m++) {
      const monthPayrolls = payrolls.filter(p => p.month === m);
      const totalBasic = monthPayrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
      const totalAllowances = monthPayrolls.reduce((sum, p) => sum + (p.totalAllowances || 0), 0);
      const totalDeductions = monthPayrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
      const totalOT = monthPayrolls.reduce((sum, p) => sum + (p.totalOvertimePay || 0), 0);
      const totalSSB = monthPayrolls.reduce((sum, p) => sum + (p.ssb?.employeeContribution || 0) + (p.ssb?.employerContribution || 0), 0);
      const totalTax = monthPayrolls.reduce((sum, p) => sum + (p.incomeTax?.taxAmount || 0), 0);
      const totalNet = monthPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      const totalGross = monthPayrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);

      monthlyData.push({
        month: m,
        monthName: new Date(searchYear, m - 1).toLocaleString('en-US', { month: 'short' }),
        employeeCount: monthPayrolls.length,
        totalBasic,
        totalAllowances,
        totalDeductions,
        totalOT,
        totalSSB,
        totalTax,
        totalNet,
        totalGross,
        paid: monthPayrolls.filter(p => p.status === 'paid').length,
        pending: monthPayrolls.filter(p => p.status !== 'paid').length,
      });
    }

    // Current month details
    const currentMonth = new Date().getMonth() + 1;
    const currentPayrolls = payrolls.filter(p => p.month === currentMonth);

    const employeeSalaries = currentPayrolls.map(p => ({
      _id: p._id,
      name: p.user?.name || 'Unknown',
      role: p.user?.role || 'employee',
      basicSalary: p.basicSalary || 0,
      totalAllowances: p.totalAllowances || 0,
      totalDeductions: p.totalDeductions || 0,
      grossSalary: p.grossSalary || 0,
      netSalary: p.netSalary || 0,
      status: p.status,
      paymentMethod: p.paymentMethod,
    }));

    // Year totals
    const yearTotal = {
      totalGross: monthlyData.reduce((sum, m) => sum + m.totalGross, 0),
      totalNet: monthlyData.reduce((sum, m) => sum + m.totalNet, 0),
      totalSSB: monthlyData.reduce((sum, m) => sum + m.totalSSB, 0),
      totalTax: monthlyData.reduce((sum, m) => sum + m.totalTax, 0),
      totalOT: monthlyData.reduce((sum, m) => sum + m.totalOT, 0),
    };

    return res.json({
      success: true,
      data: {
        monthlyData,
        employeeSalaries,
        yearTotal,
        year: Number(searchYear),
        currentMonth
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getLeaveAnalytics, getKPIAnalytics, getSalaryAnalytics };