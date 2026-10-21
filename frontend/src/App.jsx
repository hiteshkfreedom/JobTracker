import { useEffect, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import './App.css'

const API_URL = 'http://127.0.0.1:8000/api/jobs/'
const LOGIN_URL = `${API_URL}login/`
const REGISTER_URL = `${API_URL}register/`

const STATUSES = [
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
]

const CHART_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#06b6d4',
  '#22c55e',
  '#ef4444',
]

const EMPTY_FORM = {
  company_name: '',
  job_role: '',
  job_location: '',
  application_date: new Date().toISOString().slice(0, 10),
  status: 'Applied',
  notes: '',
}

function App() {
  
  // Light and dark theme preference
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('jobtracker_theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('jobtracker_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'light' ? 'dark' : 'light'
    )
  }

  // Authentication
  const [token, setToken] = useState(
    () => localStorage.getItem('jobtracker_token') || ''
  )
  const [username, setUsername] = useState(
    () => localStorage.getItem('jobtracker_username') || ''
  )
  const [authMode, setAuthMode] = useState('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Job applications
  const [jobs, setJobs] = useState([])
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortOrder, setSortOrder] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load the signed-in user's applications.
  useEffect(() => {
    if (token) {
      fetchJobs()
    } else {
      setJobs([])
      setLoading(false)
    }
    // fetchJobs uses the current token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function fetchJobs() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Your session is invalid. Please log in again.'
        )
      }

      if (!response.ok) {
        throw new Error('Unable to load job applications.')
      }

      const data = await response.json()

      // Supports both a normal array and paginated Django REST responses.
      const applications = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : null

      if (!applications) {
        throw new Error('The API returned an unexpected response.')
      }

      setJobs(applications)
    } catch (err) {
      setError(err.message || 'Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setError('')
    setMessage('')

    const authURL =
      authMode === 'login' ? LOGIN_URL : REGISTER_URL

    try {
      const response = await fetch(authURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const detail =
          data.error || data.detail || data.message

        throw new Error(
          Array.isArray(detail)
            ? detail.join(' ')
            : typeof detail === 'string'
              ? detail
              : 'Authentication failed. Please try again.'
        )
      }

      if (!data.token) {
        throw new Error(
          'The server did not return an authentication token.'
        )
      }

      localStorage.setItem('jobtracker_token', data.token)
      localStorage.setItem(
        'jobtracker_username',
        data.username || authUsername.trim()
      )

      setUsername(data.username || authUsername.trim())
      setToken(data.token)
      setAuthPassword('')
      setAuthError('')
      setMessage(
        authMode === 'login'
          ? 'Welcome back!'
          : 'Account created successfully!'
      )
    } catch (err) {
      setAuthError(
        err.message || 'Unable to connect to the server.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  // Logout is defined inside App, before the component's return.
  function handleLogout() {
    localStorage.removeItem('jobtracker_token')
    localStorage.removeItem('jobtracker_username')

    setToken('')
    setUsername('')
    setJobs([])
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setSearchTerm('')
    setStatusFilter('All')
    setSortOrder('newest')
    setMessage('')
    setError('')
    setAuthError('')
    setAuthUsername('')
    setAuthPassword('')
    setAuthMode('login')
    setLoading(false)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function resetForm() {
    setFormData(EMPTY_FORM)
    setEditingId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!token) {
      setError('Please log in before saving an application.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const isEditing = editingId !== null
    const requestURL = isEditing
      ? `${API_URL}${editingId}/`
      : API_URL

    try {
      const response = await fetch(requestURL, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        throw new Error('Your session has expired. Please log in again.')
      }

      if (!response.ok) {
        const details = Object.entries(data)
          .map(([field, value]) => {
            const readableValue = Array.isArray(value)
              ? value.join(', ')
              : String(value)

            return `${field}: ${readableValue}`
          })
          .join(' | ')

        throw new Error(
          details || 'Unable to save this application.'
        )
      }

      setMessage(
        isEditing
          ? 'Application updated successfully!'
          : 'Application added successfully!'
      )

      resetForm()
      await fetchJobs()
    } catch (err) {
      setError(err.message || 'Unable to save the application.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(job) {
    setEditingId(job.id)

    setFormData({
      company_name: job.company_name || '',
      job_role: job.job_role || '',
      job_location: job.job_location || '',
      application_date:
        job.application_date ||
        new Date().toISOString().slice(0, 10),
      status: job.status || 'Applied',
      notes: job.notes || '',
    })

    setMessage('')
    setError('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this job application?'
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        throw new Error('Your session has expired. Please log in again.')
      }

      if (!response.ok) {
        throw new Error('Unable to delete this application.')
      }

      if (editingId === id) {
        resetForm()
      }

      setMessage('Application deleted successfully!')
      await fetchJobs()
    } catch (err) {
      setError(err.message || 'Unable to delete the application.')
    }
  }

  // Search, filter and sort.
  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return [...jobs]
      .filter((job) => {
        const matchesSearch = [
          job.company_name,
          job.job_role,
          job.job_location,
          job.status,
          job.notes,
        ].some((value) =>
          String(value || '').toLowerCase().includes(search)
        )

        const matchesStatus =
          statusFilter === 'All' || job.status === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const dateA = a.application_date || ''
        const dateB = b.application_date || ''

        return sortOrder === 'newest'
          ? dateB.localeCompare(dateA)
          : dateA.localeCompare(dateB)
      })
  }, [jobs, searchTerm, statusFilter, sortOrder])

  // Dashboard statistics.
  const stats = useMemo(() => {
    const countByStatus = (status) =>
      jobs.filter((job) => job.status === status).length

    return {
      total: jobs.length,
      applied: countByStatus('Applied'),
      assessments: countByStatus('Assessment'),
      interviews: countByStatus('Interview'),
      offers: countByStatus('Offer'),
      rejected: countByStatus('Rejected'),
    }
  }, [jobs])

  const pieData = useMemo(
    () =>
      STATUSES.map((status) => ({
        name: status,
        value: jobs.filter((job) => job.status === status).length,
      })).filter((item) => item.value > 0),
    [jobs]
  )

  const monthlyData = useMemo(() => {
    const months = {}

    jobs.forEach((job) => {
      if (!job.application_date) return

      const date = new Date(`${job.application_date}T00:00:00`)

      if (Number.isNaN(date.getTime())) return

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`

      if (!months[key]) {
        months[key] = {
          month: date.toLocaleString('en', {
            month: 'short',
            year: '2-digit',
          }),
          applications: 0,
        }
      }

      months[key].applications += 1
    })

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  }, [jobs])

  const recentJobs = useMemo(
    () =>
      [...jobs]
        .sort((a, b) =>
          (b.application_date || '').localeCompare(
            a.application_date || ''
          )
        )
        .slice(0, 5),
    [jobs]
  )

  function exportCSV() {
    if (jobs.length === 0) {
      setMessage('There are no applications to export yet.')
      return
    }

    const columns = [
      'Company',
      'Job Role',
      'Location',
      'Application Date',
      'Status',
      'Notes',
    ]

    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = jobs.map((job) => [
      job.company_name,
      job.job_role,
      job.job_location,
      job.application_date,
      job.status,
      job.notes,
    ])

    const csvContent = [
      columns.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\r\n')

    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'jobtracker-applications.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setMessage('CSV exported successfully!')
  }

  // LOGIN / REGISTER SCREEN
  if (!token) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>JobTracker</h1>
          <p>Manage your career journey in one place.</p>

          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
              }}
              disabled={authLoading}
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setAuthError('')
              }}
              disabled={authLoading}
            >
              Create account
            </button>
          </div>

          <h2>
            {authMode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h2>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              value={authUsername}
              onChange={(event) =>
                setAuthUsername(event.target.value)
              }
              autoComplete="username"
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={authPassword}
              onChange={(event) =>
                setAuthPassword(event.target.value)
              }
              autoComplete={
                authMode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              required
            />

            {authError && (
              <div className="message error-message" role="alert">
                {authError}
              </div>
            )}

            <button type="submit" disabled={authLoading}>
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  // MAIN DASHBOARD
  return (
    <main className="dashboard">
      <header className="app-header">
        <div>
          <h1>JobTracker</h1>
          <p>Keep your job search organized and on track.</p>
          <p>
            Signed in as <strong>{username}</strong>
          </p>
        </div>

        <div className="header-actions">

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button type="button" onClick={exportCSV}>
            Export CSV
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      {message && (
        <div className="message success-message" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="message error-message" role="alert">
          {error}
        </div>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <h3>Total Applications</h3>
          <p>{stats.total}</p>
        </article>

        <article className="stat-card">
          <h3>Applied</h3>
          <p>{stats.applied}</p>
        </article>

        <article className="stat-card">
          <h3>Assessments</h3>
          <p>{stats.assessments}</p>
        </article>

        <article className="stat-card">
          <h3>Interviews</h3>
          <p>{stats.interviews}</p>
        </article>

        <article className="stat-card">
          <h3>Offers</h3>
          <p>{stats.offers}</p>
        </article>

        <article className="stat-card">
          <h3>Rejected</h3>
          <p>{stats.rejected}</p>
        </article>
      </section>

      <section className="charts-grid">
        <article className="chart-card">
          <h2>Applications by Status</h2>

          {pieData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          CHART_COLORS[
                            STATUSES.indexOf(entry.name)
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>Add applications to see your status chart.</p>
          )}
        </article>

        <article className="chart-card">
          <h2>Monthly Applications</h2>

          {monthlyData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="applications"
                    name="Applications"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>Your monthly application activity will appear here.</p>
          )}
        </article>
      </section>

      <section className="form-card">
        <h2>
          {editingId !== null
            ? 'Edit Job Application'
            : 'Add Job Application'}
        </h2>

        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="company_name">Company Name</label>
              <input
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Infosys"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="job_role">Job Role</label>
              <input
                id="job_role"
                name="job_role"
                value={formData.job_role}
                onChange={handleChange}
                placeholder="e.g. Python Developer"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="job_location">Location</label>
              <input
                id="job_location"
                name="job_location"
                value={formData.job_location}
                onChange={handleChange}
                placeholder="e.g. Bengaluru / Remote"
              />
            </div>

            <div className="form-group">
              <label htmlFor="application_date">
                Application Date
              </label>
              <input
                id="application_date"
                name="application_date"
                type="date"
                value={formData.application_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Application Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Interview details, job link, follow-up reminders..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId !== null
                  ? 'Update Application'
                  : 'Add Application'}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="applications-card">
        <div className="section-heading">
          <div>
            <h2>Job Applications</h2>
            <p>
              Showing {filteredJobs.length} of {jobs.length} applications
            </p>
          </div>
        </div>

        <div className="filter-row">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search company, role, location..."
            aria-label="Search applications"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Sort by date"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {loading ? (
          <p>Loading applications...</p>
        ) : filteredJobs.length === 0 ? (
          <p>
            No applications found. Add an application or change your search
            filters.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Role</th>
                  <th>Location</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.company_name}</td>
                    <td>{job.job_role}</td>
                    <td>{job.job_location || '—'}</td>
                    <td>{job.application_date || '—'}</td>
                    <td>
                      <span
                        className={`status-badge status-${String(
                          job.status || ''
                        )
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>{job.notes || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(job)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="recent-card">
        <h2>Recent Applications</h2>

        {recentJobs.length === 0 ? (
          <p>Your recent applications will appear here.</p>
        ) : (
          <ul className="recent-list">
            {recentJobs.map((job) => (
              <li key={job.id} className="recent-item">
                <div>
                  <strong>{job.company_name}</strong>
                  <p>{job.job_role}</p>
                </div>

                <div>
                  <span>{job.status}</span>
                  <p>{job.application_date || 'Date not set'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="app-footer">
        <p>JobTracker — your career journey, organized.</p>
      </footer>
    </main>
  )
}

export default App