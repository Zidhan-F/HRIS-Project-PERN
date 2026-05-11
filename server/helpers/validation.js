function validatePayrollInput(data) {
  const errors = [];
  if (data.baseSalary !== undefined) {
    const salary = Number(data.baseSalary);
    if (isNaN(salary) || salary < 0 || salary > 1000000000) errors.push('Gaji pokok tidak valid (0 - 1.000.000.000)');
  }
  if (data.allowance !== undefined) {
    const allowance = Number(data.allowance);
    if (isNaN(allowance) || allowance < 0 || allowance > 500000000) errors.push('Tunjangan tidak valid (0 - 500.000.000)');
  }
  if (data.role && !['employee', 'hrd', 'manager', 'admin'].includes(data.role)) errors.push('Role tidak valid');
  if (data.payrollStatus && !['Unpaid', 'Paid'].includes(data.payrollStatus)) errors.push('Status payroll tidak valid');
  if (data.leaveQuota !== undefined) {
    const quota = Number(data.leaveQuota);
    if (isNaN(quota) || quota < 0 || quota > 365) errors.push('Jatah cuti tidak valid (0-365)');
  }
  return errors;
}

function validateEmployeeInput(data) {
  const errors = [];
  if (data.role && !['employee', 'hrd', 'manager', 'admin'].includes(data.role)) errors.push('Role tidak valid');
  if (data.employmentStatus && !['Probation', 'Full-time', 'Contract'].includes(data.employmentStatus)) errors.push('Status kerja tidak valid');
  if (data.leaveQuota !== undefined) {
    const quota = Number(data.leaveQuota);
    if (isNaN(quota) || quota < 0 || quota > 365) errors.push('Jatah cuti tidak valid');
  }
  if (data.position && data.position.length > 100) errors.push('Posisi terlalu panjang (maks 100 karakter)');
  if (data.department && data.department.length > 100) errors.push('Departemen terlalu panjang (maks 100 karakter)');
  return errors;
}

function validateRequestInput(data) {
  const errors = [];
  if (!data.type || !['Leave', 'Permit', 'Sick', 'Overtime', 'Reimbursement', 'Timesheet', 'Expense', 'Other'].includes(data.type)) errors.push('Tipe request tidak valid');
  if (!data.reason || data.reason.trim().length === 0) errors.push('Alasan wajib diisi');
  if (data.reason && data.reason.length > 1000) errors.push('Alasan terlalu panjang (maks 1000 karakter)');
  if (data.amount !== undefined && data.amount !== '') {
    const amt = Number(data.amount);
    if (isNaN(amt) || amt < 0 || amt > 1000000000) errors.push('Jumlah tidak valid');
  }
  return errors;
}

function validateProfileInput(data) {
  const errors = [];
  if (data.name && (data.name.length < 2 || data.name.length > 100)) errors.push('Nama harus 2-100 karakter');
  if (data.bio && data.bio.length > 250) errors.push('Bio maksimal 250 karakter');
  if (data.phone && data.phone.length > 30) errors.push('Nomor HP terlalu panjang');
  if (data.address && data.address.length > 500) errors.push('Alamat terlalu panjang');
  if (data.gender && !['Male', 'Female', 'Other', '-'].includes(data.gender)) errors.push('Gender tidak valid');
  return errors;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { validatePayrollInput, validateEmployeeInput, validateRequestInput, validateProfileInput, calculateDistance };
