import api from './axios'

// ── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/admin/auth/login', data),
  logout: () => api.post('/admin/auth/logout'),
  me: () => api.get('/admin/auth/me'),
}

// ── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/admin/dashboard'),
}

// ── ACADEMIC ─────────────────────────────────────────────────────────────────
export const streamsAPI = {
  list: (params) => api.get('/admin/academic/streams', { params }),
  create: (data) => api.post('/admin/academic/streams', data),
  update: (id, data) => api.put(`/admin/academic/streams/${id}`, data),
  delete: (id) => api.delete(`/admin/academic/streams/${id}`),
}

export const departmentsAPI = {
  list: (params) => api.get('/admin/academic/departments', { params }),
  create: (data) => api.post('/admin/academic/departments', data),
  update: (id, data) => api.put(`/admin/academic/departments/${id}`, data),
  delete: (id) => api.delete(`/admin/academic/departments/${id}`),
}

export const branchesAPI = {
  list: (params) => api.get('/admin/academic/branches', { params }),
  create: (data) => api.post('/admin/academic/branches', data),
  update: (id, data) => api.put(`/admin/academic/branches/${id}`, data),
  delete: (id) => api.delete(`/admin/academic/branches/${id}`),
}

// ── STUDENTS ─────────────────────────────────────────────────────────────────
export const studentsAPI = {
  list: (params) => api.get('/admin/students', { params }),
  create: (data) => api.post('/admin/students', data),
  update: (id, data) => api.put(`/admin/students/${id}`, data),
  delete: (id) => api.delete(`/admin/students/${id}`),
  uploadCSV: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/students/csv/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  downloadTemplate: () => api.get('/admin/students/csv/template', { responseType: 'blob' }),
}

// ── FACULTY ──────────────────────────────────────────────────────────────────
export const facultyAPI = {
  list: (params) => api.get('/admin/faculty', { params }),
  create: (data) => api.post('/admin/faculty', data),
  update: (id, data) => api.put(`/admin/faculty/${id}`, data),
  delete: (id) => api.delete(`/admin/faculty/${id}`),
}

// ── ROOMS ────────────────────────────────────────────────────────────────────
export const roomsAPI = {
  list: (params) => api.get('/admin/rooms', { params }),
  getById: (id) => api.get(`/admin/rooms/${id}`),
  create: (data) => api.post('/admin/rooms', data),
  update: (id, data) => api.put(`/admin/rooms/${id}`, data),
  updateSeats: (id, seats) => api.put(`/admin/rooms/${id}/seats`, { seats }),
  delete: (id) => api.delete(`/admin/rooms/${id}`),
}

// ── EXAMS ────────────────────────────────────────────────────────────────────
export const examsAPI = {
  list: (params) => api.get('/admin/exams', { params }),
  create: (data) => api.post('/admin/exams', data),
  update: (id, data) => api.put(`/admin/exams/${id}`, data),
  delete: (id) => api.delete(`/admin/exams/${id}`),
}

// ── SHIFTS ───────────────────────────────────────────────────────────────────
export const shiftsAPI = {
  list: (examId) => api.get(`/admin/exams/${examId}/shifts`),
  create: (examId, data) => api.post(`/admin/exams/${examId}/shifts`, data),
  update: (examId, shiftId, data) => api.put(`/admin/exams/${examId}/shifts/${shiftId}`, data),
  delete: (examId, shiftId) => api.delete(`/admin/exams/${examId}/shifts/${shiftId}`),
  resolveStudents: (examId, shiftId) => api.post(`/admin/exams/${examId}/shifts/${shiftId}/resolve-students`),
}

// ── INVIGILATORS ─────────────────────────────────────────────────────────────
export const invigilatorsAPI = {
  list: (examId, shiftId) => api.get(`/admin/exams/${examId}/shifts/${shiftId}/invigilators`),
  assign: (examId, shiftId, data) => api.post(`/admin/exams/${examId}/shifts/${shiftId}/invigilators`, data),
  remove: (examId, shiftId, id) => api.delete(`/admin/exams/${examId}/shifts/${shiftId}/invigilators/${id}`),
}

// ── SEATING ──────────────────────────────────────────────────────────────────
export const seatingAPI = {
  generate: (examId, shiftId) => api.post(`/admin/exams/${examId}/shifts/${shiftId}/seating/generate`),
  preview: (examId, shiftId) => api.get(`/admin/exams/${examId}/shifts/${shiftId}/seating/preview`),
  swap: (examId, shiftId, data) => api.put(`/admin/exams/${examId}/shifts/${shiftId}/seating/swap`, data),
  manualAssign: (examId, shiftId, data) => api.put(`/admin/exams/${examId}/shifts/${shiftId}/seating/manual`, data),
  reset: (examId, shiftId) => api.delete(`/admin/exams/${examId}/shifts/${shiftId}/seating/reset`),
  publish: (examId, shiftId) => api.post(`/admin/exams/${examId}/shifts/${shiftId}/seating/publish`),
  unpublish: (examId, shiftId) => api.delete(`/admin/exams/${examId}/shifts/${shiftId}/seating/unpublish`),
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export const pdfAPI = {
  // Room seating charts
  roomPDF: (examId, shiftId, roomId) =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/room/${roomId}`, { responseType: 'blob' }),
  allRoomsPDF: (examId, shiftId) =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/rooms/all`, { responseType: 'blob' }),
  facultyDutyPDF: (examId) =>
    api.get(`/admin/exams/${examId}/pdf/faculty-duty`, { responseType: 'blob' }),

  // Room charts — all rooms merged single PDF
  allRoomsMergedPDF: (examId, shiftId) =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/rooms/merged`, { responseType: 'blob' }),

  // Seat labels — single room
  roomLabelsPDF: (examId, shiftId, roomId, variant = 'detailed') =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/room/${roomId}/labels`, {
      params: { variant },
      responseType: 'blob',
    }),

  // Seat labels — all rooms ZIP
  allRoomsLabelsPDF: (examId, shiftId, variant = 'detailed') =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/rooms/labels`, {
      params: { variant },
      responseType: 'blob',
    }),

  // Seat labels — all rooms merged single PDF
  allRoomsLabelsMergedPDF: (examId, shiftId, variant = 'detailed') =>
    api.get(`/admin/exams/${examId}/shifts/${shiftId}/pdf/rooms/labels/merged`, {
      params: { variant },
      responseType: 'blob',
    }),
}

// ── PUBLIC LOOKUP ─────────────────────────────────────────────────────────────
export const lookupAPI = {
  student: (enrollmentNo) => api.get(`/public/student/${enrollmentNo}`),
  faculty: (email) => api.get(`/public/faculty/${encodeURIComponent(email)}`),
}